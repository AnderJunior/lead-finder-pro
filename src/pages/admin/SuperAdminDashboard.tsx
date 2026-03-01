import { useEffect, useState } from "react";
import { SuperAdminLayout } from "@/components/SuperAdminLayout";
import {
  Building2,
  TrendingUp,
  Receipt,
  DollarSign,
  AlertTriangle,
  Clock,
  ChevronDown,
  Loader2,
  ArrowRight,
} from "lucide-react";
import { cn, formatDate } from "@/lib/utils";
import { Link } from "react-router-dom";
import {
  fetchSuperAdminDashboard,
  type DashboardSuperAdmin,
  type Pagamento,
} from "@/lib/super-admin-functions";

function currency(value: number): string {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

interface KpiCardProps {
  icon: React.ElementType;
  label: string;
  value: string | number;
  subtitle?: string;
  iconBg?: string;
  iconColor?: string;
}

function KpiCard({ icon: Icon, label, value, subtitle, iconBg = "bg-primary/5", iconColor = "text-primary" }: KpiCardProps) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 flex flex-col gap-3 shadow-sm">
      <div className="flex items-center gap-3">
        <div className={cn("flex h-10 w-10 items-center justify-center rounded-lg", iconBg)}>
          <Icon className={cn("h-5 w-5", iconColor)} />
        </div>
        <span className="text-sm text-gray-500">{label}</span>
      </div>
      <div>
        <p className="text-2xl font-bold text-gray-900">{value}</p>
        {subtitle && <p className="text-xs text-gray-400 mt-1">{subtitle}</p>}
      </div>
    </div>
  );
}

interface AlertSectionProps {
  type: "pendente" | "atrasado";
  count: number;
  total: number;
  items: Pagamento[];
}

function AlertSection({ type, count, total, items }: AlertSectionProps) {
  const [open, setOpen] = useState(false);

  if (count === 0) return null;

  const isPendente = type === "pendente";
  const bgBanner = isPendente ? "bg-yellow-50 border-yellow-200" : "bg-red-50 border-red-200";
  const iconBg = isPendente ? "text-yellow-600" : "text-red-600";
  const textColor = isPendente ? "text-yellow-800" : "text-red-800";
  const subColor = isPendente ? "text-yellow-600" : "text-red-600";
  const Icon = isPendente ? Clock : AlertTriangle;
  const label = isPendente ? "pagamento(s) pendente(s)" : "pagamento(s) atrasado(s)";

  return (
    <div className={cn("rounded-xl border overflow-hidden", bgBanner)}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center gap-3 px-5 py-3.5 text-left"
      >
        <Icon className={cn("h-5 w-5 shrink-0", iconBg)} />
        <div className="flex-1">
          <p className={cn("text-sm font-medium", textColor)}>
            {count} {label}
          </p>
          <p className={cn("text-xs mt-0.5", subColor)}>
            Total: {currency(total)}
          </p>
        </div>
        <ChevronDown className={cn("h-4 w-4 transition-transform", iconBg, open && "rotate-180")} />
      </button>

      {open && (
        <div className="border-t border-inherit bg-white divide-y divide-gray-100">
          {items.map((pag) => (
            <div key={pag.id} className="flex items-center gap-4 px-5 py-3 hover:bg-gray-50 transition-colors">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">{pag.empresa_nome || "Empresa"}</p>
                <p className="text-xs text-gray-400">
                  Vencimento: {formatDate(pag.data_vencimento)}
                  {pag.metodo_pagamento && ` · ${pag.metodo_pagamento}`}
                </p>
              </div>
              <span className="text-sm font-semibold text-gray-900 shrink-0">{currency(pag.valor)}</span>
            </div>
          ))}
          <div className="px-5 py-2.5">
            <Link to="/admin/financeiro" className="text-xs text-primary hover:text-primary/80 flex items-center gap-1">
              Ver todos no financeiro <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

const statusColors: Record<string, string> = {
  ativa: "bg-emerald-50 text-emerald-700 border-emerald-200",
  vencida: "bg-red-50 text-red-700 border-red-200",
  trial: "bg-blue-50 text-blue-700 border-blue-200",
  cancelada: "bg-gray-100 text-gray-500 border-gray-200",
  suspensa: "bg-yellow-50 text-yellow-700 border-yellow-200",
};

export default function SuperAdminDashboard() {
  const [data, setData] = useState<DashboardSuperAdmin | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSuperAdminDashboard()
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <SuperAdminLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </SuperAdminLayout>
    );
  }

  if (!data) return null;

  return (
    <SuperAdminLayout>
      <div className="max-w-7xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard do Sistema</h1>
          <p className="text-sm text-gray-500 mt-1">Visão geral de todas as empresas e métricas do sistema</p>
        </div>

        {/* 4 KPIs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard
            icon={Building2}
            label="Empresas"
            value={data.totalEmpresas}
            subtitle={`${data.assinaturasAtivas} ativas · ${data.assinaturasVencidas} vencidas`}
          />
          <KpiCard
            icon={TrendingUp}
            label="MRR"
            value={currency(data.receitaMensal)}
            iconBg="bg-emerald-50"
            iconColor="text-emerald-600"
            subtitle="Receita recorrente mensal"
          />
          <KpiCard
            icon={Receipt}
            label="Assinaturas"
            value={data.assinaturasAtivas + data.assinaturasVencidas + data.assinaturasTrials}
            iconBg="bg-blue-50"
            iconColor="text-blue-600"
            subtitle={`${data.assinaturasAtivas} ativas · ${data.assinaturasTrials} trial`}
          />
          <KpiCard
            icon={DollarSign}
            label="Receita do Mês"
            value={currency(data.receitaMes)}
            iconBg="bg-emerald-50"
            iconColor="text-emerald-600"
            subtitle="Pagamentos recebidos este mês"
          />
        </div>

        {/* Alertas de pagamentos */}
        {(data.pagamentosAtrasados > 0 || data.pagamentosPendentes > 0) && (
          <div className="space-y-3">
            <AlertSection
              type="atrasado"
              count={data.pagamentosAtrasados}
              total={data.valorAtrasado}
              items={data.listaAtrasados}
            />
            <AlertSection
              type="pendente"
              count={data.pagamentosPendentes}
              total={data.valorPendente}
              items={data.listaPendentes}
            />
          </div>
        )}

        {/* Empresas Cadastradas */}
        <div className="rounded-xl border border-gray-200 bg-white overflow-hidden shadow-sm">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <h2 className="text-sm font-semibold text-gray-900">Empresas Cadastradas</h2>
            <Link to="/admin/empresas" className="text-xs text-primary hover:text-primary/80 flex items-center gap-1">
              Ver todas <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          {data.empresasRecentes.length === 0 ? (
            <div className="p-8 text-center text-gray-400 text-sm">Nenhuma empresa cadastrada</div>
          ) : (
            <div className="divide-y divide-gray-100">
              {data.empresasRecentes.map((empresa) => (
                <div key={empresa.id} className="flex items-center gap-4 px-5 py-3 hover:bg-gray-50 transition-colors">
                  <div className="h-10 w-10 shrink-0 rounded-lg bg-gray-100 flex items-center justify-center overflow-hidden">
                    {empresa.logo_url ? (
                      <img src={empresa.logo_url} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <Building2 className="h-5 w-5 text-gray-400" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{empresa.nome || "Sem nome"}</p>
                    <p className="text-xs text-gray-400">{empresa.total_usuarios} usuários</p>
                  </div>
                  {empresa.plano_nome && (
                    <span className="text-xs text-gray-500 mr-2">{empresa.plano_nome}</span>
                  )}
                  {empresa.assinatura_status && (
                    <span className={cn("text-xs px-2 py-0.5 rounded-full border", statusColors[empresa.assinatura_status] || "text-gray-400")}>
                      {empresa.assinatura_status}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </SuperAdminLayout>
  );
}
