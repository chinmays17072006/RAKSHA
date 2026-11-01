import { describe, expect, it } from "vitest";
import { demoOperations } from "../../data/demo";
import type { Incident, IncidentTimelineEvent, OfflineSOSRequest, OperationsState, RescueTeam } from "../../types/disaster";
import { applyDemoReset, applyRescueDispatch, type RescueDispatchRequest } from "./OperationsContext";

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

describe("applyDemoReset", () => {
  it("restores only the shared #1043 demo scenario and clears its synced offline request", () => {
    const dispatchedState: OperationsState = applyRescueDispatch(createState(), createRequest(dispatchEvents));
    const offlineRequest: OfflineSOSRequest = {
      id: "1044",
      type: "Flash Flood",
      location: "Sector 05",
      people: 3,
      priority: "PENDING TRIAGE",
      reportedAt: "10:30:00",
      status: "SYNCED",
      demoRunId: "phase8",
    };
    const unrelatedRequest: OfflineSOSRequest = {
      id: "1045",
      type: "Flash Flood",
      location: "Sector 05",
      people: 3,
      priority: "PENDING TRIAGE",
      reportedAt: "10:31:00",
      status: "QUEUED OFFLINE",
    };
    const syncedIncident: Incident = {
      ...dispatchedState.incidents[0],
      id: "1044",
      location: "Sector 05",
      peopleAffected: 3,
      vulnerablePeople: 0,
      message: "Offline-first demo SOS created locally during simulated network loss.",
      source: "Citizen SOS",
      demoRunId: "phase8",
    };
    const unrelatedIncident: Incident = {
      ...dispatchedState.incidents[0],
      id: "1045",
      location: "Sector 06",
      message: "Unrelated field report retained by demo reset.",
      source: "Field report",
    };
    const state: OperationsState = {
      ...dispatchedState,
      incidents: [syncedIncident, unrelatedIncident, ...dispatchedState.incidents],
      offlineQueue: [offlineRequest, unrelatedRequest],
      systemStatus: { ...dispatchedState.systemStatus, network: "Disconnected", dataSync: "Paused", activeSOSCount: 25 },
    };

    const reset: OperationsState = applyDemoReset(state);
    const incident: Incident | undefined = reset.incidents.find((item: Incident) => item.id === "1043");
    const team: RescueTeam | undefined = reset.rescueTeams.find((item: RescueTeam) => item.id === "team-bravo");

    expect(incident).toMatchObject({ status: "Triaged — Critical", priority: "P0", severity: "Critical", routeAnalysisStatus: "Complete", recommendedRoute: "Road C", destinationShelter: "SHELTER 07", routeEta: 11, routeRisk: "Low" });
    expect(incident?.rescueTeamId).toBeUndefined();
    expect(incident?.timeline.some((event: IncidentTimelineEvent) => event.title === "TEAM BRAVO DISPATCHED")).toBe(false);
    expect(team).toMatchObject({ status: "Available", availability: 100 });
    expect(team?.assignedIncidentId).toBeUndefined();
    expect(reset.incidents.some((item: Incident) => item.id === "1044")).toBe(false);
    expect(reset.incidents.find((item: Incident) => item.id === "1045")).toEqual(unrelatedIncident);
    expect(reset.offlineQueue).toEqual([unrelatedRequest]);
    expect(reset.systemStatus).toMatchObject({ network: "Connected", dataSync: "Live", activeSOSCount: 24 });
    expect(reset.incidents.find((item: Incident) => item.id === "1042")).toEqual(state.incidents.find((item: Incident) => item.id === "1042"));
    expect(state.rescueTeams.find((item: RescueTeam) => item.id === "team-bravo")?.status).toBe("En route");
  });
});
