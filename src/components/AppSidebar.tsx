import { useState } from "react";
import { Search, LayoutDashboard, Users, LogOut, Settings, KanbanSquare, CreditCard, Loader2, Compass, ChevronDown, History, Medal, BarChart3, Coins } from "lucide-react";
import { NavLink, useNavigate, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { Progress } from "@/components/ui/progress";
import { useSerperCredits } from "@/hooks/useSerperCredits";

const WHATSAPP_NUMBER = "5527997226957";

const topNavItems = [
  { icon: LayoutDashboard, label: "Dashboard", path: "/" },
];

const navegacaoSubItems = [
  { icon: Search, label: "Nova Busca", path: "/search" },
  { icon: History, label: "Buscas Realizadas", path: "/buscas-realizadas" },
];

const bottomNavItems = [
  { icon: KanbanSquare, label: "Funil", path: "/funil" },
  { icon: Users, label: "Meus Leads", path: "/leads" },
  { icon: Medal, label: "Ranking", path: "/ranking" },
  { icon: BarChart3, label: "Relatórios", path: "/relatorios" },
  { icon: Settings, label: "Configurações", path: "/settings" },
];

export function AppSidebar() {
  const { signOut, dbUser } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { credits, totalCredits, loading: creditsLoading } = useSerperCredits();

  const navegacaoActive = navegacaoSubItems.some((s) => s.path === location.pathname);
  const [navegacaoOpen, setNavegacaoOpen] = useState(navegacaoActive);

  const handleQueroMaisCreditos = () => {
    const empresa = dbUser?.empresa_nome || "minha empresa";
    const email = dbUser?.email || "";
    const mensagem = encodeURIComponent(
      `Olá! Quero comprar mais créditos para a plataforma *LeadRadar*.\n\n` +
        `Empresa: ${empresa}\n` +
        `Email: ${email}\n\n` +
        `Aguardo retorno com as opções de pacotes disponíveis.`
    );
    window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${mensagem}`, "_blank");
  };

  const creditsUsed = Math.max(0, totalCredits - credits);

  const handleLogout = async () => {
    await signOut();
    navigate("/login", { replace: true });
  };

  const navLinkClass = ({ isActive }: { isActive: boolean }) =>
    cn(
      "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200",
      isActive
        ? "bg-primary/10 text-primary glow-border"
        : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
    );

  return (
    <aside className="fixed left-0 top-0 z-40 h-screen w-64 border-r border-border bg-sidebar flex flex-col">
      {/* Logo */}
      <div className="flex items-center justify-center px-6 py-5 border-b border-border">
        <img
          src="/logo-sistema.png"
          alt="LeadRadar"
          className="h-9 max-w-[200px] object-contain"
        />
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {topNavItems.map((item) => (
          <NavLink key={item.path} to={item.path} end className={navLinkClass}>
            <item.icon className="h-4 w-4" />
            {item.label}
          </NavLink>
        ))}

        {/* Navegação (collapsible) */}
        <div>
          <button
            onClick={() => setNavegacaoOpen((o) => !o)}
            className={cn(
              "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200",
              navegacaoActive
                ? "bg-primary/10 text-primary"
                : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
            )}
          >
            <Compass className="h-4 w-4" />
            <span className="flex-1 text-left">Navegação</span>
            <ChevronDown className={cn("h-3.5 w-3.5 transition-transform duration-200", navegacaoOpen && "rotate-180")} />
          </button>
          <div className={cn(
            "overflow-hidden transition-all duration-200",
            navegacaoOpen ? "max-h-40 opacity-100 mt-1" : "max-h-0 opacity-0"
          )}>
            <div className="ml-4 border-l border-border/50 pl-2 space-y-0.5">
              {navegacaoSubItems.map((item) => (
                <NavLink key={item.path} to={item.path} className={navLinkClass}>
                  <item.icon className="h-3.5 w-3.5" />
                  {item.label}
                </NavLink>
              ))}
            </div>
          </div>
        </div>

        {bottomNavItems.map((item) => (
          <NavLink key={item.path} to={item.path} className={navLinkClass}>
            <item.icon className="h-4 w-4" />
            {item.label}
          </NavLink>
        ))}
      </nav>

      {/* Créditos Serper */}
      <div className="px-4 py-3 border-t border-border">
        <div className="flex items-center gap-2 mb-2">
          <CreditCard className="h-4 w-4 text-muted-foreground" />
          <span className="text-xs font-medium text-muted-foreground">Créditos para Buscar</span>
        </div>
        {creditsLoading ? (
          <div className="flex items-center gap-2">
            <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
            <span className="text-xs text-muted-foreground">Carregando...</span>
          </div>
        ) : (
          <>
            {(() => {
              const total = Math.max(totalCredits, credits);
              const pct = total > 0 ? credits / total : 0;
              const colorText = pct <= 0.1 ? "text-red-500" : pct <= 0.3 ? "text-yellow-500" : "text-emerald-500";
              const colorBar = pct <= 0.1 ? "[&>div]:bg-red-500" : pct <= 0.3 ? "[&>div]:bg-yellow-500" : "[&>div]:bg-emerald-500";
              return (
                <>
                  <div className="flex items-baseline justify-between mb-1.5">
                    <span className={cn("text-lg font-bold", colorText)}>
                      {credits.toLocaleString("pt-BR")}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      / {total.toLocaleString("pt-BR")}
                    </span>
                  </div>
                  <Progress
                    value={pct * 100}
                    className={cn("h-2", colorBar)}
                  />
                  <p className="text-[10px] text-muted-foreground mt-1">
                    {creditsUsed.toLocaleString("pt-BR")} utilizados
                  </p>
                </>
              );
            })()}
          </>
        )}
      </div>

      {/* Quero Mais Créditos */}
      <div className="px-4 py-3 border-t border-border">
        <button
          onClick={handleQueroMaisCreditos}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-primary bg-primary/10 hover:bg-primary/15 transition-all duration-200"
        >
          <Coins className="h-4 w-4" />
          Quero Mais Créditos
        </button>
      </div>

      {/* Footer com usuário e logout */}
      <div className="px-4 py-3 border-t border-border">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 shrink-0 rounded-full bg-muted overflow-hidden">
            {dbUser?.avatar_url ? (
              <img src={dbUser.avatar_url} alt="" className="h-full w-full object-cover" />
            ) : (
              <div className="h-full w-full flex items-center justify-center text-sm font-semibold text-muted-foreground uppercase">
                {(dbUser?.nome || dbUser?.email || "U").charAt(0)}
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground truncate" title={dbUser?.nome || ""}>
              {dbUser?.nome || "Usuário"}
            </p>
            <p className="text-xs text-muted-foreground truncate" title={dbUser?.email || ""}>
              {dbUser?.email || ""}
            </p>
          </div>
          <button
            onClick={handleLogout}
            title="Sair"
            className="shrink-0 p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-sidebar-accent transition-colors"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}
