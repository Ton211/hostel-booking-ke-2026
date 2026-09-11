import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  query,
  orderBy,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../firebase/config';

const COLLECTION = 'settings';

function serialize(docSnap) {
  return { id: docSnap.id, ...docSnap.data() };
}

export async function getSetting(key) {
  const docRef = doc(db, COLLECTION, key);
  const docSnap = await getDoc(docRef);
  if (!docSnap.exists()) {
    return null;
  }
  return serialize(docSnap);
}

export async function updateSetting(key, value) {
  const docRef = doc(db, COLLECTION, key);
  await setDoc(docRef, {
    value,
    key,
    updatedAt: serverTimestamp(),
  }, { merge: true });
  const docSnap = await getDoc(docRef);
  return serialize(docSnap);
}

export async function getAllSettings() {
  const q = query(collection(db, COLLECTION), orderBy('key', 'asc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(serialize);
}
