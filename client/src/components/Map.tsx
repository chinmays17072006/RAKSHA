/// <reference types="@types/google.maps" />

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

declare global {
  interface Window {
    google?: typeof google;
  }
}

let mapsScriptPromise: Promise<void> | null = null;

function loadMapScript(): Promise<void> {
  if (window.google?.maps) return Promise.resolve();
  if (mapsScriptPromise) return mapsScriptPromise;

  const config = window.__MANUS_CONFIG__;
  if (!config?.apiUrl || !config.apiBrowserKey) {
    return Promise.reject(new Error("Maps configuration is unavailable"));
  }

  const apiKey = encodeURIComponent(config.apiBrowserKey);
  const mapsProxyUrl = `${config.apiUrl.replace(/\/$/, "")}/v1/maps/proxy`;
  mapsScriptPromise = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = `${mapsProxyUrl}/maps/api/js?key=${apiKey}&v=weekly&libraries=marker,places,geocoding,geometry`;
    script.async = true;
    script.crossOrigin = "anonymous";
    script.onload = () => {
      if (window.google?.maps) resolve();
      else reject(new Error("Google Maps did not initialize"));
      script.remove();
    };
    script.onerror = () => {
      script.remove();
      mapsScriptPromise = null;
      reject(new Error("Google Maps failed to load"));
    };
    document.head.appendChild(script);
  });

  return mapsScriptPromise;
}

interface MapViewProps {
  className?: string;
  initialCenter?: google.maps.LatLngLiteral;
  initialZoom?: number;
  onMapReady?: (map: google.maps.Map) => void;
}

export function MapView({
  className,
  initialCenter = { lat: 37.7749, lng: -122.4194 },
  initialZoom = 12,
  onMapReady,
}: MapViewProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    loadMapScript()
      .then(() => {
        if (cancelled || !mapContainer.current || !window.google?.maps) return;
        const map = new window.google.maps.Map(mapContainer.current, {
          zoom: initialZoom,
          center: initialCenter,
          mapTypeControl: false,
          fullscreenControl: false,
          zoomControl: true,
          zoomControlOptions: { position: window.google.maps.ControlPosition.RIGHT_BOTTOM },
          streetViewControl: false,
          styles: [
            { elementType: "geometry", stylers: [{ color: "#14232a" }] },
            { elementType: "labels.text.fill", stylers: [{ color: "#a0b5bb" }] },
            { elementType: "labels.text.stroke", stylers: [{ color: "#0b151c" }] },
            { featureType: "water", elementType: "geometry", stylers: [{ color: "#103344" }] },
            { featureType: "road", elementType: "geometry", stylers: [{ color: "#2a3e46" }] },
            { featureType: "poi", elementType: "labels", stylers: [{ visibility: "off" }] },
            { featureType: "transit", elementType: "labels", stylers: [{ visibility: "off" }] },
          ],
        });
        onMapReady?.(map);
      })
      .catch(() => {
        if (!cancelled) setLoadError(true);
      });

    return () => { cancelled = true; };
  }, [initialCenter, initialZoom, onMapReady]);

  return (
    <div className={cn("w-full h-[500px]", className)}>
      {loadError && (
        <div className="map-view__error" role="alert">
          <strong>GOOGLE MAP UNAVAILABLE</strong>
          <span>Check the project Maps configuration and try again.</span>
        </div>
      )}
      <div ref={mapContainer} className="map-view__canvas" aria-label="Google map with simulated response overlays" />
    </div>
  );
}
