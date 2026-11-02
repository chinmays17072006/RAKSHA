/// <reference types="@types/google.maps" />

import { useCallback, useEffect, useState } from "react";
import { MapView } from "@/components/Map";
import type { DisasterZone, Incident, RescueTeam, Shelter } from "@/types/disaster";

export const DEMO_MAP_CENTER: google.maps.LatLngLiteral = { lat: 20.5937, lng: 78.9629 };

function simulatedPosition(coordinates: { x: number; y: number }): google.maps.LatLngLiteral {
  return {
    lat: DEMO_MAP_CENTER.lat + (50 - coordinates.y) * 0.00025,
    lng: DEMO_MAP_CENTER.lng + (coordinates.x - 50) * 0.00025,
  };
}

interface GoogleDisasterMapProps {
  incidents: Incident[];
  rescueTeams: RescueTeam[];
  shelters: Shelter[];
  riskZones: DisasterZone[];
  floodVisible: boolean;
  teamsVisible: boolean;
  sheltersVisible: boolean;
  onMapReady: (map: google.maps.Map) => void;
  onSelectIncident: (incidentId: string) => void;
  onSelectTeam: (team: RescueTeam) => void;
  onSelectShelter: (shelter: Shelter) => void;
}

export function GoogleDisasterMap({
  incidents,
  rescueTeams,
  shelters,
  riskZones,
  floodVisible,
  teamsVisible,
  sheltersVisible,
  onMapReady,
  onSelectIncident,
  onSelectTeam,
  onSelectShelter,
}: GoogleDisasterMapProps) {
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const handleMapReady = useCallback((readyMap: google.maps.Map) => {
    setMap(readyMap);
    onMapReady(readyMap);
  }, [onMapReady]);

  useEffect(() => {
    if (!map) return;
    const overlays: (google.maps.Marker | google.maps.Circle)[] = [];
    const maps = window.google?.maps;
    if (!maps) return;

    if (floodVisible) {
      riskZones.forEach((zone) => {
        const color = zone.riskLevel === "Critical" ? "#f1746c" : zone.riskLevel === "High" ? "#f2b85e" : zone.riskLevel === "Moderate" ? "#53c7dc" : "#72c49a";
        overlays.push(new maps.Circle({
          map,
          center: simulatedPosition(zone.coordinates),
          radius: Math.max(90, zone.radius * 18),
          fillColor: color,
          fillOpacity: 0.18,
          strokeColor: color,
          strokeOpacity: 0.8,
          strokeWeight: 1,
          clickable: false,
        }));
      });
    }

    incidents
      .filter((incident) => incident.source === "SOS" || incident.source === "Citizen SOS")
      .forEach((incident) => {
        const marker = new maps.Marker({
          map,
          position: simulatedPosition(incident.coordinates),
          title: `Incident #${incident.id} · ${incident.priority} · ${incident.location} · simulated location`,
          label: { text: incident.id === "1042" ? "SOS" : incident.id.slice(-2), color: "#ffffff", fontSize: "9px", fontWeight: "700" },
          icon: {
            path: maps.SymbolPath.CIRCLE,
            fillColor: incident.severity === "Critical" ? "#d94343" : "#f2b85e",
            fillOpacity: 1,
            strokeColor: "#fff1ed",
            strokeWeight: 2,
            scale: incident.id === "1042" ? 10 : 7,
          },
          zIndex: incident.id === "1042" ? 100 : 50,
        });
        marker.addListener("click", () => onSelectIncident(incident.id));
        overlays.push(marker);
      });

    if (teamsVisible) {
      rescueTeams.slice(0, 3).forEach((team) => {
        const marker = new maps.Marker({
          map,
          position: simulatedPosition(team.coordinates),
          title: `${team.name} · ${team.status} · simulated location`,
          label: { text: team.name.replace("TEAM ", ""), color: "#08232a", fontSize: "8px", fontWeight: "700" },
          icon: { path: maps.SymbolPath.CIRCLE, fillColor: "#53c7dc", fillOpacity: 1, strokeColor: "#e4fbff", strokeWeight: 2, scale: 8 },
        });
        marker.addListener("click", () => onSelectTeam(team));
        overlays.push(marker);
      });
    }

    if (sheltersVisible) {
      shelters.slice(0, 3).forEach((shelter) => {
        const marker = new maps.Marker({
          map,
          position: simulatedPosition(shelter.coordinates),
          title: `${shelter.name} · ${shelter.status} · simulated location`,
          label: { text: shelter.name.replace("SHELTER ", "S"), color: "#09251a", fontSize: "8px", fontWeight: "700" },
          icon: { path: maps.SymbolPath.CIRCLE, fillColor: "#72c49a", fillOpacity: 1, strokeColor: "#e5fff0", strokeWeight: 2, scale: 8 },
        });
        marker.addListener("click", () => onSelectShelter(shelter));
        overlays.push(marker);
      });
    }

    return () => overlays.forEach((overlay) => overlay.setMap(null));
  }, [map, incidents, rescueTeams, shelters, riskZones, floodVisible, teamsVisible, sheltersVisible, onSelectIncident, onSelectTeam, onSelectShelter]);

  return (
    <div className="map-canvas">
      <MapView
        className="map-google"
        initialCenter={DEMO_MAP_CENTER}
        initialZoom={14}
        onMapReady={handleMapReady}
      />
      <div className="map-note"><span className="map-note__signal" /> GOOGLE MAPS <i>·</i> DEMO COORDINATES · NO LIVE GPS</div>
    </div>
  );
}
