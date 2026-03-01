import { useEffect, useState } from "react";
import { SuperAdminLayout } from "@/components/SuperAdminLayout";
import {
  Receipt,
  Search,
  Loader2,
  Building2,
  CheckCircle2,
  XCircle,
  Clock,
  DollarSign,
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
import {
  fetchAssinaturas,
  type Assinatura,
} from "@/lib/super-admin-functions";

function currency(value: number): string {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

const statusColors: Record<string, string> = {
  ativa: "bg-emerald-50 text-emerald-700 border-emerald-200",
  vencida: "bg-red-50 text-red-700 border-red-200",
  trial: "bg-blue-50 text-blue-700 border-blue-200",
  cancelada: "bg-gray-100 text-gray-500 border-gray-200",
  suspensa: "bg-yellow-50 text-yellow-700 border-yellow-200",
};

export default function SuperAdminAssinaturas() {
  const [assinaturas, setAssinaturas] = useState<Assinatura[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const loadData = () => {
    setLoading(true);
    fetchAssinaturas()
      .then(setAssinaturas)
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadData(); }, []);

  const filtered = assinaturas.filter((a) => {
    if (statusFilter !== "all" && a.status !== statusFilter) return false;
    const q = search.toLowerCase();
    return !q || (a.empresa_nome || "").toLowerCase().includes(q) || (a.plano_nome || "").toLowerCase().includes(q);
  });

  const kpis = {
    ativas: assinaturas.filter((a) => a.status === "ativa").length,
    vencidas: assinaturas.filter((a) => a.status === "vencida").length,
    trials: assinaturas.filter((a) => a.status === "trial").length,
    receita: assinaturas
      .filter((a) => a.status === "ativa")
      .reduce((s, a) => s + Number(a.valor), 0),
  };

  return (
    <SuperAdminLayout>
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Assinaturas</h1>
            <p className="text-sm text-gray-500 mt-1">{assinaturas.length} assinaturas no sistema</p>
          </div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-3 mb-3">
              <div className="h-10 w-10 rounded-lg bg-emerald-50 flex items-center justify-center">
                <CheckCircle2 className="h-5 w-5 text-emerald-600" />
              </div>
              <span className="text-sm text-gray-500">Ativas</span>
            </div>
            <p className="text-2xl font-bold text-emerald-600">{kpis.ativas}</p>
            <p className="text-xs text-gray-400 mt-1">assinaturas</p>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-3 mb-3">
              <div className="h-10 w-10 rounded-lg bg-red-50 flex items-center justify-center">
                <XCircle className="h-5 w-5 text-red-600" />
              </div>
              <span className="text-sm text-gray-500">Vencidas</span>
            </div>
            <p className="text-2xl font-bold text-red-600">{kpis.vencidas}</p>
            <p className="text-xs text-gray-400 mt-1">assinaturas</p>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-3 mb-3">
              <div className="h-10 w-10 rounded-lg bg-blue-50 flex items-center justify-center">
                <Clock className="h-5 w-5 text-blue-600" />
              </div>
              <span className="text-sm text-gray-500">Trial</span>
            </div>
            <p className="text-2xl font-bold text-blue-600">{kpis.trials}</p>
            <p className="text-xs text-gray-400 mt-1">assinaturas</p>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-3 mb-3">
              <div className="h-10 w-10 rounded-lg bg-primary/5 flex items-center justify-center">
                <DollarSign className="h-5 w-5 text-primary" />
              </div>
              <span className="text-sm text-gray-500">Receita Total/mês</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">{currency(kpis.receita)}</p>
            <p className="text-xs text-gray-400 mt-1">assinaturas ativas</p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Buscar empresa ou plano..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 bg-white border-gray-200 text-gray-900 placeholder:text-gray-400"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[140px] bg-white border-gray-200 text-gray-700">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="ativa">Ativa</SelectItem>
              <SelectItem value="vencida">Vencida</SelectItem>
              <SelectItem value="trial">Trial</SelectItem>
              <SelectItem value="cancelada">Cancelada</SelectItem>
              <SelectItem value="suspensa">Suspensa</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-xl border border-gray-200 bg-white p-12 text-center shadow-sm">
            <Receipt className="h-10 w-10 text-gray-300 mx-auto mb-3" />
            <p className="text-sm text-gray-500">Nenhuma assinatura encontrada</p>
          </div>
        ) : (
          <div className="rounded-xl border border-gray-200 bg-white overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/50">
                    <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Empresa</th>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Plano</th>
                    <th className="text-center px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Ciclo</th>
                    <th className="text-center px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Valor</th>
                    <th className="text-center px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="text-center px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Vencimento</th>
                    
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((ass) => {
                    const isExpiring = ass.status === "ativa" && new Date(ass.data_vencimento) < new Date(Date.now() + 7 * 86_400_000);
                    const isOverdue = ass.status === "vencida";
                    return (
                      <tr key={ass.id} className={cn("border-b border-gray-100 hover:bg-gray-50 transition-colors", isOverdue && "bg-red-50/40")}>
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-2">
                            <Building2 className="h-4 w-4 text-gray-400 shrink-0" />
                            <span className="text-sm text-gray-900 truncate">{ass.empresa_nome || "—"}</span>
                          </div>
                        </td>
                        <td className="px-5 py-4 text-sm text-gray-700">{ass.plano_nome || "—"}</td>
                        <td className="px-5 py-4 text-center text-sm text-gray-500 capitalize">{ass.ciclo}</td>
                        <td className="px-5 py-4 text-center text-sm font-medium text-gray-900">{currency(ass.valor)}</td>
                        <td className="px-5 py-4 text-center">
                          <span className={cn("text-xs px-2.5 py-1 rounded-full border", statusColors[ass.status])}>
                            {ass.status}
                          </span>
                        </td>
                        <td className={cn("px-5 py-4 text-center text-sm", isOverdue ? "text-red-600 font-medium" : isExpiring ? "text-yellow-600 font-medium" : "text-gray-500")}>
                          {formatDate(ass.data_vencimento)}
                          {isOverdue && <span className="text-[10px] block text-red-600">Pagamento atrasado</span>}
                          {!isOverdue && isExpiring && <span className="text-[10px] block text-yellow-600">Vence em breve</span>}
                        </td>
                        
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
