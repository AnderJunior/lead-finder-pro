import { useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Loader2,
  TrendingUp,
  Users,
  Target,
  Clock,
  DollarSign,
  Phone,
  Star,
  BarChart3,
  PieChart as PieChartIcon,
  ArrowRight,
  Trophy,
  Search,
  CheckCircle2,
  XCircle,
  MessageCircle,
} from "lucide-react";
import { useRelatorios } from "@/hooks/useRelatorios";
import { cn } from "@/lib/utils";

import { BarChart } from "@mui/x-charts/BarChart";
import { PieChart } from "@mui/x-charts/PieChart";
import { LineChart } from "@mui/x-charts/LineChart";
import { Gauge, gaugeClasses } from "@mui/x-charts/Gauge";

const CHART_COLORS = [
  "#6366f1",
  "#8b5cf6",
  "#a78bfa",
  "#c4b5fd",
  "#818cf8",
  "#4f46e5",
  "#7c3aed",
  "#5b21b6",
  "#4338ca",
  "#6d28d9",
];

const PIE_COLORS = [
  "#6366f1",
  "#10b981",
  "#f59e0b",
  "#ef4444",
  "#3b82f6",
  "#8b5cf6",
  "#ec4899",
  "#14b8a6",
  "#f97316",
  "#06b6d4",
];

function formatCurrency(value: number): string {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function MetricCard({
  icon: Icon,
  label,
  value,
  subtitle,
  iconBg = "bg-primary/10",
  iconColor = "text-primary",
}: {
  icon: any;
  label: string;
  value: string;
  subtitle?: string;
  iconBg?: string;
  iconColor?: string;
}) {
  return (
    <div className="card-gradient rounded-xl border border-border p-5 flex items-start gap-4">
      <div className={cn("p-2.5 rounded-lg", iconBg)}>
        <Icon className={cn("h-5 w-5", iconColor)} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
        <p className="text-2xl font-bold text-foreground mt-0.5">{value}</p>
        {subtitle && <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>}
      </div>
    </div>
  );
}

// ═══════════ ABA FUNIL ═══════════

function TabFunil() {
  const data = useRelatorios();

  if (data.loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 text-primary animate-spin" />
      </div>
    );
  }

  const etapasParaFunil = data.funilEtapas.filter((e) => e.totalLeads > 0 || e.ordem <= 4);

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          icon={TrendingUp}
          label="Taxa de Conversão Geral"
          value={`${data.taxaConversaoGeral}%`}
          subtitle="Leads que fecharam negócio"
        />
        <MetricCard
          icon={DollarSign}
          label="Valor Total Pipeline"
          value={formatCurrency(data.valorTotalPipeline)}
          subtitle="Soma dos valores no funil"
          iconBg="bg-emerald-500/10"
          iconColor="text-emerald-600"
        />
        <MetricCard
          icon={Clock}
          label="Tempo Médio de Fechamento"
          value={`${data.tempoMedioFechamento} dias`}
          subtitle="Da captação ao fechamento"
          iconBg="bg-amber-500/10"
          iconColor="text-amber-600"
        />
        <MetricCard
          icon={Target}
          label="Leads no Pipeline"
          value={String(data.funilEtapas.reduce((sum, e) => sum + e.totalLeads, 0))}
          subtitle={`${data.funilEtapas.length} etapas`}
          iconBg="bg-blue-500/10"
          iconColor="text-blue-600"
        />
      </div>

      {/* Gráfico de funil - Leads por etapa */}
      <div className="card-gradient rounded-xl border border-border p-6">
        <h3 className="text-base font-semibold text-foreground mb-1">Leads por Etapa do Funil</h3>
        <p className="text-xs text-muted-foreground mb-4">Distribuição atual dos leads em cada etapa</p>
        {etapasParaFunil.length > 0 ? (
          <BarChart
            xAxis={[
              {
                scaleType: "band",
                data: etapasParaFunil.map((e) => e.nome),
                tickLabelStyle: { fontSize: 11 },
              },
            ]}
            series={[
              {
                data: etapasParaFunil.map((e) => e.totalLeads),
                label: "Leads",
                color: "#6366f1",
              },
            ]}
            height={320}
            slotProps={{ legend: { hidden: true } }}
          />
        ) : (
          <p className="text-sm text-muted-foreground text-center py-12">Sem dados para exibir</p>
        )}
      </div>

      {/* Conversão entre etapas + Valor por etapa */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Taxas de conversão */}
        <div className="card-gradient rounded-xl border border-border p-6">
          <h3 className="text-base font-semibold text-foreground mb-1">Taxas de Conversão entre Etapas</h3>
          <p className="text-xs text-muted-foreground mb-4">Percentual de avanço entre cada etapa</p>
          {data.conversoes.length > 0 ? (
            <div className="space-y-3">
              {data.conversoes.map((c, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-xs font-medium text-foreground whitespace-nowrap">{c.de}</span>
                    <ArrowRight className="h-3 w-3 text-muted-foreground shrink-0" />
                    <span className="text-xs font-medium text-foreground whitespace-nowrap">{c.para}</span>
                  </div>
                  <div className="flex-1" />
                  <div className="flex items-center gap-2 shrink-0">
                    <div className="w-32 h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full bg-primary transition-all"
                        style={{ width: `${Math.min(c.taxa, 100)}%` }}
                      />
                    </div>
                    <span className="text-xs font-bold text-foreground w-12 text-right">{c.taxa}%</span>
                    <span className="text-[10px] text-muted-foreground w-8 text-right">
                      {c.convertidos}/{c.total}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-8">Sem dados</p>
          )}
        </div>

        {/* Valor por etapa */}
        <div className="card-gradient rounded-xl border border-border p-6">
          <h3 className="text-base font-semibold text-foreground mb-1">Valor do Pipeline por Etapa</h3>
          <p className="text-xs text-muted-foreground mb-4">Soma dos valores dos leads em cada etapa</p>
          {etapasParaFunil.some((e) => e.valor > 0) ? (
            <BarChart
              layout="horizontal"
              yAxis={[
                {
                  scaleType: "band",
                  data: etapasParaFunil.map((e) => e.nome),
                  tickLabelStyle: { fontSize: 11 },
                },
              ]}
              series={[
                {
                  data: etapasParaFunil.map((e) => e.valor),
                  label: "Valor (R$)",
                  color: "#10b981",
                  valueFormatter: (v) => formatCurrency(v ?? 0),
                },
              ]}
              height={320}
              slotProps={{ legend: { hidden: true } }}
            />
          ) : (
            <p className="text-sm text-muted-foreground text-center py-12">
              Nenhum lead com valor atribuído
            </p>
          )}
        </div>
      </div>

      {/* Tempo médio por etapa + Gargalos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card-gradient rounded-xl border border-border p-6">
          <h3 className="text-base font-semibold text-foreground mb-1">Tempo Médio por Etapa</h3>
          <p className="text-xs text-muted-foreground mb-4">Dias que os leads ficam em cada etapa (gargalos)</p>
          {etapasParaFunil.some((e) => e.tempoMedioDias > 0) ? (
            <BarChart
              xAxis={[
                {
                  scaleType: "band",
                  data: etapasParaFunil.map((e) => e.nome),
                  tickLabelStyle: { fontSize: 11 },
                },
              ]}
              series={[
                {
                  data: etapasParaFunil.map((e) => e.tempoMedioDias),
                  label: "Dias",
                  color: "#f59e0b",
                  valueFormatter: (v) => `${v} dias`,
                },
              ]}
              height={300}
              slotProps={{ legend: { hidden: true } }}
            />
          ) : (
            <p className="text-sm text-muted-foreground text-center py-12">
              Sem dados de movimentação
            </p>
          )}
        </div>

        <div className="card-gradient rounded-xl border border-border p-6">
          <h3 className="text-base font-semibold text-foreground mb-1">Leads Perdidos por Segmento</h3>
          <p className="text-xs text-muted-foreground mb-4">Segmentos com mais leads perdidos</p>
          {data.leadsPerdidosPorEtapa.length > 0 ? (
            <BarChart
              layout="horizontal"
              yAxis={[
                {
                  scaleType: "band",
                  data: data.leadsPerdidosPorEtapa.map((e) => e.etapa),
                  tickLabelStyle: { fontSize: 11 },
                },
              ]}
              series={[
                {
                  data: data.leadsPerdidosPorEtapa.map((e) => e.total),
                  label: "Perdidos",
                  color: "#ef4444",
                },
              ]}
              height={300}
              slotProps={{ legend: { hidden: true } }}
            />
          ) : (
            <p className="text-sm text-muted-foreground text-center py-12">Nenhum lead perdido</p>
          )}
        </div>
      </div>
    </div>
  );
}

// ═══════════ ABA PERFORMANCE ═══════════

function TabPerformance() {
  const data = useRelatorios();

  if (data.loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 text-primary animate-spin" />
      </div>
    );
  }

  if (data.vendedores.length === 0) {
    return (
      <div className="card-gradient rounded-xl border border-border p-12 text-center">
        <Users className="h-10 w-10 text-muted-foreground mx-auto mb-2" />
        <p className="text-sm text-muted-foreground">Nenhum vendedor encontrado</p>
      </div>
    );
  }

  const top5 = data.vendedores.slice(0, 5);

  return (
    <div className="space-y-6">
      {/* Comparativo de vendedores - Gráfico de barras agrupadas */}
      <div className="card-gradient rounded-xl border border-border p-6">
        <h3 className="text-base font-semibold text-foreground mb-1">Comparativo de Vendedores</h3>
        <p className="text-xs text-muted-foreground mb-4">Métricas lado a lado (mês atual)</p>
        <BarChart
          xAxis={[
            {
              scaleType: "band",
              data: top5.map((v) => v.nome.split(" ")[0]),
              tickLabelStyle: { fontSize: 11 },
            },
          ]}
          series={[
            {
              data: top5.map((v) => v.leads),
              label: "Leads",
              color: "#6366f1",
            },
            {
              data: top5.map((v) => v.qualificados),
              label: "Qualificados",
              color: "#10b981",
            },
            {
              data: top5.map((v) => v.vendas),
              label: "Vendas",
              color: "#f59e0b",
            },
            {
              data: top5.map((v) => v.buscas),
              label: "Buscas",
              color: "#3b82f6",
            },
          ]}
          height={350}
        />
      </div>

      {/* Taxa de conversão individual (gauges) */}
      <div className="card-gradient rounded-xl border border-border p-6">
        <h3 className="text-base font-semibold text-foreground mb-1">Taxa de Conversão Individual</h3>
        <p className="text-xs text-muted-foreground mb-4">Percentual de leads convertidos em vendas</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-6">
          {top5.map((v) => (
            <div key={v.id} className="flex flex-col items-center">
              <Gauge
                value={v.taxaConversao}
                width={120}
                height={120}
                startAngle={-110}
                endAngle={110}
                sx={{
                  [`& .${gaugeClasses.valueText}`]: {
                    fontSize: 16,
                    fontWeight: 700,
                    transform: "translate(0px, 0px)",
                  },
                  [`& .${gaugeClasses.valueArc}`]: {
                    fill: v.taxaConversao >= 20 ? "#10b981" : v.taxaConversao >= 10 ? "#f59e0b" : "#ef4444",
                  },
                }}
                text={({ value }) => `${value}%`}
              />
              <span className="text-xs font-medium text-foreground mt-1 text-center truncate max-w-full">
                {v.nome.split(" ")[0]}
              </span>
              <span className="text-[10px] text-muted-foreground">
                {v.vendas}/{v.leads} leads
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Tabela detalhada de vendedores */}
      <div className="card-gradient rounded-xl border border-border overflow-hidden">
        <div className="p-6 pb-3">
          <h3 className="text-base font-semibold text-foreground mb-1">Performance Detalhada</h3>
          <p className="text-xs text-muted-foreground">Todas as métricas por vendedor no mês atual</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-t border-border">
                <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Vendedor
                </th>
                <th className="text-center px-3 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Leads
                </th>
                <th className="text-center px-3 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Qualificados
                </th>
                <th className="text-center px-3 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Vendas
                </th>
                <th className="text-center px-3 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Buscas
                </th>
                <th className="text-center px-3 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Conversão
                </th>
                <th className="text-right px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Valor Total
                </th>
              </tr>
            </thead>
            <tbody>
              {data.vendedores.map((v, i) => (
                <tr key={v.id} className="border-b border-border/50 hover:bg-muted/50 transition-colors">
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 shrink-0 rounded-full bg-muted overflow-hidden flex items-center justify-center">
                        {v.avatar_url ? (
                          <img src={v.avatar_url} alt="" className="h-full w-full object-cover" />
                        ) : (
                          <span className="text-xs font-semibold text-muted-foreground uppercase">
                            {v.nome.charAt(0)}
                          </span>
                        )}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground">{v.nome}</p>
                        {i === 0 && (
                          <span className="inline-flex items-center gap-1 text-[10px] text-amber-600 font-medium">
                            <Trophy className="h-3 w-3" /> Top vendedor
                          </span>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="text-center px-3 py-3 text-sm font-medium">{v.leads}</td>
                  <td className="text-center px-3 py-3 text-sm font-medium text-emerald-600">{v.qualificados}</td>
                  <td className="text-center px-3 py-3 text-sm font-bold text-primary">{v.vendas}</td>
                  <td className="text-center px-3 py-3 text-sm text-muted-foreground">{v.buscas}</td>
                  <td className="text-center px-3 py-3">
                    <span
                      className={cn(
                        "text-xs font-bold px-2 py-0.5 rounded-full",
                        v.taxaConversao >= 20
                          ? "bg-emerald-500/15 text-emerald-700"
                          : v.taxaConversao >= 10
                            ? "bg-amber-500/15 text-amber-700"
                            : "bg-red-500/15 text-red-700"
                      )}
                    >
                      {v.taxaConversao}%
                    </span>
                  </td>
                  <td className="text-right px-5 py-3 text-sm font-medium">{formatCurrency(v.valorTotal)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Atingimento de metas por vendedor */}
      {data.vendedores.some((v) => v.metasAtingidas.length > 0) && (
        <div className="card-gradient rounded-xl border border-border p-6">
          <h3 className="text-base font-semibold text-foreground mb-1">Atingimento de Metas</h3>
          <p className="text-xs text-muted-foreground mb-4">Progresso de cada vendedor em relação às metas definidas</p>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {data.vendedores.slice(0, 6).map((v) => (
              <div key={v.id} className="bg-muted/30 rounded-lg p-4 border border-border/50">
                <div className="flex items-center gap-2 mb-3">
                  <div className="h-7 w-7 shrink-0 rounded-full bg-muted overflow-hidden flex items-center justify-center">
                    {v.avatar_url ? (
                      <img src={v.avatar_url} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <span className="text-[10px] font-semibold text-muted-foreground uppercase">
                        {v.nome.charAt(0)}
                      </span>
                    )}
                  </div>
                  <span className="text-sm font-semibold text-foreground truncate">{v.nome}</span>
                </div>
                <div className="space-y-2.5">
                  {v.metasAtingidas.map((m, i) => (
                    <div key={i}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-muted-foreground">{m.nome}</span>
                        <span className="text-xs font-medium text-foreground">
                          {m.atual}/{m.meta}
                        </span>
                      </div>
                      <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                        <div
                          className={cn(
                            "h-full rounded-full transition-all",
                            m.percentual >= 100
                              ? "bg-emerald-500"
                              : m.percentual >= 50
                                ? "bg-amber-500"
                                : "bg-red-500"
                          )}
                          style={{ width: `${Math.min(m.percentual, 100)}%` }}
                        />
                      </div>
                      <p className="text-[10px] text-right mt-0.5">
                        <span
                          className={cn(
                            "font-medium",
                            m.percentual >= 100
                              ? "text-emerald-600"
                              : m.percentual >= 50
                                ? "text-amber-600"
                                : "text-red-500"
                          )}
                        >
                          {m.percentual}%
                        </span>
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ═══════════ ABA LEADS ═══════════

function TabLeads() {
  const data = useRelatorios();

  if (data.loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 text-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          icon={Users}
          label="Total de Leads"
          value={String(data.totalLeads)}
          subtitle={`${data.leadsComValor} com valor atribuído`}
        />
        <MetricCard
          icon={MessageCircle}
          label="Com WhatsApp"
          value={`${data.whatsappStats.total > 0 ? Math.round((data.whatsappStats.comWhatsapp / data.whatsappStats.total) * 100) : 0}%`}
          subtitle={`${data.whatsappStats.comWhatsapp} de ${data.whatsappStats.total} leads`}
          iconBg="bg-emerald-500/10"
          iconColor="text-emerald-600"
        />
        <MetricCard
          icon={Star}
          label="Rating Médio"
          value={`★ ${data.ratingMedio}`}
          subtitle="Média de avaliação dos leads"
          iconBg="bg-amber-500/10"
          iconColor="text-amber-600"
        />
        <MetricCard
          icon={PieChartIcon}
          label="Origens de Busca"
          value={String(data.leadsPorOrigem.length)}
          subtitle="Canais diferentes de prospecção"
          iconBg="bg-blue-500/10"
          iconColor="text-blue-600"
        />
      </div>

      {/* Leads por período (últimos 6 meses) */}
      <div className="card-gradient rounded-xl border border-border p-6">
        <h3 className="text-base font-semibold text-foreground mb-1">Evolução de Leads Captados</h3>
        <p className="text-xs text-muted-foreground mb-4">Últimos 6 meses</p>
        {data.leadsPorPeriodo.some((p) => p.total > 0) ? (
          <LineChart
            xAxis={[
              {
                scaleType: "point",
                data: data.leadsPorPeriodo.map((p) => p.periodo),
                tickLabelStyle: { fontSize: 11 },
              },
            ]}
            series={[
              {
                data: data.leadsPorPeriodo.map((p) => p.total),
                label: "Leads captados",
                color: "#6366f1",
                area: true,
              },
            ]}
            height={300}
            slotProps={{ legend: { hidden: true } }}
          />
        ) : (
          <p className="text-sm text-muted-foreground text-center py-12">Sem dados no período</p>
        )}
      </div>

      {/* Leads por origem + WhatsApp */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card-gradient rounded-xl border border-border p-6">
          <h3 className="text-base font-semibold text-foreground mb-1">Leads por Origem</h3>
          <p className="text-xs text-muted-foreground mb-4">De onde vêm seus leads</p>
          {data.leadsPorOrigem.length > 0 ? (
            <div className="flex items-center justify-center">
              <PieChart
                series={[
                  {
                    data: data.leadsPorOrigem.map((o, i) => ({
                      id: i,
                      value: o.total,
                      label: o.origem,
                      color: PIE_COLORS[i % PIE_COLORS.length],
                    })),
                    highlightScope: { fade: "global", highlight: "item" },
                    innerRadius: 50,
                    paddingAngle: 2,
                    cornerRadius: 4,
                  },
                ]}
                width={400}
                height={250}
              />
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-12">Sem dados</p>
          )}
        </div>

        <div className="card-gradient rounded-xl border border-border p-6">
          <h3 className="text-base font-semibold text-foreground mb-1">Status WhatsApp</h3>
          <p className="text-xs text-muted-foreground mb-4">Verificação de WhatsApp dos leads</p>
          {data.whatsappStats.total > 0 ? (
            <div className="flex items-center justify-center">
              <PieChart
                series={[
                  {
                    data: [
                      {
                        id: 0,
                        value: data.whatsappStats.comWhatsapp,
                        label: "Com WhatsApp",
                        color: "#10b981",
                      },
                      {
                        id: 1,
                        value: data.whatsappStats.semWhatsapp,
                        label: "Sem WhatsApp",
                        color: "#ef4444",
                      },
                      {
                        id: 2,
                        value: data.whatsappStats.naoVerificado,
                        label: "Não verificado",
                        color: "#94a3b8",
                      },
                    ],
                    highlightScope: { fade: "global", highlight: "item" },
                    innerRadius: 50,
                    paddingAngle: 2,
                    cornerRadius: 4,
                  },
                ]}
                width={400}
                height={250}
              />
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-12">Sem dados</p>
          )}
        </div>
      </div>

      {/* Leads por segmento + por localização */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card-gradient rounded-xl border border-border p-6">
          <h3 className="text-base font-semibold text-foreground mb-1">Top Segmentos</h3>
          <p className="text-xs text-muted-foreground mb-4">Segmentos com mais leads captados</p>
          {data.leadsPorSegmento.length > 0 ? (
            <BarChart
              layout="horizontal"
              yAxis={[
                {
                  scaleType: "band",
                  data: data.leadsPorSegmento.slice(0, 10).map((s) =>
                    s.segmento.length > 20 ? s.segmento.substring(0, 20) + "…" : s.segmento
                  ),
                  tickLabelStyle: { fontSize: 10 },
                },
              ]}
              series={[
                {
                  data: data.leadsPorSegmento.slice(0, 10).map((s) => s.total),
                  label: "Leads",
                  color: "#6366f1",
                },
              ]}
              height={360}
              slotProps={{ legend: { hidden: true } }}
            />
          ) : (
            <p className="text-sm text-muted-foreground text-center py-12">Sem dados</p>
          )}
        </div>

        <div className="card-gradient rounded-xl border border-border p-6">
          <h3 className="text-base font-semibold text-foreground mb-1">Top Localizações</h3>
          <p className="text-xs text-muted-foreground mb-4">Cidades/regiões com mais leads</p>
          {data.leadsPorLocalizacao.length > 0 ? (
            <BarChart
              layout="horizontal"
              yAxis={[
                {
                  scaleType: "band",
                  data: data.leadsPorLocalizacao.slice(0, 10).map((l) =>
                    l.localizacao.length > 25 ? l.localizacao.substring(0, 25) + "…" : l.localizacao
                  ),
                  tickLabelStyle: { fontSize: 10 },
                },
              ]}
              series={[
                {
                  data: data.leadsPorLocalizacao.slice(0, 10).map((l) => l.total),
                  label: "Leads",
                  color: "#8b5cf6",
                },
              ]}
              height={360}
              slotProps={{ legend: { hidden: true } }}
            />
          ) : (
            <p className="text-sm text-muted-foreground text-center py-12">Sem dados</p>
          )}
        </div>
      </div>

      {/* Tabela detalhada de segmentos */}
      <div className="card-gradient rounded-xl border border-border overflow-hidden">
        <div className="p-6 pb-3">
          <h3 className="text-base font-semibold text-foreground mb-1">Análise por Segmento</h3>
          <p className="text-xs text-muted-foreground">Detalhamento de métricas por segmento de busca</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-t border-border">
                <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Segmento
                </th>
                <th className="text-center px-3 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Total
                </th>
                <th className="text-center px-3 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Com WhatsApp
                </th>
                <th className="text-center px-3 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  % WhatsApp
                </th>
                <th className="text-right px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Valor Total
                </th>
              </tr>
            </thead>
            <tbody>
              {data.leadsPorSegmento.map((s, i) => (
                <tr key={i} className="border-b border-border/50 hover:bg-muted/50 transition-colors">
                  <td className="px-5 py-3 text-sm font-medium text-foreground">{s.segmento}</td>
                  <td className="text-center px-3 py-3 text-sm">{s.total}</td>
                  <td className="text-center px-3 py-3 text-sm text-emerald-600 font-medium">
                    {s.comWhatsapp}
                  </td>
                  <td className="text-center px-3 py-3">
                    <span
                      className={cn(
                        "text-xs font-bold px-2 py-0.5 rounded-full",
                        s.total > 0 && (s.comWhatsapp / s.total) * 100 >= 50
                          ? "bg-emerald-500/15 text-emerald-700"
                          : "bg-amber-500/15 text-amber-700"
                      )}
                    >
                      {s.total > 0 ? Math.round((s.comWhatsapp / s.total) * 100) : 0}%
                    </span>
                  </td>
                  <td className="text-right px-5 py-3 text-sm font-medium">{formatCurrency(s.valorTotal)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ═══════════ PÁGINA PRINCIPAL ═══════════

export default function Relatorios() {
  const [activeTab, setActiveTab] = useState("funil");

  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-foreground">Relatórios</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Análise completa da performance de vendas, funil e prospecção
          </p>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3 max-w-md">
            <TabsTrigger value="funil" className="gap-2">
              <BarChart3 className="h-4 w-4" />
              Funil
            </TabsTrigger>
            <TabsTrigger value="performance" className="gap-2">
              <Users className="h-4 w-4" />
              Performance
            </TabsTrigger>
            <TabsTrigger value="leads" className="gap-2">
              <PieChartIcon className="h-4 w-4" />
              Leads
            </TabsTrigger>
          </TabsList>

          <TabsContent value="funil" className="mt-6">
            <TabFunil />
          </TabsContent>

          <TabsContent value="performance" className="mt-6">
            <TabPerformance />
          </TabsContent>

          <TabsContent value="leads" className="mt-6">
            <TabLeads />
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
