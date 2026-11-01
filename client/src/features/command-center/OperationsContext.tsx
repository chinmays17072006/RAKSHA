import { createContext, useCallback, useContext, useMemo, useReducer, useRef, type ReactNode } from "react";
import { demoOperations } from "@/data/demo";
import type { Incident, IncidentTimelineEvent, OperationsState } from "@/types/disaster";

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
  | { type: "rescue/dispatch"; request: RescueDispatchRequest };

interface OperationsContextValue {
  state: OperationsState;
  addIncident: (incident: Incident) => void;
  createIncident: (draft: Omit<Incident, "id">) => Incident;
  updateIncident: (id: string, changes: Partial<Incident>) => void;
  dispatchRescueTeam: (request: RescueDispatchRequest) => boolean;
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
    case "rescue/dispatch":
      return applyRescueDispatch(state, action.request);
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
  const dispatchRescueTeam = useCallback((request: RescueDispatchRequest) => {
    if (!canDispatchRescueTeam(state, request)) return false;
    dispatch({ type: "rescue/dispatch", request });
    return true;
  }, [state]);
  const value = useMemo(() => ({ state, addIncident, createIncident, updateIncident, dispatchRescueTeam }), [state, addIncident, createIncident, updateIncident, dispatchRescueTeam]);

  return <OperationsContext.Provider value={value}>{children}</OperationsContext.Provider>;
}

export function useOperations() {
  const context = useContext(OperationsContext);
  if (!context) throw new Error("useOperations must be used within OperationsProvider");
  return context;
}
