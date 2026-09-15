const MPESA_BASE_URLS = {
  sandbox: 'https://sandbox.safaricom.co.ke',
  production: 'https://api.safaricom.co.ke',
};

export function formatPhoneNumber(phone) {
  let cleaned = String(phone).replace(/\D/g, '');

  if (cleaned.startsWith('0')) {
    cleaned = '254' + cleaned.substring(1);
  }

  if (!cleaned.startsWith('254')) {
    cleaned = '254' + cleaned;
  }

  if (cleaned.length !== 12) {
    throw new Error(`Invalid phone number format: ${phone}`);
  }

  return cleaned;
}

export function generateTimestamp() {
  const now = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return (
    `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}` +
    `${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`
  );
}

export function generatePassword(shortcode, passkey, timestamp) {
  const dataToEncode = `${shortcode}${passkey}${timestamp}`;
  return btoa(dataToEncode);
}

let cachedToken = null;
let tokenExpiresAt = 0;

export async function getAccessToken(env) {
  if (cachedToken && Date.now() < tokenExpiresAt) {
    return cachedToken;
  }

  const url = `${MPESA_BASE_URLS[env.MPESA_ENVIRONMENT || 'sandbox']}/oauth/v1/generate?grant_type=client_credentials`;

  const headers = new Headers();
  headers.set(
    'Authorization',
    'Basic ' + btoa(`${env.MPESA_CONSUMER_KEY}:${env.MPESA_CONSUMER_SECRET}`)
  );

  const response = await fetch(url, { method: 'GET', headers });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Daraja OAuth failed (${response.status}): ${text}`);
  }

  const data = await response.json();
  if (!data.access_token) {
    throw new Error('No access token received from Daraja API');
  }

  cachedToken = data.access_token;
  tokenExpiresAt = Date.now() + (Number(data.expires_in || 3599) - 60) * 1000;

  return cachedToken;
}

export async function initiateSTKPush(env, { phoneNumber, amount, accountReference, transactionDesc, callbackUrl }) {
  const shortcode = env.MPESA_SHORTCODE;
  const accessToken = await getAccessToken(env);
  const timestamp = generateTimestamp();
  const password = generatePassword(shortcode, env.MPESA_PASSKEY, timestamp);
  const formattedPhone = formatPhoneNumber(phoneNumber);

  const url = `${MPESA_BASE_URLS[env.MPESA_ENVIRONMENT || 'sandbox']}/mpesa/stkpush/v1/processrequest`;

  const payload = {
    BusinessShortCode: shortcode,
    Password: password,
    Timestamp: timestamp,
    TransactionType: 'CustomerPayBillOnline',
    Amount: amount,
    PartyA: formattedPhone,
    PartyB: shortcode,
    PhoneNumber: formattedPhone,
    CallBackURL: callbackUrl,
    AccountReference: accountReference,
    TransactionDesc: transactionDesc,
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(payload),
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok || (data.ResponseCode && data.ResponseCode !== '0')) {
    throw new Error(
      `STK Push failed: ${data.ResponseDescription || data.errorMessage || response.status}`
    );
  }

  return data;
}