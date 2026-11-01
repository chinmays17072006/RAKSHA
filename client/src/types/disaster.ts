export type Severity = "Critical" | "High" | "Moderate" | "Low";
export type IncidentStatus = "New" | "Assessing" | "Monitoring" | "Contained";
export type TeamStatus = "On scene" | "Mobilizing" | "Staged" | "Available";

export interface Incident {
  id: string;
  type: string;
  location: string;
  peopleAffected: number;
  vulnerablePeople: number;
  severity: Severity;
  status: IncidentStatus;
  reportedAt: string;
  message: string;
  coordinates: { x: number; y: number };
}

export interface RescueTeam {
  id: string;
  name: string;
  members: number;
  status: TeamStatus;
  location: string;
  vehicle: string;
  availability: number;
}

export interface Shelter {
  id: string;
  name: string;
  location: string;
  capacity: number;
  occupancy: number;
  status: "Open" | "Limited" | "Full";
}

export interface Resource {
  id: string;
  name: string;
  category: "Medical" | "Rescue" | "Relief" | "Transport";
  available: number;
  unit: string;
  location: string;
}

export interface Road {
  id: string;
  name: string;
  sector: string;
  status: "Open" | "Restricted" | "Closed";
  note?: string;
}

export interface DisasterZone {
  id: string;
  name: string;
  type: "Flood" | "Landslide" | "Storm";
  severity: Severity;
  waterLevel?: number;
  rainfallMm?: number;
  coordinates: { x: number; y: number };
}

export interface SOSRequest {
  id: string;
  incidentId: string;
  receivedAt: string;
  people: number;
  vulnerablePeople: number;
  priority: Severity;
  summary: string;
  location: string;
}
