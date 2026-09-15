const FIRESTORE_API = 'https://firestore.googleapis.com/v1';

let cachedGoogleToken = null;
let googleTokenExpiresAt = 0;

function base64UrlEncode(value) {
  return btoa(value)
    .replace(/=+$/, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

async function importRsaKey(pem) {
  const pemBody = pem
    .replace(/-----BEGIN PRIVATE KEY-----/, '')
    .replace(/-----END PRIVATE KEY-----/, '')
    .replace(/\s+/g, '');

  const raw = atob(pemBody);
  const binary = Uint8Array.from(raw, (c) => c.charCodeAt(0));

  return crypto.subtle.importKey(
    'pkcs8',
    binary,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign']
  );
}

function getServiceAccount(env) {
  if (!env.FIREBASE_SERVICE_ACCOUNT) {
    throw new Error('FIREBASE_SERVICE_ACCOUNT secret is not configured');
  }
  return JSON.parse(env.FIREBASE_SERVICE_ACCOUNT);
}

async function getGoogleAccessToken(env) {
  if (cachedGoogleToken && Date.now() < googleTokenExpiresAt) {
    return cachedGoogleToken;
  }

  const sa = getServiceAccount(env);
  const key = await importRsaKey(sa.private_key);

  const iat = Math.floor(Date.now() / 1000);
  const header = { alg: 'RS256', typ: 'JWT' };
  const claims = {
    iss: sa.client_email,
    scope: 'https://www.googleapis.com/auth/datastore',
    aud: 'https://oauth2.googleapis.com/token',
    iat,
    exp: iat + 3599,
  };

  const signingInput = `${base64UrlEncode(JSON.stringify(header))}.${base64UrlEncode(JSON.stringify(claims))}`;

  const signature = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    key,
    new TextEncoder().encode(signingInput)
  );

  const jwt = `${signingInput}.${base64UrlEncode(String.fromCharCode(...new Uint8Array(signature)))}`;

  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt,
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Google OAuth failed (${response.status}): ${text}`);
  }

  const data = await response.json();
  if (!data.access_token) {
    throw new Error('No Google access token received');
  }

  cachedGoogleToken = data.access_token;
  googleTokenExpiresAt = Date.now() + (Number(data.expires_in || 3599) - 60) * 1000;

  return cachedGoogleToken;
}

function projectPath(env) {
  const sa = getServiceAccount(env);
  return `projects/${sa.project_id || env.FIREBASE_PROJECT_ID}/databases/(default)/documents`;
}

function toValue(value) {
  if (value === null || value === undefined) return { nullValue: null };
  if (typeof value === 'string') return { stringValue: value };
  if (typeof value === 'boolean') return { booleanValue: value };
  if (typeof value === 'number') {
    return Number.isInteger(value)
      ? { integerValue: String(value) }
      : { doubleValue: value };
  }
  if (value instanceof Date) return { timestampValue: value.toISOString() };
  if (Array.isArray(value)) {
    return { arrayValue: { values: value.map(toValue) } };
  }
  if (typeof value === 'object') {
    const fields = {};
    for (const [k, v] of Object.entries(value)) {
      fields[k] = toValue(v);
    }
    return { mapValue: { fields } };
  }
  throw new Error(`Unsupported Firestore value type: ${typeof value}`);
}

function fromDocument(doc) {
  if (!doc || !doc.fields) return {};
  const result = {};
  for (const [key, value] of Object.entries(doc.fields)) {
    const v = value;
    if ('stringValue' in v) result[key] = v.stringValue;
    else if ('integerValue' in v) result[key] = Number(v.integerValue);
    else if ('doubleValue' in v) result[key] = v.doubleValue;
    else if ('booleanValue' in v) result[key] = v.booleanValue;
    else if ('timestampValue' in v) result[key] = v.timestampValue;
    else if ('nullValue' in v) result[key] = null;
    else if ('arrayValue' in v) {
      result[key] = (v.arrayValue.values || []).map((item) => {
        if ('integerValue' in item) return Number(item.integerValue);
        if ('doubleValue' in item) return item.doubleValue;
        if ('stringValue' in item) return item.stringValue;
        if ('booleanValue' in item) return item.booleanValue;
        return item;
      });
    } else if ('mapValue' in v) {
      result[key] = fromDocument({ fields: v.mapValue.fields || {} });
    }
  }
  return result;
}

function docName(env, collectionId, id) {
  return `${projectPath(env)}/${collectionId}/${id}`;
}

function docIdFromName(name) {
  return name.split('/').pop();
}

export async function runQuery(env, collectionId, field, op, value, limit = 1) {
  const token = await getGoogleAccessToken(env);
  const valueField = (() => {
    if (typeof value === 'string') return { stringValue: value };
    if (typeof value === 'boolean') return { booleanValue: value };
    if (typeof value === 'number') {
      return Number.isInteger(value)
        ? { integerValue: String(value) }
        : { doubleValue: value };
    }
    return { stringValue: String(value) };
  })();

  const structuredQuery = {
    from: [{ collectionId }],
    where: {
      fieldFilter: {
        field: { fieldPath: field },
        op,
        value: valueField,
      },
    },
    limit,
  };

  const url = `${FIRESTORE_API}/${projectPath(env)}:runQuery?access_token=${encodeURIComponent(token)}`;

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ structuredQuery, searchFieldBehavior: undefined }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Firestore query failed (${response.status}): ${text}`);
  }

  const data = await response.json();
  const results = [];
  for (const result of data || []) {
    if (result.document) {
      results.push({
        id: docIdFromName(result.document.name),
        name: result.document.name,
        ...fromDocument(result.document),
        _path: result.document.name,
      });
    }
  }
  return results;
}

export async function batchCommit(env, writes) {
  const token = await getGoogleAccessToken(env);
  const url = `${FIRESTORE_API}/${projectPath(env)}:commit?access_token=${encodeURIComponent(token)}`;

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ writes }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Firestore commit failed (${response.status}): ${text}`);
  }

  return response.json();
}

export function updateWrite(env, collectionId, id, fields) {
  const name = docName(env, collectionId, id);
  const wrapped = {};
  for (const [key, value] of Object.entries(fields)) {
    wrapped[key] = toValue(value);
  }
  return {
    update: {
      name,
      fields: wrapped,
    },
  };
}