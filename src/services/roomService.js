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
  writeBatch,
} from 'firebase/firestore';
import { db } from '../firebase/config';

const COLLECTION = 'rooms';
const BEDS_COLLECTION = 'beds';

function serialize(docSnap) {
  return { id: docSnap.id, ...docSnap.data() };
}

export async function getRoomsByHostel(hostelId) {
  const q = query(
    collection(db, COLLECTION),
    where('hostelId', '==', hostelId),
    where('isActive', '==', true),
    orderBy('roomNumber', 'asc')
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map(serialize);
}

export async function getRoomsByGender(gender) {
  const q = query(
    collection(db, COLLECTION),
    where('gender', '==', String(gender).toLowerCase()),
    where('isActive', '==', true),
    orderBy('roomNumber', 'asc')
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map(serialize);
}

export async function getRoom(roomId) {
  const docRef = doc(db, COLLECTION, roomId);
  const docSnap = await getDoc(docRef);
  if (!docSnap.exists()) {
    throw new Error(`Room ${roomId} not found`);
  }
  return serialize(docSnap);
}

export async function createRoom(data) {
  const { bedCount = 0, ...roomData } = data;

  const roomRef = await addDoc(collection(db, COLLECTION), {
    ...roomData,
    bedCount: Number(bedCount),
    isActive: true,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  if (Number(bedCount) > 0) {
    const batch = writeBatch(db);
    for (let i = 1; i <= Number(bedCount); i++) {
      const bedRef = doc(collection(db, BEDS_COLLECTION));
      batch.set(bedRef, {
        roomId: roomRef.id,
        bedNumber: i,
        name: `Bed ${i}`,
        position: i % 2 === 0 ? 'UP' : 'DOWN',
        status: 'AVAILABLE',
        isActive: true,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }
    await batch.commit();
  }

  const docSnap = await getDoc(roomRef);
  return serialize(docSnap);
}

export async function updateRoom(roomId, data) {
  const docRef = doc(db, COLLECTION, roomId);
  await updateDoc(docRef, {
    ...data,
    updatedAt: serverTimestamp(),
  });
  const docSnap = await getDoc(docRef);
  return serialize(docSnap);
}

export async function deactivateRoom(roomId) {
  const docRef = doc(db, COLLECTION, roomId);
  await updateDoc(docRef, {
    isActive: false,
    deactivatedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

export async function getRoomsWithAvailability(semesterId) {
  const roomsQuery = query(
    collection(db, COLLECTION),
    where('isActive', '==', true),
    orderBy('roomNumber', 'asc')
  );
  const roomsSnapshot = await getDocs(roomsQuery);
  const rooms = roomsSnapshot.docs.map(serialize);

  const results = await Promise.all(
    rooms.map(async (room) => {
      const bedsQuery = query(
        collection(db, BEDS_COLLECTION),
        where('roomId', '==', room.id),
        where('isActive', '==', true)
      );
      const bedsSnapshot = await getDocs(bedsQuery);
      const beds = bedsSnapshot.docs.map((d) => ({ id: d.id, ...d.data() }));

      const totalBeds = beds.length;
      const availableBeds = beds.filter((b) => b.status === 'available' || b.status === 'AVAILABLE').length;
      const blockedBeds = beds.filter((b) => b.status === 'blocked' || b.status === 'BLOCKED').length;
      const occupiedBeds = totalBeds - availableBeds - blockedBeds;

      return {
        ...room,
        totalBeds,
        availableBeds,
        blockedBeds,
        occupiedBeds,
      };
    })
  );

  return results;
}

