"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { extractClientIp, verifySameOrigin } from "@/lib/requestSecurity";
import {
  checkInquiryRate,
  clearInquiryCookie,
  pruneOldInquiryAttempts,
  recordInquiryAttempt,
  setInquiryCookie,
} from "@/lib/inquiry";

export type InquiryFormState = {
  error?: string;
  values?: { nationalId?: string; dateOfBirth?: string };
};

const NATIONAL_ID_RE = /^[0-9]{8,15}$/;
const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export async function lookupStudentAction(
  _prevState: InquiryFormState,
  formData: FormData,
): Promise<InquiryFormState> {
  const nationalId = (formData.get("nationalId")?.toString() ?? "").trim();
  const dateOfBirth = (formData.get("dateOfBirth")?.toString() ?? "").trim();

  const headerList = await headers();
  if (!verifySameOrigin(headerList)) {
    return {
      error: "طلب غير مسموح به (Origin)",
      values: { nationalId, dateOfBirth },
    };
  }

  if (!NATIONAL_ID_RE.test(nationalId)) {
    return {
      error: "رقم الهوية يجب أن يكون أرقاما فقط (8 إلى 15 رقم)",
      values: { nationalId, dateOfBirth },
    };
  }
  if (!ISO_DATE_RE.test(dateOfBirth)) {
    return {
      error: "تاريخ الميلاد مطلوب",
      values: { nationalId, dateOfBirth },
    };
  }

  const ip = extractClientIp(headerList);
  const userAgent = headerList.get("user-agent");

  const rate = await checkInquiryRate(ip);
  if (rate.blocked) {
    const minutes = Math.max(1, Math.ceil(rate.retryAfterSeconds / 60));
    return {
      error: `محاولات استعلام كثيرة، حاولي بعد ${minutes} دقيقة`,
      values: { nationalId, dateOfBirth },
    };
  }

  const [match] = await db
    .select({
      id: schema.students.id,
      status: schema.students.status,
    })
    .from(schema.students)
    .where(
      and(
        eq(schema.students.nationalId, nationalId),
        eq(schema.students.dateOfBirth, dateOfBirth),
      ),
    )
    .limit(1);

  if (!match) {
    await recordInquiryAttempt(ip, false, userAgent, nationalId);
    return {
      error: "البيانات غير مطابقة. تأكدي من رقم الهوية وتاريخ الميلاد",
      values: { nationalId, dateOfBirth },
    };
  }

  if (match.status !== "active") {
    await recordInquiryAttempt(ip, false, userAgent, nationalId);
    return {
      error: "ملف الطالبة غير فعّال حاليا. يرجى مراجعة إدارة المدرسة",
      values: { nationalId, dateOfBirth },
    };
  }

  await recordInquiryAttempt(ip, true, userAgent, nationalId);
  pruneOldInquiryAttempts().catch(() => {});

  await setInquiryCookie(match.id);
  redirect("/inquiry/profile");
}

export async function endInquiryAction(): Promise<void> {
  await clearInquiryCookie();
  redirect("/inquiry");
}
