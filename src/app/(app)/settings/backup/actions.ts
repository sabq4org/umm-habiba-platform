"use server";

import { revalidatePath } from "next/cache";
import {
  BackupValidationError,
  importSnapshot,
  validateSnapshot,
  type Snapshot,
} from "@/lib/backup";
import { assertPermission } from "@/lib/permissions";

export type ImportFormState = {
  status: "idle" | "success" | "error";
  message?: string;
  inserted?: Record<string, number>;
  totalInserted?: number;
  preservedCurrentUser?: boolean;
};

const CONFIRMATION_PHRASE = "نعم استبدل البيانات";

export async function importBackupAction(
  _prev: ImportFormState,
  formData: FormData,
): Promise<ImportFormState> {
  let session;
  try {
    session = await assertPermission("backup.write");
  } catch (err) {
    return {
      status: "error",
      message:
        err instanceof Error ? err.message : "غير مسموح بتنفيذ هذا الإجراء",
    };
  }

  const confirmation = String(formData.get("confirmation") ?? "").trim();
  if (confirmation !== CONFIRMATION_PHRASE) {
    return {
      status: "error",
      message: `يجب كتابة الجملة التأكيدية بالضبط: ${CONFIRMATION_PHRASE}`,
    };
  }

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return {
      status: "error",
      message: "يرجى اختيار ملف نسخة احتياطية (.json)",
    };
  }
  if (file.size > 50 * 1024 * 1024) {
    return {
      status: "error",
      message: "الملف أكبر من الحد المسموح (50MB)",
    };
  }

  const text = await file.text();
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return {
      status: "error",
      message: "تعذّر قراءة الملف — تأكدي أنه ملف JSON صالح",
    };
  }

  try {
    validateSnapshot(parsed);
  } catch (err) {
    return {
      status: "error",
      message:
        err instanceof BackupValidationError
          ? err.message
          : "ملف النسخة غير صالح",
    };
  }

  try {
    const result = await importSnapshot(parsed as Snapshot, {
      preserveUsername: session.username,
    });
    revalidatePath("/", "layout");
    return {
      status: "success",
      message: "تمّت استعادة النسخة بنجاح",
      inserted: result.inserted,
      totalInserted: result.totalInserted,
      preservedCurrentUser: result.preservedCurrentUser,
    };
  } catch (err) {
    return {
      status: "error",
      message:
        err instanceof Error
          ? `فشل الاستيراد: ${err.message}`
          : "فشل الاستيراد لسبب غير معروف",
    };
  }
}
