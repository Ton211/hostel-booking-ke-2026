import {
  collection,
  doc,
  setDoc,
  getDocs,
  getDoc,
  updateDoc,
  query,
  orderBy,
  serverTimestamp,
} from 'firebase/firestore';
import { app, db, firebaseReady } from '../firebase/config';

const COLLECTION = 'admins';

function serialize(docSnap) {
  return { id: docSnap.id, ...docSnap.data() };
}

function assertReady() {
  if (!firebaseReady || !app || !db) {
    throw new Error('Firebase is not configured. Please set up your Firebase credentials.');
  }
}

async function createAuthUser(email, password) {
  const apiKey = app.options.apiKey;
  const res = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email,
        password,
        returnSecureToken: false,
      }),
    }
  );
  if (!res.ok) {
    let message = `Failed to create user (HTTP ${res.status})`;
    try {
      const err = await res.json();
      if (err.error?.message) message = err.error.message;
    } catch {
      // keep default message
    }
    throw new Error(message);
  }
  return res.json();
}

export async function getAdmins() {
  assertReady();
  const q = query(collection(db, COLLECTION), orderBy('displayName', 'asc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(serialize);
}

export async function getAdmin(uid) {
  assertReady();
  const docRef = doc(db, COLLECTION, uid);
  const docSnap = await getDoc(docRef);
  if (!docSnap.exists()) {
    throw new Error(`Admin ${uid} not found`);
  }
  return serialize(docSnap);
}

export async function createAdmin(data) {
  assertReady();
  const user = await createAuthUser(data.email, data.password);
  const uid = user.localId;

  const docRef = doc(db, COLLECTION, uid);
  await setDoc(docRef, {
    uid,
    email: data.email,
    displayName: data.displayName || data.name || data.email,
    role: data.role || 'ADMIN',
    active: data.active !== undefined ? data.active : true,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  return { uid, email: data.email, displayName: data.displayName, role: data.role };
}

export async function updateAdmin(uid, data) {
  assertReady();
  const docRef = doc(db, COLLECTION, uid);
  await updateDoc(docRef, {
    ...data,
    updatedAt: serverTimestamp(),
  });
  const docSnap = await getDoc(docRef);
  return serialize(docSnap);
}

export async function setAdminRole(uid, role) {
  assertReady();
  const docRef = doc(db, COLLECTION, uid);
  await updateDoc(docRef, {
    role,
    updatedAt: serverTimestamp(),
  });
  return { uid, role };
}