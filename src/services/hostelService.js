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

const COLLECTION = 'hostels';

function serialize(docSnap) {
  return { id: docSnap.id, ...docSnap.data() };
}

export async function getAllHostels() {
  const q = query(
    collection(db, COLLECTION),
    where('isActive', '==', true),
    orderBy('name', 'asc')
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map(serialize);
}

export async function getHostel(hostelId) {
  const docRef = doc(db, COLLECTION, hostelId);
  const docSnap = await getDoc(docRef);
  if (!docSnap.exists()) {
    throw new Error(`Hostel ${hostelId} not found`);
  }
  return serialize(docSnap);
}

export async function createHostel(data) {
  const docRef = await addDoc(collection(db, COLLECTION), {
    ...data,
    isActive: true,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  const docSnap = await getDoc(docRef);
  return serialize(docSnap);
}

export async function updateHostel(hostelId, data) {
  const docRef = doc(db, COLLECTION, hostelId);
  await updateDoc(docRef, {
    ...data,
    updatedAt: serverTimestamp(),
  });
  const docSnap = await getDoc(docRef);
  return serialize(docSnap);
}

export async function deleteHostel(hostelId) {
  const docRef = doc(db, COLLECTION, hostelId);
  await updateDoc(docRef, {
    isActive: false,
    deletedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}
