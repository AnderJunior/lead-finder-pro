import { useState, useEffect, useRef } from "react";

const SCRIPT_ID = "google-maps-script";

let globalPromise: Promise<void> | null = null;

function isGoogleMapsReady(): boolean {
  return typeof google !== "undefined" && !!google.maps?.places;
}

function loadScript(apiKey: string): Promise<void> {
  if (isGoogleMapsReady()) return Promise.resolve();

  if (globalPromise) return globalPromise;

  const existing = document.getElementById(SCRIPT_ID);
  if (existing) {
    globalPromise = new Promise<void>((resolve) => {
      if (isGoogleMapsReady()) {
        resolve();
        return;
      }
      const check = setInterval(() => {
        if (isGoogleMapsReady()) {
          clearInterval(check);
          resolve();
        }
      }, 100);
    });
    return globalPromise;
  }

  globalPromise = new Promise<void>((resolve, reject) => {
    const script = document.createElement("script");
    script.id = SCRIPT_ID;
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places&language=pt-BR&region=BR`;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => {
      globalPromise = null;
      reject(new Error("Falha ao carregar Google Maps"));
    };
    document.head.appendChild(script);
  });

  return globalPromise;
}

export function useGoogleMaps(apiKey: string) {
  const [isLoaded, setIsLoaded] = useState(isGoogleMapsReady);
  const [loadError, setLoadError] = useState<Error | null>(null);
  const loadedKeyRef = useRef<string | null>(null);

  useEffect(() => {
    if (isLoaded || !apiKey || loadedKeyRef.current === apiKey) return;
    loadedKeyRef.current = apiKey;

    loadScript(apiKey)
      .then(() => setIsLoaded(true))
      .catch((err) => setLoadError(err));
  }, [apiKey, isLoaded]);

  return { isLoaded, loadError };
}
