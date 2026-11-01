export type Severity = "Critical" | "High" | "Medium" | "Moderate" | "Low" | "Pending triage";
export type IncidentPriority = "P0" | "P1" | "P2" | "P3" | "Pending";
export type IncidentStatus = "Awaiting rescue" | "Under review" | "Monitoring" | "Contained" | "SOS received" | "Triaged — Critical" | "Rescue dispatched";
export type IncidentTriageStatus = "Complete" | "Manual review required";
export type TeamStatus = "En route" | "On scene" | "Mobilizing" | "Staged" | "Available" | "Busy" | "Unavailable";
export type RiskLevel = "Critical" | "High" | "Moderate" | "Safe";

export interface IncidentTimelineEvent {
  time: string;
  title: string;
  detail: string;
  tone: "red" | "amber" | "blue" | "green";
}

export interface Incident {
  id: string;
  type: string;
  location: string;
  peopleAffected: number;
  vulnerablePeople: number;
  vulnerablePerson?: string;
  vulnerableDescription?: string;
  severity: Severity;
  priority: IncidentPriority;
  status: IncidentStatus;
  reportedAt: string;
  createdAt?: string;
  message: string;
  source: "SOS" | "Sensor" | "Field report" | "Citizen SOS";
  coordinates: { x: number; y: number };
  timeline: IncidentTimelineEvent[];
  triageStatus?: IncidentTriageStatus;
  recommendedAction?: string;
  medicalSupport?: "Recommended" | "Not indicated";
  aiConfidence?: number;
  aiAssessment?: string;
  triagedAt?: string;
  rescueTeamId?: string;
  rescueRecommendationReason?: string;
  rescueEtaMinutes?: number;
  rescueDispatchedAt?: string;
  routeAnalysisStatus?: "Complete" | "No safe route";
  recommendedRoute?: string;
  destinationShelter?: string;
  routeDistanceKm?: number;
  routeEta?: number;
  routeRisk?: "Critical" | "High" | "Moderate" | "Low";
  routeGeneratedAt?: string;
}

export interface RescueTeam {
  id: string;
  name: string;
  members: number;
  capacity?: number;
  medicalSupport?: boolean;
  distanceKm?: number;
  status: TeamStatus;
  location: string;
  vehicle: string;
  availability: number;
  role: string;
  coordinates: { x: number; y: number };
  assignedIncidentId?: string;
  etaMinutes?: number;
}

export interface Shelter {
  id: string;
  name: string;
  location: string;
  capacity: number;
  occupancy: number;
  status: "Open" | "Limited" | "Full";
  coordinates: { x: number; y: number };
  routeCapacityPercent?: number;
  routeDistanceKm?: number;
  routeAccess?: "Safe" | "High risk" | "Higher risk";
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
  status: "Open" | "Restricted" | "Closed" | "Blocked";
  network?: "district" | "evacuation";
  distanceKm?: number;
  etaMinutes?: number;
  floodRisk?: "Critical" | "High" | "Moderate" | "Low";
  safety?: "Unsafe" | "High risk" | "Safe";
  safetyScore?: number;
  reason?: string;
  destinationShelterId?: string;
  note?: string;
}

export interface DisasterZone {
  id: string;
  name: string;
  sector: string;
  type: "Flood" | "Landslide" | "Storm";
  riskLevel: RiskLevel;
  waterLevel?: number;
  rainfallMm?: number;
  peopleAffected: number;
  coordinates: { x: number; y: number };
  radius: number;
}

export interface SOSRequest {
  id: string;
  incidentId: string;
  receivedAt: string;
  people: number;
  vulnerablePeople: number;
  priority: IncidentPriority;
  summary: string;
  location: string;
}

export interface SystemStatus {
  network: "Connected" | "Disconnected";
  dataSync: "Live" | "Paused";
  system: "Operational" | "Degraded";
  lastSync: string;
  activeSOSCount: number;
}

export interface OperationsState {
  incidents: Incident[];
  rescueTeams: RescueTeam[];
  shelters: Shelter[];
  riskZones: DisasterZone[];
  roads: Road[];
  resources: Resource[];
  systemStatus: SystemStatus;
}
