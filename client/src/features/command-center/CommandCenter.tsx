import { useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";
import {
  Activity,
  AlertTriangle,
  BrainCircuit,
  ArrowDownRight,
  ArrowUpRight,
  Bell,
  Building2,
  CheckCircle2,
  ChevronRight,
  CircleDot,
  CloudRain,
  Crosshair,
  Droplets,
  LayoutDashboard,
  Layers,
  LifeBuoy,
  MapPin,
  Menu,
  Radio,
  RadioTower,
  RefreshCw,
  Route as RouteIcon,
  Shield,
  ShieldCheck,
  Signal,
  Truck,
  Users,
  WifiOff,
  X,
} from "lucide-react";
import { NavigationItem } from "@/components/system/NavigationItem";
import { useOperations } from "./OperationsContext";
import type { DisasterZone, Incident, RescueTeam, Shelter, SystemStatus } from "@/types/disaster";
import { Dialog, useToast } from "@/components/system/feedback";
import {
  Button,
  Card,
  DataTable,
  KpiCard,
  ProgressIndicator,
  SectionHeader,
  SeverityBadge,
  StatusBadge,
  TimelineItem,
  type DataColumn,
} from "@/components/system/ui";

export type OperationsPage = "command" | "citizen-sos" | "ai-triage" | "safe-routing" | "rescue-operations";

const navigation = [
  { label: "Command Center", icon: LayoutDashboard, route: "/", activePage: "command" },
  { label: "Live Incidents", icon: Radio, phase: "NEXT" },
  { label: "Rescue Operations", icon: Truck, route: "/rescue-operations", activePage: "rescue-operations" },
  { label: "Shelters & Resources", icon: Building2, phase: "NEXT" },
  { label: "Citizen SOS", icon: LifeBuoy, route: "/citizen-sos", activePage: "citizen-sos" },
  { label: "AI Triage", icon: BrainCircuit, route: "/ai-triage", activePage: "ai-triage" },
  { label: "Safe Routing", icon: RouteIcon, route: "/safe-routing", activePage: "safe-routing" },
  { label: "Offline Mode", icon: WifiOff, phase: "NEXT" },
] as const;

function vulnerablePersonLabel(incident: Incident) {
  if (incident.vulnerableDescription) return incident.vulnerableDescription;
  if (incident.vulnerablePeople === 0 || incident.vulnerablePerson === "None") return "None reported";
  if (incident.vulnerablePerson === "Multiple Vulnerable People") return "Multiple vulnerable people";
  if (incident.vulnerablePerson) return `${incident.vulnerablePeople || 1} ${incident.vulnerablePerson.toLowerCase()}`;
  return `${incident.vulnerablePeople} person(s)`;
}

function BrandMark({ small = false }: { small?: boolean }) {
  return (
    <span className={`brand-mark ${small ? "brand-mark--small" : ""}`} aria-hidden="true">
      <svg viewBox="0 0 36 36" fill="none">
        <path d="M18 3.5 29 8v8.1c0 7.2-4.4 12.1-11 16.2C11.4 28.2 7 23.3 7 16.1V8l11-4.5Z" stroke="currentColor" strokeWidth="1.6" />
        <path d="M12.2 20.4a8.4 8.4 0 0 1 11.6 0M14.9 17.2a4.6 4.6 0 0 1 6.2 0" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        <circle cx="18" cy="23.3" r="1.55" fill="currentColor" />
      </svg>
    </span>
  );
}

export function NavigationRail({
  open,
  onClose,
  onPlaceholder,
  rainfall,
  systemStatus,
  activePage,
  onNavigate,
}: {
  open: boolean;
  onClose: () => void;
  onPlaceholder: (label: string) => void;
  rainfall: number;
  systemStatus: SystemStatus;
  activePage: OperationsPage;
  onNavigate: (path: string) => void;
}) {
  return (
    <>
      {open && <button className="sidebar-scrim" onClick={onClose} aria-label="Close navigation" />}
      <aside className={`sidebar ${open ? "sidebar--open" : ""}`} aria-label="Primary navigation">
        <div className="sidebar__brand">
          <BrandMark />
          <div className="sidebar__brand-copy">
            <strong>RAKSHA</strong>
            <span>AI DISASTER INTELLIGENCE</span>
            <span className="sidebar__tagline">PREDICT. PRIORITIZE. ROUTE. RESCUE.</span>
          </div>
          <button className="icon-button sidebar__close" onClick={onClose} aria-label="Close navigation"><X size={18} /></button>
        </div>

        <div className="sidebar__section-label">OPERATIONS</div>
        <nav className="sidebar__nav">
          {navigation.map((item) => {
            const active = "activePage" in item && item.activePage === activePage;
            const route = "route" in item ? item.route : null;
            return (
              <NavigationItem
                key={item.label}
                icon={item.icon}
                label={item.label}
                active={active}
                disabled={!route}
                phase={route ? undefined : "phase" in item ? item.phase : undefined}
                onClick={route ? () => { onNavigate(route); onClose(); } : () => onPlaceholder(item.label)}
              />
            );
          })}
        </nav>

        <div className="sidebar__spacer" />
        <div className="sidebar-weather">
          <div className="sidebar-weather__top"><CloudRain size={15} /><span>MONSOON WATCH</span><span className="sidebar-weather__pulse" /></div>
          <strong>{rainfall} <small>mm</small></strong>
          <span>rainfall · last 3 hours</span>
          <div className="sidebar-weather__bar"><span /></div>
          <div className="sidebar-weather__foot"><span>SECTOR 04</span><span>HIGH ALERT</span></div>
        </div>
        <div className="sidebar-status">
          <span className="system-dot" />
          <div><strong>SYSTEM {systemStatus.system.toUpperCase()}</strong><span>Network {systemStatus.network.toLowerCase()} · sync {systemStatus.dataSync.toLowerCase()}</span></div>
          <CheckCircle2 size={15} aria-hidden="true" />
        </div>
        <div className="sidebar__version">RAKSHA <span>•</span> {activePage === "command" ? "COMMAND CENTER · PHASE 1" : activePage === "citizen-sos" ? "CITIZEN SOS · PHASE 2" : activePage === "ai-triage" ? "AI TRIAGE · PHASE 3" : activePage === "safe-routing" ? "SAFE ROUTING · PHASE 4" : "RESCUE OPERATIONS · PHASE 5"}</div>
      </aside>
    </>
  );
}

export function TopBar({
  onMenu,
  onNotifications,
  systemStatus,
  pageContext = "OPERATIONS / OVERVIEW",
  pageTitle = "COMMAND CENTER",
}: {
  onMenu: () => void;
  onNotifications: () => void;
  systemStatus: SystemStatus;
  pageContext?: string;
  pageTitle?: string;
}) {
  const [now, setNow] = useState(() => new Date());
  const [profileOpen, setProfileOpen] = useState(false);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 30_000);
    return () => window.clearInterval(timer);
  }, []);

  const date = now.toLocaleDateString(undefined, { day: "2-digit", month: "short" }).toUpperCase();
  const time = now.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit", hour12: false });

  return (
    <header className="topbar">
      <div className="topbar__left">
        <button className="icon-button topbar__menu" onClick={onMenu} aria-label="Open navigation"><Menu size={20} /></button>
        <div className="topbar__brand"><BrandMark small /><div><strong>RAKSHA</strong><span>AI DISASTER INTELLIGENCE</span></div></div>
        <div className="topbar__divider" />
        <div className="topbar__page"><span>{pageContext}</span><strong>{pageTitle}</strong></div>
      </div>
      <div className="topbar__right">
        <StatusBadge tone={systemStatus.dataSync === "Live" ? "success" : "warning"} dot className="live-badge">{systemStatus.dataSync === "Live" ? "LIVE MONITORING" : "MONITORING PAUSED"}</StatusBadge>
        <span className="topbar__operational"><span className="system-dot" /> {systemStatus.system.toUpperCase()}</span>
        <div className="topbar__time"><strong>{time}</strong><span>{date} <span className="timezone">LOCAL</span></span></div>
        <button className="icon-button topbar__bell" onClick={onNotifications} aria-label="View system notifications"><Bell size={17} /><i /></button>
        <div className="profile-wrap">
          <button className="operator-profile" onClick={() => setProfileOpen((value) => !value)} aria-expanded={profileOpen} aria-label="Open operator profile">
            <span className="operator-profile__avatar">DO</span>
            <span className="operator-profile__copy"><strong>Duty operator</strong><small>Shift 02 · Command</small></span>
            <ChevronRight className={profileOpen ? "profile-chevron profile-chevron--open" : "profile-chevron"} size={14} />
          </button>
          {profileOpen && <div className="profile-popover"><span className="section-eyebrow">ACTIVE SESSION</span><strong>Demonstration operator</strong><span>Command desk · Shift 02</span><div className="profile-popover__status"><span className="system-dot" /> Secure session active</div></div>}
        </div>
      </div>
    </header>
  );
}

function MapLayer({
  floodVisible,
  waterLevel,
  teamsVisible,
  sheltersVisible,
  riskZones,
  incidents,
  rescueTeams,
  shelters,
  onSelectIncident,
  onSelectTeam,
  onSelectShelter,
  focusPulse,
}: {
  floodVisible: boolean;
  waterLevel: number;
  teamsVisible: boolean;
  sheltersVisible: boolean;
  riskZones: DisasterZone[];
  incidents: Incident[];
  rescueTeams: RescueTeam[];
  shelters: Shelter[];
  onSelectIncident: (incidentId: string) => void;
  onSelectTeam: (team: RescueTeam) => void;
  onSelectShelter: (shelter: Shelter) => void;
  focusPulse: boolean;
}) {
  return (
    <div className={`map-canvas ${focusPulse ? "map-canvas--focused" : ""}`}>
      <svg className="map-svg" viewBox="0 0 920 410" preserveAspectRatio="xMidYMid slice" role="img" aria-label="Schematic disaster map showing simulated critical, high, moderate, and safe zones across seven sectors">
        <defs>
          <pattern id="map-grid" width="32" height="32" patternUnits="userSpaceOnUse"><path d="M32 0H0V32" fill="none" stroke="#294050" strokeWidth=".6" opacity=".48" /></pattern>
          <pattern id="water-lines" width="24" height="14" patternUnits="userSpaceOnUse"><path d="M-2 8c4-4 8-4 12 0s8 4 12 0 8-4 12 0" fill="none" stroke="#36a7c8" strokeWidth=".8" opacity=".37" /></pattern>
          <radialGradient id="map-fade"><stop offset="0" stopColor="#1c3441" stopOpacity=".45" /><stop offset="1" stopColor="#0b151d" stopOpacity="0" /></radialGradient>
          <filter id="marker-glow" x="-300%" y="-300%" width="700%" height="700%"><feGaussianBlur stdDeviation="4" result="blur" /><feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
        </defs>
        <rect width="920" height="410" fill="#0c171f" />
        <rect width="920" height="410" fill="url(#map-grid)" />
        <ellipse cx="540" cy="205" rx="440" ry="250" fill="url(#map-fade)" />
        <path className="map-river" d="M-40 330C83 276 89 213 222 226c91 9 130 77 234 50 78-20 105-97 193-91 102 7 145 66 303 16v116c-102 48-183 13-279 2-115-14-138 65-240 74-119 10-186-76-281-53-77 18-102 67-192 85Z" />
        <path className="map-river-edge" d="M-40 330C83 276 89 213 222 226c91 9 130 77 234 50 78-20 105-97 193-91 102 7 145 66 303 16" />
        <g className="map-roads" fill="none" strokeLinecap="round">
          <path d="M-15 90C102 102 135 152 237 140s146-54 251-33 183 66 293 36 128-64 188-64" />
          <path d="M-26 174c94-10 143-23 222 6s147 79 247 56 129-74 235-60 158 31 278 2" />
          <path d="M-20 254c92-16 130-70 220-68 103 3 131 58 228 92s148 36 232-6 140-105 280-95" />
          <path d="M125-20c29 70 42 123 29 195s-60 127-36 259" />
          <path d="M326-20c-15 76-25 127 13 192s37 126 21 258" />
          <path d="M540-10c22 62 77 111 74 173s-49 131-30 267" />
          <path d="M742-10c-22 80-50 127-14 185s77 97 63 255" />
          <path d="M-18 120 173 105 325 124 489 88 659 113 920 69" />
          <path d="M-12 300 133 272 268 289 421 324 555 305 721 263 926 283" />
        </g>
        <g className="map-minor-roads" fill="none" strokeLinecap="round">
          <path d="m57 57 64 20 62-15 37 37m74 51 46-31 59 9m129 164 56 16 46-37 70 3m70-70 44 16 51-24" />
          <path d="m212 340 26-57 46-30m-14-202 40 30 31-4m236-8 39 35 37-7" />
        </g>
        <g className="map-boundaries">
          <path d="M40 48 320 31 409 92 380 204 292 260 90 230Z" />
          <path d="M409 92 628 63 742 117 690 234 533 270 380 204Z" />
          <path d="m90 230 202 30 88-56 153 66-31 116-232 24-187-36Z" />
          <path d="m533 270 157-36 185 43-9 103-258 16-133-22Z" />
        </g>
        <g className="map-risk-zones">
          {riskZones.map((zone) => (
            <g key={zone.id} className={`map-risk-zone map-risk-zone--${zone.riskLevel.toLowerCase()}`}>
              <ellipse cx={zone.coordinates.x * 9.2} cy={zone.coordinates.y * 4.1} rx={zone.radius * 4.1} ry={zone.radius * 2.25}>
                <title>{`${zone.sector} · ${zone.riskLevel} · ${zone.name}`}</title>
              </ellipse>
            </g>
          ))}
        </g>
        <g className="map-labels">
          <text x="78" y="112">SECTOR 01</text><text x="126" y="142">SECTOR 02</text><text x="300" y="103">SECTOR 03</text><text x="470" y="153">SECTOR 04</text><text x="710" y="183">SECTOR 05</text>
          <text x="198" y="322">SECTOR 07</text><text x="634" y="344">SECTOR 09</text>
          <text className="map-labels__river" x="334" y="238" transform="rotate(8 334 238)">EASTERN CHANNEL</text>
          <text className="map-labels__district" x="48" y="38">EASTERN DISTRICT / SIMULATED LAYER</text>
        </g>
        {floodVisible && <g className="map-flood-zone">
          <path d="M410 120c40-32 104-27 140-4 35 23 67 36 61 80-4 31-34 50-70 58-38 8-69 3-101-16-41-24-73-34-67-70 4-21 14-35 37-48Z" />
          <path d="M410 120c40-32 104-27 140-4 35 23 67 36 61 80-4 31-34 50-70 58-38 8-69 3-101-16-41-24-73-34-67-70 4-21 14-35 37-48Z" fill="url(#water-lines)" />
          <text x="498" y="202">HIGH-WATER ZONE</text>
          <text x="509" y="219">{waterLevel.toFixed(1)} M / RISING</text>
        </g>}
      </svg>
      <div className="map-marker-layer" role="group" aria-label="Simulated incident, response-team, and shelter markers">
        {incidents.filter((incident) => incident.source === "SOS" || incident.source === "Citizen SOS").map((incident) => (
          <button
            type="button"
            key={incident.id}
            className={`map-point map-point--sos ${incident.id === "1042" ? "map-point--primary" : ""} ${incident.severity === "Critical" ? "map-point--critical" : incident.severity === "Pending triage" ? "map-point--pending" : ""}`}
            style={{ left: `${incident.coordinates.x}%`, top: `${incident.coordinates.y}%` }}
            onClick={() => onSelectIncident(incident.id)}
            aria-label={`Open incident #${incident.id}, ${incident.priority} ${incident.severity}, ${incident.location}`}
            title={`#${incident.id} · ${incident.priority} · ${incident.severity}`}
          >
            <span className="map-point__icon"><LifeBuoy size={incident.id === "1042" ? 15 : 12} /></span>
            {incident.id === "1042" ? <span className="map-point__label"><strong>#1042 <b>P0</b></strong><small>CRITICAL · SECTOR 04</small></span> : <span className="map-point__code">#{incident.id} · {incident.priority === "Pending" ? "PENDING" : incident.priority}</span>}
          </button>
        ))}
        {teamsVisible && rescueTeams.slice(0, 3).map((team) => (
          <button
            type="button"
            key={team.id}
            className="map-point map-point--team"
            style={{ left: `${team.coordinates.x}%`, top: `${team.coordinates.y}%` }}
            onClick={() => onSelectTeam(team)}
            aria-label={`Show information for ${team.name}`}
            title={team.name}
          ><span className="map-point__icon"><Truck size={13} /></span><span className="map-point__asset-label">{team.name.replace("TEAM ", "")}</span></button>
        ))}
        {sheltersVisible && shelters.slice(0, 3).map((shelter) => (
          <button
            type="button"
            key={shelter.id}
            className="map-point map-point--shelter"
            style={{ left: `${shelter.coordinates.x}%`, top: `${shelter.coordinates.y}%` }}
            onClick={() => onSelectShelter(shelter)}
            aria-label={`Show information for ${shelter.name}`}
            title={shelter.name}
          ><span className="map-point__icon"><Building2 size={12} /></span><span className="map-point__asset-label">{shelter.name.replace("SHELTER ", "S")}</span></button>
        ))}
      </div>
      <div className="map-compass" aria-hidden="true"><span>N</span><div><i /><i /><i /><i /></div></div>
      <div className="map-note"><CircleDot size={11} /> SIMULATED MAP DATA <span>·</span> NOT TO SCALE</div>
    </div>
  );
}

function MapPanel({ incidents, rescueTeams, shelters, riskZones, waterLevel, onSelectIncident }: {
  incidents: Incident[];
  rescueTeams: RescueTeam[];
  shelters: Shelter[];
  riskZones: DisasterZone[];
  waterLevel: number;
  onSelectIncident: (incidentId: string) => void;
}) {
  const [layers, setLayers] = useState({ flood: true, teams: true, shelters: true });
  const [focused, setFocused] = useState(false);
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);
  const [selectedShelterId, setSelectedShelterId] = useState<string | null>(null);
  const selectedTeam = rescueTeams.find((team) => team.id === selectedTeamId) ?? null;
  const selectedShelter = shelters.find((shelter) => shelter.id === selectedShelterId) ?? null;
  const showToast = useToast();
  const toggleLayer = (key: keyof typeof layers) => setLayers((current) => ({ ...current, [key]: !current[key] }));
  const focusMap = () => {
    setFocused(true);
    showToast({ title: "Sector 04 centered", detail: "Simulated map view · no live routing is connected.", tone: "info" });
    window.setTimeout(() => setFocused(false), 850);
  };

  return (
    <Card className="map-panel">
      <div className="map-panel__header">
        <SectionHeader eyebrow="GEOSPATIAL AWARENESS" title="Live disaster map" />
        <div className="map-panel__header-meta"><StatusBadge tone="info" dot>DEMO LAYER</StatusBadge><span>UPDATED JUST NOW</span></div>
      </div>
      <div className="map-panel__visual-wrap">
        <MapLayer
          floodVisible={layers.flood}
          waterLevel={waterLevel}
          teamsVisible={layers.teams}
          sheltersVisible={layers.shelters}
          riskZones={riskZones}
          incidents={incidents}
          rescueTeams={rescueTeams}
          shelters={shelters}
          onSelectIncident={(id) => { setSelectedTeamId(null); setSelectedShelterId(null); onSelectIncident(id); }}
          onSelectTeam={(team) => { setSelectedShelterId(null); setSelectedTeamId(team.id); }}
          onSelectShelter={(shelter) => { setSelectedTeamId(null); setSelectedShelterId(shelter.id); }}
          focusPulse={focused}
        />
        {(selectedTeam || selectedShelter) && <div className="map-asset-popup" role="status">
          <button className="icon-button map-asset-popup__close" onClick={() => { setSelectedTeamId(null); setSelectedShelterId(null); }} aria-label="Close map information"><X size={14} /></button>
          {selectedTeam && <>
            <span className="section-eyebrow">RESCUE UNIT · SIMULATED</span>
            <strong>{selectedTeam.name}</strong>
            <span>{selectedTeam.role} · {selectedTeam.status.toUpperCase()}</span>
            <small>{selectedTeam.assignedIncidentId ? `Incident #${selectedTeam.assignedIncidentId} · Destination ${incidents.find((incident) => incident.id === selectedTeam.assignedIncidentId)?.location ?? selectedTeam.location} · ETA ${selectedTeam.etaMinutes} min` : `${selectedTeam.location} · Ready for deployment`}</small>
            <small>{selectedTeam.capacity ? `Capacity ${selectedTeam.capacity} · ` : ""}Medical support {selectedTeam.medicalSupport ? "YES" : "NO"}</small>
          </>}
          {selectedShelter && <>
            <span className="section-eyebrow">SHELTER · SIMULATED</span>
            <strong>{selectedShelter.name}</strong>
            <span>{selectedShelter.location}</span>
            <small>{selectedShelter.capacity - selectedShelter.occupancy} places available · {selectedShelter.occupancy} occupants</small>
            <StatusBadge tone={selectedShelter.status === "Full" ? "warning" : "success"} dot>{selectedShelter.status.toUpperCase()}</StatusBadge>
          </>}
        </div>}
        <div className="map-layers" aria-label="Map layers">
          <button className={layers.flood ? "map-layer map-layer--active" : "map-layer"} aria-pressed={layers.flood} onClick={() => toggleLayer("flood")}><span className="map-layer__swatch map-layer__swatch--flood" /> Flood extent</button>
          <button className={layers.teams ? "map-layer map-layer--active" : "map-layer"} aria-pressed={layers.teams} onClick={() => toggleLayer("teams")}><span className="map-layer__swatch map-layer__swatch--team" /> Field units</button>
          <button className={layers.shelters ? "map-layer map-layer--active" : "map-layer"} aria-pressed={layers.shelters} onClick={() => toggleLayer("shelters")}><span className="map-layer__swatch map-layer__swatch--shelter" /> Shelters</button>
        </div>
        <button className="map-focus" onClick={focusMap} aria-label="Center the map on Sector 04"><Crosshair size={15} /></button>
      </div>
      <div className="map-panel__footer">
        <div className="map-legend" aria-label="Map legend">
          <span><i className="legend-dot legend-dot--critical" /> Critical</span><span><i className="legend-dot legend-dot--high" /> High Risk</span><span><i className="legend-dot legend-dot--moderate" /> Moderate</span><span><i className="legend-dot legend-dot--safe" /> Safe</span>
          <span><LifeBuoy size={10} /> SOS</span><span><Truck size={10} /> Rescue Team</span><span><Building2 size={10} /> Shelter</span>
        </div>
        <span className="map-scale">SECTOR 04 <b /> 1.4 KM</span>
      </div>
    </Card>
  );
}

function IncidentDetail({ incident, rescueTeams, onClose }: { incident: Incident; rescueTeams: RescueTeam[]; onClose: () => void }) {
  const isPrimary = incident.id === "1042";
  const isCitizenSOS = incident.source === "Citizen SOS";
  const triageComplete = incident.triageStatus === "Complete";
  const manualReview = incident.triageStatus === "Manual review required";
  const assignedTeam = rescueTeams.find((team) => team.id === incident.rescueTeamId);
  const statusTone = incident.status === "Awaiting rescue" || incident.status === "Triaged — Critical" ? "critical" : incident.status === "Contained" ? "success" : "info";
  return (
    <Dialog title={`INCIDENT #${incident.id}`} eyebrow="SIMULATED INCIDENT RECORD · VIEW ONLY" onClose={onClose} footer={<Button variant="secondary" onClick={onClose}>Close details</Button>}>
      <div className="incident-detail__summary">
        <SeverityBadge severity={incident.severity} priority={incident.priority} />
        <span className="incident-detail__type">{incident.type}</span>
        <StatusBadge tone={statusTone}>{incident.status.toUpperCase()}</StatusBadge>
      </div>
      <div className="incident-detail__location"><MapPin size={16} /><span><strong>{incident.location}</strong><small>Fictional demo location · received {incident.reportedAt}</small></span></div>
      <div className="incident-detail__facts">
        <div><span>EVENT</span><strong>{incident.type}</strong></div>
        <div><span>LOCATION</span><strong>{incident.location}</strong></div>
        <div><span>PEOPLE</span><strong>{incident.peopleAffected}</strong></div>
        <div><span>VULNERABLE</span><strong>{vulnerablePersonLabel(incident)}</strong></div>
        <div><span>PRIORITY</span><strong>{incident.priority === "Pending" ? "PENDING TRIAGE" : incident.priority}</strong></div>
        <div><span>SEVERITY</span><strong>{incident.severity.toUpperCase()}</strong></div>
        <div><span>STATUS</span><strong>{incident.status.toUpperCase()}</strong></div>
        <div><span>SOURCE</span><strong>{incident.source.toUpperCase()}</strong></div>
      </div>
      <blockquote className="incident-detail__message">“{incident.message}”</blockquote>
      {(isPrimary || isCitizenSOS) && <>
        {(isPrimary || incident.recommendedAction) && <section className="incident-detail__recommendation" aria-label="Demonstration recommendation">
          <div><span>RECOMMENDED ACTION</span><strong>{incident.recommendedAction ?? "Immediate rescue required."}</strong>{!incident.recommendedAction && <small>For now, this is a demo recommendation.</small>}</div>
          <div><span>MEDICAL SUPPORT</span><strong>{incident.medicalSupport ?? "Recommended"}</strong></div>
        </section>}
        <div className="incident-detail__ai"><span><span className="section-eyebrow">AI TRIAGE</span><small>{triageComplete ? `Local rule result · ${incident.aiConfidence ?? 0}% confidence` : manualReview ? "Insufficient information · operator review required" : "Local deterministic rule analysis available."}</small></span><StatusBadge tone={triageComplete ? "success" : manualReview ? "warning" : "info"}>{triageComplete ? "AI TRIAGE COMPLETE" : manualReview ? "MANUAL REVIEW REQUIRED" : "PENDING — AI TRIAGE"}</StatusBadge></div>
      {triageComplete && incident.aiAssessment && <p className="incident-detail__ai-assessment"><strong>AI ASSESSMENT</strong>{incident.aiAssessment}</p>}
      </>}
      {incident.routeAnalysisStatus === "Complete" && incident.recommendedRoute && incident.destinationShelter && <section className="incident-detail__route" aria-label="Evacuation route">
        <div><span className="section-eyebrow">EVACUATION ROUTE</span><StatusBadge tone="success" dot>SAFE ROUTE FOUND</StatusBadge></div>
        <strong>{incident.recommendedRoute} <i>→</i> {incident.destinationShelter}</strong>
        <small>{incident.routeDistanceKm?.toFixed(1)} km · {incident.routeEta} min · {incident.routeRisk?.toUpperCase()} RISK</small>
      </section>}
      {incident.routeAnalysisStatus === "No safe route" && <section className="incident-detail__route incident-detail__route--warning" aria-label="Evacuation route">
        <div><span className="section-eyebrow">EVACUATION ROUTE</span><StatusBadge tone="warning" dot>MANUAL REVIEW</StatusBadge></div>
        <strong>NO SAFE ROUTE AVAILABLE</strong>
        <small>Manual operator review required.</small>
      </section>}
      {incident.status === "Rescue dispatched" && assignedTeam && <section className="incident-detail__dispatch" aria-label="Rescue dispatch">
        <div><span className="section-eyebrow">RESCUE RESPONSE</span><StatusBadge tone="info" dot>RESCUE DISPATCHED</StatusBadge></div>
        <strong>{assignedTeam.name}</strong>
        <small>ETA {incident.rescueEtaMinutes ?? assignedTeam.etaMinutes ?? "—"} MIN · EN ROUTE TO {incident.location.toUpperCase()}</small>
      </section>}
      {incident.timeline.length > 0 && <section className="incident-detail__timeline">
        <span className="section-eyebrow">INCIDENT TIMELINE</span>
        <div className="incident-detail__timeline-list">
          {incident.timeline.map((event, index) => <TimelineItem key={`${event.time}-${event.title}`} icon={event.tone === "red" ? AlertTriangle : CircleDot} title={event.title} detail={event.detail} time={event.time} tone={event.tone} last={index === incident.timeline.length - 1} />)}
        </div>
      </section>}
      <div className="incident-detail__notice"><Shield size={15} /><span>Simulated demo information only · no live AI service or external dispatch is connected.</span></div>
    </Dialog>
  );
}

function IncidentPanel({ incidents, rescueTeams, onSelectIncident }: { incidents: Incident[]; rescueTeams: RescueTeam[]; onSelectIncident: (incidentId: string) => void }) {
  const rows = useMemo(() => {
    const citizenReports = incidents.filter((incident) => incident.source === "Citizen SOS").sort((a, b) => Number(b.id) - Number(a.id));
    const pinned = ["1042", "1041", "1038"].map((id) => incidents.find((incident) => incident.id === id)).filter((incident): incident is Incident => incident !== undefined);
    const pinnedIds = new Set([...citizenReports, ...pinned].map((incident) => incident.id));
    const priorityRank = (priority: Incident["priority"]) => priority === "Pending" ? 4 : Number(priority.slice(1));
    const additional = incidents.filter((incident) => !pinnedIds.has(incident.id)).sort((a, b) => priorityRank(a.priority) - priorityRank(b.priority)).slice(0, 3);
    return [...citizenReports, ...pinned, ...additional].slice(0, 6);
  }, [incidents]);
  const criticalCount = incidents.filter((incident) => incident.severity === "Critical").length;
  const columns: DataColumn<Incident>[] = [
    { key: "priority", title: "PRI", render: (row) => <SeverityBadge severity={row.severity} priority={row.priority} compact /> },
    { key: "incident", title: "PRIORITY INCIDENTS", render: (row) => <div className="incident-cell"><strong>{row.type}</strong><span>#{row.id} <i /> {row.location} · {row.peopleAffected} people</span>{row.source === "Citizen SOS" && <small className="incident-cell__status">{row.status === "Rescue dispatched" ? `RESCUE DISPATCHED · ${rescueTeams.find((team) => team.id === row.rescueTeamId)?.name ?? "TEAM ASSIGNED"} · ETA ${row.rescueEtaMinutes ?? "—"} MIN` : row.triageStatus === "Complete" ? `TRIAGED — ${row.severity.toUpperCase()} · ${row.priority}` : row.triageStatus === "Manual review required" ? "MANUAL REVIEW REQUIRED" : "SOS RECEIVED · PENDING TRIAGE"}</small>}</div> },
    { key: "age", title: "AGE", align: "right", className: "incident-age", render: (row) => <span>{row.reportedAt}</span> },
  ];
  return (
    <Card className="incident-panel">
      <div className="incident-panel__header">
        <SectionHeader eyebrow="NEEDS ATTENTION" title="Priority incidents" />
        <StatusBadge tone="critical">{criticalCount.toString().padStart(2, "0")} CRITICAL</StatusBadge>
      </div>
      <DataTable rows={rows} columns={columns} label="Priority incidents" onRowClick={(incident) => onSelectIncident(incident.id)} />
      <div className="incident-panel__footer"><span>Showing simulated reports</span><span className="incident-panel__view-label">OPEN A ROW TO REVIEW <ArrowUpRight size={12} /></span></div>
    </Card>
  );
}

function ReadinessPanel({ rescueTeams }: { rescueTeams: RescueTeam[] }) {
  const featured = ["team-bravo", "team-alpha", "team-charlie"]
    .map((id) => rescueTeams.find((team) => team.id === id))
    .filter((team): team is RescueTeam => team !== undefined);
  const availableCount = rescueTeams.filter((team) => team.status === "Available").length;
  return (
    <Card className="readiness-panel">
      <div className="support-panel__header"><SectionHeader eyebrow="RESCUE OPERATIONS SUMMARY" title="Field response" /><StatusBadge tone="info" dot>DEMO SUMMARY</StatusBadge></div>
      <div className="readiness-panel__summary"><strong>{availableCount.toString().padStart(2, "0")}</strong><span>teams available</span><span className="readiness-panel__divider" /><strong>{rescueTeams.length.toString().padStart(2, "0")}</strong><span>units reporting</span></div>
      <div className="team-list">
        {featured.map((team) => {
          const tone = team.status === "On scene" || team.status === "Unavailable" ? "critical" : team.status === "En route" ? "info" : team.status === "Mobilizing" || team.status === "Busy" ? "warning" : "success";
          const subline = team.assignedIncidentId ? `Incident #${team.assignedIncidentId} · ETA ${team.etaMinutes} min` : team.status === "Available" ? `${team.location} · Ready for deployment` : `${team.location} · ${team.status.toUpperCase()}`;
          return (
            <div className="team-row" key={team.id}>
              <span className={`team-row__icon team-row__icon--${tone}`}><Truck size={15} /></span>
              <div className="team-row__details"><strong>{team.name}</strong><span>{subline}</span></div>
              <div className="team-row__status"><StatusBadge tone={tone}>{team.status.toUpperCase()}</StatusBadge><ProgressIndicator value={team.availability} showValue={false} tone={team.status === "En route" ? "blue" : team.status === "Mobilizing" || team.status === "Busy" ? "amber" : team.status === "On scene" || team.status === "Unavailable" ? "red" : "green"} /></div>
            </div>
          );
        })}
      </div>
      <div className="readiness-panel__footnote"><Shield size={13} /> Demonstration status only · no dispatch controls</div>
    </Card>
  );
}

function NetworkPanel({ systemStatus }: { systemStatus: SystemStatus }) {
  const signals = [
    { id: "network", name: "NETWORK", source: "District mesh", status: systemStatus.network, icon: Signal },
    { id: "sync", name: "DATA SYNC", source: "Simulated heartbeat", status: systemStatus.dataSync, icon: Activity },
    { id: "system", name: "SYSTEM", source: "RAKSHA core", status: systemStatus.system, icon: ShieldCheck },
  ];
  return (
    <Card className="network-panel">
      <div className="support-panel__header"><SectionHeader eyebrow="SYSTEM / NETWORK" title="System health" /><span className="network-health"><span className="system-dot" /> {systemStatus.system.toUpperCase()}</span></div>
      <div className="network-list">
        {signals.map((signal) => {
          const tone = ["Connected", "Live", "Operational"].includes(signal.status) ? "success" : "critical";
          const Icon = signal.icon;
          return (
            <div className="network-row" key={signal.id}>
              <span className="network-row__icon"><Icon size={15} /></span>
              <span className="network-row__copy"><strong>{signal.name}</strong><small>{signal.source}</small></span>
              <span className="network-row__state"><StatusBadge tone={tone} dot>{signal.status.toUpperCase()}</StatusBadge></span>
            </div>
          );
        })}
      </div>
      <div className="network-panel__foot"><span>LAST SYNC</span><strong>{systemStatus.lastSync}</strong><span className="network-panel__demo">SIMULATED LOCAL STATE</span></div>
    </Card>
  );
}

function SituationPanel({ incident, rainfall, systemStatus }: { incident: Incident; rainfall: number; systemStatus: SystemStatus }) {
  return (
    <Card className="situation-panel">
      <div className="support-panel__header"><SectionHeader eyebrow="SITUATION LOG" title="Recent signals" /><span className="activity-count">03 EVENTS</span></div>
      <div className="situation-timeline">
        <TimelineItem icon={AlertTriangle} title="Priority report received" detail={`${incident.type} · ${incident.location}`} time={incident.reportedAt} tone="red" />
        <TimelineItem icon={CloudRain} title="Rainfall threshold elevated" detail={`${rainfall} mm recorded / 3 hours`} time="12m" tone="amber" />
        <TimelineItem icon={Radio} title="District radio check-in" detail={`Network ${systemStatus.network.toLowerCase()}`} time="18m" tone="green" last />
      </div>
      <div className="situation-panel__foot"><span>Activity is part of the simulated feed</span><CircleDot size={12} /></div>
    </Card>
  );
}

function EmergencyBanner({ incident, waterLevel, onReview }: { incident: Incident; waterLevel: number; onReview: () => void }) {
  return (
    <section className="emergency-banner" aria-labelledby="emergency-title">
      <span className="emergency-banner__rail" />
      <div className="emergency-banner__icon"><AlertTriangle size={20} strokeWidth={1.8} /></div>
      <div className="emergency-banner__copy">
        <div className="emergency-banner__eyebrow"><span>ACTIVE EMERGENCY</span><i /> FLASH FLOOD WATCH <i /> SECTOR 04</div>
        <h1 id="emergency-title">Escalated water levels in the eastern floodplain</h1>
        <p>One priority report indicates {incident.peopleAffected} people isolated, including {vulnerablePersonLabel(incident)}. Demo scenario · not a live dispatch.</p>
      </div>
      <div className="emergency-banner__side"><StatusBadge tone="critical" dot>P0 — CRITICAL</StatusBadge><Button variant="danger" size="sm" icon={ChevronRight} onClick={onReview}>REVIEW #1042</Button></div>
      <div className="emergency-banner__stamp"><span>WATER LEVEL</span><strong>{waterLevel.toFixed(1)}<small>m</small></strong><em><ArrowUpRight size={12} /> RISING</em></div>
    </section>
  );
}

export default function CommandCenter() {
  const { state } = useOperations();
  const [, setLocation] = useLocation();
  const [selectedIncidentId, setSelectedIncidentId] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [refreshedAt, setRefreshedAt] = useState("just now");
  const showToast = useToast();

  const primaryIncident = state.incidents.find((incident) => incident.id === "1042")!;
  const selectedIncident = state.incidents.find((incident) => incident.id === selectedIncidentId) ?? null;
  const primaryRiskZone = state.riskZones.find((zone) => zone.id === "zone-04-east");
  const criticalCount = state.incidents.filter((incident) => incident.severity === "Critical").length;
  const availableTeamCount = state.rescueTeams.filter((team) => team.status === "Available").length;
  const totalShelterCapacity = state.shelters.reduce((total, shelter) => total + shelter.capacity, 0);
  const availableShelterCapacity = state.shelters.reduce((total, shelter) => total + shelter.capacity - shelter.occupancy, 0);
  const shelterCapacityPercent = totalShelterCapacity ? Math.round((availableShelterCapacity / totalShelterCapacity) * 100) : 0;
  const peopleInPriority = state.riskZones.filter((zone) => zone.riskLevel === "Critical" || zone.riskLevel === "High").reduce((total, zone) => total + zone.peopleAffected, 0);
  const criticalZoneCount = state.riskZones.filter((zone) => zone.riskLevel === "Critical").length;
  const highRiskZoneCount = state.riskZones.filter((zone) => zone.riskLevel === "High").length;
  const activeShelterCount = state.shelters.filter((shelter) => shelter.status !== "Full").length;
  const blockedRoadCount = state.roads.filter((road) => road.network !== "evacuation" && road.status === "Blocked").length;

  const onRefresh = () => {
    setRefreshedAt("just now");
    showToast({ title: "Situation feed refreshed", detail: "Showing the latest simulated command-center state.", tone: "success" });
  };
  const onPlaceholder = (label: string) => showToast({ title: `${label} is planned for a later phase`, detail: "Advanced workflows remain intentionally out of scope for this prototype phase.", tone: "info" });
  const onSelectIncident = (incidentId: string) => setSelectedIncidentId(incidentId);

  return (
    <div className="app-shell">
      <NavigationRail open={sidebarOpen} onClose={() => setSidebarOpen(false)} onPlaceholder={onPlaceholder} rainfall={primaryRiskZone?.rainfallMm ?? 0} systemStatus={state.systemStatus} activePage="command" onNavigate={setLocation} />
      <main className="app-main">
        <TopBar
          onMenu={() => setSidebarOpen(true)}
          systemStatus={state.systemStatus}
          onNotifications={() => showToast({ title: `System ${state.systemStatus.system.toLowerCase()}`, detail: `Network ${state.systemStatus.network.toLowerCase()} · data sync ${state.systemStatus.dataSync.toLowerCase()}.`, tone: "info" })}
        />
        <div className="command-page">
          <div className="command-page__inner">
            <div className="page-heading">
              <div><span className="page-kicker"><span className="page-kicker__line" /> MONSOON RESPONSE <i>/</i> EASTERN DISTRICT</span><h2>COMMAND CENTER</h2><p>LIVE DISASTER OPERATIONS</p></div>
              <div className="page-heading__actions"><StatusBadge tone="warning" dot>PHASE 1 · SIMULATION</StatusBadge><Button variant="secondary" size="sm" icon={RefreshCw} onClick={onRefresh}>Refresh feed</Button></div>
            </div>

            <EmergencyBanner incident={primaryIncident} waterLevel={primaryRiskZone?.waterLevel ?? 0} onReview={() => onSelectIncident(primaryIncident.id)} />

            <section className="kpi-grid" aria-label="Operational indicators">
              <KpiCard icon={LifeBuoy} label="ACTIVE SOS" value={String(state.systemStatus.activeSOSCount)} note="Across monitored sectors" status="LIVE" statusTone="info" tone="blue" />
              <KpiCard icon={AlertTriangle} label="CRITICAL INCIDENTS" value={String(criticalCount)} note="Requires immediate attention" status="CRITICAL" statusTone="critical" tone="red" />
              <KpiCard icon={Truck} label="AVAILABLE RESCUE TEAMS" value={String(availableTeamCount)} note="Ready for deployment" status="AVAILABLE" statusTone="success" tone="green" />
              <KpiCard icon={Building2} label="SHELTER CAPACITY" value={`${shelterCapacityPercent}%`} note="Current available capacity" status="STABLE" statusTone="success" tone="green" />
            </section>

            <section className="people-risk-summary" aria-label="People and risk summary">
              <div className="people-risk-summary__lead"><span className="section-eyebrow">PEOPLE IN PRIORITY ZONES</span><strong><Users size={19} /> {peopleInPriority}</strong><small>Residents within critical and high-risk zones</small></div>
              <div className="people-risk-summary__metrics">
                <div><strong>{criticalZoneCount.toString().padStart(2, "0")}</strong><span>CRITICAL ZONES</span></div>
                <div><strong>{highRiskZoneCount.toString().padStart(2, "0")}</strong><span>HIGH-RISK ZONES</span></div>
                <div><strong>{activeShelterCount.toString().padStart(2, "0")}</strong><span>ACTIVE SHELTERS</span></div>
                <div><strong>{blockedRoadCount.toString().padStart(2, "0")}</strong><span>BLOCKED ROADS</span></div>
              </div>
            </section>

            <section className="dashboard-grid" aria-label="Map and priority incidents">
              <MapPanel incidents={state.incidents} rescueTeams={state.rescueTeams} shelters={state.shelters} riskZones={state.riskZones} waterLevel={primaryRiskZone?.waterLevel ?? 0} onSelectIncident={onSelectIncident} />
              <IncidentPanel incidents={state.incidents} rescueTeams={state.rescueTeams} onSelectIncident={onSelectIncident} />
            </section>

            <section className="support-grid" aria-label="Response readiness and system status">
              <ReadinessPanel rescueTeams={state.rescueTeams} />
              <NetworkPanel systemStatus={state.systemStatus} />
              <SituationPanel incident={primaryIncident} rainfall={primaryRiskZone?.rainfallMm ?? 0} systemStatus={state.systemStatus} />
            </section>

            <footer className="page-footer"><div><ShieldCheck size={14} /><span>RAKSHA</span><i /> <span>COMMAND CENTER</span></div><span>SIMULATED OPERATIONAL DATA <b>·</b> REFRESHED {refreshedAt.toUpperCase()}</span><span>DESIGNED FOR RESILIENT RESPONSE</span></footer>
          </div>
        </div>
      </main>
      {selectedIncident && <IncidentDetail incident={selectedIncident} rescueTeams={state.rescueTeams} onClose={() => setSelectedIncidentId(null)} />}
    </div>
  );
}
