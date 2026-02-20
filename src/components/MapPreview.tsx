import { GoogleMap, useJsApiLoader } from "@react-google-maps/api";

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
  const { isLoaded } = useJsApiLoader({
    id: "google-map-script",
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || "",
  });

  if (!isLoaded || !import.meta.env.VITE_GOOGLE_MAPS_API_KEY) {
    return (
      <div
        className={`flex items-center justify-center bg-muted text-muted-foreground ${className}`}
      >
        <div className="text-center p-4">
          <p className="text-sm">
            Configure a chave da API do Google Maps no arquivo .env
          </p>
          <p className="text-xs mt-1">
            Variável: VITE_GOOGLE_MAPS_API_KEY
          </p>
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
