import { Search, LayoutDashboard, Users, Settings, MapPin, Download, BarChart3, Zap } from "lucide-react";
import { NavLink } from "react-router-dom";
import { cn } from "@/lib/utils";

const navItems = [
  { icon: LayoutDashboard, label: "Dashboard", path: "/" },
  { icon: Search, label: "Nova Busca", path: "/search" },
  { icon: Users, label: "Meus Leads", path: "/leads" },
  { icon: Download, label: "Exportações", path: "/exports" },
  { icon: BarChart3, label: "Relatórios", path: "/reports" },
  { icon: Settings, label: "Configurações", path: "/settings" },
];

export function AppSidebar() {
  return (
    <aside className="fixed left-0 top-0 z-40 h-screen w-64 border-r border-border bg-sidebar flex flex-col">
      {/* Logo */}
      <div className="flex items-center gap-3 px-6 py-5 border-b border-border">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary">
          <MapPin className="h-5 w-5 text-primary-foreground" />
        </div>
        <div>
          <h1 className="text-base font-bold text-foreground tracking-tight">ProspectMap</h1>
          <p className="text-xs text-muted-foreground">Prospecção Inteligente</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200",
                isActive
                  ? "bg-primary/10 text-primary glow-border"
                  : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              )
            }
          >
            <item.icon className="h-4 w-4" />
            {item.label}
          </NavLink>
        ))}
      </nav>

      {/* Credits */}
      <div className="mx-3 mb-4 rounded-lg border border-border bg-muted p-4">
        <div className="flex items-center gap-2 mb-2">
          <Zap className="h-4 w-4 text-warning" />
          <span className="text-xs font-semibold text-foreground">Créditos</span>
        </div>
        <div className="flex items-baseline gap-1">
          <span className="text-2xl font-bold text-foreground">847</span>
          <span className="text-xs text-muted-foreground">/ 1.000</span>
        </div>
        <div className="mt-2 h-1.5 rounded-full bg-border overflow-hidden">
          <div className="h-full w-[85%] rounded-full bg-primary" />
        </div>
      </div>
    </aside>
  );
}
