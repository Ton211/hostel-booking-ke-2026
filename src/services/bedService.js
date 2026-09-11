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

const COLLECTION = 'beds';

function serialize(docSnap) {
  return { id: docSnap.id, ...docSnap.data() };
}

export async function getBedsByRoom(roomId) {
  const q = query(
    collection(db, COLLECTION),
    where('roomId', '==', roomId),
    where('isActive', '==', true),
    orderBy('bedNumber', 'asc')
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map(serialize);
}

export async function getBed(bedId) {
  const docRef = doc(db, COLLECTION, bedId);
  const docSnap = await getDoc(docRef);
  if (!docSnap.exists()) {
    throw new Error(`Bed ${bedId} not found`);
  }
  return serialize(docSnap);
}

export async function getAvailableBeds(roomId, semesterId) {
  const q = query(
    collection(db, COLLECTION),
    where('roomId', '==', roomId),
    where('isActive', '==', true),
    where('status', '==', 'AVAILABLE')
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map(serialize);
}

export async function updateBedStatus(bedId, status) {
  const docRef = doc(db, COLLECTION, bedId);
  await updateDoc(docRef, {
    status,
    updatedAt: serverTimestamp(),
  });
  const docSnap = await getDoc(docRef);
  return serialize(docSnap);
}

export async function createBed(data) {
  const docRef = await addDoc(collection(db, COLLECTION), {
    ...data,
    status: data.status || 'AVAILABLE',
    isActive: true,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  const docSnap = await getDoc(docRef);
  return serialize(docSnap);
}

export async function updateBed(bedId, data) {
  const docRef = doc(db, COLLECTION, bedId);
  await updateDoc(docRef, {
    ...data,
    updatedAt: serverTimestamp(),
  });
  const docSnap = await getDoc(docRef);
  return serialize(docSnap);
}

export async function blockBed(bedId) {
  const docRef = doc(db, COLLECTION, bedId);
  await updateDoc(docRef, {
    status: 'BLOCKED',
    blockedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  const docSnap = await getDoc(docRef);
  return serialize(docSnap);
}

export async function unblockBed(bedId) {
  const docRef = doc(db, COLLECTION, bedId);
  await updateDoc(docRef, {
    status: 'AVAILABLE',
    blockedAt: null,
    updatedAt: serverTimestamp(),
  });
  const docSnap = await getDoc(docRef);
  return serialize(docSnap);
}
