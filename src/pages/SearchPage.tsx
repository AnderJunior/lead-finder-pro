import { useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { SearchForm } from "@/components/SearchForm";
import { MapSearch } from "@/components/MapSearch";
import { MapPin, Search, Map } from "lucide-react";
import { cn } from "@/lib/utils";

const tabs = [
  { id: "search" as const, label: "Nova Prospecção", icon: Search },
  { id: "map" as const, label: "Mapa", icon: Map },
];

const SearchPage = () => {
  const [activeTab, setActiveTab] = useState<"search" | "map">("search");

  return (
    <AppLayout>
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center pt-4">
          <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 mb-4 animate-pulse-glow">
            <MapPin className="h-7 w-7 text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">Nova Prospecção</h1>
          <p className="text-sm text-muted-foreground mt-2 max-w-md mx-auto">
            Encontre empresas por segmento e localização ou selecione uma área no mapa.
          </p>
        </div>

        {/* Tabs */}
        <div className="flex justify-center">
          <div className="inline-flex rounded-lg border border-border bg-muted p-1 gap-1">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-all duration-200",
                  activeTab === tab.id
                    ? "bg-card text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <tab.icon className="h-4 w-4" />
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        {activeTab === "search" ? (
          <div className="space-y-8">
            <SearchForm />
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {[
                { title: "Seja específico", desc: "Use termos como 'Clínica Odontológica' ao invés de 'Dentista'" },
                { title: "Defina a região", desc: "Inclua cidade e estado para resultados mais precisos" },
                { title: "Use filtros", desc: "Após a busca, filtre por avaliação e status" },
              ].map((tip, i) => (
                <div key={i} className="card-gradient rounded-xl border border-border p-4 animate-fade-in" style={{ animationDelay: `${i * 100}ms` }}>
                  <h3 className="text-sm font-semibold text-foreground mb-1">{tip.title}</h3>
                  <p className="text-xs text-muted-foreground">{tip.desc}</p>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <MapSearch />
        )}
      </div>
    </AppLayout>
  );
};

export default SearchPage;
