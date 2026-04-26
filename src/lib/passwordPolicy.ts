/**
 * Password policy + login security knobs.
 *
 * Centralised here so we can tweak strength requirements, lockout windows,
 * and rate-limit budgets in one place. All thresholds err on the strict
 * side — this is a school admin platform, not a public consumer app.
 */

export const PASSWORD_POLICY = {
  minLength: 10,
  maxLength: 128,
  requireLower: true,
  requireUpper: true,
  requireDigit: true,
  requireSymbol: true,
} as const;

export const LOGIN_POLICY = {
  /** Number of consecutive failed attempts before the account is locked. */
  lockThreshold: 5,
  /** How long the account stays locked (in minutes). */
  lockMinutes: 15,
  /** Rolling window for IP rate-limit (in minutes). */
  rateWindowMinutes: 15,
  /** Max failed attempts per (ip, username) inside the rolling window. */
  rateMaxFailures: 8,
} as const;

const SYMBOL_RE = /[^A-Za-z0-9]/;

export type PasswordCheck =
  | { ok: true }
  | { ok: false; error: string };

/**
 * Validates a candidate password against the platform policy.
 * Errors are returned in Arabic so they can be surfaced directly to the UI.
 */
export function validatePassword(password: string): PasswordCheck {
  if (typeof password !== "string") {
    return { ok: false, error: "كلمة المرور غير صالحة" };
  }
  if (password.length < PASSWORD_POLICY.minLength) {
    return {
      ok: false,
      error: `كلمة المرور يجب أن تكون ${PASSWORD_POLICY.minLength} أحرف على الأقل`,
    };
  }
  if (password.length > PASSWORD_POLICY.maxLength) {
    return { ok: false, error: "كلمة المرور طويلة جداً" };
  }
  if (PASSWORD_POLICY.requireLower && !/[a-z]/.test(password)) {
    return { ok: false, error: "أضيفي حرفاً لاتينياً صغيراً (a-z)" };
  }
  if (PASSWORD_POLICY.requireUpper && !/[A-Z]/.test(password)) {
    return { ok: false, error: "أضيفي حرفاً لاتينياً كبيراً (A-Z)" };
  }
  if (PASSWORD_POLICY.requireDigit && !/[0-9]/.test(password)) {
    return { ok: false, error: "أضيفي رقماً (0-9)" };
  }
  if (PASSWORD_POLICY.requireSymbol && !SYMBOL_RE.test(password)) {
    return { ok: false, error: "أضيفي رمزاً خاصاً (مثل ! @ # $)" };
  }
  if (/\s/.test(password)) {
    return { ok: false, error: "كلمة المرور لا يجب أن تحتوي على مسافات" };
  }
  return { ok: true };
}

/** Human-readable hint shown next to password inputs. */
export const PASSWORD_HINT = `${PASSWORD_POLICY.minLength}+ أحرف، تتضمّن حرفاً كبيراً وصغيراً ورقماً ورمزاً خاصاً`;
