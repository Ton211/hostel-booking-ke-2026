import {
  collection,
  doc,
  getDoc,
  updateDoc,
  addDoc,
  query,
  where,
  orderBy,
  limit,
  getDocs,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../firebase/config';

const COLLECTION = 'students';

function serialize(docSnap) {
  return { id: docSnap.id, ...docSnap.data() };
}

export async function getStudent(studentId) {
  const docRef = doc(db, COLLECTION, studentId);
  const docSnap = await getDoc(docRef);
  if (!docSnap.exists()) {
    throw new Error(`Student ${studentId} not found`);
  }
  return serialize(docSnap);
}

export async function findOrCreateStudent(studentData) {
  const { phone, email } = studentData;

  let existingQuery;
  if (phone) {
    existingQuery = query(
      collection(db, COLLECTION),
      where('phone', '==', phone),
      limit(1)
    );
  } else if (email) {
    existingQuery = query(
      collection(db, COLLECTION),
      where('email', '==', email),
      limit(1)
    );
  }

  if (existingQuery) {
    const snapshot = await getDocs(existingQuery);
    if (!snapshot.empty) {
      const existingDoc = snapshot.docs[0];
      await updateDoc(existingDoc.ref, {
        ...studentData,
        updatedAt: serverTimestamp(),
      });
      const updated = await getDoc(existingDoc.ref);
      return serialize(updated);
    }
  }

  const docRef = await addDoc(collection(db, COLLECTION), {
    ...studentData,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  const docSnap = await getDoc(docRef);
  return serialize(docSnap);
}

export async function updateStudent(studentId, data) {
  const docRef = doc(db, COLLECTION, studentId);
  await updateDoc(docRef, {
    ...data,
    updatedAt: serverTimestamp(),
  });
  const docSnap = await getDoc(docRef);
  return serialize(docSnap);
}

export async function searchStudents(queryText, filters = {}) {
  const q = query(collection(db, COLLECTION), orderBy('fullName', 'asc'), limit(20));
  const snapshot = await getDocs(q);
  const lowerQuery = queryText.toLowerCase();

  return snapshot.docs
    .map(serialize)
    .filter((student) => {
      const matchesText =
        !queryText ||
        student.fullName?.toLowerCase().includes(lowerQuery) ||
        student.phone?.includes(lowerQuery) ||
        student.email?.toLowerCase().includes(lowerQuery) ||
        student.registrationNumber?.toLowerCase().includes(lowerQuery);

      const matchesGender = !filters.gender || student.gender === filters.gender;

      return matchesText && matchesGender;
    });
}

export async function getStudentsByBooking(semesterId) {
  const bookingsQuery = query(
    collection(db, 'bookings'),
    where('semesterId', '==', semesterId),
    where('status', 'in', ['confirmed', 'active'])
  );
  const bookingsSnapshot = await getDocs(bookingsQuery);
  const studentIds = [...new Set(bookingsSnapshot.docs.map((d) => d.data().studentId))];

  if (studentIds.length === 0) return [];

  const students = await Promise.all(
    studentIds.map(async (id) => {
      try {
        return await getStudent(id);
      } catch {
        return null;
      }
    })
  );

  return students.filter(Boolean);
}
