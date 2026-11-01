import { createContext, useCallback, useContext, useMemo, useReducer, useRef, type ReactNode } from "react";
import { demoOperations } from "@/data/demo";
import type { Incident, OperationsState } from "@/types/disaster";

type OperationsAction =
  | { type: "incident/add"; incident: Incident }
  | { type: "incident/update"; id: string; changes: Partial<Incident> };

interface OperationsContextValue {
  state: OperationsState;
  addIncident: (incident: Incident) => void;
  createIncident: (draft: Omit<Incident, "id">) => Incident;
  updateIncident: (id: string, changes: Partial<Incident>) => void;
}

const OperationsContext = createContext<OperationsContextValue | null>(null);

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
  const value = useMemo(() => ({ state, addIncident, createIncident, updateIncident }), [state, addIncident, createIncident, updateIncident]);

  return <OperationsContext.Provider value={value}>{children}</OperationsContext.Provider>;
}

export function useOperations() {
  const context = useContext(OperationsContext);
  if (!context) throw new Error("useOperations must be used within OperationsProvider");
  return context;
}
