import type {
  DisasterZone,
  Incident,
  Resource,
  RescueTeam,
  Road,
  Shelter,
  SOSRequest,
} from "@/types/disaster";

export const incidents: Incident[] = [
  {
    id: "1042",
    type: "Flash Flood",
    location: "Sector 04",
    peopleAffected: 4,
    vulnerablePeople: 1,
    severity: "Critical",
    status: "New",
    reportedAt: "3 min ago",
    message:
      "Water has entered our house. Four people are trapped inside. My grandmother is with us and cannot walk.",
    coordinates: { x: 71, y: 38 },
  },
  {
    id: "1038",
    type: "Street Flooding",
    location: "Sector 02",
    peopleAffected: 12,
    vulnerablePeople: 2,
    severity: "High",
    status: "Assessing",
    reportedAt: "11 min ago",
    message: "Water is rising across the lower road near the market. Several homes are cut off.",
    coordinates: { x: 43, y: 57 },
  },
  {
    id: "1035",
    type: "Power Outage",
    location: "Sector 07",
    peopleAffected: 8,
    vulnerablePeople: 0,
    severity: "High",
    status: "Monitoring",
    reportedAt: "18 min ago",
    message: "A local power interruption has affected the southern block during heavy rainfall.",
    coordinates: { x: 28, y: 32 },
  },
  {
    id: "1031",
    type: "Slope Movement",
    location: "Sector 11",
    peopleAffected: 2,
    vulnerablePeople: 0,
    severity: "Moderate",
    status: "Monitoring",
    reportedAt: "31 min ago",
    message: "A small section of hillside has shifted. Access remains under observation.",
    coordinates: { x: 56, y: 74 },
  },
];

export const rescueTeams: RescueTeam[] = [
  { id: "team-delta", name: "Team Delta", members: 4, status: "Mobilizing", location: "Sector 03", vehicle: "High-water unit", availability: 72 },
  { id: "team-bravo", name: "Team Bravo", members: 3, status: "On scene", location: "Sector 02", vehicle: "Rapid response", availability: 46 },
  { id: "team-north", name: "North Medical", members: 5, status: "Staged", location: "Central depot", vehicle: "Medical transport", availability: 100 },
  { id: "team-echo", name: "Team Echo", members: 4, status: "Available", location: "Sector 08", vehicle: "Water rescue", availability: 100 },
];

export const shelters: Shelter[] = [
  { id: "shelter-01", name: "Civic Hall East", location: "Sector 01", capacity: 240, occupancy: 148, status: "Open" },
  { id: "shelter-02", name: "North School Gym", location: "Sector 06", capacity: 180, occupancy: 142, status: "Limited" },
  { id: "shelter-03", name: "Riverside Community Centre", location: "Sector 09", capacity: 120, occupancy: 38, status: "Open" },
];

export const resources: Resource[] = [
  { id: "resource-01", name: "First-aid kits", category: "Medical", available: 86, unit: "kits", location: "Central depot" },
  { id: "resource-02", name: "Inflatable rescue boats", category: "Rescue", available: 7, unit: "boats", location: "North boathouse" },
  { id: "resource-03", name: "Water & meal packs", category: "Relief", available: 320, unit: "packs", location: "Sector 01" },
  { id: "resource-04", name: "High-clearance vehicles", category: "Transport", available: 5, unit: "vehicles", location: "Central depot" },
];

export const roads: Road[] = [
  { id: "road-01", name: "Embankment Way", sector: "Sector 04", status: "Restricted", note: "Standing water reported" },
  { id: "road-02", name: "Market Loop", sector: "Sector 02", status: "Open" },
  { id: "road-03", name: "Old Bridge Approach", sector: "Sector 05", status: "Closed", note: "Water-level threshold exceeded" },
];

export const disasterZones: DisasterZone[] = [
  { id: "zone-04", name: "Eastern floodplain", type: "Flood", severity: "Critical", waterLevel: 2.4, rainfallMm: 86, coordinates: { x: 64, y: 45 } },
  { id: "zone-02", name: "Market catchment", type: "Flood", severity: "High", waterLevel: 1.2, rainfallMm: 61, coordinates: { x: 42, y: 56 } },
  { id: "zone-11", name: "Northern slope", type: "Landslide", severity: "Moderate", rainfallMm: 48, coordinates: { x: 55, y: 22 } },
];

export const sosRequests: SOSRequest[] = [
  {
    id: "SOS-1042",
    incidentId: "1042",
    receivedAt: "3 min ago",
    people: 4,
    vulnerablePeople: 1,
    priority: "Critical",
    summary:
      "Water has entered our house. Four people are trapped inside. My grandmother is with us and cannot walk.",
    location: "Sector 04",
  },
  {
    id: "SOS-1038",
    incidentId: "1038",
    receivedAt: "11 min ago",
    people: 12,
    vulnerablePeople: 2,
    priority: "High",
    summary: "Water is rising across the lower road near the market. Several homes are cut off.",
    location: "Sector 02",
  },
];

export const systemSignals = [
  { id: "rainfall", name: "Rainfall gauges", source: "Regional sensor network", status: "Connected", latency: "4 sec" },
  { id: "radio", name: "District radio mesh", source: "Emergency communications", status: "Strong signal", latency: "12 sec" },
  { id: "satellite", name: "Satellite uplink", source: "Backup communications", status: "Standby", latency: "—" },
] as const;
