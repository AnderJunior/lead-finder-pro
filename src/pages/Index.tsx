import { useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { SearchForm } from "@/components/SearchForm";
import { StatCard } from "@/components/StatCard";
import { GoalCards } from "@/components/GoalCards";
import { VendedorCards } from "@/components/VendedorCards";
import { RecentSearches } from "@/components/RecentSearches";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Users, Search, Star, Trophy, XCircle, Loader2, Calendar } from "lucide-react";
import { useDashboardStats, type VendedorPeriodo } from "@/hooks/useDashboardStats";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";

function formatNumber(n: number): string {
  return n.toLocaleString("pt-BR");
}

const PERIODO_LABELS: Record<VendedorPeriodo, string> = {
  diario: "Hoje",
  semanal: "Esta semana",
  mensal: "Este mês",
};

const Dashboard = () => {
  const stats = useDashboardStats();
  const { isAdmin } = useAuth();
  const [vendedorPeriodo, setVendedorPeriodo] = useState<VendedorPeriodo>("mensal");
  const [metaVendedorId, setMetaVendedorId] = useState<string>("me");

  const metaVendas = metaVendedorId === "me"
    ? stats.vendasMes
    : (stats.vendedorMetas[Number(metaVendedorId)]?.vendasMes ?? 0);
  const metaContatos = metaVendedorId === "me"
    ? stats.contatosMes
    : (stats.vendedorMetas[Number(metaVendedorId)]?.contatosMes ?? 0);
  const metaMetas = metaVendedorId === "me"
    ? stats.metas
    : (stats.vendedorMetas[Number(metaVendedorId)]?.metas ?? stats.metas);

  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-1">Visão geral da sua prospecção</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <StatCard
            icon={Users}
            label="Total de Leads"
            value={stats.loading ? "..." : formatNumber(stats.totalLeads)}
            change={stats.changeLeads}
            positive={stats.changeLeadsPositive}
          />
          <StatCard
            icon={Search}
            label="Buscas Realizadas"
            value={stats.loading ? "..." : formatNumber(stats.totalBuscas)}
            change={stats.changeBuscas}
            positive={stats.changeBuscasPositive}
          />
          <StatCard
            icon={Star}
            label="Leads Qualificados"
            value={stats.loading ? "..." : formatNumber(stats.leadsQualificados)}
            change={stats.changeQualificados}
            positive={stats.changeQualificadosPositive}
            subtitle={stats.loading ? undefined : `${stats.totalLeads > 0 ? ((stats.leadsQualificados / stats.totalLeads) * 100).toFixed(1) : "0"}% de todos os leads`}
            subtitleClass="text-emerald-600"
          />
          <StatCard
            icon={Trophy}
            label="Ganhos"
            value={stats.loading ? "..." : formatNumber(stats.ganhos)}
            change={stats.changeGanhos}
            positive={stats.changeGanhosPositive}
            iconBgClass="bg-emerald-500/10"
            iconClass="text-emerald-600"
            subtitle={stats.loading ? undefined : `${stats.totalLeads > 0 ? ((stats.ganhos / stats.totalLeads) * 100).toFixed(1) : "0"}% de taxa de conversão`}
            subtitleClass="text-emerald-600"
          />
          <StatCard
            icon={XCircle}
            label="Descartados"
            value={stats.loading ? "..." : formatNumber(stats.descartados)}
            change={stats.changeDescartados}
            positive={stats.changeDescartadosPositive}
            iconBgClass="bg-red-500/10"
            iconClass="text-red-500"
            subtitle={stats.loading ? undefined : `${stats.totalLeads > 0 ? ((stats.descartados / stats.totalLeads) * 100).toFixed(1) : "0"}% de todos os leads`}
            subtitleClass="text-red-500"
          />
        </div>

        {/* Search + Recent */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <SearchForm />
          </div>
          <RecentSearches buscas={stats.buscasRecentes} loading={stats.loading} />
        </div>

        {/* Goal Cards */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-foreground">Performance das Meta</h2>
            {isAdmin && stats.vendedores.length > 0 && (
              <Select value={metaVendedorId} onValueChange={setMetaVendedorId}>
                <SelectTrigger className="h-9 w-[180px] bg-white text-sm">
                  <SelectValue placeholder="Vendedor" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="me">Meta Geral</SelectItem>
                  {stats.vendedores.map((v) => (
                    <SelectItem key={v.id} value={String(v.id)}>{v.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
          <GoalCards vendasMes={metaVendas} contatosMes={metaContatos} metas={metaMetas} loading={stats.loading} />
        </div>

        {/* Vendedores */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <h2 className="text-lg font-semibold text-foreground">Performance por Vendedor</h2>
            <Select value={vendedorPeriodo} onValueChange={(v) => setVendedorPeriodo(v as VendedorPeriodo)}>
              <SelectTrigger className="w-[160px] h-9 bg-white">
                <Calendar className="h-3.5 w-3.5 mr-2 text-muted-foreground" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="diario">Hoje</SelectItem>
                <SelectItem value="semanal">Esta semana</SelectItem>
                <SelectItem value="mensal">Este mês</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <p className="text-sm text-muted-foreground mb-4">Ranking — {PERIODO_LABELS[vendedorPeriodo]}</p>
          <VendedorCards vendedores={stats.vendedoresPorPeriodo[vendedorPeriodo]} loading={stats.loading} />
        </div>

        {/* Recent Leads */}
        <div>
          <h2 className="text-lg font-semibold text-foreground mb-4">Leads Captados Recentemente</h2>
          {stats.loading ? (
            <div className="card-gradient rounded-xl border border-border p-12 flex items-center justify-center">
              <Loader2 className="h-6 w-6 text-primary animate-spin" />
            </div>
          ) : stats.leadsRecentes.length === 0 ? (
            <div className="card-gradient rounded-xl border border-border p-12 text-center">
              <Users className="h-10 w-10 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">
                Nenhum lead captado ainda. Vá para Nova Busca e capte seus primeiros leads!
              </p>
            </div>
          ) : (
            <div className="card-gradient rounded-xl border border-border overflow-hidden animate-fade-in">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider max-w-[280px]">
                        Empresa
                      </th>
                      <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                        Telefone
                      </th>
                      <th className="text-center px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                        Avaliação
                      </th>
                      <th className="text-center px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                        WhatsApp
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.leadsRecentes.map((lead, i) => (
                      <tr
                        key={lead.id}
                        className="border-b border-border/50 hover:bg-muted/50 transition-colors"
                        style={{ animationDelay: `${i * 50}ms` }}
                      >
                        <td className="px-5 py-4 max-w-[280px]">
                          <div className="min-w-0">
                            <p className="font-medium text-sm text-foreground truncate">
                              {lead.nome}
                            </p>
                            <p className="text-xs text-muted-foreground mt-0.5 truncate">
                              {lead.endereco || "—"}
                            </p>
                            {lead.website && (
                              <a
                                href={
                                  lead.website.startsWith("http")
                                    ? lead.website
                                    : `https://${lead.website}`
                                }
                                target="_blank"
                                rel="noreferrer"
                                className="text-xs text-primary hover:underline mt-0.5 block truncate"
                              >
                                {lead.website}
                              </a>
                            )}
                          </div>
                        </td>
                        <td className="px-5 py-4 text-sm text-secondary-foreground font-mono">
                          {lead.telefone || "—"}
                        </td>
                        <td className="px-5 py-4">
                          <div className="flex flex-col items-center">
                            <span className="text-sm font-semibold text-warning">
                              ★ {lead.rating ?? 0}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              ({lead.avaliacoes ?? 0})
                            </span>
                          </div>
                        </td>
                        <td className="px-5 py-4 text-center">
                          <Badge
                            variant="outline"
                            className={cn(
                              "text-xs font-medium",
                              lead.has_whatsapp === true &&
                                "bg-green-500/15 text-green-700 border-green-500/30",
                              lead.has_whatsapp === false &&
                                "bg-red-500/15 text-red-700 border-red-500/30",
                              lead.has_whatsapp == null &&
                                "bg-muted text-muted-foreground"
                            )}
                          >
                            {lead.has_whatsapp === true
                              ? "Sim"
                              : lead.has_whatsapp === false
                                ? "Não"
                                : "Não Verificado"}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
};

export default Dashboard;
