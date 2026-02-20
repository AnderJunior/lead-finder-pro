import { Clock, Search, MapPin, Star } from "lucide-react";

interface RecentSearch {
  term: string;
  location: string;
  results: number;
  time: string;
}

const recentSearches: RecentSearch[] = [
  { term: "Restaurantes", location: "São Paulo, SP", results: 48, time: "Há 2h" },
  { term: "Clínicas Odontológicas", location: "Campinas, SP", results: 23, time: "Há 5h" },
  { term: "Academias", location: "Rio de Janeiro, RJ", results: 67, time: "Ontem" },
  { term: "Pet Shops", location: "Belo Horizonte, MG", results: 31, time: "2 dias atrás" },
];

export function RecentSearches() {
  return (
    <div className="card-gradient rounded-xl border border-border p-5 animate-fade-in">
      <div className="flex items-center gap-2 mb-4">
        <Clock className="h-4 w-4 text-muted-foreground" />
        <h3 className="text-sm font-semibold text-foreground">Buscas Recentes</h3>
      </div>
      <div className="space-y-3">
        {recentSearches.map((s, i) => (
          <div
            key={i}
            className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <Search className="h-3.5 w-3.5 text-primary" />
              <div>
                <p className="text-sm font-medium text-foreground">{s.term}</p>
                <div className="flex items-center gap-1 mt-0.5">
                  <MapPin className="h-3 w-3 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">{s.location}</span>
                </div>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm font-semibold text-foreground">{s.results}</p>
              <p className="text-xs text-muted-foreground">{s.time}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
