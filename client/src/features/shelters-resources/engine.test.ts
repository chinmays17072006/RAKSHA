import { describe, expect, it } from "vitest";
import type { Incident, Shelter } from "../../types/disaster";
import { chooseRecommendedShelter, getShelterOccupancyBand, getShelterOccupancyPercent } from "./engine";

const shelter07: Shelter = {
  id: "shelter-07",
  name: "SHELTER 07",
  location: "North School Gym · Sector 07",
  capacity: 180,
  occupancy: 54,
  status: "Open",
  coordinates: { x: 32, y: 69 },
  routeCapacityPercent: 32,
  routeDistanceKm: 6.2,
  routeAccess: "Safe",
};

const shelter01: Shelter = { ...shelter07, id: "shelter-01", name: "SHELTER 01", routeCapacityPercent: 82 };
const shelter12: Shelter = { ...shelter07, id: "shelter-12", name: "SHELTER 12", routeCapacityPercent: 91 };
const routedIncident: Pick<Incident, "routeAnalysisStatus" | "destinationShelter"> = {
  routeAnalysisStatus: "Complete",
  destinationShelter: "SHELTER 07",
};

describe("shelter occupancy status", () => {
  it("uses available below 80, limited from 80 through 90, and near capacity above 90", () => {
    expect(getShelterOccupancyBand(79)).toBe("AVAILABLE");
    expect(getShelterOccupancyBand(80)).toBe("LIMITED");
    expect(getShelterOccupancyBand(90)).toBe("LIMITED");
    expect(getShelterOccupancyBand(91)).toBe("NEAR CAPACITY");
  });

  it("uses the existing route occupancy values from the shared shelter records", () => {
    expect(getShelterOccupancyPercent(shelter01)).toBe(82);
    expect(getShelterOccupancyPercent(shelter07)).toBe(32);
    expect(getShelterOccupancyPercent(shelter12)).toBe(91);
  });
});

describe("recommended shelter", () => {
  it("preserves the selected shared incident route destination", () => {
    expect(chooseRecommendedShelter([shelter01, shelter07, shelter12], routedIncident)).toBe(shelter07);
  });

  it("uses Shelter 07 for the local demo when the incident has no completed route yet", () => {
    expect(chooseRecommendedShelter([shelter01, shelter07, shelter12], null)).toBe(shelter07);
  });

  it("does not substitute Shelter 07 when a completed route has an unmatched destination", () => {
    expect(chooseRecommendedShelter([shelter01, shelter07], { routeAnalysisStatus: "Complete", destinationShelter: "SHELTER 12" })).toBeNull();
  });
});
