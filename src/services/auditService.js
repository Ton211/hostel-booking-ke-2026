import {
  collection,
  doc,
  getDocs,
  addDoc,
  query,
  where,
  orderBy,
  limit as firestoreLimit,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../firebase/config';

const COLLECTION = 'auditLogs';

function serialize(docSnap) {
  return { id: docSnap.id, ...docSnap.data() };
}

export async function getAuditLogs(filters = {}) {
  const constraints = [orderBy('createdAt', 'desc')];

  if (filters.action) {
    constraints.push(where('action', '==', filters.action));
  }
  if (filters.performedBy) {
    constraints.push(where('performedBy', '==', filters.performedBy));
  }
  if (filters.entityType) {
    constraints.push(where('entityType', '==', filters.entityType));
  }

  constraints.push(firestoreLimit(filters.limit || 100));

  const q = query(collection(db, COLLECTION), ...constraints);
  const snapshot = await getDocs(q);
  return snapshot.docs.map(serialize);
}

export async function createAuditLog(data) {
  const docRef = await addDoc(collection(db, COLLECTION), {
    action: data.action,
    entityType: data.entityType,
    entityId: data.entityId,
    entityName: data.entityName || null,
    performedBy: data.performedBy,
    performedByName: data.performedByName || null,
    details: data.details || null,
    previousValues: data.previousValues || null,
    newValues: data.newValues || null,
    ipAddress: data.ipAddress || null,
    createdAt: serverTimestamp(),
  });
  const docSnap = await getDoc(docRef);
  return serialize(docSnap);
}
