import { describe, expect, it } from "vitest";
import { demoOperations } from "../../data/demo";
import type { OperationsState } from "../../types/disaster";
import { analyzeSafeRoutes } from "./engine";

const demoState = demoOperations as OperationsState;
const evacuationRoads = demoState.roads.filter((road) => road.network === "evacuation");

describe("analyzeSafeRoutes", () => {
  it("selects the safest available route even though Road C is not the shortest", () => {
    const result = analyzeSafeRoutes(demoState.roads, demoState.shelters);

    expect(result.status).toBe("found");
    expect(result.recommendedRoad?.name).toBe("Road C");
    expect(result.recommendedRoad?.distanceKm).toBe(6.2);
    expect(result.recommendedRoad?.etaMinutes).toBe(11);
    expect(result.recommendedShelter?.name).toBe("SHELTER 07");
    expect(result.recommendedShelter?.routeCapacityPercent).toBe(32);
    expect(result.explanation).toBe("Road C provides the safest available access to Shelter 07 while avoiding the blocked and high-risk flood corridors.");
  });

  it("rejects Road A and avoids Road B instead of selecting the shorter unsafe roads", () => {
    const result = analyzeSafeRoutes(demoState.roads, demoState.shelters);
    const byName = new Map(result.evaluations.map((item) => [item.road.name, item]));

    expect(byName.get("Road A")?.disposition).toBe("REJECTED");
    expect(byName.get("Road B")?.disposition).toBe("AVOID");
    expect(byName.get("Road C")?.disposition).toBe("RECOMMENDED");
    expect(result.evaluations.map((item) => item.road.name)).toEqual(["Road A", "Road B", "Road C"]);
    expect(evacuationRoads.find((road) => road.name === "Road A")?.distanceKm).toBeLessThan(evacuationRoads.find((road) => road.name === "Road C")?.distanceKm ?? 0);
  });

  it("returns the manual-review fallback if no road is safely passable", () => {
    const unsafeRoads = demoState.roads.map((road) => road.network === "evacuation"
      ? { ...road, status: "Blocked" as const, safety: "Unsafe" as const, floodRisk: "Critical" as const }
      : road);

    const result = analyzeSafeRoutes(unsafeRoads, demoState.shelters);

    expect(result.status).toBe("no-safe-route");
    expect(result.recommendedRoad).toBeNull();
    expect(result.recommendedShelter).toBeNull();
    expect(result.evaluations.every((item) => item.disposition === "REJECTED")).toBe(true);
  });

  it("returns no safe route when the only safe-access shelter is full", () => {
    const fullShelters = demoState.shelters.map((shelter) => shelter.id === "shelter-07" ? { ...shelter, status: "Full" as const } : shelter);

    const result = analyzeSafeRoutes(demoState.roads, fullShelters);

    expect(result.status).toBe("no-safe-route");
    expect(result.recommendedRoad).toBeNull();
  });

  it("does not mutate the centralized simulated road or shelter records", () => {
    const roadsBefore = JSON.stringify(demoState.roads);
    const sheltersBefore = JSON.stringify(demoState.shelters);

    analyzeSafeRoutes(demoState.roads, demoState.shelters);

    expect(JSON.stringify(demoState.roads)).toBe(roadsBefore);
    expect(JSON.stringify(demoState.shelters)).toBe(sheltersBefore);
  });
});
