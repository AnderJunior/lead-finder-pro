import { Users, Search, Star, Trophy, Loader2, Medal } from "lucide-react";
import type { VendedorStats } from "@/hooks/useDashboardStats";

const RANK_COLORS = [
  "bg-yellow-500 text-white",
  "bg-gray-400 text-white",
  "bg-amber-700 text-white",
];

function getInitials(nome: string): string {
  const parts = nome.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function VendedorCard({
  vendedor,
  rank,
}: {
  vendedor: VendedorStats;
  rank: number;
}) {
  return (
    <div className="card-gradient rounded-xl border border-border overflow-hidden animate-fade-in min-w-[240px]">
      <div className="bg-gradient-to-r from-slate-800 to-slate-700 px-5 py-4 flex items-center gap-3">
        <div className="relative">
          {vendedor.avatar_url ? (
            <img
              src={vendedor.avatar_url}
              alt={vendedor.nome}
              className="h-11 w-11 rounded-full border-2 border-primary/40 object-cover"
            />
          ) : (
            <div className="h-11 w-11 rounded-full border-2 border-primary/40 flex items-center justify-center text-sm font-bold text-primary-foreground bg-primary">
              {getInitials(vendedor.nome)}
            </div>
          )}
          {rank <= 3 && (
            <div
              className={`absolute -bottom-1 -right-1 h-5 w-5 rounded-full flex items-center justify-center ${RANK_COLORS[rank - 1]}`}
            >
              <Medal className="h-3 w-3" />
            </div>
          )}
        </div>
        <div className="min-w-0">
          <p className="font-semibold text-white text-sm truncate">
            {vendedor.nome}
          </p>
          <p className="text-xs text-slate-300">Top {rank} do período</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-x-4 gap-y-3 px-5 py-4">
        <div>
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            <Users className="h-3 w-3" /> Leads
          </p>
          <p className="text-lg font-bold text-foreground">{vendedor.leads}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            <Star className="h-3 w-3" /> Qualificados
          </p>
          <p className="text-lg font-bold text-foreground">
            {vendedor.qualificados}
          </p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            <Trophy className="h-3 w-3" /> Vendas
          </p>
          <p className="text-lg font-bold text-foreground">{vendedor.vendas}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            <Search className="h-3 w-3" /> Buscas
          </p>
          <p className="text-lg font-bold text-foreground">
            {vendedor.buscas}
          </p>
        </div>
      </div>
    </div>
  );
}

interface VendedorCardsProps {
  vendedores: VendedorStats[];
  loading?: boolean;
}

export function VendedorCards({ vendedores, loading }: VendedorCardsProps) {
  if (loading) {
    return (
      <div className="card-gradient rounded-xl border border-border p-12 flex items-center justify-center">
        <Loader2 className="h-6 w-6 text-primary animate-spin" />
      </div>
    );
  }

  if (vendedores.length === 0) {
    return (
      <div className="card-gradient rounded-xl border border-border p-12 text-center">
        <Users className="h-10 w-10 text-muted-foreground mx-auto mb-2" />
        <p className="text-sm text-muted-foreground">
          Nenhum vendedor encontrado.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {vendedores.map((v, i) => (
        <VendedorCard key={v.id} vendedor={v} rank={i + 1} />
      ))}
    </div>
  );
}
