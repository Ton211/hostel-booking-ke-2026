#!/usr/bin/env node

/**
 * Seed script using Firestore REST API with Firebase CLI token
 * Reads token from C:\Users\clint\.config\configstore\firebase-tools.json
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

const PROJECT_ID = 'hostel-booking-ke-2026';
const FIREBASE_TOKEN_PATH = path.join(
  process.env.USERPROFILE || process.env.HOME,
  '.config', 'configstore', 'firebase-tools.json'
);

// Get Firebase CLI access token
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

// Firestore REST API helper
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

// Create a document
async function createDoc(collection, docId, data) {
  const docPath = `/${collection}`;
  const body = {
    fields: {}
  };

  for (const [key, value] of Object.entries(data)) {
    if (value === null || value === undefined) {
      body.fields[key] = { nullValue: null };
    } else if (typeof value === 'string') {
      body.fields[key] = { stringValue: value };
    } else if (typeof value === 'number') {
      if (Number.isInteger(value)) {
        body.fields[key] = { integerValue: value };
      } else {
        body.fields[key] = { doubleValue: value };
      }
    } else if (typeof value === 'boolean') {
      body.fields[key] = { booleanValue: value };
    } else if (value instanceof Date) {
      body.fields[key] = { timestampValue: value.toISOString() };
    } else if (Array.isArray(value)) {
      body.fields[key] = {
        arrayValue: {
          values: value.map(v => ({ stringValue: v }))
        }
      };
    } else if (typeof value === 'object') {
      // Map object to mapValue
      const mapFields = {};
      for (const [k, v] of Object.entries(value)) {
        if (typeof v === 'string') {
          mapFields[k] = { stringValue: v };
        } else if (typeof v === 'number') {
          mapFields[k] = { integerValue: v };
        }
      }
      body.fields[key] = { mapValue: { fields: mapFields } };
    }
  }

// Use POST to create with documentId
  const url = `/${collection}?documentId=${docId}`;
  return firestoreRequest('POST', url, body);
}

// Timestamps
const now = new Date();
const oneYearLater = new Date(now);
oneYearLater.setFullYear(oneYearLater.getFullYear() + 1);
const oneWeekLater = new Date(now);
oneWeekLater.setDate(oneWeekLater.getDate() + 7);
const twoWeeksLater = new Date(now);
twoWeeksLater.setDate(twoWeeksLater.getDate() + 14);

// ==================== SEED DATA ====================

const HOSPITALITIES_HOSTEL = {
  name: 'Hospitalities',
  gender: 'MALE',
  floors: 4,
  roomsPerFloor: 3,
  totalCapacity: 44,
  description: 'Male hostel with 4 floors, 3 rooms per floor, 4 beds per room',
  isActive: true,
};

const BED_POSITIONS = ['UP', 'DOWN'];

const roomTypes = ['NORMAL', 'VIP', 'VVIP'];

// Room numbering: Floor 1 = 101-103, Floor 2 = 201-203, Floor 3 = 301-303, Floor 4 = 401-403
// Room 101, 102 = VIP (4 floors x 3 rooms = 12 rooms, 2 VIP per floor = 8 VIP, 4 normal)
// Room 103, 203, 303, 403 = VVIP (4 VVIP)
// Actually let's do: each floor has rooms X01, X02, X03
// X01 = NORMAL, X02 = VIP, X03 = VVIP per floor
const rooms = [];
const beds = [];

for (let floor = 1; floor <= 4; floor++) {
  for (let roomIdx = 1; roomIdx <= 3; roomIdx++) {
    const roomNumber = `${floor}0${roomIdx}`;
    let roomType, roomCapacity, costPerSemester;

    if (roomIdx === 1) {
      roomType = 'NORMAL';
      roomCapacity = 4;
      costPerSemester = 6500;
    } else if (roomIdx === 2) {
      roomType = 'VIP';
      roomCapacity = 4;
      costPerSemester = 8000;
    } else {
      roomType = 'VVIP';
      roomCapacity = 4;
      costPerSemester = 10000;
    }

    const roomId = `room-${roomNumber}`;
    rooms.push({
      id: roomId,
      roomNumber,
      floor,
      type: roomType,
      capacity: roomCapacity,
      costPerSemester,
      isActive: true,
      hostel: 'Hospitalities',
      hostelId: 'hosp-001',
      name: `Room ${roomNumber}`,
      gender: 'MALE',
    });

    // Create 4 beds per room
    for (let bedIdx = 1; bedIdx <= 4; bedIdx++) {
      const bedId = `bed-${roomNumber}-${bedIdx}`;
      beds.push({
        id: bedId,
        bedNumber: `Bed ${bedIdx}`,
        roomId,
        position: BED_POSITIONS[(bedIdx - 1) % 2],
        status: 'AVAILABLE',
        isActive: true,
        hostelId: 'hosp-001',
        name: `Bed ${bedIdx}`,
        floor,
        roomNumber,
        costPerSemester,
        type: roomType,
      });
    }
  }
}

const ACCOMMODATION_TYPES = [
  {
    id: 'acc-normal',
    name: 'Normal',
    description: 'Standard bed space with shared facilities',
    cost: 6500,
    features: ['Basic bedding', 'Shared bathroom', 'Wi-Fi'],
    isActive: true,
  },
  {
    id: 'acc-vip',
    name: 'VIP',
    description: 'Premium bed space with enhanced amenities',
    cost: 8000,
    features: ['Premium bedding', 'En-suite bathroom', 'Wi-Fi', 'Study desk'],
    isActive: true,
  },
  {
    id: 'acc-vvip',
    name: 'VVIP',
    description: 'Luxury bed space with top-tier facilities',
    cost: 10000,
    features: ['Luxury bedding', 'Private bathroom', 'Wi-Fi', 'Study desk', 'Mini fridge', 'AC'],
    isActive: true,
  },
];

const SEMESTER = {
  id: 'semester-2026-1',
  name: 'Semester 1 2026/2027',
  academicYear: '2026/2027',
  semesterNumber: 1,
  startDate: now.toISOString(),
  endDate: oneYearLater.toISOString(),
  bookingOpen: oneWeekLater.toISOString(),
  bookingDeadline: twoWeeksLater.toISOString(),
  isActive: true,
  status: 'OPEN',
};

const SETTINGS = [
  { id: 'general', key: 'general', value: { hostelName: 'KUCCAS Hostel System', contactEmail: 'hostel@ku.ac.ke', contactPhone: '+254700000000' } },
  { id: 'payment', key: 'payment', value: { mpesaEnabled: true, mpesaShortcode: '174379', mpesaPasskey: '' } },
  { id: 'booking', key: 'booking', value: { autoApprove: false, maxBookingDays: 7, requirePayment: true } },
  { id: 'notifications', key: 'notifications', value: { emailEnabled: false, smsEnabled: false, pushEnabled: false } },
];

// ==================== SEED FUNCTION ====================

async function seedDatabase() {
  console.log('🌱 Starting database seed...\n');

  // Step 1: Create hostel
  console.log('1️⃣  Creating hostel...');
  await createDoc('hostels', HOSPITALITIES_HOSTEL.id, {
    ...HOSPITALITIES_HOSTEL,
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
  });
  console.log('   ✅ Created hostel: Hospitalities\n');

  // Step 2: Create rooms
  console.log('2️⃣  Creating rooms...');
  for (const room of rooms) {
    const { id, ...roomData } = room;
    await createDoc('rooms', id, {
      ...roomData,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    });
    console.log(`   ✅ Room ${room.roomNumber} (${room.type})`);
  }
  console.log(`   📊 Total rooms created: ${rooms.length}\n`);

  // Step 3: Create beds
  console.log('3️⃣  Creating beds...');
  for (const bed of beds) {
    const { id, ...bedData } = bed;
    await createDoc('beds', id, {
      ...bedData,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    });
    console.log(`   ✅ Bed ${bed.bedNumber} in Room ${bed.roomNumber} (${bed.position}, ${bed.type})`);
  }
  console.log(`   📊 Total beds created: ${beds.length}\n`);

  // Step 4: Create accommodation types
  console.log('4️⃣  Creating accommodation types...');
  for (const accType of ACCOMMODATION_TYPES) {
    const { id, ...accData } = accType;
    await createDoc('accommodationTypes', id, {
      ...accData,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    });
    console.log(`   ✅ ${accType.name} - KES ${accType.cost}`);
  }
  console.log(`   📊 Total accommodation types: ${ACCOMMODATION_TYPES.length}\n`);

  // Step 5: Create semester
  console.log('5️⃣  Creating semester...');
  await createDoc('semesters', SEMESTER.id, {
    ...SEMESTER,
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
  });
  console.log(`   ✅ ${SEMESTER.name}\n`);

  // Step 6: Create settings
  console.log('6️⃣  Creating settings...');
  for (const setting of SETTINGS) {
    const { id, ...settingData } = setting;
    await createDoc('settings', id, {
      ...settingData,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    });
    console.log(`   ✅ Setting: ${setting.key}`);
  }
  console.log(`   📊 Total settings: ${SETTINGS.length}\n`);

  // Summary
  console.log('\n✅ Database seed completed!\n');
  console.log('📊 Summary:');
  console.log(`   - 1 Hostel (Hospitalities)`);
  console.log(`   - ${rooms.length} Rooms`);
  console.log(`   - ${beds.length} Beds`);
  console.log(`   - ${ACCOMMODATION_TYPES.length} Accommodation Types`);
  console.log(`   - 1 Semester (2026/2027 Sem 1)`);
  console.log(`   - ${SETTINGS.length} Settings`);
  console.log('\n⚠️  Next steps:');
  console.log('   1. Enable Firebase Authentication in console');
  console.log('   2. Upgrade to Blaze plan');
  console.log('   3. Deploy Cloud Functions');
}

seedDatabase().catch(err => {
  console.error('❌ Seed failed:', err);
  process.exit(1);
});