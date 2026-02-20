import { useEffect, useRef, useState, useCallback } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Search, Loader2, Square, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface SelectedArea {
  northEast: { lat: number; lng: number };
  southWest: { lat: number; lng: number };
}

export function MapSearch() {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const rectRef = useRef<L.Rectangle | null>(null);
  const startRef = useRef<L.LatLng | null>(null);

  const [segment, setSegment] = useState("");
  const [area, setArea] = useState<SelectedArea | null>(null);
  const [drawing, setDrawing] = useState(false);
  const [loading, setLoading] = useState(false);
  const drawingRef = useRef(drawing);

  useEffect(() => {
    drawingRef.current = drawing;
  }, [drawing]);

  // Init map
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: [-23.5505, -46.6333],
      zoom: 12,
    });

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(map);

    map.on("mousedown", (e: L.LeafletMouseEvent) => {
      if (!drawingRef.current) return;
      startRef.current = e.latlng;
      if (rectRef.current) {
        map.removeLayer(rectRef.current);
        rectRef.current = null;
      }
    });

    map.on("mousemove", (e: L.LeafletMouseEvent) => {
      if (!drawingRef.current || !startRef.current) return;
      const bounds = L.latLngBounds(startRef.current, e.latlng);
      if (rectRef.current) {
        rectRef.current.setBounds(bounds);
      } else {
        rectRef.current = L.rectangle(bounds, {
          color: "hsl(217, 91%, 50%)",
          weight: 2,
          fillOpacity: 0.15,
        }).addTo(map);
      }
    });

    map.on("mouseup", (e: L.LeafletMouseEvent) => {
      if (!drawingRef.current || !startRef.current) return;
      const bounds = L.latLngBounds(startRef.current, e.latlng);
      setArea({
        northEast: { lat: bounds.getNorthEast().lat, lng: bounds.getNorthEast().lng },
        southWest: { lat: bounds.getSouthWest().lat, lng: bounds.getSouthWest().lng },
      });
      setDrawing(false);
      startRef.current = null;
    });

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Toggle dragging based on drawing state
  useEffect(() => {
    if (!mapRef.current) return;
    if (drawing) {
      mapRef.current.dragging.disable();
      mapRef.current.getContainer().style.cursor = "crosshair";
    } else {
      mapRef.current.dragging.enable();
      mapRef.current.getContainer().style.cursor = "";
    }
  }, [drawing]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!segment.trim() || !area) return;
    setLoading(true);
    setTimeout(() => setLoading(false), 1000);
  };

  const clearArea = useCallback(() => {
    setArea(null);
    if (rectRef.current && mapRef.current) {
      mapRef.current.removeLayer(rectRef.current);
      rectRef.current = null;
    }
  }, []);

  return (
    <div className="card-gradient rounded-xl border border-border overflow-hidden animate-fade-in">
      {/* Controls */}
      <form onSubmit={handleSearch} className="p-4 border-b border-border flex flex-col sm:flex-row gap-3">
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
          <Button type="button" variant="outline" size="sm" className="gap-2 shrink-0" onClick={clearArea}>
            <Trash2 className="h-3.5 w-3.5" />
            Limpar
          </Button>
        )}
        <Button type="submit" disabled={loading || !segment.trim() || !area} className="px-6 shrink-0">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Buscar na Área"}
        </Button>
      </form>

      {/* Info */}
      <div className="px-4 py-2 bg-muted/50 border-b border-border">
        <span className="text-xs text-muted-foreground">
          {area
            ? '✅ Área selecionada — Clique em "Buscar na Área" para prospectar'
            : drawing
            ? "🖱️ Clique e arraste no mapa para selecionar a área"
            : '📍 Clique em "Selecionar Área" e desenhe um retângulo no mapa'}
        </span>
      </div>

      {/* Map */}
      <div ref={mapContainerRef} className="h-[500px] w-full" />
    </div>
  );
}
