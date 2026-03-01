import { useEffect, useState } from "react";
import { SuperAdminLayout } from "@/components/SuperAdminLayout";
import {
  CreditCard,
  Search,
  Loader2,
  DollarSign,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Building2,
  TrendingUp,
  TrendingDown,
  ExternalLink,
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
import { fetchPagamentos, type Pagamento } from "@/lib/super-admin-functions";

function currency(value: number): string {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

const statusColors: Record<string, string> = {
  pendente: "bg-yellow-50 text-yellow-700 border-yellow-200",
  pago: "bg-emerald-50 text-emerald-700 border-emerald-200",
  atrasado: "bg-red-50 text-red-700 border-red-200",
  cancelado: "bg-gray-100 text-gray-500 border-gray-200",
};

const statusIcons: Record<string, React.ElementType> = {
  pendente: Clock,
  pago: CheckCircle2,
  atrasado: AlertTriangle,
  cancelado: CreditCard,
};

export default function SuperAdminFinanceiro() {
  const [pagamentos, setPagamentos] = useState<Pagamento[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const loadData = () => {
    setLoading(true);
    fetchPagamentos()
      .then((p) => setPagamentos(p))
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadData(); }, []);

  const filtered = pagamentos.filter((p) => {
    if (statusFilter !== "all" && p.status !== statusFilter) return false;
    const q = search.toLowerCase();
    return !q || (p.empresa_nome || "").toLowerCase().includes(q) || (p.referencia || "").toLowerCase().includes(q);
  });

  const kpis = {
    totalPago: pagamentos.filter((p) => p.status === "pago").reduce((s, p) => s + Number(p.valor), 0),
    totalPendente: pagamentos.filter((p) => p.status === "pendente").reduce((s, p) => s + Number(p.valor), 0),
    totalAtrasado: pagamentos.filter((p) => p.status === "atrasado").reduce((s, p) => s + Number(p.valor), 0),
    qtdPendente: pagamentos.filter((p) => p.status === "pendente").length,
    qtdAtrasado: pagamentos.filter((p) => p.status === "atrasado").length,
    qtdPago: pagamentos.filter((p) => p.status === "pago").length,
  };

  return (
    <SuperAdminLayout>
      <div className="max-w-7xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Financeiro</h1>
          <p className="text-sm text-gray-500 mt-1">Controle de pagamentos e cobranças</p>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-3 mb-3">
              <div className="h-10 w-10 rounded-lg bg-emerald-50 flex items-center justify-center">
                <TrendingUp className="h-5 w-5 text-emerald-600" />
              </div>
              <span className="text-sm text-gray-500">Recebido</span>
            </div>
            <p className="text-2xl font-bold text-emerald-600">{currency(kpis.totalPago)}</p>
            <p className="text-xs text-gray-400 mt-1">{kpis.qtdPago} pagamentos</p>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-3 mb-3">
              <div className="h-10 w-10 rounded-lg bg-yellow-50 flex items-center justify-center">
                <Clock className="h-5 w-5 text-yellow-600" />
              </div>
              <span className="text-sm text-gray-500">Pendente</span>
            </div>
            <p className="text-2xl font-bold text-yellow-600">{currency(kpis.totalPendente)}</p>
            <p className="text-xs text-gray-400 mt-1">{kpis.qtdPendente} pagamentos</p>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-3 mb-3">
              <div className="h-10 w-10 rounded-lg bg-red-50 flex items-center justify-center">
                <TrendingDown className="h-5 w-5 text-red-600" />
              </div>
              <span className="text-sm text-gray-500">Atrasado</span>
            </div>
            <p className="text-2xl font-bold text-red-600">{currency(kpis.totalAtrasado)}</p>
            <p className="text-xs text-gray-400 mt-1">{kpis.qtdAtrasado} pagamentos</p>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-3 mb-3">
              <div className="h-10 w-10 rounded-lg bg-primary/5 flex items-center justify-center">
                <DollarSign className="h-5 w-5 text-primary" />
              </div>
              <span className="text-sm text-gray-500">A Receber</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">{currency(kpis.totalPendente + kpis.totalAtrasado)}</p>
            <p className="text-xs text-gray-400 mt-1">{kpis.qtdPendente + kpis.qtdAtrasado} pagamentos</p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Buscar empresa ou referência..."
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
              <SelectItem value="pendente">Pendente</SelectItem>
              <SelectItem value="pago">Pago</SelectItem>
              <SelectItem value="atrasado">Atrasado</SelectItem>
              <SelectItem value="cancelado">Cancelado</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-xl border border-gray-200 bg-white p-12 text-center shadow-sm">
            <CreditCard className="h-10 w-10 text-gray-300 mx-auto mb-3" />
            <p className="text-sm text-gray-500">
              {search || statusFilter !== "all" ? "Nenhum pagamento encontrado" : "Nenhum pagamento registrado"}
            </p>
          </div>
        ) : (
          <div className="rounded-xl border border-gray-200 bg-white overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/50">
                    <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Empresa</th>
                    <th className="text-center px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Valor</th>
                    <th className="text-center px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="text-center px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Vencimento</th>
                    <th className="text-center px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Pagamento</th>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Método</th>
                    <th className="text-center px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Fatura</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((pag) => {
                    const StatusIcon = statusIcons[pag.status] || CreditCard;
                    const isLate = pag.status === "pendente" && new Date(pag.data_vencimento) < new Date();
                    return (
                      <tr key={pag.id} className={cn("border-b border-gray-100 hover:bg-gray-50 transition-colors", isLate && "bg-red-50/50")}>
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-2">
                            <Building2 className="h-4 w-4 text-gray-400 shrink-0" />
                            <span className="text-sm text-gray-900 truncate">{pag.empresa_nome || "—"}</span>
                          </div>
                        </td>
                        <td className="px-5 py-4 text-center text-sm font-semibold text-gray-900">{currency(pag.valor)}</td>
                        <td className="px-5 py-4 text-center">
                          <span className={cn("inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border", statusColors[isLate ? "atrasado" : pag.status])}>
                            <StatusIcon className="h-3 w-3" />
                            {isLate ? "Atrasado" : pag.status}
                          </span>
                        </td>
                        <td className={cn("px-5 py-4 text-center text-sm", isLate ? "text-red-600 font-medium" : "text-gray-500")}>
                          {formatDate(pag.data_vencimento)}
                        </td>
                        <td className="px-5 py-4 text-center text-sm text-gray-500">{formatDate(pag.data_pagamento)}</td>
                        <td className="px-5 py-4 text-sm text-gray-500">{pag.metodo_pagamento || "—"}</td>
                        <td className="px-5 py-4 text-center">
                          {(pag as any).asaas_invoice_url ? (
                            <a
                              href={(pag as any).asaas_invoice_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                            >
                              <ExternalLink className="h-3 w-3" />
                              Ver fatura
                            </a>
                          ) : (pag as any).asaas_boleto_url ? (
                            <a
                              href={(pag as any).asaas_boleto_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                            >
                              <ExternalLink className="h-3 w-3" />
                              Boleto
                            </a>
                          ) : (
                            <span className="text-xs text-gray-300">—</span>
                          )}
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
