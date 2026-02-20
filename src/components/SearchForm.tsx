import { Search, MapPin, Loader2 } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useNavigate } from "react-router-dom";

export function SearchForm() {
  const [term, setTerm] = useState("");
  const [location, setLocation] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!term.trim() || !location.trim()) return;
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      navigate(`/leads?q=${encodeURIComponent(term)}&loc=${encodeURIComponent(location)}`);
    }, 800);
  };

  return (
    <form onSubmit={handleSearch} className="card-gradient rounded-xl border border-border p-6 animate-fade-in">
      <h2 className="text-lg font-semibold text-foreground mb-1">Nova Prospecção</h2>
      <p className="text-sm text-muted-foreground mb-5">Busque empresas por segmento e localização</p>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={term}
            onChange={(e) => setTerm(e.target.value)}
            placeholder="Ex: Restaurantes, Clínicas, Academias..."
            className="pl-10 bg-muted border-border text-foreground placeholder:text-muted-foreground"
          />
        </div>
        <div className="relative flex-1">
          <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="Ex: São Paulo, SP"
            className="pl-10 bg-muted border-border text-foreground placeholder:text-muted-foreground"
          />
        </div>
        <Button type="submit" disabled={loading || !term.trim() || !location.trim()} className="px-8">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Buscar"}
        </Button>
      </div>
    </form>
  );
}
