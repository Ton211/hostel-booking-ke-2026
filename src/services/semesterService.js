import {
  collection,
  doc,
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../firebase/config';

const COLLECTION = 'semesters';

function serialize(docSnap) {
  return { id: docSnap.id, ...docSnap.data() };
}

export async function getAllSemesters() {
  const q = query(collection(db, COLLECTION), orderBy('startDate', 'desc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(serialize);
}

export async function getActiveSemester() {
  const q = query(
    collection(db, COLLECTION),
    where('isActive', '==', true),
    limit(1)
  );
  const snapshot = await getDocs(q);
  if (snapshot.empty) {
    return null;
  }
  return serialize(snapshot.docs[0]);
}

export async function createSemester(data) {
  const docRef = await addDoc(collection(db, COLLECTION), {
    ...data,
    isActive: true,
    isClosed: false,
    bookingOpen: data.bookingOpen ?? false,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  const docSnap = await getDoc(docRef);
  return serialize(docSnap);
}

export async function updateSemester(semesterId, data) {
  const docRef = doc(db, COLLECTION, semesterId);
  await updateDoc(docRef, {
    ...data,
    updatedAt: serverTimestamp(),
  });
  const docSnap = await getDoc(docRef);
  return serialize(docSnap);
}

export async function closeSemester(semesterId) {
  const docRef = doc(db, COLLECTION, semesterId);
  await updateDoc(docRef, {
    isClosed: true,
    isActive: false,
    closedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  const docSnap = await getDoc(docRef);
  return serialize(docSnap);
}
