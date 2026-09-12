import * as functions from "firebase-functions";
import * as admin from "./admin";
import * as bookings from "./bookings";

export const mpesaCallback = admin.mpesaCallback;
export const setAdminRole = functions.https.onCall(admin.setAdminRole);
export const createAdmin = functions.https.onCall(admin.createAdminAccount);

export const createBooking = bookings.createBooking;
export const cancelBooking = bookings.cancelBooking;
export const transferBed = bookings.transferBed;
export const getBookingStats = bookings.getBookingStats;
export const expirePendingBookings = bookings.expirePendingBookings;
