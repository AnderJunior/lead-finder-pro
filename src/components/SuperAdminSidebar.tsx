import { NavLink, useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { useState } from "react";
import {
  LayoutDashboard,
  Building2,
  CreditCard,
  Receipt,
  LogOut,
  Package,
  Headphones,
} from "lucide-react";
import { SupportDialog } from "@/components/SupportDialog";

const navItems = [
  { icon: LayoutDashboard, label: "Dashboard", path: "/admin" },
  { icon: Building2, label: "Empresas", path: "/admin/empresas" },
  { icon: Receipt, label: "Assinaturas", path: "/admin/assinaturas" },
  { icon: CreditCard, label: "Financeiro", path: "/admin/financeiro" },
  { icon: Package, label: "Planos", path: "/admin/planos" },
];

export function SuperAdminSidebar() {
  const { signOut, dbUser } = useAuth();
  const navigate = useNavigate();
  const [supportOpen, setSupportOpen] = useState(false);

  const handleLogout = async () => {
    await signOut();
    navigate("/login", { replace: true });
  };

  const navLinkClass = ({ isActive }: { isActive: boolean }) =>
    cn(
      "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200",
      isActive
        ? "bg-primary/5 text-primary border border-primary/20"
        : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
    );

  return (
    <aside className="fixed left-0 top-0 z-40 h-screen w-64 border-r border-gray-200 bg-white flex flex-col">
      <div className="flex items-center justify-center px-6 py-5 border-b border-gray-200">
        <img
          src="/logo-sistema.png"
          alt="ClientScout"
          className="h-11 max-w-[200px] object-contain"
        />
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.path === "/admin"}
            className={navLinkClass}
          >
            <item.icon className="h-4 w-4" />
            {item.label}
          </NavLink>
        ))}
      </nav>

      {/* Suporte */}
      <div className="px-4 py-3 border-t border-gray-200">
        <button
          onClick={() => setSupportOpen(true)}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition-all duration-200"
        >
          <Headphones className="h-4 w-4" />
          Suporte
        </button>
      </div>
      <SupportDialog open={supportOpen} onOpenChange={setSupportOpen} />

      <div className="px-4 py-3 border-t border-gray-200">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 shrink-0 rounded-full bg-primary/10 flex items-center justify-center">
            <span className="text-sm font-semibold text-primary uppercase">
              {(dbUser?.nome || dbUser?.email || "S").charAt(0)}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">
              {dbUser?.nome || "Super Admin"}
            </p>
            <p className="text-xs text-gray-400 truncate">
              {dbUser?.email || ""}
            </p>
          </div>
          <button
            onClick={handleLogout}
            title="Sair"
            className="shrink-0 p-1.5 rounded-md text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}
