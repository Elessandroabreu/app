import { useEffect } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import { BarChart3, CalendarRange, DatabaseBackup, LayoutDashboard, Tags } from "lucide-react";
import { Toaster } from "@/components/ui/sonner";
import InstallButton from "@/components/InstallButton";
import { cn } from "@/lib/utils";

const NAV = [
  { to: "/", label: "Painel do mês", icon: LayoutDashboard, id: "painel" },
  { to: "/relatorio", label: "Relatório anual", icon: CalendarRange, id: "relatorio" },
  { to: "/analise", label: "Análise", icon: BarChart3, id: "analise" },
  { to: "/categorias", label: "Categorias", icon: Tags, id: "categorias" },
  { to: "/backup", label: "Backup", icon: DatabaseBackup, id: "backup" },
];

export default function AppShell() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [pathname]);
  return (
    <div className="min-h-screen bg-background">
      <div aria-hidden className="pointer-events-none fixed inset-x-0 top-0 -z-0 h-[420px] bg-[radial-gradient(60%_80%_at_15%_0%,rgba(245,158,11,0.10),transparent_70%),radial-gradient(50%_60%_at_90%_10%,rgba(99,102,241,0.10),transparent_70%)]" />
      <header className="sticky top-0 z-30 border-b border-slate-800/80 bg-slate-950/75 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center gap-4 px-4 sm:px-6 lg:px-8">
          <NavLink to="/" data-testid="app-logo" className="flex shrink-0 items-center gap-2.5">
            <img src="/icons/icon-192.png" alt="" className="size-8 rounded-lg" />
            <span className="font-heading text-lg font-semibold tracking-tight text-slate-50">
              Finan<span className="text-primary">Control</span>
            </span>
          </NavLink>
          <nav className="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto [scrollbar-width:none]">
            {NAV.map(({ to, label, icon: Icon, id }) => (
              <NavLink
                key={to}
                to={to}
                end={to === "/"}
                data-testid={`nav-${id}`}
                className={({ isActive }) =>
                  cn(
                    "flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors duration-150",
                    isActive ? "bg-slate-800/80 text-slate-50" : "text-slate-400 hover:bg-slate-900 hover:text-slate-200",
                  )
                }
              >
                <Icon className="size-4" />
                <span className="hidden md:inline">{label}</span>
              </NavLink>
            ))}
          </nav>
          <InstallButton />
        </div>
      </header>
      <main className="relative z-10 mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        <Outlet />
      </main>
      <Toaster richColors />
    </div>
  );
}
