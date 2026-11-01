import type { Road, Shelter } from "@/types/disaster";

export type RouteDisposition = "REJECTED" | "AVOID" | "RECOMMENDED" | "SAFE ALTERNATIVE";

export interface RoadEvaluation {
  road: Road;
  score: number;
  disposition: RouteDisposition;
  isSafe: boolean;
}

export interface SafeRouteAnalysis {
  status: "found" | "no-safe-route";
  evaluations: RoadEvaluation[];
  recommendedRoad: Road | null;
  recommendedShelter: Shelter | null;
  explanation: string;
  shelterReason: string;
}

const floodRiskScore: Record<NonNullable<Road["floodRisk"]>, number> = {
  Low: 100,
  Moderate: 70,
  High: 30,
  Critical: 0,
};

/**
 * A transparent, deterministic safety-first route selector. The weighted score
 * uses safety, road condition, flood exposure, distance and ETA, while strict
 * safety gates prevent a blocked or high-risk corridor from being recommended.
 */
export function analyzeSafeRoutes(roads: Road[], shelters: Shelter[]): SafeRouteAnalysis {
  const evacuationRoads = roads.filter((road) => road.network === "evacuation");
  const availableShelters = shelters.filter((shelter) => shelter.status !== "Full" && shelter.routeAccess === "Safe");

  const ranked = evacuationRoads.map((road) => {
    const roadCondition = road.status === "Open" ? 100 : road.status === "Restricted" ? 45 : 0;
    const floodRisk = road.floodRisk ? floodRiskScore[road.floodRisk] : 0;
    const distanceScore = Math.max(0, 100 - (road.distanceKm ?? 0) * 8);
    const etaScore = Math.max(0, 100 - (road.etaMinutes ?? 0) * 5);
    const safety = road.safetyScore ?? 0;
    const score = Math.round(safety * 0.45 + roadCondition * 0.25 + floodRisk * 0.2 + distanceScore * 0.06 + etaScore * 0.04);
    const shelterAvailable = availableShelters.some((shelter) => shelter.id === road.destinationShelterId);
    const isSafe = road.status === "Open"
      && road.floodRisk === "Low"
      && road.safety === "Safe"
      && safety >= 80
      && shelterAvailable;
    return { road, score, isSafe, shelterAvailable };
  }).sort((left, right) => right.score - left.score);

  const selected = ranked.find((item) => item.isSafe) ?? null;
  const recommendedShelter = selected
    ? availableShelters.find((shelter) => shelter.id === selected.road.destinationShelterId) ?? null
    : null;
  const selectedRoad = recommendedShelter ? selected?.road ?? null : null;

  const evaluationById = new Map(ranked.map((evaluation) => [evaluation.road.id, evaluation] as const));
  const evaluations: RoadEvaluation[] = evacuationRoads.map((road) => {
    const { score, isSafe } = evaluationById.get(road.id)!;
    return {
      road,
      score,
      isSafe,
      disposition: road.id === selectedRoad?.id
        ? "RECOMMENDED"
        : road.status === "Blocked" || road.status === "Closed" || road.safety === "Unsafe"
          ? "REJECTED"
          : isSafe
            ? "SAFE ALTERNATIVE"
            : "AVOID",
    };
  });

  return {
    status: selectedRoad && recommendedShelter ? "found" : "no-safe-route",
    evaluations,
    recommendedRoad: selectedRoad,
    recommendedShelter,
    explanation: selectedRoad && recommendedShelter
      ? `${selectedRoad.name} provides the safest available access to ${recommendedShelter.name.replace("SHELTER ", "Shelter ")} while avoiding the blocked and high-risk flood corridors.`
      : "No route currently meets the safe road and shelter-access criteria.",
    shelterReason: selectedRoad && recommendedShelter
      ? `Lower occupancy and safer access through ${selectedRoad.name}.`
      : "No shelter currently meets the safe-access criteria.",
  };
}
