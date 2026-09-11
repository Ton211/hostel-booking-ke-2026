import {
  collection,
  doc,
  getDocs,
  getDoc,
  updateDoc,
  query,
  orderBy,
  serverTimestamp,
} from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { app, firebaseReady } from '../firebase/config';

const COLLECTION = 'admins';

function getFunctionsInstance() {
  if (!firebaseReady || !app) {
    throw new Error('Firebase is not configured. Please set up your Firebase credentials.');
  }
  return getFunctions(app);
}

function serialize(docSnap) {
  return { id: docSnap.id, ...docSnap.data() };
}

export async function getAdmins() {
  const q = query(collection(db, COLLECTION), orderBy('displayName', 'asc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(serialize);
}

export async function getAdmin(uid) {
  const docRef = doc(db, COLLECTION, uid);
  const docSnap = await getDoc(docRef);
  if (!docSnap.exists()) {
    throw new Error(`Admin ${uid} not found`);
  }
  return serialize(docSnap);
}

export async function createAdmin(data) {
  const functions = getFunctionsInstance();
  const createAdminFn = httpsCallable(functions, 'createAdmin');
  const result = await createAdminFn(data);
  return result.data;
}

export async function updateAdmin(uid, data) {
  const docRef = doc(db, COLLECTION, uid);
  await updateDoc(docRef, {
    ...data,
    updatedAt: serverTimestamp(),
  });
  const docSnap = await getDoc(docRef);
  return serialize(docSnap);
}

export async function setAdminRole(uid, role) {
  const functions = getFunctionsInstance();
  const setAdminRoleFn = httpsCallable(functions, 'setAdminRole');
  const result = await setAdminRoleFn({ uid, role });
  return result.data;
}
