import {
  collection,
  getDocs,
  query,
  where,
} from 'firebase/firestore';
import { db } from '../firebase/config';

function serialize(docSnap) {
  return { id: docSnap.id, ...docSnap.data() };
}

export async function getDashboardStats(semesterId) {
  const [roomsSnapshot, bedsSnapshot, bookingsSnapshot, paymentsSnapshot] =
    await Promise.all([
      getDocs(
        query(collection(db, 'rooms'), where('isActive', '==', true))
      ),
      getDocs(
        query(collection(db, 'beds'), where('isActive', '==', true))
      ),
      getDocs(
        query(
          collection(db, 'bookings'),
          where('semesterId', '==', semesterId)
        )
      ),
      getDocs(
        query(
          collection(db, 'payments'),
          where('semesterId', '==', semesterId),
          where('status', '==', 'completed')
        )
      ),
    ]);

  const rooms = roomsSnapshot.docs.map((d) => d.data());
  const beds = bedsSnapshot.docs.map((d) => d.data());
  const bookings = bookingsSnapshot.docs.map((d) => d.data());
  const payments = paymentsSnapshot.docs.map((d) => d.data());

  const totalRooms = rooms.length;
  const totalBeds = beds.length;
  const availableBeds = beds.filter((b) => b.status === 'available').length;
  const occupiedBeds = beds.filter((b) => b.status === 'occupied').length;
  const blockedBeds = beds.filter((b) => b.status === 'blocked').length;

  const totalBookings = bookings.length;
  const confirmedBookings = bookings.filter(
    (b) => b.status === 'confirmed'
  ).length;
  const pendingBookings = bookings.filter(
    (b) => b.status === 'pending'
  ).length;

  const totalRevenue = payments.reduce((sum, p) => sum + (p.amount || 0), 0);

  const occupancyRate =
    totalBeds > 0 ? ((occupiedBeds / totalBeds) * 100).toFixed(1) : 0;

  return {
    totalRooms,
    totalBeds,
    availableBeds,
    occupiedBeds,
    blockedBeds,
    occupancyRate: Number(occupancyRate),
    totalBookings,
    confirmedBookings,
    pendingBookings,
    totalRevenue,
  };
}

export async function getOccupancyStats(semesterId) {
  const [bedsSnapshot, roomsSnapshot] = await Promise.all([
    getDocs(query(collection(db, 'beds'), where('isActive', '==', true))),
    getDocs(query(collection(db, 'rooms'), where('isActive', '==', true))),
  ]);

  const beds = bedsSnapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
  const rooms = roomsSnapshot.docs.map((d) => ({ id: d.id, ...d.data() }));

  const hostelStats = {};

  for (const room of rooms) {
    if (!hostelStats[room.hostelId]) {
      hostelStats[room.hostelId] = {
        hostelId: room.hostelId,
        hostelName: room.hostelName || room.hostelId,
        totalBeds: 0,
        availableBeds: 0,
        occupiedBeds: 0,
        blockedBeds: 0,
      };
    }

    const roomBeds = beds.filter((b) => b.roomId === room.id);
    hostelStats[room.hostelId].totalBeds += roomBeds.length;
    hostelStats[room.hostelId].availableBeds += roomBeds.filter(
      (b) => b.status === 'available'
    ).length;
    hostelStats[room.hostelId].occupiedBeds += roomBeds.filter(
      (b) => b.status === 'occupied'
    ).length;
    hostelStats[room.hostelId].blockedBeds += roomBeds.filter(
      (b) => b.status === 'blocked'
    ).length;
  }

  const stats = Object.values(hostelStats).map((s) => ({
    ...s,
    occupancyRate:
      s.totalBeds > 0
        ? Number(((s.occupiedBeds / s.totalBeds) * 100).toFixed(1))
        : 0,
  }));

  const totalBeds = beds.length;
  const occupiedBeds = beds.filter((b) => b.status === 'occupied').length;

  return {
    overall: {
      totalBeds,
      occupiedBeds,
      availableBeds: beds.filter((b) => b.status === 'available').length,
      blockedBeds: beds.filter((b) => b.status === 'blocked').length,
      occupancyRate:
        totalBeds > 0
          ? Number(((occupiedBeds / totalBeds) * 100).toFixed(1))
          : 0,
    },
    byHostel: stats,
  };
}

export async function getRevenueStats(semesterId) {
  const paymentsSnapshot = await getDocs(
    query(
      collection(db, 'payments'),
      where('semesterId', '==', semesterId),
      where('status', '==', 'completed')
    )
  );

  const payments = paymentsSnapshot.docs.map((d) => d.data());

  const totalRevenue = payments.reduce((sum, p) => sum + (p.amount || 0), 0);
  const totalCount = payments.length;

  const methodBreakdown = payments.reduce((acc, p) => {
    const method = p.paymentMethod || 'unknown';
    acc[method] = (acc[method] || 0) + (p.amount || 0);
    return acc;
  }, {});

  const monthlyRevenue = payments.reduce((acc, p) => {
    const date = p.createdAt?.toDate?.();
    const month = date
      ? `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
      : 'unknown';
    acc[month] = (acc[month] || 0) + (p.amount || 0);
    return acc;
  }, {});

  return {
    totalRevenue,
    totalCount,
    methodBreakdown,
    monthlyRevenue,
  };
}
