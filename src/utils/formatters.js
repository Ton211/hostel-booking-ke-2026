/**
 * Display formatters for the Hostel Management System
 */

/**
 * Format number as KSh currency
 * @param {number} amount
 * @returns {string} e.g. "KSh 12,000"
 */
export function formatCurrency(amount) {
  if (amount === null || amount === undefined) return 'KSh 0';
  const num = Number(amount);
  if (isNaN(num)) return 'KSh 0';
  return `KSh ${num.toLocaleString('en-KE')}`;
}

/**
 * Format date as DD/MM/YYYY
 * @param {Date|string|object} date
 * @returns {string}
 */
export function formatDate(date) {
  if (!date) return '';

  let d;
  if (date?.toDate) {
    d = date.toDate();
  } else if (date instanceof Date) {
    d = date;
  } else if (typeof date === 'string' || typeof date === 'number') {
    d = new Date(date);
  } else {
    return '';
  }

  if (isNaN(d.getTime())) return '';

  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();

  return `${day}/${month}/${year}`;
}

/**
 * Format date as DD/MM/YYYY HH:MM
 * @param {Date|string|object} date
 * @returns {string}
 */
export function formatDateTime(date) {
  if (!date) return '';

  let d;
  if (date?.toDate) {
    d = date.toDate();
  } else if (date instanceof Date) {
    d = date;
  } else if (typeof date === 'string' || typeof date === 'number') {
    d = new Date(date);
  } else {
    return '';
  }

  if (isNaN(d.getTime())) return '';

  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');

  return `${day}/${month}/${year} ${hours}:${minutes}`;
}

/**
 * Format booking reference to HOST-YYYY-XXXXX format
 * @param {string} ref
 * @returns {string}
 */
export function formatBookingReference(ref) {
  if (!ref) return '';

  // If already in correct format, return as is
  if (/^HOST-\d{4}-\d{5}$/.test(ref)) {
    return ref;
  }

  // Try to extract components
  const match = ref.match(/(\d{4})[-_]?(\d{1,5})/i);
  if (match) {
    const year = match[1];
    const num = match[2].padStart(5, '0');
    return `HOST-${year}-${num}`;
  }

  return ref;
}

/**
 * Get bed position label
 * @param {string} position - "UP" or "DOWN"
 * @returns {string} "Up" or "Down"
 */
export function getBedPositionLabel(position) {
  if (!position) return '';
  const labels = {
    UP: 'Up',
    DOWN: 'Down',
    up: 'Up',
    down: 'Down',
  };
  return labels[position] || position;
}

/**
 * Get gender label
 * @param {string} gender - "MALE" or "FEMALE"
 * @returns {string} "Male" or "Female"
 */
export function getGenderLabel(gender) {
  if (!gender) return '';
  const labels = {
    MALE: 'Male',
    FEMALE: 'Female',
    male: 'Male',
    female: 'Female',
  };
  return labels[gender] || gender;
}

/**
 * Get Tailwind color class based on status
 * @param {string} status
 * @returns {string} Tailwind class
 */
export function getStatusColor(status) {
  const colors = {
    AVAILABLE: 'text-green-600 bg-green-50',
    OCCUPIED: 'text-red-600 bg-red-50',
    RESERVED: 'text-yellow-600 bg-yellow-50',
    MAINTENANCE: 'text-gray-600 bg-gray-50',
    ACTIVE: 'text-green-600 bg-green-50',
    INACTIVE: 'text-red-600 bg-red-50',
    OPEN: 'text-green-600 bg-green-50',
    CLOSED: 'text-red-600 bg-red-50',
    PENDING: 'text-yellow-600 bg-yellow-50',
    CONFIRMED: 'text-blue-600 bg-blue-50',
    CHECKED_IN: 'text-green-600 bg-green-50',
    CHECKED_OUT: 'text-gray-600 bg-gray-50',
    CANCELLED: 'text-red-600 bg-red-50',
    EXPIRED: 'text-gray-600 bg-gray-50',
    PAID: 'text-green-600 bg-green-50',
    UNPAID: 'text-red-600 bg-red-50',
    PARTIAL: 'text-yellow-600 bg-yellow-50',
    REFUNDED: 'text-purple-600 bg-purple-50',
  };

  return colors[status] || 'text-gray-600 bg-gray-50';
}

/**
 * Get human-readable booking status
 * @param {string} status
 * @returns {string}
 */
export function getBookingStatusLabel(status) {
  const labels = {
    PENDING: 'Pending',
    CONFIRMED: 'Confirmed',
    CHECKED_IN: 'Checked In',
    CHECKED_OUT: 'Checked Out',
    CANCELLED: 'Cancelled',
    EXPIRED: 'Expired',
    RESERVED: 'Reserved',
    ACTIVE: 'Active',
  };

  return labels[status] || status || '';
}
