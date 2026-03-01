import { useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { VendedorCards } from "@/components/VendedorCards";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Users,
  Search,
  Star,
  Trophy,
  Calendar,
  Loader2,
  Medal,
} from "lucide-react";
import { useDashboardStats, type VendedorPeriodo } from "@/hooks/useDashboardStats";
import { useAuth } from "@/contexts/AuthContext";

const PERIODO_LABELS: Record<VendedorPeriodo, string> = {
  tudo: "Todo o período",
  diario: "Hoje",
  semanal: "Esta semana",
  mensal: "Este mês",
  mes_anterior: "Mês passado",
};

function formatNumber(n: number): string {
  return n.toLocaleString("pt-BR");
}

const Ranking = () => {
  const stats = useDashboardStats();
  const { isAdmin, dbUser } = useAuth();
  const [periodo, setPeriodo] = useState<VendedorPeriodo>("mensal");

  const vendedores = stats.vendedoresPorPeriodo[periodo];
  const top4 = vendedores.slice(0, 4);

  const meusDados = dbUser
    ? vendedores.find((v) => v.id === dbUser.id)
    : null;

  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                <Medal className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-foreground">Ranking</h1>
                <p className="text-sm text-muted-foreground mt-0.5">
                  Performance dos vendedores
                </p>
              </div>
            </div>
          </div>
          <Select value={periodo} onValueChange={(v) => setPeriodo(v as VendedorPeriodo)}>
            <SelectTrigger className="w-[160px] h-9 bg-white">
              <Calendar className="h-3.5 w-3.5 mr-2 text-muted-foreground" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="tudo">Todo o período</SelectItem>
              <SelectItem value="diario">Hoje</SelectItem>
              <SelectItem value="semanal">Esta semana</SelectItem>
              <SelectItem value="mensal">Este mês</SelectItem>
              <SelectItem value="mes_anterior">Mês passado</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Top 4 */}
        <div>
          <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
            <Trophy className="h-5 w-5 text-yellow-500" />
            Top 4 Vendedores
          </h2>
          <VendedorCards vendedores={top4} loading={stats.loading} />
        </div>

        {/* Admin: tabela completa / Vendedor: seus dados */}
        {isAdmin ? (
          <div>
            <h2 className="text-lg font-semibold text-foreground mb-4">
              Todos os Vendedores
            </h2>
            {stats.loading ? (
              <div className="card-gradient rounded-xl border border-border p-12 flex items-center justify-center">
                <Loader2 className="h-6 w-6 text-primary animate-spin" />
              </div>
            ) : vendedores.length === 0 ? (
              <div className="card-gradient rounded-xl border border-border p-12 text-center">
                <Users className="h-10 w-10 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">
                  Nenhum vendedor encontrado.
                </p>
              </div>
            ) : (
              <div className="card-gradient rounded-xl border border-border overflow-hidden animate-fade-in">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-border bg-muted/30">
                        <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                          #
                        </th>
                        <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                          Vendedor
                        </th>
                        <th className="text-center px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                          Leads Captados
                        </th>
                        <th className="text-center px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                          Leads Qualificados
                        </th>
                        <th className="text-center px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                          Vendas Realizadas
                        </th>
                        <th className="text-center px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                          Buscas Feitas
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {vendedores.map((v, i) => (
                        <tr
                          key={v.id}
                          className="border-b border-border/50 hover:bg-muted/50 transition-colors"
                        >
                          <td className="px-5 py-4">
                            <RankBadge rank={i + 1} />
                          </td>
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-3">
                              {v.avatar_url ? (
                                <img
                                  src={v.avatar_url}
                                  alt={v.nome}
                                  className="h-9 w-9 rounded-full object-cover border border-border"
                                />
                              ) : (
                                <div className="h-9 w-9 rounded-full bg-primary flex items-center justify-center text-xs font-bold text-primary-foreground border border-border">
                                  {getInitials(v.nome)}
                                </div>
                              )}
                              <span className="font-medium text-sm text-foreground">
                                {v.nome}
                              </span>
                            </div>
                          </td>
                          <td className="px-5 py-4 text-center">
                            <span className="text-sm font-semibold text-foreground">
                              {formatNumber(v.leads)}
                            </span>
                          </td>
                          <td className="px-5 py-4 text-center">
                            <span className="text-sm font-semibold text-foreground">
                              {formatNumber(v.qualificados)}
                            </span>
                          </td>
                          <td className="px-5 py-4 text-center">
                            <span className="text-sm font-semibold text-foreground">
                              {formatNumber(v.vendas)}
                            </span>
                          </td>
                          <td className="px-5 py-4 text-center">
                            <span className="text-sm font-semibold text-foreground">
                              {formatNumber(v.buscas)}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div>
            <h2 className="text-lg font-semibold text-foreground mb-4">
              Minha Performance
            </h2>
            {stats.loading ? (
              <div className="card-gradient rounded-xl border border-border p-12 flex items-center justify-center">
                <Loader2 className="h-6 w-6 text-primary animate-spin" />
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <MetricCard
                  icon={<Users className="h-5 w-5 text-primary" />}
                  label="Leads Captados"
                  value={meusDados?.leads ?? stats.totalLeads}
                />
                <MetricCard
                  icon={<Star className="h-5 w-5 text-yellow-500" />}
                  label="Leads Qualificados"
                  value={meusDados?.qualificados ?? stats.leadsQualificados}
                />
                <MetricCard
                  icon={<Trophy className="h-5 w-5 text-emerald-500" />}
                  label="Vendas Realizadas"
                  value={meusDados?.vendas ?? stats.ganhos}
                />
                <MetricCard
                  icon={<Search className="h-5 w-5 text-blue-500" />}
                  label="Buscas Feitas"
                  value={meusDados?.buscas ?? stats.totalBuscas}
                />
              </div>
            )}
          </div>
        )}
      </div>
    </AppLayout>
  );
};

function MetricCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
}) {
  return (
    <div className="card-gradient rounded-xl border border-border p-6 animate-fade-in">
      <div className="flex items-center gap-3 mb-4">
        <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
          {icon}
        </div>
        <span className="text-sm font-medium text-muted-foreground">{label}</span>
      </div>
      <p className="text-3xl font-bold text-foreground">
        {value.toLocaleString("pt-BR")}
      </p>
    </div>
  );
}

const RANK_COLORS = [
  "bg-yellow-500 text-white",
  "bg-gray-400 text-white",
  "bg-amber-700 text-white",
];

function RankBadge({ rank }: { rank: number }) {
  if (rank <= 3) {
    return (
      <div
        className={`h-7 w-7 rounded-full flex items-center justify-center text-xs font-bold ${RANK_COLORS[rank - 1]}`}
      >
        {rank}º
      </div>
    );
  }
  return (
    <span className="text-sm font-medium text-muted-foreground pl-1.5">
      {rank}º
    </span>
  );
}

function getInitials(nome: string): string {
  const parts = nome.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export default Ranking;
