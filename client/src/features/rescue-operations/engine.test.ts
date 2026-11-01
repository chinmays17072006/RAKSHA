import { describe, expect, it } from "vitest";
import { demoOperations } from "../../data/demo";
import type { Incident, RescueTeam } from "../../types/disaster";
import { recommendRescueTeam } from "./engine";

function createIncident(): Incident {
  const source = demoOperations.incidents[0];
  return {
    ...source,
    id: "1043",
    type: "Flash Flood",
    location: "Sector 04",
    status: "Triaged — Critical",
    severity: "Critical",
    priority: "P0",
    peopleAffected: 4,
    vulnerablePeople: 1,
    vulnerablePerson: "Elderly Person",
  };
}

function createTeams(): RescueTeam[] {
  return demoOperations.rescueTeams
    .filter((team: RescueTeam) => ["team-alpha", "team-bravo", "team-charlie"].includes(team.id))
    .map((team: RescueTeam) => ({ ...team }));
}

describe("recommendRescueTeam", () => {
  it("recommends available Team Bravo for the elderly four-person Incident #1043", () => {
    const recommendation = recommendRescueTeam(createTeams(), createIncident());

    expect(recommendation?.team.id).toBe("team-bravo");
    expect(recommendation?.reason).toBe("Team Bravo is the closest available team with sufficient capacity and medical support for the incident.");
  });

  it("does not select a busy unit or a team without sufficient capacity", () => {
    const teams = createTeams().map((team) => team.id === "team-bravo" ? { ...team, capacity: 3 } : team);
    const recommendation = recommendRescueTeam(teams, createIncident());

    expect(recommendation?.team.id).toBe("team-alpha");
    expect(recommendation?.team.id).not.toBe("team-charlie");
  });

  it("prefers available medical support for an incident with a vulnerable person", () => {
    const teams = createTeams().map((team) => team.id === "team-alpha" ? { ...team, etaMinutes: 1, distanceKm: 0.2 } : team);
    const recommendation = recommendRescueTeam(teams, createIncident());

    expect(recommendation?.team.id).toBe("team-bravo");
  });

  it("returns no recommendation when no available team has enough capacity", () => {
    const teams = createTeams().map((team) => ({ ...team, status: "Unavailable" as const }));

    expect(recommendRescueTeam(teams, createIncident())).toBeNull();
  });

  it("does not mutate centralized team or incident inputs", () => {
    const teams = createTeams();
    const incident = createIncident();
    const originalTeams = JSON.stringify(teams);
    const originalIncident = JSON.stringify(incident);

    recommendRescueTeam(teams, incident);

    expect(JSON.stringify(teams)).toBe(originalTeams);
    expect(JSON.stringify(incident)).toBe(originalIncident);
  });
});
