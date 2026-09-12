import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  updateDoc,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
} from 'firebase/firestore';
import { app, db, firebaseReady } from '../firebase/config';

const COLLECTION = 'bookings';

function assertReady() {
  if (!firebaseReady || !app || !db) {
    throw new Error('Firebase is not configured. Please set up your Firebase credentials.');
  }
}

function serialize(docSnap) {
  return { id: docSnap.id, ...docSnap.data() };
}

function generateBookingReference() {
  const year = new Date().getFullYear();
  const randomPart = Math.random().toString(36).substring(2, 7).toUpperCase();
  return `HOST-${year}-${randomPart}`;
}

export async function createBooking(data) {
  assertReady();
  const {
    studentName,
    studentEmail,
    studentPhone,
    studentGender,
    studentIdNumber,
    bedId,
    roomId,
    hostelId,
    accommodationTypeId,
    price,
    semesterId,
  } = data;

  if (!studentName || !studentPhone || !studentGender || !bedId || !roomId || !hostelId || !accommodationTypeId) {
    throw new Error('Missing required booking fields');
  }

  const now = new Date();

  // Active semester
  let semester = null;
  if (semesterId) {
    const semDoc = await getDoc(doc(db, 'semesters', semesterId));
    if (semDoc.exists()) semester = { id: semDoc.id, ...semDoc.data() };
  }
  if (!semester) {
    const semSnap = await getDocs(
      query(collection(db, 'semesters'), where('isActive', '==', true), limit(1))
    );
    if (semSnap.empty) {
      throw new Error('No active semester found. Please contact the administrator.');
    }
    semester = { id: semSnap.docs[0].id, ...semSnap.docs[0].data() };
  }

  const bookingOpenRaw = semester.bookingOpen ?? semester.bookingStart ?? semester.bookingStartDate;
  let bookingOpen = semester.status === 'OPEN';
  if (typeof bookingOpenRaw === 'boolean') {
    bookingOpen = bookingOpenRaw;
  } else if (bookingOpenRaw && typeof bookingOpenRaw.toDate === 'function') {
    bookingOpen = bookingOpenRaw.toDate() <= now;
  } else if (bookingOpenRaw && typeof bookingOpenRaw === 'string') {
    bookingOpen = new Date(bookingOpenRaw) <= now;
  }
  if (semester.isClosed) bookingOpen = false;
  if (!bookingOpen) {
    throw new Error('Bookings are not open for the active semester.');
  }

  const deadlineRaw = semester.bookingDeadline ?? semester.bookingEnd ?? semester.bookingEndDate;
  const deadline =
    deadlineRaw && typeof deadlineRaw.toDate === 'function'
      ? deadlineRaw.toDate()
      : deadlineRaw && typeof deadlineRaw === 'string'
      ? new Date(deadlineRaw)
      : null;
  if (deadline && now > deadline) {
    throw new Error('The booking period has ended.');
  }

  // Price
  let finalPrice = Number(price);
  if (!finalPrice) {
    const accDoc = await getDoc(doc(db, 'accommodationTypes', accommodationTypeId));
    if (!accDoc.exists()) {
      throw new Error('Accommodation type not found');
    }
    finalPrice = Number(accDoc.data().price || 0);
  }

  // Bed + room validation
  const bedRef = doc(db, 'beds', bedId);
  const bedDoc = await getDoc(bedRef);
  if (!bedDoc.exists()) {
    throw new Error('Selected bed not found');
  }
  const bed = bedDoc.data();
  const bedStatusKey = String(bed.status || '').toUpperCase();
  if (bedStatusKey !== 'AVAILABLE' && bedStatusKey !== 'OCCUPIED') {
    throw new Error('This bed is no longer available.');
  }
  if (bedStatusKey === 'OCCUPIED' && bed.currentBookingId) {
    throw new Error('This bed is no longer available.');
  }
  if (bedStatusKey === 'AVAILABLE') {
    // fall through
  }

  const roomDoc = await getDoc(doc(db, 'rooms', roomId));
  if (!roomDoc.exists()) {
    throw new Error('Room not found');
  }
  const room = roomDoc.data();
  const roomGender = String(room.gender || '').toLowerCase();
  const genderKey = String(studentGender || '').toLowerCase();
  if (roomGender && genderKey && roomGender !== 'mixed' && roomGender !== genderKey) {
    throw new Error(`This room is for ${room.gender} students only`);
  }
  if (room.hostelId !== hostelId) {
    throw new Error('Room does not belong to the selected hostel');
  }

  // Student upsert by phone
  const existingStudents = await getDocs(
    query(collection(db, 'students'), where('phone', '==', studentPhone), limit(1))
  );
let studentId;
  if (!existingStudents.empty) {
    studentId = existingStudents.docs[0].id;
    const studentRef = doc(db, 'students', studentId);
    await updateDoc(studentRef, {
      name: studentName,
      email: studentEmail || null,
      idNumber: studentIdNumber || null,
      gender: String(studentGender).toLowerCase(),
      updatedAt: serverTimestamp(),
    });
  } else {
    const studentRef = doc(collection(db, 'students'));
    studentId = studentRef.id;
    await setDoc(studentRef, {
      name: studentName,
      email: studentEmail || null,
      phone: studentPhone,
      idNumber: studentIdNumber || null,
      gender: String(studentGender).toLowerCase(),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  }

  const bookingRef = doc(collection(db, 'bookings'));
  const bookingId = bookingRef.id;
  const bookingReference = generateBookingReference();
  const expiresAt = new Date(now.getTime() + 10 * 60 * 1000);

  await setDoc(bookingRef, {
    bookingReference,
    studentId,
    studentName,
    studentPhone,
    studentEmail: studentEmail || null,
    studentGender: String(studentGender).toLowerCase(),
    bedId,
    roomId,
    hostelId,
    accommodationTypeId,
    semesterId: semester.id,
    bookingStatus: 'PENDING_PAYMENT',
    paymentStatus: 'PENDING',
    price: finalPrice,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    expiresAt,
  });

  await updateDoc(bedRef, {
    status: 'pending',
    currentBookingId: bookingId,
    updatedAt: serverTimestamp(),
  });

  const paymentRef = doc(collection(db, 'payments'));
  await setDoc(paymentRef, {
    bookingId,
    studentId,
    amount: finalPrice,
    currency: 'KES',
    method: 'MPESA',
    status: 'PENDING',
    mpesaPhoneNumber: studentPhone,
    semesterId: semester.id,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  return {
    success: true,
    bookingId,
    bookingReference,
    paymentStatus: 'PENDING',
    message: 'Booking created. Please complete payment.',
    price: finalPrice,
  };
}

export async function getBooking(bookingId) {
  assertReady();
  const docRef = doc(db, COLLECTION, bookingId);
  const docSnap = await getDoc(docRef);
  if (!docSnap.exists()) {
    throw new Error(`Booking ${bookingId} not found`);
  }
  return serialize(docSnap);
}

export async function getBookingByReference(reference) {
  assertReady();
  const q = query(
    collection(db, COLLECTION),
    where('bookingReference', '==', reference),
    limit(1)
  );
  const snapshot = await getDocs(q);
  if (snapshot.empty) {
    throw new Error(`Booking with reference ${reference} not found`);
  }
  return serialize(snapshot.docs[0]);
}

export async function getBookingsByStudent(studentId) {
  assertReady();
  const q = query(
    collection(db, COLLECTION),
    where('studentId', '==', studentId),
    orderBy('createdAt', 'desc')
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map(serialize);
}

export async function getBookingsBySemester(semesterId, filters = {}) {
  assertReady();
  const constraints = [
    where('semesterId', '==', semesterId),
    orderBy('createdAt', 'desc'),
  ];

  if (filters.status) {
    constraints.splice(1, 0, where('bookingStatus', '==', filters.status));
  }

  const q = query(collection(db, COLLECTION), ...constraints);
  const snapshot = await getDocs(q);
  let bookings = snapshot.docs.map(serialize);

  if (filters.hostelId) {
    bookings = bookings.filter((b) => b.hostelId === filters.hostelId);
  }

  if (filters.search) {
    const lower = filters.search.toLowerCase();
    bookings = bookings.filter(
      (b) =>
        b.bookingReference?.toLowerCase().includes(lower) ||
        b.studentName?.toLowerCase().includes(lower)
    );
  }

  return bookings;
}

export async function getBookingStats(semesterId) {
  assertReady();
  const q = query(
    collection(db, COLLECTION),
    where('semesterId', '==', semesterId)
  );
  const snapshot = await getDocs(q);
  const bookings = snapshot.docs.map((d) => d.data());

  const total = bookings.length;
  const confirmed = bookings.filter(
    (b) => b.bookingStatus === 'CONFIRMED'
  ).length;
  const pending = bookings.filter(
    (b) => b.bookingStatus === 'PENDING_PAYMENT'
  ).length;
  const cancelled = bookings.filter(
    (b) => b.bookingStatus === 'CANCELLED'
  ).length;
  const active = confirmed;
  const totalRevenue = bookings
    .filter((b) => b.paymentStatus === 'PAID')
    .reduce((sum, b) => sum + Number(b.price || b.amount || 0), 0);

  return { total, confirmed, pending, cancelled, active, totalRevenue };
}

export async function cancelBooking(bookingId, reason) {
  assertReady();
  const bookingRef = doc(db, COLLECTION, bookingId);
  const bookingDoc = await getDoc(bookingRef);
  if (!bookingDoc.exists()) {
    throw new Error('Booking not found');
  }

  const booking = bookingDoc.data();

  if (booking.bookingStatus === 'CANCELLED') {
    throw new Error('Booking is already cancelled');
  }

  // Free the bed if it was pending or occupied by this booking
  if (booking.bedId) {
    const bedRef = doc(db, 'beds', booking.bedId);
    const bedDoc = await getDoc(bedRef);
    if (bedDoc.exists() && bedDoc.data().currentBookingId === bookingId) {
      await updateDoc(bedRef, {
        status: 'available',
        currentBookingId: null,
        updatedAt: serverTimestamp(),
      });
    }
  }

  await updateDoc(bookingRef, {
    bookingStatus: 'CANCELLED',
    paymentStatus: booking.paymentStatus === 'PAID' ? 'REFUNDED' : booking.paymentStatus,
    cancellationReason: reason || 'Cancelled by admin',
    cancelledAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  const payments = await getDocs(
    query(collection(db, 'payments'), where('bookingId', '==', bookingId))
  );
  for (const paymentDoc of payments.docs) {
    if (paymentDoc.data().status === 'PENDING') {
      await updateDoc(paymentDoc.ref, {
        status: 'CANCELLED',
        updatedAt: serverTimestamp(),
      });
    }
  }

  return { success: true, message: 'Booking cancelled successfully' };
}

export async function transferBed(bookingId, newBedId) {
  assertReady();
  const bookingRef = doc(db, COLLECTION, bookingId);
  const bookingDoc = await getDoc(bookingRef);
  if (!bookingDoc.exists()) {
    throw new Error('Booking not found');
  }
  const booking = bookingDoc.data();

  if (booking.bookingStatus !== 'CONFIRMED') {
    throw new Error('Only confirmed bookings can be transferred');
  }

  const newBedRef = doc(db, 'beds', newBedId);
  const newBedDoc = await getDoc(newBedRef);
  if (!newBedDoc.exists()) {
    throw new Error('New bed not found');
  }
  const newBed = newBedDoc.data();

  const newBedStatus = String(newBed.status || '').toUpperCase();
  if (newBedStatus !== 'AVAILABLE') {
    throw new Error('New bed is not available');
  }

  const newRoomDoc = await getDoc(doc(db, 'rooms', newBed.roomId));
  if (!newRoomDoc.exists()) {
    throw new Error('New room not found');
  }
  const newRoom = newRoomDoc.data();
  const newRoomGender = String(newRoom.gender || '').toLowerCase();
  const bookingGender = String(booking.studentGender || '').toLowerCase();
  if (newRoomGender && bookingGender && newRoomGender !== 'mixed' && newRoomGender !== bookingGender) {
    throw new Error(`New room is for ${newRoom.gender} students only`);
  }
  if (newRoom.hostelId !== booking.hostelId) {
    throw new Error('New room must be in the same hostel');
  }

  // Free old bed
  if (booking.bedId) {
    const oldBedRef = doc(db, 'beds', booking.bedId);
    await updateDoc(oldBedRef, {
      status: 'available',
      currentBookingId: null,
      updatedAt: serverTimestamp(),
    });
  }

  await updateDoc(newBedRef, {
    status: 'occupied',
    currentBookingId: bookingId,
    updatedAt: serverTimestamp(),
  });

  await updateDoc(bookingRef, {
    bedId: newBedId,
    roomId: newBed.roomId,
    transferredAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  return { success: true, message: 'Bed transferred successfully' };
}