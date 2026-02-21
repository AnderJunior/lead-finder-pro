import { useCallback, useState, useRef, useEffect } from "react";
import { GoogleMap, MarkerF, CircleF, Autocomplete } from "@react-google-maps/api";
import { Search, Loader2, MapPin, Navigation } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useGoogleMaps } from "@/hooks/useGoogleMaps";
import { useIntegracoesConfig } from "@/lib/integracoes-config";

const containerStyle = { width: "100%", height: "100%" };
const defaultCenter = { lat: -14.235, lng: -51.9253 };

function radiusToZoom(radiusKm: number): number {
  return Math.min(Math.max(Math.round(15 - Math.log2(Math.max(radiusKm, 0.5))), 5), 18);
}

interface MapSearchProps {
  onSearch: (segment: string, location: string, coordinates: string) => void;
  loading?: boolean;
}

export function MapSearch({ onSearch, loading = false }: MapSearchProps) {
  const [segment, setSegment] = useState("");
  const [address, setAddress] = useState("");
  const [radiusKm, setRadiusKm] = useState(5);
  const [pinLocation, setPinLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [mapCenter, setMapCenter] = useState(defaultCenter);
  const [mapZoom, setMapZoom] = useState(4);

  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
  const mapRef = useRef<google.maps.Map | null>(null);

  const { config: integracoes, loading: integracoesLoading } = useIntegracoesConfig();
  const apiKey = integracoes.google_maps_api_key;
  const { isLoaded, loadError } = useGoogleMaps(apiKey);

  const onMapLoad = useCallback((map: google.maps.Map) => {
    mapRef.current = map;
  }, []);

  const onAutocompleteLoad = useCallback((ac: google.maps.places.Autocomplete) => {
    autocompleteRef.current = ac;
  }, []);

  const onPlaceChanged = useCallback(() => {
    const place = autocompleteRef.current?.getPlace();
    if (!place?.geometry?.location) return;

    const lat = place.geometry.location.lat();
    const lng = place.geometry.location.lng();
    setPinLocation({ lat, lng });
    setMapCenter({ lat, lng });
    setAddress(place.formatted_address ?? place.name ?? "");
    setMapZoom(radiusToZoom(radiusKm));
  }, [radiusKm]);

  useEffect(() => {
    if (!pinLocation) return;
    setMapZoom(radiusToZoom(radiusKm));
  }, [radiusKm, pinLocation]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!segment.trim() || !pinLocation) return;

    const zoom = radiusToZoom(radiusKm);
    const coords = `@${pinLocation.lat.toFixed(6)},${pinLocation.lng.toFixed(6)},${zoom}z`;
    onSearch(segment.trim(), address, coords);
  };

  if (integracoesLoading) {
    return (
      <div className="card-gradient rounded-xl border border-border overflow-hidden animate-fade-in p-8">
        <div className="flex flex-col items-center justify-center text-muted-foreground gap-2">
          <Loader2 className="h-8 w-8 animate-spin" />
          <p className="text-sm">Carregando configurações...</p>
        </div>
      </div>
    );
  }

  if (!apiKey) {
    return (
      <div className="card-gradient rounded-xl border border-border overflow-hidden animate-fade-in p-8">
        <div className="flex flex-col items-center justify-center text-muted-foreground gap-2">
          <MapPin className="h-10 w-10" />
          <p className="text-sm font-medium">API do Google Maps não configurada</p>
          <p className="text-xs">
            Peça ao administrador para configurar a chave do Google Maps em Configurações &gt; Integrações.
          </p>
        </div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="card-gradient rounded-xl border border-border overflow-hidden animate-fade-in p-8">
        <div className="flex flex-col items-center justify-center text-destructive gap-2">
          <MapPin className="h-10 w-10" />
          <p className="text-sm font-medium">Erro ao carregar Google Maps</p>
          <p className="text-xs text-muted-foreground">
            Verifique se a chave da API é válida e as APIs Maps JavaScript e Places estão
            habilitadas.
          </p>
        </div>
      </div>
    );
  }

  if (!isLoaded) {
    return (
      <div className="card-gradient rounded-xl border border-border overflow-hidden animate-fade-in p-8">
        <div className="flex flex-col items-center justify-center text-muted-foreground gap-2">
          <Loader2 className="h-8 w-8 animate-spin" />
          <p className="text-sm">Carregando mapa...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="card-gradient rounded-xl border border-border overflow-hidden animate-fade-in">
      <form onSubmit={handleSearch} className="p-4 border-b border-border space-y-3">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 space-y-1.5">
            <Label className="text-xs font-medium text-muted-foreground">Endereço</Label>
            <Autocomplete
              onLoad={onAutocompleteLoad}
              onPlaceChanged={onPlaceChanged}
              options={{ componentRestrictions: { country: "br" } }}
            >
              <div className="relative">
                <Navigation className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Digite o endereço ou local..."
                  className="pl-10 bg-muted border-border text-foreground placeholder:text-muted-foreground"
                />
              </div>
            </Autocomplete>
          </div>

          <div className="w-full sm:w-32 space-y-1.5">
            <Label className="text-xs font-medium text-muted-foreground">Raio (km)</Label>
            <Input
              type="number"
              min={1}
              max={100}
              value={radiusKm}
              onChange={(e) => setRadiusKm(Math.max(1, Math.min(100, Number(e.target.value) || 1)))}
              className="bg-muted border-border text-foreground text-center"
            />
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 space-y-1.5">
            <Label className="text-xs font-medium text-muted-foreground">Segmento</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={segment}
                onChange={(e) => setSegment(e.target.value)}
                placeholder="Ex: Restaurantes, Clínicas, Academias..."
                className="pl-10 bg-muted border-border text-foreground placeholder:text-muted-foreground"
              />
            </div>
          </div>

          <div className="flex items-end">
            <Button
              type="submit"
              disabled={loading || !segment.trim() || !pinLocation}
              className="px-8 h-10"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <Search className="h-4 w-4 mr-2" />
                  Buscar na Área
                </>
              )}
            </Button>
          </div>
        </div>
      </form>

      <div className="px-4 py-2 bg-muted/50 border-b border-border">
        <span className="text-xs text-muted-foreground">
          {pinLocation
            ? `📍 Endereço marcado — Raio de ${radiusKm}km selecionado`
            : "🔎 Digite um endereço acima para marcar no mapa"}
        </span>
      </div>

      <div className="h-[500px] w-full relative">
        <GoogleMap
          mapContainerStyle={containerStyle}
          center={mapCenter}
          zoom={mapZoom}
          onLoad={onMapLoad}
          options={{
            disableDefaultUI: false,
            zoomControl: true,
            mapTypeControl: true,
            streetViewControl: false,
            fullscreenControl: true,
          }}
        >
          {pinLocation && (
            <>
              <MarkerF position={pinLocation} />
              <CircleF
                center={pinLocation}
                radius={radiusKm * 1000}
                options={{
                  fillColor: "hsl(217, 91%, 50%)",
                  fillOpacity: 0.1,
                  strokeColor: "hsl(217, 91%, 50%)",
                  strokeWeight: 2,
                  strokeOpacity: 0.6,
                }}
              />
            </>
          )}
        </GoogleMap>
      </div>
    </div>
  );
}
