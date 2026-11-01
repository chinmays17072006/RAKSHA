import { createContext, useCallback, useContext, useMemo, useReducer, useRef, type ReactNode } from "react";
import { demoOperations } from "@/data/demo";
import type { Incident, IncidentTimelineEvent, OfflineSOSRequest, OperationsState } from "@/types/disaster";

export interface RescueDispatchRequest {
  incidentId: string;
  teamId: string;
  reason: string;
  dispatchedAt: string;
  timelineEvents: IncidentTimelineEvent[];
}

type OperationsAction =
  | { type: "incident/add"; incident: Incident }
  | { type: "incident/update"; id: string; changes: Partial<Incident> }
  | { type: "system/update"; changes: Partial<OperationsState["systemStatus"]> }
  | { type: "offline/set"; request: OfflineSOSRequest }
  | { type: "rescue/dispatch"; request: RescueDispatchRequest }
  | { type: "demo/reset" };

interface OperationsContextValue {
  state: OperationsState;
  addIncident: (incident: Incident) => void;
  createIncident: (draft: Omit<Incident, "id">) => Incident;
  updateIncident: (id: string, changes: Partial<Incident>) => void;
  updateSystemStatus: (changes: Partial<OperationsState["systemStatus"]>) => void;
  setOfflineRequest: (request: OfflineSOSRequest) => void;
  dispatchRescueTeam: (request: RescueDispatchRequest) => boolean;
  resetDemoScenario: () => void;
}

const OperationsContext = createContext<OperationsContextValue | null>(null);

function canDispatchRescueTeam(state: OperationsState, request: RescueDispatchRequest) {
  const incident = state.incidents.find((item) => item.id === request.incidentId);
  const team = state.rescueTeams.find((item) => item.id === request.teamId);
  return Boolean(
    incident
    && team
    && team.status === "Available"
    && (team.capacity ?? 0) >= incident.peopleAffected
    && incident.priority === "P0"
    && incident.severity === "Critical"
    && incident.status !== "Rescue dispatched"
    && incident.routeAnalysisStatus === "Complete"
    && incident.recommendedRoute === "Road C"
    && incident.destinationShelter === "SHELTER 07"
    && incident.routeRisk === "Low",
  );
}

export function applyRescueDispatch(state: OperationsState, request: RescueDispatchRequest): OperationsState {
  if (!canDispatchRescueTeam(state, request)) return state;
  const incident = state.incidents.find((item) => item.id === request.incidentId)!;
  const team = state.rescueTeams.find((item) => item.id === request.teamId)!;
  const timelineEvents = request.timelineEvents.filter((event) =>
    !incident.timeline.some((existing) => existing.title === event.title),
  );
  return {
    ...state,
    incidents: state.incidents.map((item) => item.id === incident.id
      ? {
          ...item,
          status: "Rescue dispatched",
          rescueTeamId: team.id,
          rescueRecommendationReason: request.reason,
          rescueEtaMinutes: team.etaMinutes,
          rescueDispatchedAt: request.dispatchedAt,
          timeline: [...item.timeline, ...timelineEvents],
        }
      : item),
    rescueTeams: state.rescueTeams.map((item) => item.id === team.id
      ? { ...item, status: "En route", assignedIncidentId: incident.id }
      : item),
  };
}

export function applyDemoReset(state: OperationsState): OperationsState {
  const isDemoOfflineIncident = (incident: Incident) => incident.id === "1044" && incident.demoRunId === "phase8";
  const removeSyncedDemoIncident = state.incidents.some(isDemoOfflineIncident);

  return {
    ...state,
    incidents: state.incidents
      .filter((incident) => !(removeSyncedDemoIncident && isDemoOfflineIncident(incident)))
      .map((incident) => {
        if (incident.id !== "1043") return incident;
        const { rescueTeamId, rescueRecommendationReason, rescueEtaMinutes, rescueDispatchedAt, ...base } = incident;
        return {
          ...base,
          type: "Flash Flood",
          location: "Sector 04",
          peopleAffected: 4,
          vulnerablePeople: 1,
          vulnerablePerson: "Elderly Person",
          message: "Water has entered our house. Four people are trapped inside. My grandmother is with us and cannot walk.",
          source: "Citizen SOS",
          severity: "Critical",
          priority: "P0",
          status: "Triaged — Critical",
          triageStatus: "Complete",
          recommendedAction: "Immediate Rescue",
          medicalSupport: "Recommended",
          aiConfidence: 94,
          routeAnalysisStatus: "Complete",
          recommendedRoute: "Road C",
          destinationShelter: "SHELTER 07",
          routeDistanceKm: 6.2,
          routeEta: 11,
          routeRisk: "Low",
          timeline: base.timeline.filter((event) =>
            !event.title.includes("TEAM BRAVO RECOMMENDED")
            && !event.title.includes("TEAM BRAVO DISPATCHED")
            && event.title !== "TEAM EN ROUTE",
          ),
        };
      }),
    rescueTeams: state.rescueTeams.map((team) => {
      if (team.id !== "team-bravo") return team;
      const { assignedIncidentId, ...availableTeam } = team;
      return { ...availableTeam, status: "Available", availability: 100 };
    }),
    offlineQueue: (state.offlineQueue ?? []).filter((request) => request.demoRunId !== "phase8"),
    systemStatus: {
      ...state.systemStatus,
      network: "Connected",
      dataSync: "Live",
      lastSync: "Just now",
      activeSOSCount: Math.max(0, state.systemStatus.activeSOSCount - (removeSyncedDemoIncident ? 1 : 0)),
    },
  };
}

function operationsReducer(state: OperationsState, action: OperationsAction): OperationsState {
  switch (action.type) {
    case "incident/add":
      if (state.incidents.some((incident) => incident.id === action.incident.id)) return state;
      return {
        ...state,
        incidents: [action.incident, ...state.incidents],
        systemStatus: action.incident.source === "Citizen SOS"
          ? { ...state.systemStatus, activeSOSCount: state.systemStatus.activeSOSCount + 1 }
          : state.systemStatus,
      };
    case "incident/update":
      return {
        ...state,
        incidents: state.incidents.map((incident) =>
          incident.id === action.id ? { ...incident, ...action.changes, id: incident.id } : incident,
        ),
      };
    case "system/update":
      return { ...state, systemStatus: { ...state.systemStatus, ...action.changes } };
    case "offline/set": {
      const offlineQueue = state.offlineQueue ?? [];
      return {
        ...state,
        offlineQueue: offlineQueue.some((request) => request.id === action.request.id)
          ? offlineQueue.map((request) => request.id === action.request.id ? action.request : request)
          : [action.request, ...offlineQueue],
      };
    }
    case "rescue/dispatch":
      return applyRescueDispatch(state, action.request);
    case "demo/reset":
      return applyDemoReset(state);
    default:
      return state;
  }
}

export function OperationsProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(operationsReducer, demoOperations);
  const nextIncidentId = useRef(1043);
  const addIncident = useCallback((incident: Incident) => dispatch({ type: "incident/add", incident }), []);
  const createIncident = useCallback((draft: Omit<Incident, "id">) => {
    const usedIds = new Set(state.incidents.map((incident) => Number(incident.id)));
    let idNumber = nextIncidentId.current;
    while (usedIds.has(idNumber)) idNumber += 1;
    nextIncidentId.current = idNumber + 1;
    const incident: Incident = { ...draft, id: String(idNumber) };
    dispatch({ type: "incident/add", incident });
    return incident;
  }, [state.incidents]);
  const updateIncident = useCallback((id: string, changes: Partial<Incident>) => dispatch({ type: "incident/update", id, changes }), []);
  const updateSystemStatus = useCallback((changes: Partial<OperationsState["systemStatus"]>) => dispatch({ type: "system/update", changes }), []);
  const setOfflineRequest = useCallback((request: OfflineSOSRequest) => dispatch({ type: "offline/set", request }), []);
  const dispatchRescueTeam = useCallback((request: RescueDispatchRequest) => {
    if (!canDispatchRescueTeam(state, request)) return false;
    dispatch({ type: "rescue/dispatch", request });
    return true;
  }, [state]);
  const resetDemoScenario = useCallback(() => dispatch({ type: "demo/reset" }), []);
  const value = useMemo(() => ({ state, addIncident, createIncident, updateIncident, updateSystemStatus, setOfflineRequest, dispatchRescueTeam, resetDemoScenario }), [state, addIncident, createIncident, updateIncident, updateSystemStatus, setOfflineRequest, dispatchRescueTeam, resetDemoScenario]);

  return <OperationsContext.Provider value={value}>{children}</OperationsContext.Provider>;
}

export function useOperations() {
  const context = useContext(OperationsContext);
  if (!context) throw new Error("useOperations must be used within OperationsProvider");
  return context;
}
