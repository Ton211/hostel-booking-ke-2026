import * as functions from "firebase-functions";
import express from "express";
import cors from "cors";
import type { Request, Response } from "express";
import { db, FieldValue } from "./config";
import { createAuditLog } from "./audit";

const app = express();
app.use(cors({ origin: true }));
app.use(express.json());

export async function setAdminRole(data: { uid: string; role: string }, context: functions.https.CallableContext): Promise<{ success: boolean; message: string }> {
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "User must be authenticated");
  }

  const callerDoc = await db.collection("admins").doc(context.auth.uid).get();
  if (!callerDoc.exists || callerDoc.data()?.role !== "SUPER_ADMIN") {
    throw new functions.https.HttpsError("permission-denied", "Only SUPER_ADMIN can set admin roles");
  }

  if (!data.uid || !data.role) {
    throw new functions.https.HttpsError("invalid-argument", "uid and role are required");
  }

  const validRoles = ["SUPER_ADMIN", "ADMIN", "HOSTEL_MANAGER", "RECEPTIONIST"];
  if (!validRoles.includes(data.role)) {
    throw new functions.https.HttpsError("invalid-argument", `Invalid role. Must be one of: ${validRoles.join(", ")}`);
  }

  const targetUserDoc = await db.collection("admins").doc(data.uid).get();
  if (!targetUserDoc.exists) {
    throw new functions.https.HttpsError("not-found", "Target user not found in admins collection");
  }

  const batch = db.batch();

  batch.update(db.collection("admins").doc(data.uid), {
    role: data.role,
    updatedAt: FieldValue.serverTimestamp(),
  });

  await batch.commit();

  const { auth } = await import("firebase-admin");
  await auth().setCustomUserClaims(data.uid, { role: data.role });

  await createAuditLog(
    "SET_ADMIN_ROLE",
    "admin",
    data.uid,
    { role: targetUserDoc.data()?.role },
    { role: data.role },
    context.auth.uid,
    context.auth.token.email
  );

  return { success: true, message: `Role updated to ${data.role} for user ${data.uid}` };
}

export async function createAdminAccount(
  data: { email: string; password: string; displayName: string; role: string; hostelId?: string },
  context: functions.https.CallableContext
): Promise<{ uid: string; success: boolean; message: string }> {
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "User must be authenticated");
  }

  const callerDoc = await db.collection("admins").doc(context.auth.uid).get();
  if (!callerDoc.exists || callerDoc.data()?.role !== "SUPER_ADMIN") {
    throw new functions.https.HttpsError("permission-denied", "Only SUPER_ADMIN can create admin accounts");
  }

  if (!data.email || !data.password || !data.displayName || !data.role) {
    throw new functions.https.HttpsError("invalid-argument", "email, password, displayName, and role are required");
  }

  if (data.password.length < 8) {
    throw new functions.https.HttpsError("invalid-argument", "Password must be at least 8 characters");
  }

  const validRoles = ["SUPER_ADMIN", "ADMIN", "HOSTEL_MANAGER", "RECEPTIONIST"];
  if (!validRoles.includes(data.role)) {
    throw new functions.https.HttpsError("invalid-argument", `Invalid role. Must be one of: ${validRoles.join(", ")}`);
  }

  const { auth } = await import("firebase-admin");
  let userRecord;
  try {
    userRecord = await auth().createUser({
      email: data.email,
      password: data.password,
      displayName: data.displayName,
      emailVerified: true,
    });
  } catch (error: unknown) {
    const firebaseError = error as { code?: string; message?: string };
    if (firebaseError.code === "auth/email-already-exists") {
      throw new functions.https.HttpsError("already-exists", "An account with this email already exists");
    }
    throw new functions.https.HttpsError("internal", "Failed to create user account");
  }

  await auth().setCustomUserClaims(userRecord.uid, { role: data.role });

  const adminData = {
    uid: userRecord.uid,
    email: data.email,
    displayName: data.displayName,
    role: data.role,
    hostelId: data.hostelId || null,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
    createdBy: context.auth.uid,
  };

  await db.collection("admins").doc(userRecord.uid).set(adminData);

  await createAuditLog(
    "CREATE_ADMIN_ACCOUNT",
    "admin",
    userRecord.uid,
    null,
    adminData,
    context.auth.uid,
    context.auth.token.email
  );

  return { uid: userRecord.uid, success: true, message: `Admin account created for ${data.email}` };
}

app.post("/callback", async (req: Request, res: Response) => {
  try {
    functions.logger.info("M-Pesa callback received:", JSON.stringify(req.body));

    const callbackData = req.body;
    const stkCallback = callbackData.Body?.stkCallback;

    if (!stkCallback) {
      functions.logger.error("Invalid callback data: missing stkCallback");
      res.status(400).json({ ResultCode: 1, ResultDesc: "Invalid callback data" });
      return;
    }

    const resultCode = stkCallback.ResultCode;
    const resultDesc = stkCallback.ResultDesc;
    const callbackMetadata = stkCallback.CallbackMetadata?.Item || [];

    const extractParam = (name: string): string | number | null => {
      const param = callbackMetadata.find(
        (p: { Name: string; Value: string | number }) => p.Name === name
      );
      return param ? param.Value : null;
    };

    const accountReference = extractParam("AccountReference") as string | null;

    if (!accountReference) {
      functions.logger.error("No AccountReference found in callback");
      res.status(400).json({ ResultCode: 1, ResultDesc: "Missing AccountReference" });
      return;
    }

    const bookingsQuery = await db
      .collection("bookings")
      .where("bookingReference", "==", accountReference)
      .limit(1)
      .get();

    if (bookingsQuery.empty) {
      functions.logger.error(`No booking found for reference: ${accountReference}`);
      res.status(200).json({ ResultCode: 0, ResultDesc: "Callback processed" });
      return;
    }

    const bookingDoc = bookingsQuery.docs[0];
    const bookingData = bookingDoc.data();

    if (resultCode === 0) {
      const mpesaReceiptNumber = extractParam("MpesaReceiptNumber") as string;
      const amount = extractParam("Amount") as number;
      const phoneNumber = extractParam("PhoneNumber") as string;

      await db.runTransaction(async (transaction) => {
        const freshBookingDoc = await transaction.get(bookingDoc.ref);
        if (!freshBookingDoc.exists) {
          throw new Error("Booking not found");
        }

        const freshBooking = freshBookingDoc.data()!;

        if (freshBooking.paymentStatus === "PAID") {
          functions.logger.info(`Booking ${accountReference} already processed, skipping`);
          return;
        }

        const paymentsQuery = await db
          .collection("payments")
          .where("bookingId", "==", bookingDoc.id)
          .where("status", "==", "PENDING")
          .limit(1)
          .get();

        if (!paymentsQuery.empty) {
          const paymentDoc = paymentsQuery.docs[0];
          transaction.update(paymentDoc.ref, {
            status: "PAID",
            mpesaReceiptNumber,
            amount,
            phoneNumber,
            paidAt: FieldValue.serverTimestamp(),
            callbackData: callbackData,
            updatedAt: FieldValue.serverTimestamp(),
          });
        }

        transaction.update(bookingDoc.ref, {
          paymentStatus: "PAID",
          bookingStatus: "CONFIRMED",
          confirmedAt: FieldValue.serverTimestamp(),
          mpesaReceiptNumber,
          updatedAt: FieldValue.serverTimestamp(),
        });

        if (freshBooking.bedId) {
          const bedDoc = await db.collection("beds").doc(freshBooking.bedId).get();
          if (bedDoc.exists) {
            transaction.update(bedDoc.ref, {
              status: "BOOKED",
              updatedAt: FieldValue.serverTimestamp(),
            });
          }
        }
      });

      await createAuditLog(
        "MPESA_PAYMENT_SUCCESS",
        "booking",
        bookingDoc.id,
        { paymentStatus: bookingData.paymentStatus, bookingStatus: bookingData.bookingStatus },
        { paymentStatus: "PAID", bookingStatus: "CONFIRMED", mpesaReceiptNumber: extractParam("MpesaReceiptNumber") },
        undefined,
        undefined
      );

      functions.logger.info(`Payment successful for booking ${accountReference}`);
      res.status(200).json({ ResultCode: 0, ResultDesc: "Callback processed successfully" });
    } else {
      await db.runTransaction(async (transaction) => {
        const freshBookingDoc = await transaction.get(bookingDoc.ref);
        if (!freshBookingDoc.exists) return;

        const freshBooking = freshBookingDoc.data()!;

        if (freshBooking.paymentStatus === "FAILED" || freshBooking.paymentStatus === "PAID") {
          functions.logger.info(`Booking ${accountReference} already in terminal state: ${freshBooking.paymentStatus}`);
          return;
        }

        const paymentsQuery = await db
          .collection("payments")
          .where("bookingId", "==", bookingDoc.id)
          .where("status", "==", "PENDING")
          .limit(1)
          .get();

        if (!paymentsQuery.empty) {
          const paymentDoc = paymentsQuery.docs[0];
          transaction.update(paymentDoc.ref, {
            status: "FAILED",
            failureReason: resultDesc,
            callbackData: callbackData,
            updatedAt: FieldValue.serverTimestamp(),
          });
        }

        transaction.update(bookingDoc.ref, {
          paymentStatus: "FAILED",
          bookingStatus: "FAILED",
          failureReason: resultDesc,
          updatedAt: FieldValue.serverTimestamp(),
        });

        if (freshBooking.bedId) {
          const bedDoc = await db.collection("beds").doc(freshBooking.bedId).get();
          if (bedDoc.exists) {
            transaction.update(bedDoc.ref, {
              status: "AVAILABLE",
              currentBookingId: null,
              updatedAt: FieldValue.serverTimestamp(),
            });
          }
        }
      });

      await createAuditLog(
        "MPESA_PAYMENT_FAILED",
        "booking",
        bookingDoc.id,
        { paymentStatus: bookingData.paymentStatus },
        { paymentStatus: "FAILED", bookingStatus: "FAILED", failureReason: resultDesc },
        undefined,
        undefined
      );

      functions.logger.info(`Payment failed for booking ${accountReference}: ${resultDesc}`);
      res.status(200).json({ ResultCode: 0, ResultDesc: "Failure callback processed" });
    }
  } catch (error) {
    functions.logger.error("Error processing M-Pesa callback:", error);
    res.status(500).json({ ResultCode: 1, ResultDesc: "Internal server error" });
  }
});

app.get("/health", (_req: Request, res: Response) => {
  res.status(200).json({ status: "ok", timestamp: new Date().toISOString() });
});

export const mpesaCallback = functions.https.onRequest(app);
