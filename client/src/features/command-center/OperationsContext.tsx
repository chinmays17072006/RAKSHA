import { createContext, useCallback, useContext, useMemo, useReducer, type ReactNode } from "react";
import { demoOperations } from "@/data/demo";
import type { Incident, OperationsState } from "@/types/disaster";

type OperationsAction =
  | { type: "incident/add"; incident: Incident }
  | { type: "incident/update"; id: string; changes: Partial<Incident> };

interface OperationsContextValue {
  state: OperationsState;
  addIncident: (incident: Incident) => void;
  updateIncident: (id: string, changes: Partial<Incident>) => void;
}

const OperationsContext = createContext<OperationsContextValue | null>(null);

function operationsReducer(state: OperationsState, action: OperationsAction): OperationsState {
  switch (action.type) {
    case "incident/add":
      if (state.incidents.some((incident) => incident.id === action.incident.id)) return state;
      return { ...state, incidents: [action.incident, ...state.incidents] };
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
  const addIncident = useCallback((incident: Incident) => dispatch({ type: "incident/add", incident }), []);
  const updateIncident = useCallback((id: string, changes: Partial<Incident>) => dispatch({ type: "incident/update", id, changes }), []);
  const value = useMemo(() => ({ state, addIncident, updateIncident }), [state, addIncident, updateIncident]);

  return <OperationsContext.Provider value={value}>{children}</OperationsContext.Provider>;
}

export function useOperations() {
  const context = useContext(OperationsContext);
  if (!context) throw new Error("useOperations must be used within OperationsProvider");
  return context;
}
