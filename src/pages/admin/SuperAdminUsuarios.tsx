import { useEffect, useState } from "react";
import { SuperAdminLayout } from "@/components/SuperAdminLayout";
import {
  Users,
  Search,
  Shield,
  ShieldCheck,
  UserCircle,
  Loader2,
  Building2,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn, formatDate } from "@/lib/utils";
import { fetchTodosUsuarios, type UsuarioGlobal } from "@/lib/super-admin-functions";

const roleLabels: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  super_admin: { label: "Super Admin", icon: Shield, color: "text-primary bg-primary/5 border-primary/20" },
  admin: { label: "Admin", icon: ShieldCheck, color: "text-blue-700 bg-blue-50 border-blue-200" },
  user: { label: "Vendedor", icon: UserCircle, color: "text-gray-600 bg-gray-100 border-gray-200" },
};

const statusColors: Record<string, string> = {
  ativo: "bg-emerald-50 text-emerald-700 border-emerald-200",
  inativo: "bg-red-50 text-red-700 border-red-200",
  suspenso: "bg-yellow-50 text-yellow-700 border-yellow-200",
};

export default function SuperAdminUsuarios() {
  const [usuarios, setUsuarios] = useState<UsuarioGlobal[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");

  useEffect(() => {
    fetchTodosUsuarios()
      .then(setUsuarios)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const filtered = usuarios.filter((u) => {
    if (roleFilter !== "all" && u.role !== roleFilter) return false;
    const q = search.toLowerCase();
    return (
      !q ||
      (u.nome || "").toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q) ||
      (u.empresa_nome || "").toLowerCase().includes(q)
    );
  });

  const totalByRole = {
    super_admin: usuarios.filter((u) => u.role === "super_admin").length,
    admin: usuarios.filter((u) => u.role === "admin").length,
    user: usuarios.filter((u) => u.role === "user").length,
  };

  return (
    <SuperAdminLayout>
      <div className="max-w-7xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Usuários</h1>
          <p className="text-sm text-gray-500 mt-1">
            {usuarios.length} usuários no sistema
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {(["super_admin", "admin", "user"] as const).map((role) => {
            const info = roleLabels[role];
            const Icon = info.icon;
            const bgClass = info.color.split(" ")[1];
            const textClass = info.color.split(" ")[0];
            return (
              <div key={role} className="rounded-xl border border-gray-200 bg-white p-4 flex items-center gap-4 shadow-sm">
                <div className={cn("h-10 w-10 rounded-lg flex items-center justify-center", bgClass)}>
                  <Icon className={cn("h-5 w-5", textClass)} />
                </div>
                <div>
                  <p className="text-lg font-bold text-gray-900">{totalByRole[role]}</p>
                  <p className="text-xs text-gray-400">{info.label}s</p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Filters */}
        <div className="flex items-center gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Buscar por nome, email ou empresa..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 bg-white border-gray-200 text-gray-900 placeholder:text-gray-400"
            />
          </div>
          <Select value={roleFilter} onValueChange={setRoleFilter}>
            <SelectTrigger className="w-[160px] bg-white border-gray-200 text-gray-700">
              <SelectValue placeholder="Cargo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="super_admin">Super Admin</SelectItem>
              <SelectItem value="admin">Admin</SelectItem>
              <SelectItem value="user">Vendedor</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-xl border border-gray-200 bg-white p-12 text-center shadow-sm">
            <Users className="h-10 w-10 text-gray-300 mx-auto mb-3" />
            <p className="text-sm text-gray-500">Nenhum usuário encontrado</p>
          </div>
        ) : (
          <div className="rounded-xl border border-gray-200 bg-white overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/50">
                    <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Usuário</th>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Empresa</th>
                    <th className="text-center px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Cargo</th>
                    <th className="text-center px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="text-center px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Plano</th>
                    <th className="text-center px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Criado em</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((user) => {
                    const role = roleLabels[user.role || "user"] || roleLabels.user;
                    const RoleIcon = role.icon;
                    return (
                      <tr key={user.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            <div className="h-9 w-9 shrink-0 rounded-full bg-gray-100 overflow-hidden flex items-center justify-center">
                              {user.avatar_url ? (
                                <img src={user.avatar_url} alt="" className="h-full w-full object-cover" />
                              ) : (
                                <span className="text-sm font-semibold text-gray-400 uppercase">
                                  {(user.nome || user.email).charAt(0)}
                                </span>
                              )}
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-gray-900 truncate">{user.nome || "Sem nome"}</p>
                              <p className="text-xs text-gray-400 truncate">{user.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-2">
                            <Building2 className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                            <span className="text-sm text-gray-600 truncate">{user.empresa_nome || "—"}</span>
                          </div>
                        </td>
                        <td className="px-5 py-4 text-center">
                          <span className={cn("inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border", role.color)}>
                            <RoleIcon className="h-3 w-3" />
                            {role.label}
                          </span>
                        </td>
                        <td className="px-5 py-4 text-center">
                          <span className={cn("text-xs px-2.5 py-1 rounded-full border", statusColors[user.status] || "text-gray-400")}>
                            {user.status}
                          </span>
                        </td>
                        <td className="px-5 py-4 text-center text-sm text-gray-700">{user.plano}</td>
                        <td className="px-5 py-4 text-center text-sm text-gray-500">{formatDate(user.created_at)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </SuperAdminLayout>
  );
}
