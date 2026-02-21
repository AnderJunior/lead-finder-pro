import { Clock, Search, MapPin, Loader2 } from "lucide-react";
import type { BuscaRealizada } from "@/lib/supabase-functions";

function formatRelativeTime(dateStr: string): string {
  const now = Date.now();
  const diff = now - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) return "Agora";
  if (minutes < 60) return `Há ${minutes}min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `Há ${hours}h`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "Ontem";
  return `${days} dias atrás`;
}

interface RecentSearchesProps {
  buscas?: BuscaRealizada[];
  loading?: boolean;
}

export function RecentSearches({ buscas = [], loading = false }: RecentSearchesProps) {
  return (
    <div className="card-gradient rounded-xl border border-border p-5 animate-fade-in flex flex-col h-full">
      <div className="flex items-center gap-2 mb-4">
        <Clock className="h-4 w-4 text-muted-foreground" />
        <h3 className="text-sm font-semibold text-foreground">Buscas Recentes</h3>
      </div>

      {loading ? (
        <div className="flex items-center justify-center flex-1">
          <Loader2 className="h-5 w-5 text-primary animate-spin" />
        </div>
      ) : buscas.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center flex-1 flex items-center justify-center">
          Nenhuma busca realizada ainda.
        </p>
      ) : (
        <div className="flex flex-col gap-2 flex-1 overflow-y-auto pr-1">
          {buscas.map((s) => (
            <div
              key={s.id}
              className="flex items-center justify-between p-2.5 rounded-lg bg-muted/50 hover:bg-muted transition-colors cursor-pointer flex-1"
            >
              <div className="flex items-center gap-3 min-w-0">
                <Search className="h-3.5 w-3.5 text-primary shrink-0" />
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">
                    {s.segmento || "Sem segmento"}
                  </p>
                  {s.localizacao && (
                    <div className="flex items-center gap-1 mt-0.5">
                      <MapPin className="h-3 w-3 text-muted-foreground shrink-0" />
                      <span className="text-xs text-muted-foreground truncate">{s.localizacao}</span>
                    </div>
                  )}
                </div>
              </div>
              <div className="text-right shrink-0 ml-2">
                <p className="text-xs text-muted-foreground whitespace-nowrap">
                  {formatRelativeTime(s.created_at)}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
