"use client";

import { useActionState, useState } from "react";
import { Download, Upload, AlertTriangle, CheckCircle2 } from "lucide-react";
import { importBackupAction, type ImportFormState } from "./actions";

const initial: ImportFormState = { status: "idle" };
const CONFIRMATION_PHRASE = "نعم استبدل البيانات";

export function BackupClient({
  exportHref,
}: {
  exportHref: string;
}) {
  const [state, action, pending] = useActionState(importBackupAction, initial);
  const [file, setFile] = useState<File | null>(null);
  const [confirmation, setConfirmation] = useState("");
  const ready =
    !!file && confirmation.trim() === CONFIRMATION_PHRASE && !pending;

  return (
    <div className="backup-grid">
      <section className="card">
        <div className="card-head">
          <h3>
            <Download
              size={18}
              style={{ marginInlineEnd: 8, verticalAlign: "-3px" }}
            />
            تصدير نسخة احتياطية
          </h3>
        </div>
        <p style={{ color: "var(--text-soft)", lineHeight: 1.8, margin: 0 }}>
          يحفظ كامل بيانات المنصة (الطالبات، المعلمات، الفصول، الجداول، الحضور،
          الدرجات، المستخدمات، الإعلانات والسجلات) في ملف JSON واحد. احفظي الملف
          في مكان آمن — يحوي بيانات حساسة بما فيها كلمات المرور المشفّرة.
        </p>
        <a
          className="button"
          href={exportHref}
          download
          style={{ marginTop: 18, textDecoration: "none" }}
        >
          <Download size={18} />
          تنزيل ملف النسخة الآن
        </a>
      </section>

      <section className="card">
        <div className="card-head">
          <h3>
            <Upload
              size={18}
              style={{ marginInlineEnd: 8, verticalAlign: "-3px" }}
            />
            استعادة من نسخة احتياطية
          </h3>
        </div>

        <div className="notice tone-rose" role="alert">
          <AlertTriangle size={18} aria-hidden />
          <div>
            <strong>تنبيه خطر:</strong> الاستعادة تستبدل
            <em> كل البيانات الحالية </em>
            بمحتوى الملف. تأكدي من أخذ نسخة احتياطية أولاً قبل المتابعة.
            حسابكِ الحالي للدخول سيُحفَظ تلقائياً ولن تتأثري بالعملية.
          </div>
        </div>

        <form action={action} className="backup-form">
          <label className="form-row" style={{ width: "100%" }}>
            <span style={{ fontWeight: 600 }}>ملف النسخة (.json)</span>
            <input
              type="file"
              name="file"
              accept="application/json,.json"
              required
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              disabled={pending}
              style={{ width: "100%" }}
            />
            {file ? (
              <small style={{ color: "var(--muted)" }}>
                {file.name} — {(file.size / 1024).toFixed(1)} KB
              </small>
            ) : null}
          </label>

          <label className="form-row" style={{ width: "100%" }}>
            <span style={{ fontWeight: 600 }}>
              للتأكيد، اكتبي:{" "}
              <strong style={{ color: "var(--text)" }}>
                {CONFIRMATION_PHRASE}
              </strong>
            </span>
            <input
              type="text"
              name="confirmation"
              value={confirmation}
              onChange={(e) => setConfirmation(e.target.value)}
              placeholder={CONFIRMATION_PHRASE}
              autoComplete="off"
              required
              disabled={pending}
              style={{ width: "100%" }}
            />
          </label>

          <button
            type="submit"
            className="button button-danger"
            disabled={!ready}
            style={{ marginTop: 8 }}
          >
            <Upload size={18} />
            {pending ? "جارٍ الاستيراد…" : "استعادة البيانات"}
          </button>
        </form>

        {state.status === "error" && state.message ? (
          <div className="notice tone-rose" style={{ marginTop: 16 }}>
            <AlertTriangle size={18} aria-hidden />
            <div>{state.message}</div>
          </div>
        ) : null}

        {state.status === "success" ? (
          <div className="notice tone-mint" style={{ marginTop: 16 }}>
            <CheckCircle2 size={18} aria-hidden />
            <div>
              <strong>{state.message}</strong>
              <ul style={{ margin: "8px 0 0", paddingInlineStart: 18 }}>
                <li>
                  إجمالي الصفوف المُستعادة:{" "}
                  <strong>{state.totalInserted ?? 0}</strong>
                </li>
                {state.preservedCurrentUser ? (
                  <li>تم الاحتفاظ بحسابكِ الحالي للدخول.</li>
                ) : null}
                {state.inserted ? (
                  <li>
                    التفصيل:{" "}
                    {Object.entries(state.inserted)
                      .filter(([, n]) => n > 0)
                      .map(([k, n]) => `${k}: ${n}`)
                      .join(" • ")}
                  </li>
                ) : null}
              </ul>
            </div>
          </div>
        ) : null}
      </section>
    </div>
  );
}
