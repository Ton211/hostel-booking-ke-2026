#!/usr/bin/env node

/**
 * Seed script using Firestore REST API with Firebase CLI token
 * Reads token from C:\Users\clint\.config\configstore\firebase-tools.json
 *
 * Hostel layout:
 * - 11 rooms total
 * - Rooms 1-7: GIRLS (FEMALE)
 * - Rooms 8-11: BOYS (MALE)
 * - Each room has 2 double-deckers = 4 beds (Bed 1-4)
 * - Even bed numbers = UP bunk, odd bed numbers = DOWN bunk
 * - Accommodation: School Based KES 4,500 / Regular KES 12,000 (per semester)
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

const PROJECT_ID = 'hostel-booking-ke-2026';
const FIREBASE_TOKEN_PATH = path.join(
  process.env.USERPROFILE || process.env.HOME,
  '.config', 'configstore', 'firebase-tools.json'
);

function getAccessToken() {
  try {
    const config = JSON.parse(fs.readFileSync(FIREBASE_TOKEN_PATH, 'utf8'));
    const tokens = config.tokens;
    if (tokens && tokens.access_token) {
      return tokens.access_token;
    }
  } catch (e) {
    console.error('Failed to read Firebase CLI token:', e.message);
  }
  return null;
}

function firestoreRequest(method, path, data) {
  const token = getAccessToken();
  return new Promise((resolve, reject) => {
    const url = new URL(`https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents${path}`);

    const options = {
      hostname: url.hostname,
      path: url.pathname + url.search,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      }
    };

    const req = https.request(options, (res) => {
      let responseData = '';
      res.on('data', chunk => { responseData += chunk; });
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          try {
            resolve(JSON.parse(responseData));
          } catch (e) {
            resolve(responseData);
          }
        } else {
          reject(new Error(`HTTP ${res.statusCode}: ${responseData}`));
        }
      });
    });

    req.on('error', reject);
    if (data) {
      req.write(JSON.stringify(data));
    }
    req.end();
  });
}

function createDoc(collection, docId, data) {
  const body = { fields: {} };

  for (const [key, value] of Object.entries(data)) {
    if (value === null || value === undefined) {
      body.fields[key] = { nullValue: null };
    } else if (typeof value === 'string') {
      body.fields[key] = { stringValue: value };
    } else if (typeof value === 'number') {
      body.fields[key] = Number.isInteger(value) ? { integerValue: value } : { doubleValue: value };
    } else if (typeof value === 'boolean') {
      body.fields[key] = { booleanValue: value };
    } else if (value instanceof Date) {
      body.fields[key] = { timestampValue: value.toISOString() };
    } else if (Array.isArray(value)) {
      body.fields[key] = { arrayValue: { values: value.map(v => ({ stringValue: v })) } };
    } else if (typeof value === 'object') {
      const mapFields = {};
      for (const [k, v] of Object.entries(value)) {
        if (typeof v === 'string') mapFields[k] = { stringValue: v };
        else if (typeof v === 'number') mapFields[k] = { integerValue: v };
        else if (typeof v === 'boolean') mapFields[k] = { booleanValue: v };
      }
      body.fields[key] = { mapValue: { fields: mapFields } };
    }
  }

  const url = `/${collection}?documentId=${docId}`;
  return firestoreRequest('POST', url, body);
}

// Delete every document in a collection
async function deleteCollection(collection) {
  const url = `/${collection}`;
  const resp = await firestoreRequest('GET', url);
  const docs = resp.documents || [];
  const ids = docs.map((d) => d.name.split('/').pop());
  if (ids.length === 0) return;
  const deleteUrl = `:commit`;
  const body = {
    writes: ids.map((id) => ({
      delete: `projects/${PROJECT_ID}/databases/(default)/documents/${collection}/${id}`
    }))
  };
  await firestoreRequest('POST', deleteUrl, body);
  console.log(`   Deleted ${ids.length} docs from ${collection}`);
}

const now = new Date();
const semStart = new Date('2026-09-01T00:00:00Z');
const semEnd = new Date('2026-12-20T00:00:00Z');
const oneWeekLater = new Date(now);
oneWeekLater.setDate(oneWeekLater.getDate() + 7);
const twoWeeksLater = new Date(now);
twoWeeksLater.setDate(twoWeeksLater.getDate() + 14);

// ==================== SEED DATA ====================

const HOSTELS = [
  {
    id: 'hosp-main',
    name: 'Hostel',
    gender: 'MIXED',
    floors: 1,
    totalCapacity: 44,
    description: 'Main hostel: Rooms 1-7 (Girls), Rooms 8-11 (Boys). 4 beds per room.',
    isActive: true,
  },
];

const ACCOMMODATION_TYPES = [
  {
    id: 'acc-school-based',
    name: 'School Based',
    description: 'School-sponsored student rate (per semester)',
    cost: 4500,
    paymentPerSemester: true,
    features: ['Bed space for one semester', 'School-sponsored pricing'],
    isActive: true,
  },
  {
    id: 'acc-regular',
    name: 'Regular',
    description: 'Regular student rate (per semester)',
    cost: 12000,
    paymentPerSemester: true,
    features: ['Bed space for one semester', 'Regular private pricing'],
    isActive: true,
  },
];

const SEMESTER = {
  id: 'semester-2026-1',
  name: 'Semester 1 2026/2027',
  academicYear: '2026/2027',
  semesterNumber: 1,
  startDate: semStart.toISOString(),
  endDate: semEnd.toISOString(),
  bookingOpen: oneWeekLater.toISOString(),
  bookingDeadline: twoWeeksLater.toISOString(),
  isActive: true,
  status: 'OPEN',
};

const SETTINGS = [
  { id: 'general', key: 'general', value: { hostelName: 'Hostel Management System', contactEmail: 'hostel@example.com', contactPhone: '+254700000000' } },
  { id: 'payment', key: 'payment', value: { mpesaEnabled: true, mpesaShortcode: '174379', mpesaPasskey: '' } },
  { id: 'booking', key: 'booking', value: { autoApprove: false, maxBookingDays: 7, requirePayment: true } },
  { id: 'notifications', key: 'notifications', value: { emailEnabled: false, smsEnabled: false, pushEnabled: false } },
];

// ==================== BUILD ROOMS & BEDS ====================

const rooms = [];
const beds = [];

// Rooms 1-7: GIRLS, Rooms 8-11: BOYS
for (let roomNum = 1; roomNum <= 11; roomNum++) {
  const gender = roomNum <= 7 ? 'FEMALE' : 'MALE';

  const roomId = `room-${roomNum}`;
  rooms.push({
    id: roomId,
    name: `Room ${roomNum}`,
    roomNumber: roomNum,
    gender,
    type: 'NORMAL',
    capacity: 4,
    costPerSemester: 4500,
    hostel: 'Hostel',
    hostelId: 'hosp-main',
    isActive: true,
    floor: 1,
  });

  // 4 beds per room (2 double-deckers)
  // Even number beds = UP bunk, odd number beds = DOWN bunk
  for (let bedNum = 1; bedNum <= 4; bedNum++) {
    const position = bedNum % 2 === 0 ? 'UP' : 'DOWN';

    const bedId = `bed-${roomId}-${bedNum}`;
    beds.push({
      id: bedId,
      bedNumber: bedNum,
      name: `Bed ${bedNum}`,
      roomId,
      roomName: `Room ${roomNum}`,
      position,
      status: 'AVAILABLE',
      isActive: true,
      hostelId: 'hosp-main',
      floor: 1,
      gender,
      costPerSemester: 4500,
    });
  }
}

// ==================== SEED FUNCTION ====================

async function seedDatabase() {
  console.log('🌱 Starting database seed (fresh)...');

  console.log('\n1️⃣  Clearing existing data...');
  await deleteCollection('hostels');
  await deleteCollection('rooms');
  await deleteCollection('beds');
  await deleteCollection('accommodationTypes');
  await deleteCollection('semesters');
  await deleteCollection('settings');
  await deleteCollection('bookings');
  await deleteCollection('payments');
  await deleteCollection('students');

  console.log('\n2️⃣  Creating hostel...');
  for (const h of HOSTELS) {
    const { id, ...data } = h;
    await createDoc('hostels', id, { ...data, createdAt: now.toISOString(), updatedAt: now.toISOString() });
    console.log(`   ✅ Created hostel: ${h.name} (${h.gender})`);
  }

  console.log('\n3️⃣  Creating rooms...');
  for (const room of rooms) {
    const { id, ...data } = room;
    await createDoc('rooms', id, { ...data, createdAt: now.toISOString(), updatedAt: now.toISOString() });
    console.log(`   ✅ ${room.name} (${room.gender})`);
  }
  console.log(`   📊 Total rooms: ${rooms.length} (1-7 Girls, 8-11 Boys)`);

  console.log('\n4️⃣  Creating beds...');
  for (const bed of beds) {
    const { id, ...data } = bed;
    await createDoc('beds', id, { ...data, createdAt: now.toISOString(), updatedAt: now.toISOString() });
  }
  console.log(`   ✅ Total beds: ${beds.length} (even=UP, odd=DOWN) per room`);

  console.log('\n5️⃣  Creating accommodation types...');
  for (const acc of ACCOMMODATION_TYPES) {
    const { id, ...data } = acc;
    await createDoc('accommodationTypes', id, { ...data, createdAt: now.toISOString(), updatedAt: now.toISOString() });
    console.log(`   ✅ ${acc.name} - KES ${acc.cost}`);
  }

  console.log('\n6️⃣  Creating semester...');
  await createDoc('semesters', SEMESTER.id, {
    ...SEMESTER,
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
  });
  console.log(`   ✅ ${SEMESTER.name}`);

  console.log('\n7️⃣  Creating settings...');
  for (const setting of SETTINGS) {
    const { id, ...data } = setting;
    await createDoc('settings', id, { ...data, createdAt: now.toISOString(), updatedAt: now.toISOString() });
  }
  console.log(`   ✅ ${SETTINGS.length} settings`);

  console.log('\n✅ Database seed completed!\n');
  console.log('📊 Summary:');
  console.log(`   - 1 Hostel`);
  console.log(`   - ${rooms.length} Rooms (1-7 Girls, 8-11 Boys)`);
  console.log(`   - ${beds.length} Beds (4 per room, 2 double-deckers)`);
  console.log(`   - School Based KES 4,500 / Regular KES 12,000`);
  console.log(`   - 1 Semester (2026/2027 Sem 1)`);
  console.log(`   - 4 Settings`);
}

seedDatabase().catch(err => {
  console.error('❌ Seed failed:', err.message || err);
  process.exit(1);
});