import * as admin from "firebase-admin";

admin.initializeApp();

export const db = admin.firestore();
export const auth = admin.auth();
export const FieldValue = admin.firestore.FieldValue;
export const Timestamp = admin.firestore.Timestamp;

export interface MpesaConfig {
  consumerKey: string;
  consumerSecret: string;
  passkey: string;
  shortcode: string;
  callbackUrl: string;
  environment: "sandbox" | "production";
}

export function getMpesaConfig(): MpesaConfig {
  const required = [
    "MPESA_CONSUMER_KEY",
    "MPESA_CONSUMER_SECRET",
    "MPESA_PASSKEY",
    "MPESA_SHORTCODE",
    "MPESA_CALLBACK_URL",
    "MPESA_ENVIRONMENT",
  ];

  for (const key of required) {
    if (!process.env[key]) {
      throw new Error(`Missing required environment variable: ${key}`);
    }
  }

  return {
    consumerKey: process.env.MPESA_CONSUMER_KEY!,
    consumerSecret: process.env.MPESA_CONSUMER_SECRET!,
    passkey: process.env.MPESA_PASSKEY!,
    shortcode: process.env.MPESA_SHORTCODE!,
    callbackUrl: process.env.MPESA_CALLBACK_URL!,
    environment: (process.env.MPESA_ENVIRONMENT as "sandbox" | "production") || "sandbox",
  };
}

export function getMpesaBaseUrl(): string {
  const config = getMpesaConfig();
  return config.environment === "production"
    ? "https://api.safaricom.co.ke"
    : "https://sandbox.safaricom.co.ke";
}
