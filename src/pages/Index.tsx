import { AppLayout } from "@/components/AppLayout";
import { SearchForm } from "@/components/SearchForm";
import { StatCard } from "@/components/StatCard";
import { RecentSearches } from "@/components/RecentSearches";
import { Badge } from "@/components/ui/badge";
import { Users, Search, Star, TrendingUp, Loader2 } from "lucide-react";
import { useDashboardStats } from "@/hooks/useDashboardStats";
import { cn } from "@/lib/utils";

function formatNumber(n: number): string {
  return n.toLocaleString("pt-BR");
}

const Dashboard = () => {
  const stats = useDashboardStats();

  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-1">Visão geral da sua prospecção</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
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
          />
          <StatCard
            icon={TrendingUp}
            label="Taxa de Conversão"
            value={stats.loading ? "..." : `${stats.taxaConversao.toFixed(1)}%`}
            change={stats.changeTaxa}
            positive={stats.changeTaxaPositive}
          />
        </div>

        {/* Search + Recent */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <SearchForm />
          </div>
          <RecentSearches buscas={stats.buscasRecentes} loading={stats.loading} />
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
                        <td className="px-5 py-4">
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
