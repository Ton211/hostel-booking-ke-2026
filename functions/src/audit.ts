import * as functions from "firebase-functions";
import { db, FieldValue } from "./config";

export interface AuditLogData {
  action: string;
  recordType: string;
  recordId: string;
  previousValue?: Record<string, unknown> | null;
  newValue?: Record<string, unknown> | null;
  adminId?: string | null;
  adminEmail?: string | null;
  timestamp: FirebaseFirestore.FieldValue;
  ipAddress?: string | null;
}

export async function createAuditLog(
  action: string,
  recordType: string,
  recordId: string,
  previousValue?: Record<string, unknown> | null,
  newValue?: Record<string, unknown> | null,
  adminId?: string,
  adminEmail?: string,
  ipAddress?: string
): Promise<void> {
  try {
    const logData: AuditLogData = {
      action,
      recordType,
      recordId,
      previousValue: previousValue ?? null,
      newValue: newValue ?? null,
      adminId: adminId ?? null,
      adminEmail: adminEmail ?? null,
      timestamp: FieldValue.serverTimestamp(),
      ipAddress: ipAddress ?? null,
    };

    await db.collection("auditLogs").add(logData);
  } catch (error) {
    functions.logger.error("Failed to create audit log:", error);
  }
}
