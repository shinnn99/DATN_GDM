import { NavLink, Outlet } from "react-router-dom";
import { Activity } from "lucide-react";
import { cn } from "@/lib/utils";

const NAV = [
  { to: "/", label: "Trang chủ", end: true },
  { to: "/predict", label: "Dự đoán" },
  { to: "/shap", label: "Giải thích SHAP" },
  { to: "/what-if", label: "What-If" },
  { to: "/history", label: "Lịch sử" },
];

export function Layout() {
  return (
    <div className="flex h-full flex-col">
      <header className="sticky top-0 z-30 border-b border-border/60 bg-background/80 backdrop-blur-md">
        <div className="container flex h-14 items-center justify-between gap-4">
          <NavLink to="/" className="flex items-center gap-2 font-semibold">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-primary text-primary-foreground shadow-sm">
              <Activity className="h-4 w-4" />
            </span>
            <span className="text-[15px] tracking-tight">GDM Diagnosis</span>
          </NavLink>
          <nav className="flex items-center gap-0.5 rounded-full border border-border/70 bg-card/70 p-1 text-[13px] shadow-sm">
            {NAV.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  cn(
                    "rounded-full px-3.5 py-1.5 text-muted-foreground transition-colors hover:text-foreground",
                    isActive &&
                      "bg-primary text-primary-foreground shadow-sm hover:text-primary-foreground",
                  )
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
        </div>
      </header>

      <main className="container flex min-h-0 flex-1 flex-col py-4 lg:py-6">
        <Outlet />
      </main>

      <footer className="container border-t border-border/60 py-2 text-center text-[11px] text-muted-foreground">
        ĐATN — Sàng lọc nguy cơ Tiểu đường thai kỳ với LightGBM + XAI
      </footer>
    </div>
  );
}
