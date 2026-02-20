/**
 * Formulário de busca integrado - recebe search e loading do parent
 * Preenche os inputs com os valores da URL quando usuário vem da tela principal
 */
import { Search, MapPin, Loader2 } from "lucide-react";
import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";

interface SearchFormIntegratedProps {
  onSearch: (term: string, location: string) => Promise<void>;
  loading: boolean;
  hasSerper?: boolean;
}

export function SearchFormIntegrated({
  onSearch,
  loading,
  hasSerper = false,
}: SearchFormIntegratedProps) {
  const [searchParams] = useSearchParams();
  const qFromUrl = searchParams.get("q") ?? "";
  const locFromUrl = searchParams.get("loc") ?? "";

  const [term, setTerm] = useState(qFromUrl);
  const [location, setLocation] = useState(locFromUrl);

  useEffect(() => {
    setTerm(qFromUrl);
    setLocation(locFromUrl);
  }, [qFromUrl, locFromUrl]);
  const { toast } = useToast();

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!term.trim() || !location.trim()) {
      toast({
        title: "Campos obrigatórios",
        description: "Preencha o termo e a localização.",
        variant: "destructive",
      });
      return;
    }

    try {
      await onSearch(term.trim(), location.trim());
      toast({
        title: "Busca realizada",
        description: "Resultados carregados. Use os filtros para refinar.",
      });
    } catch {
      toast({
        title: "Erro na busca",
        description: "Tente novamente.",
        variant: "destructive",
      });
    }
  };

  return (
    <form
      onSubmit={handleSearch}
      className="card-gradient rounded-xl border border-border p-6 animate-fade-in"
    >
      <h2 className="text-lg font-semibold text-foreground mb-1">Nova Prospecção</h2>
      <p className="text-sm text-muted-foreground mb-5">
        Busque empresas por segmento e localização
        {hasSerper ? " (Serper API)" : " (Google Places)"}
      </p>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={term}
            onChange={(e) => setTerm(e.target.value)}
            placeholder="Ex: Restaurantes, Clínicas, Academias, Petshop..."
            className="pl-10 bg-muted border-border text-foreground placeholder:text-muted-foreground"
          />
        </div>
        <div className="relative flex-1">
          <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="Ex: São Paulo, Salvador, Florianópolis..."
            className="pl-10 bg-muted border-border text-foreground placeholder:text-muted-foreground"
          />
        </div>
        <Button
          type="submit"
          disabled={loading || !term.trim() || !location.trim()}
          className="px-8 shrink-0"
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            "Buscar"
          )}
        </Button>
      </div>
    </form>
  );
}
