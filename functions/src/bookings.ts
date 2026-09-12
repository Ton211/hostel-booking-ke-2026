import * as functions from "firebase-functions";
import { db, FieldValue, Timestamp } from "./config";
import { initiateSTKPush, formatPhoneNumber } from "./mpesa";
import { createAuditLog } from "./audit";

function generateBookingReference(): string {
  const year = new Date().getFullYear();
  const randomPart = Math.random().toString(36).substring(2, 7).toUpperCase();
  return `HOST-${year}-${randomPart}`;
}

interface CreateBookingData {
  studentName: string;
  studentEmail: string;
  studentPhone: string;
  studentGender: "MALE" | "FEMALE";
  studentIdNumber: string;
  bedId: string;
  roomId: string;
  hostelId: string;
  accommodationTypeId: string;
}

export const createBooking = functions.https.onCall(async (data: CreateBookingData, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "User must be authenticated");
  }

  if (!data.studentName || !data.studentPhone || !data.studentGender || !data.bedId || !data.roomId || !data.hostelId || !data.accommodationTypeId) {
    throw new functions.https.HttpsError("invalid-argument", "Missing required booking fields");
  }

  const validGenders = ["MALE", "FEMALE"];
  if (!validGenders.includes(data.studentGender)) {
    throw new functions.https.HttpsError("invalid-argument", "Invalid gender value");
  }

  try {
    formatPhoneNumber(data.studentPhone);
  } catch {
    throw new functions.https.HttpsError("invalid-argument", "Invalid phone number format");
  }

  const semesterQuery = await db
    .collection("semesters")
    .where("isActive", "==", true)
    .limit(1)
    .get();

  if (semesterQuery.empty) {
    throw new functions.https.HttpsError("failed-precondition", "No active semester with open booking found");
  }

  const semester = semesterQuery.docs[0].data();
  const now = new Date();

  const bookingOpenRaw = semester.bookingOpen ?? semester.bookingStart ?? semester.bookingStartDate;
  let bookingOpenFlag = semester.status === "OPEN";
  if (typeof bookingOpenRaw === "boolean") {
    bookingOpenFlag = bookingOpenRaw;
  } else if (bookingOpenRaw && typeof bookingOpenRaw.toDate === "function") {
    bookingOpenFlag = bookingOpenRaw.toDate() <= now;
  } else if (bookingOpenRaw && typeof bookingOpenRaw === "string") {
    bookingOpenFlag = new Date(bookingOpenRaw) <= now;
  }
  if (semester.isClosed) bookingOpenFlag = false;

  if (!bookingOpenFlag) {
    throw new functions.https.HttpsError("failed-precondition", "Booking is not open for the active semester");
  }

  const deadlineRaw = semester.bookingDeadline ?? semester.bookingEnd ?? semester.bookingEndDate;
  const bookingDeadline =
    deadlineRaw && typeof deadlineRaw.toDate === "function"
      ? deadlineRaw.toDate()
      : deadlineRaw && typeof deadlineRaw === "string"
      ? new Date(deadlineRaw)
      : null;
  if (bookingDeadline && now > bookingDeadline) {
    throw new functions.https.HttpsError("failed-precondition", "Booking period has ended");
  }

  const accTypeDoc = await db.collection("accommodationTypes").doc(data.accommodationTypeId).get();
  if (!accTypeDoc.exists) {
    throw new functions.https.HttpsError("not-found", "Accommodation type not found");
  }
  const accType = accTypeDoc.data()!;
  const price = accType.price;

  const bookingReference = generateBookingReference();
  const bookingId = db.collection("bookings").doc().id;
  const studentId = db.collection("students").doc().id;
  const paymentId = db.collection("payments").doc().id;

  try {
    await db.runTransaction(async (transaction) => {
      const bedRef = db.collection("beds").doc(data.bedId);
      const bedDoc = await transaction.get(bedRef);

      if (!bedDoc.exists) {
        throw new functions.https.HttpsError("not-found", "Bed not found");
      }

      const bed = bedDoc.data()!;

      if (bed.status !== "AVAILABLE") {
        throw new functions.https.HttpsError("failed-precondition", "Bed is not available");
      }

      const roomDoc = await transaction.get(db.collection("rooms").doc(data.roomId));
      if (!roomDoc.exists) {
        throw new functions.https.HttpsError("not-found", "Room not found");
      }
      const room = roomDoc.data()!;
      if (room.gender !== data.studentGender) {
        throw new functions.https.HttpsError("failed-precondition", `This room is for ${room.gender} students only`);
      }

      if (room.hostelId !== data.hostelId) {
        throw new functions.https.HttpsError("failed-precondition", "Room does not belong to selected hostel");
      }

      const existingStudentQuery = await db
        .collection("students")
        .where("phone", "==", data.studentPhone)
        .limit(1)
        .get();

      let studentRef;
      if (!existingStudentQuery.empty) {
        studentRef = existingStudentQuery.docs[0].ref;
        transaction.update(studentRef, {
          name: data.studentName,
          email: data.studentEmail || null,
          idNumber: data.studentIdNumber || null,
          gender: data.studentGender,
          updatedAt: FieldValue.serverTimestamp(),
        });
      } else {
        studentRef = db.collection("students").doc(studentId);
        transaction.set(studentRef, {
          name: data.studentName,
          email: data.studentEmail || null,
          phone: data.studentPhone,
          idNumber: data.studentIdNumber || null,
          gender: data.studentGender,
          createdAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
        });
      }

      const expiresAt = new Date(now.getTime() + 10 * 60 * 1000);

      const bookingRef = db.collection("bookings").doc(bookingId);
      const bookingData = {
        bookingReference,
        studentId: studentRef.id,
        studentName: data.studentName,
        studentPhone: data.studentPhone,
        studentEmail: data.studentEmail || null,
        studentGender: data.studentGender,
        bedId: data.bedId,
        roomId: data.roomId,
        hostelId: data.hostelId,
        accommodationTypeId: data.accommodationTypeId,
        semesterId: semesterQuery.docs[0].id,
        bookingStatus: "PENDING_PAYMENT",
        paymentStatus: "PENDING",
        price,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
        expiresAt: Timestamp.fromDate(expiresAt),
        createdBy: context.auth!.uid,
      };
      transaction.set(bookingRef, bookingData);

      transaction.update(bedRef, {
        status: "PENDING_PAYMENT",
        currentBookingId: bookingId,
        updatedAt: FieldValue.serverTimestamp(),
      });

      const paymentRef = db.collection("payments").doc(paymentId);
      transaction.set(paymentRef, {
        bookingId,
        studentId: studentRef.id,
        amount: price,
        currency: "KES",
        method: "MPESA",
        status: "PENDING",
        mpesaPhoneNumber: formatPhoneNumber(data.studentPhone),
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });
    });

    let stkPushResult;
    try {
      stkPushResult = await initiateSTKPush(
        data.studentPhone,
        price,
        bookingReference,
        `Hostel Booking - ${bookingReference}`
      );
    } catch (error) {
      functions.logger.error("STK Push failed, but booking created:", error);

      await db.collection("bookings").doc(bookingId).update({
        bookingStatus: "PENDING_PAYMENT",
        paymentStatus: "STK_FAILED",
        stkPushError: error instanceof Error ? error.message : "Unknown error",
        updatedAt: FieldValue.serverTimestamp(),
      });

      return {
        success: true,
        bookingId,
        bookingReference,
        paymentStatus: "STK_FAILED",
        message: "Booking created but payment initiation failed. Please try paying again.",
        price,
      };
    }

    await createAuditLog(
      "BOOKING_CREATED",
      "booking",
      bookingId,
      null,
      {
        bookingReference,
        bedId: data.bedId,
        studentName: data.studentName,
        price,
      },
      context.auth!.uid,
      context.auth!.token.email
    );

    return {
      success: true,
      bookingId,
      bookingReference,
      paymentStatus: "PENDING",
      stkPushStatus: stkPushResult?.CustomerMessage || "Check your phone for payment prompt",
      message: "Booking created. Please complete payment on your phone.",
      price,
    };
  } catch (error) {
    if (error instanceof functions.https.HttpsError) {
      throw error;
    }
    functions.logger.error("Booking creation failed:", error);
    throw new functions.https.HttpsError("internal", "Failed to create booking");
  }
});

interface CancelBookingData {
  bookingId: string;
  reason?: string;
}

export const cancelBooking = functions.https.onCall(async (data: CancelBookingData, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "User must be authenticated");
  }

  const adminDoc = await db.collection("admins").doc(context.auth.uid).get();
  if (!adminDoc.exists) {
    throw new functions.https.HttpsError("permission-denied", "Only admins can cancel bookings");
  }

  if (!data.bookingId) {
    throw new functions.https.HttpsError("invalid-argument", "bookingId is required");
  }

  try {
    await db.runTransaction(async (transaction) => {
      const bookingRef = db.collection("bookings").doc(data.bookingId);
      const bookingDoc = await transaction.get(bookingRef);

      if (!bookingDoc.exists) {
        throw new functions.https.HttpsError("not-found", "Booking not found");
      }

      const booking = bookingDoc.data()!;

      if (booking.bookingStatus === "CANCELLED") {
        throw new functions.https.HttpsError("failed-precondition", "Booking is already cancelled");
      }

      if (booking.bookingStatus === "CONFIRMED") {
        const bedDoc = await transaction.get(db.collection("beds").doc(booking.bedId));
        if (bedDoc.exists) {
          transaction.update(bedDoc.ref, {
            status: "AVAILABLE",
            currentBookingId: null,
            updatedAt: FieldValue.serverTimestamp(),
          });
        }
      }

      if (booking.bookingStatus === "PENDING_PAYMENT") {
        const bedDoc = await transaction.get(db.collection("beds").doc(booking.bedId));
        if (bedDoc.exists) {
          transaction.update(bedDoc.ref, {
            status: "AVAILABLE",
            currentBookingId: null,
            updatedAt: FieldValue.serverTimestamp(),
          });
        }
      }

      transaction.update(bookingRef, {
        bookingStatus: "CANCELLED",
        cancellationReason: data.reason || "Cancelled by admin",
        cancelledAt: FieldValue.serverTimestamp(),
        cancelledBy: context.auth!.uid,
        updatedAt: FieldValue.serverTimestamp(),
      });

      const paymentsQuery = await db
        .collection("payments")
        .where("bookingId", "==", data.bookingId)
        .where("status", "==", "PENDING")
        .get();

      for (const paymentDoc of paymentsQuery.docs) {
        transaction.update(paymentDoc.ref, {
          status: "CANCELLED",
          updatedAt: FieldValue.serverTimestamp(),
        });
      }
    });

    await createAuditLog(
      "BOOKING_CANCELLED",
      "booking",
      data.bookingId,
      null,
      { reason: data.reason, cancelledBy: context.auth.uid },
      context.auth.uid,
      context.auth.token.email
    );

    return { success: true, message: "Booking cancelled successfully" };
  } catch (error) {
    if (error instanceof functions.https.HttpsError) {
      throw error;
    }
    functions.logger.error("Booking cancellation failed:", error);
    throw new functions.https.HttpsError("internal", "Failed to cancel booking");
  }
});

interface TransferBedData {
  bookingId: string;
  newBedId: string;
  newRoomId: string;
  reason?: string;
}

export const transferBed = functions.https.onCall(async (data: TransferBedData, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "User must be authenticated");
  }

  const adminDoc = await db.collection("admins").doc(context.auth.uid).get();
  if (!adminDoc.exists) {
    throw new functions.https.HttpsError("permission-denied", "Only admins can transfer beds");
  }

  if (!data.bookingId || !data.newBedId || !data.newRoomId) {
    throw new functions.https.HttpsError("invalid-argument", "bookingId, newBedId, and newRoomId are required");
  }

  try {
    await db.runTransaction(async (transaction) => {
      const bookingRef = db.collection("bookings").doc(data.bookingId);
      const bookingDoc = await transaction.get(bookingRef);

      if (!bookingDoc.exists) {
        throw new functions.https.HttpsError("not-found", "Booking not found");
      }

      const booking = bookingDoc.data()!;

      if (booking.bookingStatus !== "CONFIRMED") {
        throw new functions.https.HttpsError("failed-precondition", "Only confirmed bookings can be transferred");
      }

      const newBedDoc = await transaction.get(db.collection("beds").doc(data.newBedId));
      if (!newBedDoc.exists) {
        throw new functions.https.HttpsError("not-found", "New bed not found");
      }
      const newBed = newBedDoc.data()!;

      if (newBed.status !== "AVAILABLE") {
        throw new functions.https.HttpsError("failed-precondition", "New bed is not available");
      }

      const newRoomDoc = await transaction.get(db.collection("rooms").doc(data.newRoomId));
      if (!newRoomDoc.exists) {
        throw new functions.https.HttpsError("not-found", "New room not found");
      }
      const newRoom = newRoomDoc.data()!;

      if (newRoom.gender !== booking.studentGender) {
        throw new functions.https.HttpsError("failed-precondition", `New room is for ${newRoom.gender} students only`);
      }

      if (newRoom.hostelId !== booking.hostelId) {
        throw new functions.https.HttpsError("failed-precondition", "New room must be in the same hostel");
      }

      const oldBedRef = db.collection("beds").doc(booking.bedId);
      transaction.update(oldBedRef, {
        status: "AVAILABLE",
        currentBookingId: null,
        updatedAt: FieldValue.serverTimestamp(),
      });

      transaction.update(newBedDoc.ref, {
        status: "BOOKED",
        currentBookingId: data.bookingId,
        updatedAt: FieldValue.serverTimestamp(),
      });

      transaction.update(bookingRef, {
        bedId: data.newBedId,
        roomId: data.newRoomId,
        updatedAt: FieldValue.serverTimestamp(),
        transferReason: data.reason || null,
        transferredBy: context.auth!.uid,
        transferredAt: FieldValue.serverTimestamp(),
      });
    });

    await createAuditLog(
      "BED_TRANSFERRED",
      "booking",
      data.bookingId,
      { bedId: (await db.collection("bookings").doc(data.bookingId).get()).data()?.bedId },
      { bedId: data.newBedId, roomId: data.newRoomId, reason: data.reason },
      context.auth.uid,
      context.auth.token.email
    );

    return { success: true, message: "Bed transferred successfully" };
  } catch (error) {
    if (error instanceof functions.https.HttpsError) {
      throw error;
    }
    functions.logger.error("Bed transfer failed:", error);
    throw new functions.https.HttpsError("internal", "Failed to transfer bed");
  }
});

export const expirePendingBookings = functions.pubsub.schedule("every 5 minutes").onRun(async () => {
  const now = new Date();

  const expiredBookingsQuery = await db
    .collection("bookings")
    .where("bookingStatus", "==", "PENDING_PAYMENT")
    .where("expiresAt", "<=", Timestamp.fromDate(now))
    .get();

  if (expiredBookingsQuery.empty) {
    functions.logger.info("No pending bookings to expire");
    return;
  }

  functions.logger.info(`Found ${expiredBookingsQuery.size} bookings to expire`);

  const batch = db.batch();
  const bedUpdates: Promise<void>[] = [];

  for (const bookingDoc of expiredBookingsQuery.docs) {
    const booking = bookingDoc.data();

    batch.update(bookingDoc.ref, {
      bookingStatus: "EXPIRED",
      paymentStatus: "EXPIRED",
      expiredAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });

    bedUpdates.push(
      (async () => {
        const bedRef = db.collection("beds").doc(booking.bedId);
        const bedDoc = await bedRef.get();
        if (bedDoc.exists && bedDoc.data()?.currentBookingId === bookingDoc.id) {
          batch.update(bedRef, {
            status: "AVAILABLE",
            currentBookingId: null,
            updatedAt: FieldValue.serverTimestamp(),
          });
        }
      })()
    );

    const paymentsQuery = await db
      .collection("payments")
      .where("bookingId", "==", bookingDoc.id)
      .where("status", "==", "PENDING")
      .get();

    for (const paymentDoc of paymentsQuery.docs) {
      batch.update(paymentDoc.ref, {
        status: "EXPIRED",
        updatedAt: FieldValue.serverTimestamp(),
      });
    }
  }

  await Promise.all(bedUpdates);
  await batch.commit();

  for (const bookingDoc of expiredBookingsQuery.docs) {
    await createAuditLog(
      "BOOKING_EXPIRED",
      "booking",
      bookingDoc.id,
      null,
      { reason: "Payment not received within 10 minutes" }
    );
  }

  functions.logger.info(`Expired ${expiredBookingsQuery.size} bookings`);
});

interface BookingStatsData {
  hostelId?: string;
  semesterId?: string;
}

export const getBookingStats = functions.https.onCall(async (data: BookingStatsData, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "User must be authenticated");
  }

  try {
    let bookingsQuery: FirebaseFirestore.Query = db.collection("bookings");

    if (data.hostelId) {
      bookingsQuery = bookingsQuery.where("hostelId", "==", data.hostelId);
    }
    if (data.semesterId) {
      bookingsQuery = bookingsQuery.where("semesterId", "==", data.semesterId);
    }

    const bookingsSnapshot = await bookingsQuery.get();

    const stats = {
      total: 0,
      confirmed: 0,
      pendingPayment: 0,
      cancelled: 0,
      expired: 0,
      failed: 0,
      totalRevenue: 0,
      confirmedRevenue: 0,
    };

    for (const doc of bookingsSnapshot.docs) {
      const booking = doc.data();
      stats.total++;

      switch (booking.bookingStatus) {
        case "CONFIRMED":
          stats.confirmed++;
          if (booking.price) {
            stats.confirmedRevenue += booking.price;
          }
          break;
        case "PENDING_PAYMENT":
          stats.pendingPayment++;
          break;
        case "CANCELLED":
          stats.cancelled++;
          break;
        case "EXPIRED":
          stats.expired++;
          break;
        case "FAILED":
          stats.failed++;
          break;
      }

      if (booking.price && booking.paymentStatus === "PAID") {
        stats.totalRevenue += booking.price;
      }
    }

    return stats;
  } catch (error) {
    functions.logger.error("Failed to get booking stats:", error);
    throw new functions.https.HttpsError("internal", "Failed to retrieve booking statistics");
  }
});
