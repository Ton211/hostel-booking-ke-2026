import * as functions from "firebase-functions";
import * as admin from "./admin";

export const mpesaCallback = admin.mpesaCallback;
export const setAdminRole = functions.https.onCall(admin.setAdminRole);
export const createAdminAccount = functions.https.onCall(admin.createAdminAccount);
