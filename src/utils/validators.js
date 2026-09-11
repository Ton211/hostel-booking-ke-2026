/**
 * Form validators for the Hostel Management System
 * Each validator returns { valid: boolean, error: string }
 */

import { validateKenyanPhone, normalizePhone } from './phone';

/**
 * Validate required field
 */
export function validateRequired(value, fieldName) {
  if (value === null || value === undefined) {
    return { valid: false, error: `${fieldName} is required` };
  }
  if (typeof value === 'string' && value.trim() === '') {
    return { valid: false, error: `${fieldName} is required` };
  }
  return { valid: true, error: '' };
}

/**
 * Validate name (at least 2 characters, letters and spaces only)
 */
export function validateName(name) {
  if (!name || name.trim() === '') {
    return { valid: false, error: 'Name is required' };
  }

  const trimmed = name.trim();

  if (trimmed.length < 2) {
    return { valid: false, error: 'Name must be at least 2 characters' };
  }

  if (trimmed.length > 100) {
    return { valid: false, error: 'Name must be less than 100 characters' };
  }

  if (!/^[a-zA-Z\s'-]+$/.test(trimmed)) {
    return { valid: false, error: 'Name can only contain letters, spaces, hyphens and apostrophes' };
  }

  return { valid: true, error: '' };
}

/**
 * Validate phone number (Kenyan format)
 */
export function validatePhone(phone) {
  if (!phone || phone.trim() === '') {
    return { valid: false, error: 'Phone number is required' };
  }

  const normalized = normalizePhone(phone);

  if (!validateKenyanPhone(phone)) {
    return { valid: false, error: 'Please enter a valid Kenyan phone number (e.g. 0712345678)' };
  }

  return { valid: true, error: '' };
}

/**
 * Validate email address
 */
export function validateEmail(email) {
  if (!email || email.trim() === '') {
    return { valid: false, error: 'Email is required' };
  }

  const trimmed = email.trim().toLowerCase();

  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

  if (!emailRegex.test(trimmed)) {
    return { valid: false, error: 'Please enter a valid email address' };
  }

  return { valid: true, error: '' };
}

/**
 * Validate booking reference format: HOST-YYYY-XXXXX
 */
export function validateBookingReference(ref) {
  if (!ref || ref.trim() === '') {
    return { valid: false, error: 'Booking reference is required' };
  }

  const trimmed = ref.trim().toUpperCase();

  const refRegex = /^HOST-\d{4}-\d{5}$/;

  if (!refRegex.test(trimmed)) {
    return { valid: false, error: 'Booking reference must be in format HOST-YYYY-XXXXX (e.g. HOST-2026-00001)' };
  }

  return { valid: true, error: '' };
}
