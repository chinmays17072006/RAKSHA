import { describe, expect, it } from "vitest";
import { demoOperations } from "../../data/demo";
import type { Incident, IncidentTimelineEvent, OperationsState, RescueTeam } from "../../types/disaster";
import { applyRescueDispatch, type RescueDispatchRequest } from "./OperationsContext";

function createState(): OperationsState {
  const incident: Incident = {
    ...demoOperations.incidents[0],
    id: "1043",
    source: "Citizen SOS",
    status: "Triaged — Critical",
    severity: "Critical",
    priority: "P0",
    peopleAffected: 4,
    vulnerablePeople: 1,
    triageStatus: "Complete",
    routeAnalysisStatus: "Complete",
    recommendedRoute: "Road C",
    destinationShelter: "SHELTER 07",
    routeDistanceKm: 6.2,
    routeEta: 11,
    routeRisk: "Low",
  };
  return { ...demoOperations, incidents: [incident, ...demoOperations.incidents] };
}

function createRequest(events: IncidentTimelineEvent[] = []): RescueDispatchRequest {
  return {
    incidentId: "1043",
    teamId: "team-bravo",
    reason: "Team Bravo is the closest available team with sufficient capacity and medical support for the incident.",
    dispatchedAt: "2026-11-01T10:20:00.000Z",
    timelineEvents: events,
  };
}

const dispatchEvents: IncidentTimelineEvent[] = [
  { time: "READY", title: "TEAM BRAVO RECOMMENDED", detail: "Recommendation recorded.", tone: "green" },
  { time: "10:20", title: "TEAM BRAVO DISPATCHED", detail: "Team Bravo dispatched to Incident #1043.", tone: "blue" },
  { time: "ETA 11 MIN", title: "TEAM EN ROUTE", detail: "Team Bravo responding to Sector 04.", tone: "blue" },
];

describe("applyRescueDispatch", () => {
  it("atomically updates the shared incident and team while preserving triage and route data", () => {
    const state = createState();
    const next: OperationsState = applyRescueDispatch(state, createRequest(dispatchEvents));
    const incident: Incident | undefined = next.incidents.find((item: Incident) => item.id === "1043");
    const team: RescueTeam | undefined = next.rescueTeams.find((item: RescueTeam) => item.id === "team-bravo");

    expect(next).not.toBe(state);
    expect(next.incidents.filter((item: Incident) => item.id === "1043")).toHaveLength(1);
    expect(incident).toMatchObject({
      status: "Rescue dispatched",
      severity: "Critical",
      priority: "P0",
      triageStatus: "Complete",
      routeAnalysisStatus: "Complete",
      recommendedRoute: "Road C",
      destinationShelter: "SHELTER 07",
      routeDistanceKm: 6.2,
      routeEta: 11,
      routeRisk: "Low",
      rescueTeamId: "team-bravo",
      rescueEtaMinutes: 11,
    });
    expect(team).toMatchObject({ status: "En route", assignedIncidentId: "1043" });
    expect(incident?.timeline.map((event: IncidentTimelineEvent) => event.title)).toEqual([
      ...state.incidents[0].timeline.map((event: IncidentTimelineEvent) => event.title),
      "TEAM BRAVO RECOMMENDED",
      "TEAM BRAVO DISPATCHED",
      "TEAM EN ROUTE",
    ]);
    expect(state.rescueTeams.find((item: RescueTeam) => item.id === "team-bravo")?.status).toBe("Available");
  });

  it("rejects unavailable-team and unsafe-route requests without changing shared state", () => {
    const state = createState();
    const unavailableState: OperationsState = {
      ...state,
      rescueTeams: state.rescueTeams.map((team) => team.id === "team-bravo" ? { ...team, status: "Busy" } : team),
    };
    const unsafeRouteState: OperationsState = {
      ...state,
      incidents: state.incidents.map((incident) => incident.id === "1043" ? { ...incident, routeRisk: "High" } : incident),
    };

    expect(applyRescueDispatch(unavailableState, createRequest(dispatchEvents))).toBe(unavailableState);
    expect(applyRescueDispatch(unsafeRouteState, createRequest(dispatchEvents))).toBe(unsafeRouteState);
  });
});
