import axios from "axios";
import { getMpesaConfig, getMpesaBaseUrl } from "./config";
import * as functions from "firebase-functions";

export async function getAccessToken(): Promise<string> {
  const config = getMpesaConfig();
  const url = `${getMpesaBaseUrl()}/oauth/v1/generate?grant_type=client_credentials`;

  try {
    const response = await axios.get(url, {
      auth: {
        username: config.consumerKey,
        password: config.consumerSecret,
      },
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (response.data && response.data.access_token) {
      return response.data.access_token;
    }

    throw new Error("No access token received from M-Pesa API");
  } catch (error) {
    functions.logger.error("Failed to get M-Pesa access token:", error);
    throw new functions.https.HttpsError(
      "internal",
      "Failed to authenticate with M-Pesa API"
    );
  }
}

export function formatPhoneNumber(phone: string): string {
  let cleaned = phone.replace(/\D/g, "");

  if (cleaned.startsWith("+")) {
    cleaned = cleaned.substring(1);
  }

  if (cleaned.startsWith("0")) {
    cleaned = "254" + cleaned.substring(1);
  }

  if (!cleaned.startsWith("254")) {
    cleaned = "254" + cleaned;
  }

  if (cleaned.length !== 12) {
    throw new Error(`Invalid phone number format: ${phone}`);
  }

  return cleaned;
}

export function generateTimestamp(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  const hours = String(now.getHours()).padStart(2, "0");
  const minutes = String(now.getMinutes()).padStart(2, "0");
  const seconds = String(now.getSeconds()).padStart(2, "0");

  return `${year}${month}${day}${hours}${minutes}${seconds}`;
}

export function generatePassword(shortcode: string, passkey: string, timestamp: string): string {
  const dataToEncode = `${shortcode}${passkey}${timestamp}`;
  return Buffer.from(dataToEncode).toString("base64");
}

export interface STKPushRequest {
  phoneNumber: string;
  amount: number;
  accountReference: string;
  transactionDesc: string;
}

export interface STKPushResponse {
  MerchantRequestID: string;
  CheckoutRequestID: string;
  ResponseCode: string;
  ResponseDescription: string;
  CustomerMessage: string;
}

export async function initiateSTKPush(
  phoneNumber: string,
  amount: number,
  accountReference: string,
  transactionDesc: string
): Promise<STKPushResponse> {
  const config = getMpesaConfig();
  const accessToken = await getAccessToken();
  const timestamp = generateTimestamp();
  const password = generatePassword(config.shortcode, config.passkey, timestamp);
  const formattedPhone = formatPhoneNumber(phoneNumber);

  const url = `${getMpesaBaseUrl()}/mpesa/stkpush/v1/processrequest`;

  const payload = {
    BusinessShortCode: config.shortcode,
    Password: password,
    Timestamp: timestamp,
    TransactionType: "CustomerPayBillOnline",
    Amount: amount,
    PartyA: formattedPhone,
    PartyB: config.shortcode,
    PhoneNumber: formattedPhone,
    CallBackURL: config.callbackUrl,
    AccountReference: accountReference,
    TransactionDesc: transactionDesc,
  };

  try {
    const response = await axios.post(url, payload, {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
    });

    functions.logger.info("STK Push initiated:", response.data);

    if (response.data.ResponseCode !== "0") {
      functions.logger.error("STK Push failed:", response.data);
      throw new functions.https.HttpsError(
        "internal",
        `STK Push failed: ${response.data.ResponseDescription}`
      );
    }

    return response.data as STKPushResponse;
  } catch (error) {
    if (error instanceof functions.https.HttpsError) {
      throw error;
    }
    functions.logger.error("STK Push request failed:", error);
    throw new functions.https.HttpsError(
      "internal",
      "Failed to initiate M-Pesa payment"
    );
  }
}
