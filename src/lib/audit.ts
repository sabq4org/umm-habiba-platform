import { db, schema } from "@/db";
import { getCurrentSession } from "./auth";

export type AuditAction =
  | "create"
  | "update"
  | "delete"
  | "login"
  | "logout"
  | "record"
  | "publish"
  | "remove";

export type AuditEntity =
  | "user"
  | "student"
  | "teacher"
  | "admin"
  | "class"
  | "subject"
  | "schedule"
  | "attendance"
  | "assessment"
  | "grade"
  | "announcement"
  | "message"
  | "settings";

type AuditPayload = {
  action: AuditAction;
  entity: AuditEntity;
  entityId?: string | null;
  summary: string;
  metadata?: Record<string, unknown> | null;
  actor?: {
    userId?: string | null;
    label?: string | null;
  };
};

export async function logAudit(payload: AuditPayload): Promise<void> {
  let actorUserId: string | null = payload.actor?.userId ?? null;
  let actorLabel: string | null = payload.actor?.label ?? null;
  if (!actorUserId || !actorLabel) {
    const session = await getCurrentSession();
    actorUserId = actorUserId ?? session?.userId ?? null;
    actorLabel = actorLabel ?? session?.fullName ?? "النظام";
  }

  try {
    await db.insert(schema.auditLogs).values({
      actorUserId,
      actorLabel,
      action: payload.action,
      entity: payload.entity,
      entityId: payload.entityId ?? null,
      summary: payload.summary,
      metadata: payload.metadata
        ? JSON.stringify(payload.metadata).slice(0, 4000)
        : null,
    });
  } catch (error) {
    console.error("Failed to write audit log", error);
  }
}
