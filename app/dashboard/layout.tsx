import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const navItems = [
    { href: "/dashboard", label: "Home", icon: "🏠" },
    { href: "/dashboard/today", label: "Today", icon: "✅" },
    { href: "/dashboard/planner", label: "Planner", icon: "🗂️" },
    { href: "/dashboard/brain-dump", label: "Brain Dump", icon: "💬" },
    { href: "/dashboard/settings", label: "Settings", icon: "⚙️" },
  ];

  return (
    <div className="min-h-screen flex flex-col">
      <main className="flex-1 px-4 pb-24 pt-6 max-w-2xl mx-auto w-full">{children}</main>
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-line">
        <div className="max-w-2xl mx-auto flex items-center justify-around py-2">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex flex-col items-center gap-1 text-[10px] font-bold text-ink-faint px-2 py-1"
            >
              <span className="text-lg">{item.icon}</span>
              {item.label}
            </Link>
          ))}
        </div>
      </nav>
    </div>
  );
}
