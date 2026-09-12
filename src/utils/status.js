export function bedStatusKey(status) {
  const s = String(status || '').toUpperCase();
  const map = {
    AVAILABLE: 'available',
    BOOKED: 'occupied',
    OCCUPIED: 'occupied',
    PENDING_PAYMENT: 'pending',
    PENDING: 'pending',
    BLOCKED: 'blocked',
  };
  return map[s] || String(status || '').toLowerCase();
}

export function isBedAvailable(status) {
  return bedStatusKey(status) === 'available';
}

export function isBedOccupied(status) {
  return bedStatusKey(status) === 'occupied';
}

export function isBedBlocked(status) {
  return bedStatusKey(status) === 'blocked';
}

export function isBookingConfirmed(status) {
  const s = String(status || '').toUpperCase();
  return s === 'CONFIRMED';
}

export function isBookingPending(status) {
  const s = String(status || '').toUpperCase();
  return s === 'PENDING_PAYMENT' || s === 'PENDING';
}

export function isPaymentPaid(status) {
  return String(status || '').toUpperCase() === 'PAID';
}