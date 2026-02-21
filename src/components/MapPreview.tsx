import { GoogleMap } from "@react-google-maps/api";
import { useGoogleMaps } from "@/hooks/useGoogleMaps";
import { useIntegracoesConfig } from "@/lib/integracoes-config";

interface MapPreviewProps {
  center?: { lat: number; lng: number };
  zoom?: number;
  className?: string;
}

const defaultCenter = { lat: -14.235, lng: -51.9253 };
const containerStyle = { width: "100%", height: "100%" };

export function MapPreview({
  center = defaultCenter,
  zoom = 4,
  className = "",
}: MapPreviewProps) {
  const { config: integracoes } = useIntegracoesConfig();
  const apiKey = integracoes.google_maps_api_key;
  const { isLoaded } = useGoogleMaps(apiKey);

  if (!isLoaded || !apiKey) {
    return (
      <div
        className={`flex items-center justify-center bg-muted text-muted-foreground ${className}`}
      >
        <div className="text-center p-4">
          <p className="text-sm">
            {!apiKey
              ? "Google Maps não configurado."
              : "Carregando mapa..."}
          </p>
          {!apiKey && (
            <p className="text-xs mt-1">
              Configure em Configurações &gt; Integrações.
            </p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={className}>
      <GoogleMap
        mapContainerStyle={containerStyle}
        center={center}
        zoom={zoom}
        options={{
          disableDefaultUI: false,
          zoomControl: true,
          mapTypeControl: true,
          scaleControl: true,
          streetViewControl: false,
          fullscreenControl: true,
        }}
      />
    </div>
  );
}
