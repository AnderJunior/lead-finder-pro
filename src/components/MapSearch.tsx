import { useCallback, useState, useRef } from "react";
import { GoogleMap, useJsApiLoader, DrawingManagerF } from "@react-google-maps/api";
import { Search, Loader2, Square, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface SelectedArea {
  northEast: { lat: number; lng: number };
  southWest: { lat: number; lng: number };
}

const containerStyle = { width: "100%", height: "100%" };
const center = { lat: -23.5505, lng: -46.6333 };

export function MapSearch() {
  const [segment, setSegment] = useState("");
  const [area, setArea] = useState<SelectedArea | null>(null);
  const [drawing, setDrawing] = useState(false);
  const [loading, setLoading] = useState(false);
  const rectRef = useRef<google.maps.Rectangle | null>(null);

  const { isLoaded } = useJsApiLoader({
    id: "google-map-script",
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || "",
    libraries: ["drawing"],
  });

  const onRectangleComplete = useCallback((rectangle: google.maps.Rectangle) => {
    if (rectRef.current) {
      rectRef.current.setMap(null);
    }
    rectRef.current = rectangle;
    const bounds = rectangle.getBounds();
    if (bounds) {
      const ne = bounds.getNorthEast();
      const sw = bounds.getSouthWest();
      setArea({
        northEast: { lat: ne.lat(), lng: ne.lng() },
        southWest: { lat: sw.lat(), lng: sw.lng() },
      });
    }
    setDrawing(false);
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!segment.trim() || !area) return;
    setLoading(true);
    setTimeout(() => setLoading(false), 1000);
  };

  const clearArea = useCallback(() => {
    setArea(null);
    if (rectRef.current) {
      rectRef.current.setMap(null);
      rectRef.current = null;
    }
  }, []);

  if (!isLoaded || !import.meta.env.VITE_GOOGLE_MAPS_API_KEY) {
    return (
      <div className="card-gradient rounded-xl border border-border overflow-hidden animate-fade-in p-8">
        <div className="flex flex-col items-center justify-center text-muted-foreground">
          <p className="text-sm">Configure a chave da API do Google Maps no .env</p>
          <p className="text-xs mt-1">Variável: VITE_GOOGLE_MAPS_API_KEY</p>
        </div>
      </div>
    );
  }

  return (
    <div className="card-gradient rounded-xl border border-border overflow-hidden animate-fade-in">
      <form
        onSubmit={handleSearch}
        className="p-4 border-b border-border flex flex-col sm:flex-row gap-3"
      >
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={segment}
            onChange={(e) => setSegment(e.target.value)}
            placeholder="Segmento: Ex: Restaurantes, Clínicas..."
            className="pl-10 bg-muted border-border text-foreground placeholder:text-muted-foreground"
          />
        </div>
        <Button
          type="button"
          variant={drawing ? "default" : "outline"}
          size="sm"
          className="gap-2 shrink-0"
          onClick={() => setDrawing(!drawing)}
        >
          <Square className="h-3.5 w-3.5" />
          {drawing ? "Selecionando..." : "Selecionar Área"}
        </Button>
        {area && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="gap-2 shrink-0"
            onClick={clearArea}
          >
            <Trash2 className="h-3.5 w-3.5" />
            Limpar
          </Button>
        )}
        <Button
          type="submit"
          disabled={loading || !segment.trim() || !area}
          className="px-6 shrink-0"
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            "Buscar na Área"
          )}
        </Button>
      </form>

      <div className="px-4 py-2 bg-muted/50 border-b border-border">
        <span className="text-xs text-muted-foreground">
          {area
            ? '✅ Área selecionada — Clique em "Buscar na Área" para prospectar'
            : drawing
            ? "🖱️ Clique e arraste no mapa para desenhar um retângulo"
            : '📍 Clique em "Selecionar Área" e desenhe um retângulo no mapa'}
        </span>
      </div>

      <div className="h-[500px] w-full relative">
        <GoogleMap
          mapContainerStyle={containerStyle}
          center={center}
          zoom={12}
          options={{
            disableDefaultUI: false,
            zoomControl: true,
            mapTypeControl: true,
            streetViewControl: false,
            fullscreenControl: true,
          }}
        >
          <DrawingManagerF
            options={{
              drawingControl: false,
              drawingModes: [google.maps.drawing.OverlayType.RECTANGLE],
              rectangleOptions: {
                fillColor: "hsl(217, 91%, 50%)",
                fillOpacity: 0.15,
                strokeColor: "hsl(217, 91%, 50%)",
                strokeWeight: 2,
              },
            }}
            drawingMode={
              drawing ? google.maps.drawing.OverlayType.RECTANGLE : null
            }
            onRectangleComplete={onRectangleComplete}
          />
        </GoogleMap>
      </div>
    </div>
  );
}
