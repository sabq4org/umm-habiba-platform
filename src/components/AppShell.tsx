import { KeyRound, LogOut, Menu, Search, X } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { Sidebar } from "./Sidebar";
import { MobileMenuController } from "./MobileMenuController";
import { ThemeToggle } from "./ThemeToggle";
import { requireFreshUser } from "@/lib/auth";
import { roleLabel } from "@/lib/roles";
import { signOutAction } from "@/app/(auth)/actions";

const MOBILE_MENU_ID = "umh-mobile-menu";

export async function AppShell({ children }: { children: ReactNode }) {
  const session = await requireFreshUser();
  if (session.mustChangePassword) {
    redirect("/change-password?required=1");
  }
  const initials = session.fullName
    .split(/\s+/)
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("");

  return (
    <>
      <MobileMenuController id={MOBILE_MENU_ID} />
      <input
        type="checkbox"
        id={MOBILE_MENU_ID}
        className="mobile-menu-toggle"
        aria-hidden
        defaultChecked={false}
      />
      <div className="app-shell">
        <aside className="sidebar" aria-label="القائمة الجانبية">
          <label
            htmlFor={MOBILE_MENU_ID}
            className="sidebar-close"
            aria-label="إغلاق القائمة"
          >
            <X size={18} strokeWidth={2} />
          </label>

          <div className="brand">
            <div className="brand-mark">أ.ح</div>
            <div>
              <h1>منصة أم حبيبة التعليمية</h1>
              <p>متوسطة أم حبيبة التعليمية - صبيا</p>
            </div>
          </div>

          <Sidebar role={session.role} />

          <div className="user-card">
            <div className="user-avatar">{initials || "م"}</div>
            <div className="user-meta">
              <span className="user-name">{session.fullName}</span>
              <span className="user-role">{roleLabel(session.role)}</span>
            </div>
          </div>
        </aside>

        <main className="main">
          <div className="top-bar">
            <label
              htmlFor={MOBILE_MENU_ID}
              className="hamburger-btn"
              aria-label="فتح القائمة"
              role="button"
              tabIndex={0}
            >
              <Menu size={18} strokeWidth={2} />
            </label>

            <form action="/search" method="get" className="top-bar-search">
              <Search size={16} strokeWidth={1.8} />
              <input
                name="q"
                type="search"
                placeholder="ابحثي عن طالبة، معلمة، فصل، أو مادة..."
                autoComplete="off"
              />
              <button type="submit">بحث</button>
            </form>

            <div className="top-bar-user">
              <div className="top-bar-identity">
                <div className="user-avatar small">{initials || "م"}</div>
                <div className="user-meta">
                  <span className="user-name">أهلاً، {session.fullName}</span>
                  <span className="user-role">{roleLabel(session.role)}</span>
                </div>
              </div>

              <div className="top-bar-actions">
                <ThemeToggle />
                <Link
                  href="/change-password"
                  className="ghost-button top-bar-action"
                  title="تغيير كلمة المرور"
                >
                  <KeyRound size={14} strokeWidth={1.8} />
                  <span>تغيير كلمة المرور</span>
                </Link>
                <form action={signOutAction}>
                  <button
                    type="submit"
                    className="signout-button"
                    title="تسجيل الخروج"
                  >
                    <LogOut size={14} strokeWidth={1.8} />
                    <span>تسجيل الخروج</span>
                  </button>
                </form>
              </div>
            </div>
          </div>
          {children}
        </main>
      </div>
      <label
        htmlFor={MOBILE_MENU_ID}
        className="sidebar-backdrop"
        aria-label="إغلاق القائمة"
      />
    </>
  );
}
