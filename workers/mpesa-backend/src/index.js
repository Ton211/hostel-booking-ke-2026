import { initiateSTKPush, formatPhoneNumber } from './mpesa.js';
import {
  runQuery,
  batchCommit,
  updateWrite,
} from './firestore.js';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
  });
}

function error(message, status = 500) {
  return json({ error: message }, status);
}

function extractCallbackParam(item, name) {
  const entry = (item || []).find((p) => p.Name === name);
  return entry ? entry.Value : null;
}

async function findBookingByReference(env, reference) {
  const results = await runQuery(env, 'bookings', 'bookingReference', 'EQUAL', reference, 1);
  return results[0] || null;
}

async function findPaymentByBookingId(env, bookingId) {
  const results = await runQuery(env, 'payments', 'bookingId', 'EQUAL', bookingId, 1);
  return results[0] || null;
}

async function handleStkPush(env, request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return error('Invalid JSON body', 400);
  }

  const { bookingReference, phoneNumber, amount } = body;
  if (!bookingReference || !phoneNumber || !amount) {
    return error('bookingReference, phoneNumber and amount are required', 400);
  }

  let formattedPhone;
  try {
    formattedPhone = formatPhoneNumber(phoneNumber);
  } catch {
    return error('Invalid phone number format', 400);
  }

  const parsedAmount = Number(amount);
  if (!Number.isFinite(parsedAmount) || parsedAmount < 1) {
    return error('Invalid amount', 400);
  }

  const callbackUrl =
    env.MPESA_CALLBACK_URL || `${new URL(request.url).origin}/api/mpesa-callback`;

  try {
    const result = await initiateSTKPush(env, {
      phoneNumber: formattedPhone,
      amount: parsedAmount,
      accountReference: bookingReference,
      transactionDesc: `Hostel Booking - ${bookingReference}`,
      callbackUrl,
    });

    // Best-effort: persist the Daraja CheckoutRequestID for reconciliation.
    try {
      const bookings = await findBookingByReference(env, bookingReference);
      if (bookings) {
        const payment = await findPaymentByBookingId(env, bookings.id);
        const writes = [
          updateWrite(env, 'bookings', bookings.id, {
            stkCheckoutRequestID: result.CheckoutRequestID,
            stkMerchantRequestID: result.MerchantRequestID,
            stkPushStatus: result.ResponseDescription || 'PUSH_SENT',
            updatedAt: new Date().toISOString(),
          }),
        ];
        if (payment) {
          writes.push(
            updateWrite(env, 'payments', payment.id, {
              stkCheckoutRequestID: result.CheckoutRequestID,
              stkMerchantRequestID: result.MerchantRequestID,
              status: 'PENDING',
              updatedAt: new Date().toISOString(),
            })
          );
        }
        await batchCommit(env, writes);
      }
    } catch (err) {
      return json({
        success: true,
        checkoutRequestID: result.CheckoutRequestID,
        merchantRequestID: result.MerchantRequestID,
        responseDescription: result.ResponseDescription,
        customerMessage: result.CustomerMessage,
        note: 'STK push initiated, but recording the request details failed.',
      });
    }

    return json({
      success: true,
      checkoutRequestID: result.CheckoutRequestID,
      merchantRequestID: result.MerchantRequestID,
      responseDescription: result.ResponseDescription,
      customerMessage: result.CustomerMessage,
    });
  } catch (err) {
    return error(err && err.message ? err.message : 'Failed to initiate M-Pesa payment', 502);
  }
}

async function handleMpesaCallback(env, request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return json({ ResultCode: 1, ResultDesc: 'Invalid JSON' }, 400);
  }

  const stkCallback = body.Body && body.Body.stkCallback;
  if (!stkCallback) {
    return json({ ResultCode: 1, ResultDesc: 'Invalid callback data' }, 400);
  }

  const resultCode = stkCallback.ResultCode;
  const resultDesc = stkCallback.ResultDesc || 'Unknown result';
  const item = stkCallback.CallbackMetadata ? stkCallback.CallbackMetadata.Item : [];
  const accountReference = extractCallbackParam(item, 'AccountReference');

  if (!accountReference) {
    return json({ ResultCode: 1, ResultDesc: 'Missing AccountReference' }, 400);
  }

  try {
    const booking = await findBookingByReference(env, accountReference);
    if (!booking) {
      return json({ ResultCode: 0, ResultDesc: 'Callback processed' }, 200);
    }

    if (booking.paymentStatus === 'PAID' || booking.bookingStatus === 'CONFIRMED') {
      return json({ ResultCode: 0, ResultDesc: 'Already processed' }, 200);
    }

    const payment = await findPaymentByBookingId(env, booking.id);
    const writes = [];

    if (resultCode === 0) {
      const mpesaReceiptNumber = extractCallbackParam(item, 'MpesaReceiptNumber');
      const amount = extractCallbackParam(item, 'Amount');
      const phoneNumber = extractCallbackParam(item, 'PhoneNumber');

      writes.push(
        updateWrite(env, 'bookings', booking.id, {
          paymentStatus: 'PAID',
          bookingStatus: 'CONFIRMED',
          confirmedAt: new Date().toISOString(),
          mpesaReceiptNumber: mpesaReceiptNumber || null,
          callbackResultCode: resultCode,
          callbackResultDesc: resultDesc,
          updatedAt: new Date().toISOString(),
        })
      );

      if (payment) {
        writes.push(
          updateWrite(env, 'payments', payment.id, {
            status: 'PAID',
            mpesaReceiptNumber: mpesaReceiptNumber || null,
            amount: amount != null ? Number(amount) : payment.amount,
            phoneNumber: phoneNumber ? String(phoneNumber) : payment.phoneNumber,
            paidAt: new Date().toISOString(),
            callbackData: body,
            updatedAt: new Date().toISOString(),
          })
        );
      }

      if (booking.bedId) {
        writes.push(
          updateWrite(env, 'beds', booking.bedId, {
            status: 'occupied',
            currentBookingId: booking.id,
            updatedAt: new Date().toISOString(),
          })
        );
      }
    } else {
      writes.push(
        updateWrite(env, 'bookings', booking.id, {
          paymentStatus: 'FAILED',
          bookingStatus: 'FAILED',
          failureReason: resultDesc,
          callbackResultCode: resultCode,
          callbackResultDesc: resultDesc,
          updatedAt: new Date().toISOString(),
        })
      );

      if (payment) {
        writes.push(
          updateWrite(env, 'payments', payment.id, {
            status: 'FAILED',
            failureReason: resultDesc,
            callbackData: body,
            updatedAt: new Date().toISOString(),
          })
        );
      }

      if (booking.bedId) {
        writes.push(
          updateWrite(env, 'beds', booking.bedId, {
            status: 'available',
            currentBookingId: null,
            updatedAt: new Date().toISOString(),
          })
        );
      }
    }

    await batchCommit(env, writes);
    return json({ ResultCode: 0, ResultDesc: 'Callback processed successfully' }, 200);
  } catch (err) {
    return json({ ResultCode: 1, ResultDesc: err && err.message ? err.message : 'Internal server error' }, 500);
  }
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: CORS_HEADERS });
    }

    if (path === '/api/health' && request.method === 'GET') {
      return json({ status: 'ok', timestamp: new Date().toISOString() });
    }

    if (path === '/api/stkpush' && request.method === 'POST') {
      return handleStkPush(env, request);
    }

    if (path === '/api/mpesa-callback' && request.method === 'POST') {
      return handleMpesaCallback(env, request);
    }

    return error('Not found', 404);
  },
};