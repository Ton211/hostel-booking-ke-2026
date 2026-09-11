/**
 * Firebase Firestore Seed Script
 *
 * Run with: node scripts/seed.js
 *
 * Prerequisites:
 * 1. Install Firebase Admin SDK: npm install firebase-admin
 * 2. Get service account key from Firebase Console:
 *    - Go to https://console.firebase.google.com
 *    - Select your project
 *    - Go to Project Settings (gear icon) > Service Accounts
 *    - Click "Generate new private key"
 *    - Save the file as scripts/serviceAccount.json
 * 3. Run: node scripts/seed.js
 *
 * This script creates:
 * - 1 Hostel (Main Hostel)
 * - 11 Rooms (Rooms 1-7 Female, Rooms 8-11 Male)
 * - 44 Beds (4 per room, alternating UP/DOWN positions)
 * - 2 Accommodation Types (School Based, Regular)
 * - 1 Semester (2026 Semester 2)
 * - 1 Settings document
 */

const admin = require('firebase-admin');
const path = require('path');
const fs = require('fs');

// ─── Configuration ──────────────────────────────────────────────────────────

const SERVICE_ACCOUNT_PATH = path.join(__dirname, 'serviceAccount.json');

if (!fs.existsSync(SERVICE_ACCOUNT_PATH)) {
  console.error('\n╔══════════════════════════════════════════════════════════════╗');
  console.error('║  ERROR: serviceAccount.json not found!                      ║');
  console.error('║                                                              ║');
  console.error('║  1. Go to Firebase Console > Project Settings               ║');
  console.error('║  2. Go to Service Accounts tab                              ║');
  console.error('║  3. Click "Generate new private key"                        ║');
  console.error('║  4. Save as: scripts/serviceAccount.json                    ║');
  console.error('╚══════════════════════════════════════════════════════════════╝\n');
  process.exit(1);
}

const serviceAccount = require(SERVICE_ACCOUNT_PATH);

// ─── Initialize Firebase Admin ──────────────────────────────────────────────

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();
db.settings({ ignoreUndefinedProperties: true });

// ─── Helper: Generate Firestore Timestamp ──────────────────────────────────

function ts(dateString) {
  return admin.firestore.Timestamp.fromDate(new Date(dateString));
}

// ─── Seed Data ─────────────────────────────────────────────────────────────

async function seedHostel() {
  const hostelRef = db.collection('hostels').doc('mainHostel');
  await hostelRef.set({
    id: 'mainHostel',
    name: 'Main Hostel',
    active: true,
    gender: null, // null = has both male and female rooms
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });
  console.log('  ✓ Created Main Hostel');
  return 'mainHostel';
}

async function seedRooms(hostelId) {
  const batch = db.batch();
  const rooms = [];

  // Rooms 1-7: Female
  for (let i = 1; i <= 7; i++) {
    const roomId = `room${i}`;
    rooms.push({ id: roomId, number: i, gender: 'FEMALE' });
    const roomRef = db.collection('rooms').doc(roomId);
    batch.set(roomRef, {
      id: roomId,
      hostelId: hostelId,
      roomNumber: i,
      gender: 'FEMALE',
      capacity: 4,
      active: true,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  }

  // Rooms 8-11: Male
  for (let i = 8; i <= 11; i++) {
    const roomId = `room${i}`;
    rooms.push({ id: roomId, number: i, gender: 'MALE' });
    const roomRef = db.collection('rooms').doc(roomId);
    batch.set(roomRef, {
      id: roomId,
      hostelId: hostelId,
      roomNumber: i,
      gender: 'MALE',
      capacity: 4,
      active: true,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  }

  await batch.commit();
  console.log(`  ✓ Created ${rooms.length} rooms (7 Female, 4 Male)`);
  return rooms;
}

async function seedBeds(rooms) {
  const bedsPerRoom = 4;
  const positions = ['DOWN', 'UP', 'DOWN', 'UP'];
  let totalBeds = 0;

  // Firestore batch limit is 500 operations, so we create batches per group
  const batchSize = 10;
  const roomChunks = [];

  for (let i = 0; i < rooms.length; i += batchSize) {
    roomChunks.push(rooms.slice(i, i + batchSize));
  }

  for (const chunk of roomChunks) {
    const batch = db.batch();

    for (const room of chunk) {
      for (let b = 1; b <= bedsPerRoom; b++) {
        const bedId = `${room.id}-bed${b}`;
        const position = positions[b - 1]; // DOWN, UP, DOWN, UP

        const bedRef = db.collection('beds').doc(bedId);
        batch.set(bedRef, {
          id: bedId,
          roomId: room.id,
          bedNumber: b,
          position: position,
          status: 'AVAILABLE',
          active: true,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        totalBeds++;
      }
    }

    await batch.commit();
  }

  console.log(`  ✓ Created ${totalBeds} beds (${bedsPerRoom} per room × ${rooms.length} rooms)`);
  console.log(`    Positions: DOWN, UP, DOWN, UP per room`);
  return totalBeds;
}

async function seedAccommodationTypes() {
  const batch = db.batch();

  const schoolBasedRef = db.collection('accommodationTypes').doc('schoolBased');
  batch.set(schoolBasedRef, {
    id: 'schoolBased',
    name: 'School Based',
    price: 4500,
    active: true,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  const regularRef = db.collection('accommodationTypes').doc('regular');
  batch.set(regularRef, {
    id: 'regular',
    name: 'Regular',
    price: 12000,
    active: true,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  await batch.commit();
  console.log('  ✓ Created 2 accommodation types (School Based: KSh 4,500, Regular: KSh 12,000)');
}

async function seedSemester() {
  const semesterRef = db.collection('semesters').doc('semester2026-2');
  await semesterRef.set({
    id: 'semester2026-2',
    name: '2026 Semester 2',
    startDate: ts('2026-09-01'),
    endDate: ts('2027-01-31'),
    bookingStartDate: ts('2026-07-01'),
    bookingEndDate: ts('2026-08-31'),
    status: 'OPEN',
    active: true,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });
  console.log('  ✓ Created semester: 2026 Semester 2 (Sep 2026 - Jan 2027)');
}

async function seedSettings() {
  const settingsRef = db.collection('settings').doc('general');
  await settingsRef.set({
    hostelName: 'Hostel Management System',
    contactPhone: '0700000000',
    contactEmail: 'admin@hostel.com',
    reservationTimeoutMinutes: 15,
    systemName: 'Hostel Booking System',
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });
  console.log('  ✓ Created general settings');
}

// ─── Main Seed Function ────────────────────────────────────────────────────

async function seed() {
  console.log('\n╔══════════════════════════════════════════════════════════════╗');
  console.log('║       HOSTEL MANAGEMENT SYSTEM - DATABASE SEED              ║');
  console.log('╚══════════════════════════════════════════════════════════════╝\n');

  try {
    console.log('📂 Seeding Hostel...');
    const hostelId = await seedHostel();

    console.log('\n📂 Seeding Rooms...');
    const rooms = await seedRooms(hostelId);

    console.log('\n📂 Seeding Beds...');
    const totalBeds = await seedBeds(rooms);

    console.log('\n📂 Seeding Accommodation Types...');
    await seedAccommodationTypes();

    console.log('\n📂 Seeding Semester...');
    await seedSemester();

    console.log('\n📂 Seeding Settings...');
    await seedSettings();

    console.log('\n╔══════════════════════════════════════════════════════════════╗');
    console.log('║                     SEED COMPLETED ✓                       ║');
    console.log('╠══════════════════════════════════════════════════════════════╣');
    console.log(`║  Hostel:        1                                          ║`);
    console.log(`║  Rooms:         11 (7 Female + 4 Male)                    ║`);
    console.log(`║  Beds:          ${String(totalBeds).padEnd(3)} (4 per room × 11 rooms)          ║`);
    console.log(`║  Acc. Types:    2 (School Based, Regular)                 ║`);
    console.log(`║  Semesters:     1 (2026 Semester 2)                       ║`);
    console.log(`║  Settings:      1 (General)                               ║`);
    console.log('╚══════════════════════════════════════════════════════════════╝\n');

  } catch (error) {
    console.error('\n❌ Seed failed:', error.message);
    console.error(error);
    process.exit(1);
  } finally {
    admin.app().delete();
  }
}

seed();
