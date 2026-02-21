import { Search, LayoutDashboard, Users, MapPin, LogOut, Settings, KanbanSquare, CreditCard, Loader2 } from "lucide-react";
import { NavLink, useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useSerperCredits } from "@/hooks/useSerperCredits";

const baseNavItems = [
  { icon: LayoutDashboard, label: "Dashboard", path: "/" },
  { icon: Search, label: "Nova Busca", path: "/search" },
  { icon: KanbanSquare, label: "Funil", path: "/funil" },
  { icon: Users, label: "Meus Leads", path: "/leads" },
];

const adminNavItems = [
  { icon: Settings, label: "Configurações", path: "/settings" },
];

export function AppSidebar() {
  const { signOut, dbUser } = useAuth();
  const navigate = useNavigate();
  const { credits, totalCredits, loading: creditsLoading } = useSerperCredits();

  const creditsUsed = totalCredits - credits;

  const handleLogout = async () => {
    await signOut();
    navigate("/login", { replace: true });
  };

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
        {baseNavItems.map((item) => (
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
        {dbUser?.role === "admin" &&
          adminNavItems.map((item) => (
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

      {/* Créditos Serper */}
      <div className="px-4 py-3 border-t border-border">
        <div className="flex items-center gap-2 mb-2">
          <CreditCard className="h-4 w-4 text-muted-foreground" />
          <span className="text-xs font-medium text-muted-foreground">Créditos API</span>
        </div>
        {creditsLoading ? (
          <div className="flex items-center gap-2">
            <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
            <span className="text-xs text-muted-foreground">Carregando...</span>
          </div>
        ) : (
          <>
            <div className="flex items-baseline justify-between mb-1.5">
              <span className={cn(
                "text-lg font-bold",
                credits <= 250 ? "text-red-500" : credits <= 750 ? "text-yellow-500" : "text-emerald-500"
              )}>
                {credits.toLocaleString("pt-BR")}
              </span>
              <span className="text-xs text-muted-foreground">
                / {totalCredits.toLocaleString("pt-BR")}
              </span>
            </div>
            <Progress
              value={((totalCredits - creditsUsed) / totalCredits) * 100}
              className={cn(
                "h-2",
                credits <= 250 ? "[&>div]:bg-red-500" : credits <= 750 ? "[&>div]:bg-yellow-500" : "[&>div]:bg-emerald-500"
              )}
            />
            <p className="text-[10px] text-muted-foreground mt-1">
              {creditsUsed.toLocaleString("pt-BR")} utilizados
            </p>
          </>
        )}
      </div>

      {/* Footer com usuário e logout */}
      <div className="p-3 border-t border-border space-y-2">
        {dbUser && (
          <p className="px-3 py-1 text-xs text-muted-foreground truncate" title={dbUser.email}>
            {dbUser.email}
          </p>
        )}
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start gap-3 text-muted-foreground hover:text-foreground"
          onClick={handleLogout}
        >
          <LogOut className="h-4 w-4" />
          Sair
        </Button>
      </div>
    </aside>
  );
}
