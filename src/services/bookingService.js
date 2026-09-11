import {
  collection,
  doc,
  getDocs,
  getDoc,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
} from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { db } from '../firebase/config';

const COLLECTION = 'bookings';
const functions = getFunctions();

function serialize(docSnap) {
  return { id: docSnap.id, ...docSnap.data() };
}

export async function createBooking(data) {
  const createBookingFn = httpsCallable(functions, 'createBooking');
  const result = await createBookingFn(data);
  return result.data;
}

export async function getBooking(bookingId) {
  const docRef = doc(db, COLLECTION, bookingId);
  const docSnap = await getDoc(docRef);
  if (!docSnap.exists()) {
    throw new Error(`Booking ${bookingId} not found`);
  }
  return serialize(docSnap);
}

export async function getBookingByReference(reference) {
  const q = query(
    collection(db, COLLECTION),
    where('reference', '==', reference),
    limit(1)
  );
  const snapshot = await getDocs(q);
  if (snapshot.empty) {
    throw new Error(`Booking with reference ${reference} not found`);
  }
  return serialize(snapshot.docs[0]);
}

export async function getBookingsByStudent(studentId) {
  const q = query(
    collection(db, COLLECTION),
    where('studentId', '==', studentId),
    orderBy('createdAt', 'desc')
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map(serialize);
}

export async function getBookingsBySemester(semesterId, filters = {}) {
  const constraints = [
    where('semesterId', '==', semesterId),
    orderBy('createdAt', 'desc'),
  ];

  if (filters.status) {
    constraints.splice(1, 0, where('status', '==', filters.status));
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
        b.reference?.toLowerCase().includes(lower) ||
        b.studentName?.toLowerCase().includes(lower)
    );
  }

  return bookings;
}

export async function getBookingStats(semesterId) {
  const q = query(
    collection(db, COLLECTION),
    where('semesterId', '==', semesterId)
  );
  const snapshot = await getDocs(q);
  const bookings = snapshot.docs.map((d) => d.data());

  const total = bookings.length;
  const confirmed = bookings.filter((b) => b.status === 'confirmed').length;
  const pending = bookings.filter((b) => b.status === 'pending').length;
  const cancelled = bookings.filter((b) => b.status === 'cancelled').length;
  const active = bookings.filter((b) => b.status === 'active').length;
  const totalRevenue = bookings
    .filter((b) => ['confirmed', 'active'].includes(b.status))
    .reduce((sum, b) => sum + (b.amount || 0), 0);

  return { total, confirmed, pending, cancelled, active, totalRevenue };
}

export async function cancelBooking(bookingId) {
  const cancelBookingFn = httpsCallable(functions, 'cancelBooking');
  const result = await cancelBookingFn({ bookingId });
  return result.data;
}

export async function transferBed(bookingId, newBedId) {
  const transferBedFn = httpsCallable(functions, 'transferBed');
  const result = await transferBedFn({ bookingId, newBedId });
  return result.data;
}
