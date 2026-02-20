/**
 * Mapa com markers automáticos das localizações das empresas
 * Baseado na lógica do sistema_pronto - Leaflet com pins por lead
 */
import { useMemo, useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { LeadWithExtras } from "@/hooks/useLeadsSearch";

const BRAZIL_CENTER: [number, number] = [-14.235, -51.9253];
const DEFAULT_ZOOM = 4;

function getLeadCoords(lead: LeadWithExtras): [number, number] | null {
  if (lead.gps_coordinates?.latitude != null && lead.gps_coordinates?.longitude != null) {
    return [lead.gps_coordinates.latitude, lead.gps_coordinates.longitude];
  }
  if (lead.lat != null && lead.lng != null) {
    return [lead.lat, lead.lng];
  }
  const addr = (lead.address ?? "").toLowerCase();
  if (addr.includes("salvador") || addr.includes("pituba") || addr.includes("barra"))
    return [-12.971598, -38.50131];
  if (addr.includes("são paulo") || addr.includes("sp")) return [-23.55052, -46.633309];
  if (addr.includes("rio de janeiro") || addr.includes("rj")) return [-22.906847, -43.172896];
  if (addr.includes("belo horizonte") || addr.includes("mg")) return [-19.919054, -43.945973];
  if (addr.includes("brasília") || addr.includes("df")) return [-15.794229, -47.882166];
  return null;
}

function formatPhone(phone?: string): string {
  if (!phone) return "Não informado";
  const c = phone.replace(/\D/g, "");
  if (c.length === 11) return `(${c.slice(0, 2)}) ${c.slice(2, 7)}-${c.slice(7)}`;
  if (c.length === 10) return `(${c.slice(0, 2)}) ${c.slice(2, 6)}-${c.slice(6)}`;
  return phone;
}

function FitBounds({ leads }: { leads: LeadWithExtras[] }) {
  const map = useMap();
  const coords = useMemo(
    () =>
      leads
        .map((l) => getLeadCoords(l))
        .filter((c): c is [number, number] => c != null),
    [leads]
  );
  useEffect(() => {
    if (coords.length === 0) return;
    const group = L.featureGroup(coords.map(([lat, lng]) => L.marker([lat, lng])));
    map.fitBounds(group.getBounds().pad(0.1));
  }, [map, coords]);
  return null;
}

function createMarkerIcon(hasWhatsApp: boolean | null | undefined) {
  const color = hasWhatsApp === true ? "#22c55e" : "#ef4444";
  return L.divIcon({
    className: "custom-marker",
    html: `<div style="background-color: ${color}; width: 12px; height: 12px; border-radius: 50%; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>`,
    iconSize: [16, 16],
    iconAnchor: [8, 8],
  });
}

interface LeadsMapProps {
  leads: LeadWithExtras[];
  className?: string;
}

export function LeadsMap({ leads, className = "" }: LeadsMapProps) {
  const markers = useMemo(() => {
    return leads
      .map((lead) => {
        const coords = getLeadCoords(lead);
        if (!coords) return null;
        return { lead, coords };
      })
      .filter((m): m is { lead: LeadWithExtras; coords: [number, number] } => m != null);
  }, [leads]);

  if (markers.length === 0) {
    return (
      <div className={`flex items-center justify-center bg-muted/30 rounded-lg ${className}`}>
        <p className="text-sm text-muted-foreground">
          {leads.length === 0
            ? "Nenhum lead para exibir no mapa"
            : "Leads sem coordenadas para exibir no mapa"}
        </p>
      </div>
    );
  }

  return (
    <div className={`rounded-lg overflow-hidden border border-border ${className}`}>
      <MapContainer
        center={BRAZIL_CENTER}
        zoom={DEFAULT_ZOOM}
        style={{ height: "100%", minHeight: 320 }}
        className="w-full"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <FitBounds leads={leads} />
        {markers.map(({ lead, coords }) => (
          <Marker
            key={lead.id}
            position={coords}
            icon={createMarkerIcon(lead.hasWhatsApp)}
          >
            <Popup>
              <div className="prospect-popup text-sm min-w-[200px]">
                <h6 className="font-semibold mb-2">{lead.name}</h6>
                <p className="mb-1 text-muted-foreground">
                  <span className="font-medium">Endereço:</span> {lead.address ?? "—"}
                </p>
                <p className="mb-1">
                  <span className="font-medium">Telefone:</span> {formatPhone(lead.phone)}
                </p>
                {lead.rating ? (
                  <p className="mb-1">
                    ★ {lead.rating} ({lead.reviews} avaliações)
                  </p>
                ) : null}
                <div className="flex gap-1 mt-2">
                  <span
                    className={`text-xs px-2 py-0.5 rounded ${
                      lead.hasWhatsApp === true
                        ? "bg-green-100 text-green-800"
                        : lead.hasWhatsApp === false
                          ? "bg-red-100 text-red-800"
                          : "bg-gray-100 text-gray-600"
                    }`}
                  >
                    {lead.hasWhatsApp === true
                      ? "WhatsApp"
                      : lead.hasWhatsApp === false
                        ? "Sem WhatsApp"
                        : "Não Verificado"}
                  </span>
                </div>
                {lead.hasWhatsApp === true && lead.phone && (
                  <a
                    href={`https://wa.me/${lead.phone.replace(/\D/g, "")}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-block mt-2 text-green-600 hover:underline text-xs"
                  >
                    Abrir WhatsApp
                  </a>
                )}
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
