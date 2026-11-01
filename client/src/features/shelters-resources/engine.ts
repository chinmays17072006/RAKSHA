import type { Incident, Shelter } from "@/types/disaster";

export type ShelterOccupancyBand = "AVAILABLE" | "LIMITED" | "NEAR CAPACITY";

export function getShelterOccupancyPercent(shelter: Shelter) {
  const rawPercent = shelter.routeCapacityPercent ?? (shelter.capacity > 0 ? Math.round((shelter.occupancy / shelter.capacity) * 100) : 0);
  return Math.max(0, Math.min(100, Number.isFinite(rawPercent) ? rawPercent : 0));
}

export function getShelterOccupancyBand(percent: number): ShelterOccupancyBand {
  const safePercent = Math.max(0, Math.min(100, Number.isFinite(percent) ? percent : 0));
  if (safePercent < 80) return "AVAILABLE";
  if (safePercent <= 90) return "LIMITED";
  return "NEAR CAPACITY";
}

export function chooseRecommendedShelter(
  shelters: readonly Shelter[],
  incident: Pick<Incident, "routeAnalysisStatus" | "destinationShelter"> | null,
): Shelter | null {
  if (incident?.routeAnalysisStatus === "Complete" && incident.destinationShelter) {
    return shelters.find((shelter) => shelter.name === incident.destinationShelter) ?? null;
  }
  return shelters.find((shelter) => shelter.id === "shelter-07") ?? null;
}
