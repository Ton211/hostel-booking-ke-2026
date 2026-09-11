import {
  collection,
  doc,
  getDocs,
  getDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../firebase/config';

const COLLECTION = 'payments';

function serialize(docSnap) {
  return { id: docSnap.id, ...docSnap.data() };
}

export async function getPayments(filters = {}) {
  const constraints = [orderBy('createdAt', 'desc')];

  if (filters.semesterId) {
    constraints.push(where('semesterId', '==', filters.semesterId));
  }
  if (filters.status) {
    constraints.push(where('status', '==', filters.status));
  }
  if (filters.bookingId) {
    constraints.push(where('bookingId', '==', filters.bookingId));
  }

  const q = query(collection(db, COLLECTION), ...constraints);
  const snapshot = await getDocs(q);
  return snapshot.docs.map(serialize);
}

export async function getPayment(paymentId) {
  const docRef = doc(db, COLLECTION, paymentId);
  const docSnap = await getDoc(docRef);
  if (!docSnap.exists()) {
    throw new Error(`Payment ${paymentId} not found`);
  }
  return serialize(docSnap);
}

export async function getPaymentsByBooking(bookingId) {
  const q = query(
    collection(db, COLLECTION),
    where('bookingId', '==', bookingId),
    orderBy('createdAt', 'desc')
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map(serialize);
}

export async function getRevenueStats(semesterId) {
  const q = query(
    collection(db, COLLECTION),
    where('semesterId', '==', semesterId),
    where('status', '==', 'completed')
  );
  const snapshot = await getDocs(q);
  const payments = snapshot.docs.map((d) => d.data());

  const totalRevenue = payments.reduce((sum, p) => sum + (p.amount || 0), 0);
  const totalCount = payments.length;
  const methodBreakdown = payments.reduce((acc, p) => {
    const method = p.paymentMethod || 'unknown';
    acc[method] = (acc[method] || 0) + (p.amount || 0);
    return acc;
  }, {});

  const dailyRevenue = payments.reduce((acc, p) => {
    const date = p.createdAt?.toDate?.().toISOString().split('T')[0] || 'unknown';
    acc[date] = (acc[date] || 0) + (p.amount || 0);
    return acc;
  }, {});

  return { totalRevenue, totalCount, methodBreakdown, dailyRevenue };
}
