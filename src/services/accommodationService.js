import {
  collection,
  doc,
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  query,
  orderBy,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../firebase/config';

const COLLECTION = 'accommodationTypes';

function serialize(docSnap) {
  return { id: docSnap.id, ...docSnap.data() };
}

export async function getAllTypes() {
  const q = query(collection(db, COLLECTION), orderBy('name', 'asc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(serialize);
}

export async function getType(typeId) {
  const docRef = doc(db, COLLECTION, typeId);
  const docSnap = await getDoc(docRef);
  if (!docSnap.exists()) {
    throw new Error(`Accommodation type ${typeId} not found`);
  }
  return serialize(docSnap);
}

export async function createType(data) {
  const docRef = await addDoc(collection(db, COLLECTION), {
    ...data,
    isActive: true,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  const docSnap = await getDoc(docRef);
  return serialize(docSnap);
}

export async function updateType(typeId, data) {
  const docRef = doc(db, COLLECTION, typeId);
  await updateDoc(docRef, {
    ...data,
    updatedAt: serverTimestamp(),
  });
  const docSnap = await getDoc(docRef);
  return serialize(docSnap);
}
