import { AppLayout } from "@/components/AppLayout";
import { SearchForm } from "@/components/SearchForm";
import { MapPin } from "lucide-react";

const SearchPage = () => {
  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="text-center pt-8">
          <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 mb-4 animate-pulse-glow">
            <MapPin className="h-7 w-7 text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">Nova Prospecção</h1>
          <p className="text-sm text-muted-foreground mt-2 max-w-md mx-auto">
            Encontre empresas no Google Maps por segmento e localização. Os resultados serão adicionados à sua lista de leads.
          </p>
        </div>

        <SearchForm />

        {/* Tips */}
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
    </AppLayout>
  );
};

export default SearchPage;
