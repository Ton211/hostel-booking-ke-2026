#!/usr/bin/env node

/**
 * Migration: normalize live Firestore data casing to match the frontend.
 *
 * Changes applied:
 * - beds.status: AVAILABLE->available, BOOKED->occupied, PENDING_PAYMENT->pending, BLOCKED->blocked
 * - beds: add active/isActive consistency (sets both)
 * - rooms.gender: FEMALE->female, MALE->male
 * - rooms: add active/isActive consistency (sets both)
 * - semesters: add bookingOpen boolean (derived from bookingOpen/bookingStart date vs now)
 *
 * Run with: node scripts/migrate-fields.cjs
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

function firestoreRequest(method, requestPath, data) {
  const token = getAccessToken();
  return new Promise((resolve, reject) => {
    const url = new URL(`https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents${requestPath}`);

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

// Convert a Firestore Document proto to plain JS
function protoToObject(fields) {
  const obj = {};
  for (const [key, value] of Object.entries(fields || {})) {
    if ('stringValue' in value) obj[key] = value.stringValue;
    else if ('integerValue' in value) obj[key] = Number(value.integerValue);
    else if ('doubleValue' in value) obj[key] = Number(value.doubleValue);
    else if ('booleanValue' in value) obj[key] = value.booleanValue;
    else if ('nullValue' in value) obj[key] = null;
    else if ('timestampValue' in value) obj[key] = new Date(value.timestampValue);
    else if ('mapValue' in value) obj[key] = value.mapValue.fields ? protoToObject(value.mapValue.fields) : {};
    else if ('arrayValue' in value) obj[key] = (value.arrayValue.values || []).map(v => protoToObject({ x: v }).x);
  }
  return obj;
}

function buildFields(data) {
  const fields = {};
  for (const [key, value] of Object.entries(data)) {
    if (value === null || value === undefined) {
      fields[key] = { nullValue: null };
    } else if (typeof value === 'string') {
      fields[key] = { stringValue: value };
    } else if (typeof value === 'number') {
      fields[key] = Number.isInteger(value) ? { integerValue: value } : { doubleValue: value };
    } else if (typeof value === 'boolean') {
      fields[key] = { booleanValue: value };
    } else if (value instanceof Date) {
      fields[key] = { timestampValue: value.toISOString() };
    } else if (Array.isArray(value)) {
      fields[key] = { arrayValue: { values: value.map(v => ({ stringValue: String(v) })) } };
    } else if (typeof value === 'object') {
      const mapFields = {};
      for (const [k, v] of Object.entries(value)) {
        if (typeof v === 'string') mapFields[k] = { stringValue: v };
        else if (typeof v === 'number') mapFields[k] = Number.isInteger(v) ? { integerValue: v } : { doubleValue: v };
        else if (typeof v === 'boolean') mapFields[k] = { booleanValue: v };
        else if (v === null) mapFields[k] = { nullValue: null };
      }
      fields[key] = { mapValue: { fields: mapFields } };
    }
  }
  return fields;
}

// Extract the 'beds/doc-id' suffix from a canonical document path
function relativeDocPath(canonical) {
  const idx = canonical.indexOf('/documents/');
  const suffix = idx >= 0 ? canonical.slice(idx + '/documents/'.length) : canonical;
  return '/' + suffix.split('/').map(encodeURIComponent).join('/');
}

// PATCH on a doc (merge) — Firestore REST requires updateMask for partial updates
async function patchDoc(docPath, data) {
  const body = { fields: buildFields(data) };
  const masks = Object.keys(data)
    .map(k => `updateMask.fieldPaths=${encodeURIComponent(k)}`)
    .join('&');
  const requestPath = `${relativeDocPath(docPath)}?${masks}`;
  return firestoreRequest('PATCH', requestPath, body);
}

async function listAll(collectionPath) {
  const results = [];
  let pageToken = null;
  do {
    const q = pageToken
      ? `?pageSize=300&pageToken=${encodeURIComponent(pageToken)}`
      : '?pageSize=300';
    const res = await firestoreRequest('GET', `/${collectionPath}${q}`);
    for (const doc of res.documents || []) {
      results.push({ _path: doc.name, ...protoToObject(doc.fields) });
    }
    pageToken = res.nextPageToken || null;
  } while (pageToken);
  return results;
}

const BED_STATUS_MAP = {
  AVAILABLE: 'available',
  BOOKED: 'occupied',
  OCCUPIED: 'occupied',
  PENDING_PAYMENT: 'pending',
  PENDING: 'pending',
  BLOCKED: 'blocked',
};

const GENDER_MAP = {
  FEMALE: 'female',
  MALE: 'male',
  MIXED: 'mixed',
};

async function migrateBeds() {
  const beds = await listAll('beds');
  let changed = 0;
  for (const bed of beds) {
    const updates = {};
    const status = bed.status || bed.bedStatus || 'AVAILABLE';
    const target = BED_STATUS_MAP[String(status).toUpperCase()] || String(status).toLowerCase();
    if (String(bed.status || '') !== target) {
      updates.status = target;
    }
    if (bed.bedStatus !== undefined && String(bed.bedStatus || '') !== target) {
      updates.bedStatus = target;
    }
    const isActive = bed.isActive ?? bed.active ?? true;
    if (bed.isActive !== isActive) updates.isActive = isActive;
    if (bed.active !== isActive && isActive === true) updates.active = isActive;
    if (bed.isActive !== undefined && updates.active === undefined) updates.active = isActive;
    if (Object.keys(updates).length > 0) {
      await patchDoc(bed._path, updates);
      changed++;
      console.log(`  beds/${bed.id}: ${JSON.stringify(updates)}`);
    }
  }
  console.log(`beds: ${changed} updated of ${beds.length}`);
}

async function migrateRooms() {
  const rooms = await listAll('rooms');
  let changed = 0;
  for (const room of rooms) {
    const updates = {};
    const gender = room.gender;
    const target = GENDER_MAP[String(gender || '').toUpperCase()] || String(gender || '');
    if (gender !== target && target) {
      updates.gender = target;
    }
    if (room.roomGender !== undefined) {
      const roomGenderTarget = GENDER_MAP[String(room.roomGender).toUpperCase()] || room.roomGender;
      if (room.roomGender !== roomGenderTarget) updates.roomGender = roomGenderTarget;
    }
    const isActive = room.isActive ?? room.active ?? true;
    if (room.isActive !== isActive) updates.isActive = isActive;
    if (room.active !== isActive && isActive === true) updates.active = isActive;
    if (room.isActive !== undefined && updates.active === undefined) updates.active = isActive;
    if (Object.keys(updates).length > 0) {
      await patchDoc(room._path, updates);
      changed++;
      console.log(`  rooms/${room.id}: ${JSON.stringify(updates)}`);
    }
  }
  console.log(`rooms: ${changed} updated of ${rooms.length}`);
}

async function migrateSemesters() {
  const semesters = await listAll('semesters');
  let changed = 0;
  for (const sem of semesters) {
    const updates = {};
    if (typeof sem.bookingOpen !== 'boolean') {
      const raw = sem.bookingOpen ?? sem.bookingStart ?? sem.bookingStartDate;
      let isOpen = sem.status === 'OPEN';
      if (typeof raw === 'boolean') isOpen = raw;
      else if (raw instanceof Date) isOpen = raw <= new Date();
      else if (typeof raw === 'string') isOpen = new Date(raw) <= new Date();
      updates.bookingOpen = isOpen;
    }
    if (sem.isClosed === undefined) {
      updates.isClosed = false;
    }
    if (Object.keys(updates).length > 0) {
      await patchDoc(sem._path, updates);
      changed++;
      console.log(`  semesters/${sem.id}: ${JSON.stringify(updates)}`);
    }
  }
  console.log(`semesters: ${changed} updated of ${semesters.length}`);
}

async function main() {
  console.log('🚀 Starting field normalization migration...\n');
  await migrateBeds();
  await migrateRooms();
  await migrateSemesters();
  console.log('\n✅ Migration complete!');
}

main().catch(err => {
  console.error('Migration failed:', err.message);
  process.exit(1);
});