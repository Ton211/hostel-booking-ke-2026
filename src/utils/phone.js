/**
 * Phone number utilities for Kenyan phone numbers
 */

/**
 * Normalize Kenyan phone number to 2547XXXXXXXX format
 * Converts formats like 0712345678, +254712345678, 254712345678
 */
export function normalizePhone(phone) {
  if (!phone) return '';

  let cleaned = phone.replace(/[\s\-()]/g, '');

  // Already in international format without +
  if (/^254\d{9}$/.test(cleaned)) {
    return cleaned;
  }

  // With + prefix
  if (/^\+254\d{9}$/.test(cleaned)) {
    return cleaned.substring(1);
  }

  // Local format starting with 0
  if (/^0\d{9}$/.test(cleaned)) {
    return '254' + cleaned.substring(1);
  }

  // Without leading zero, 7XXXXXXXX
  if (/^[71]\d{8}$/.test(cleaned)) {
    return '254' + cleaned;
  }

  return cleaned;
}

/**
 * Format phone number for display: 07XX XXX XXX
 */
export function formatPhoneDisplay(phone) {
  if (!phone) return '';

  const normalized = normalizePhone(phone);

  if (normalized.length === 12 && normalized.startsWith('254')) {
    const local = normalized.substring(3);
    return `0${local.substring(0, 2)} ${local.substring(2, 5)} ${local.substring(5)}`;
  }

  return phone;
}

/**
 * Validate Kenyan phone number format
 * Returns true if the phone number is a valid Kenyan number
 */
export function validateKenyanPhone(phone) {
  if (!phone) return false;

  const normalized = normalizePhone(phone);

  // Must be 12 digits starting with 254
  if (!/^254\d{10}$/.test(normalized)) {
    return false;
  }

  // Must start with valid prefix: 701-729, 740-742, 743, 745, 746, 748, 749, 757, 758, 759, 768, 790-799, 110-111
  const localPart = normalized.substring(3);
  const validPrefixes = [
    '701', '702', '703', '704', '705', '706', '707', '708', '709',
    '710', '711', '712', '713', '714', '715', '716', '717', '718', '719',
    '720', '721', '722', '723', '724', '725', '726', '727', '728', '729',
    '740', '741', '742', '743', '745', '746', '748', '749',
    '757', '758', '759',
    '768',
    '790', '791', '792', '793', '794', '795', '796', '797', '798', '799',
    '110', '111'
  ];

  const prefix = localPart.substring(0, 3);
  return validPrefixes.includes(prefix);
}
