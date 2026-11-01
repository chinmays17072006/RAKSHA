import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  AlertTriangle,
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
  Shield,
  ShieldCheck,
  Signal,
  Truck,
  Users,
  WifiOff,
  X,
} from "lucide-react";
import { NavigationItem } from "@/components/system/NavigationItem";
import { incidents, rescueTeams, shelters, systemSignals } from "@/data/demo";
import type { Incident } from "@/types/disaster";
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

const navigation = [
  { label: "Command Center", icon: LayoutDashboard, enabled: true },
  { label: "Live Incidents", icon: Radio, phase: "NEXT" },
  { label: "Rescue Operations", icon: Truck, phase: "NEXT" },
  { label: "Shelters & Resources", icon: Building2, phase: "NEXT" },
  { label: "Citizen SOS", icon: LifeBuoy, phase: "NEXT" },
  { label: "Offline Mode", icon: WifiOff, phase: "NEXT" },
] as const;

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

function NavigationRail({
  open,
  onClose,
  onPlaceholder,
}: {
  open: boolean;
  onClose: () => void;
  onPlaceholder: (label: string) => void;
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
            const active = "enabled" in item && item.enabled;
            return (
              <NavigationItem
                key={item.label}
                icon={item.icon}
                label={item.label}
                active={active}
                disabled={!active}
                phase={"phase" in item ? item.phase : undefined}
                onClick={active ? onClose : () => onPlaceholder(item.label)}
              />
            );
          })}
        </nav>

        <div className="sidebar__spacer" />
        <div className="sidebar-weather">
          <div className="sidebar-weather__top"><CloudRain size={15} /><span>MONSOON WATCH</span><span className="sidebar-weather__pulse" /></div>
          <strong>86 <small>mm</small></strong>
          <span>rainfall · last 3 hours</span>
          <div className="sidebar-weather__bar"><span /></div>
          <div className="sidebar-weather__foot"><span>SECTOR 04</span><span>HIGH ALERT</span></div>
        </div>
        <div className="sidebar-status">
          <span className="system-dot" />
          <div><strong>SYSTEM OPERATIONAL</strong><span>All core systems online</span></div>
          <CheckCircle2 size={15} aria-hidden="true" />
        </div>
        <div className="sidebar__version">RAKSHA <span>•</span> FOUNDATION 0.1</div>
      </aside>
    </>
  );
}

function TopBar({
  onMenu,
  onNotifications,
}: {
  onMenu: () => void;
  onNotifications: () => void;
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
        <div className="topbar__page"><span>OPERATIONS / OVERVIEW</span><strong>COMMAND CENTER</strong></div>
      </div>
      <div className="topbar__right">
        <StatusBadge tone="success" dot className="live-badge">LIVE MONITORING</StatusBadge>
        <span className="topbar__operational"><span className="system-dot" /> OPERATIONAL</span>
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
  teamsVisible,
  onSelectIncident,
  focusPulse,
}: {
  floodVisible: boolean;
  teamsVisible: boolean;
  onSelectIncident: () => void;
  focusPulse: boolean;
}) {
  const openIncident = () => onSelectIncident();
  return (
    <div className={`map-canvas ${focusPulse ? "map-canvas--focused" : ""}`}>
      <svg className="map-svg" viewBox="0 0 920 410" preserveAspectRatio="xMidYMid slice" role="img" aria-label="Schematic disaster map showing a simulated flood area in Sector 04, one priority incident and response-team positions">
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
        <g className="map-labels">
          <text x="126" y="142">SECTOR 02</text><text x="470" y="153">SECTOR 04</text><text x="710" y="183">SECTOR 06</text>
          <text x="198" y="322">SECTOR 07</text><text x="634" y="344">SECTOR 09</text>
          <text className="map-labels__river" x="334" y="238" transform="rotate(8 334 238)">EASTERN CHANNEL</text>
          <text className="map-labels__district" x="48" y="38">EASTERN DISTRICT / SIMULATED LAYER</text>
        </g>
        {floodVisible && <g className="map-flood-zone">
          <path d="M410 120c40-32 104-27 140-4 35 23 67 36 61 80-4 31-34 50-70 58-38 8-69 3-101-16-41-24-73-34-67-70 4-21 14-35 37-48Z" />
          <path d="M410 120c40-32 104-27 140-4 35 23 67 36 61 80-4 31-34 50-70 58-38 8-69 3-101-16-41-24-73-34-67-70 4-21 14-35 37-48Z" fill="url(#water-lines)" />
          <text x="498" y="202">HIGH-WATER ZONE</text>
          <text x="509" y="219">2.4 M / RISING</text>
        </g>}
        {teamsVisible && <g className="map-team-markers">
          <g transform="translate(310 167)"><circle r="13" /><path d="M0-5v10M-5 0h10" /></g>
          <g transform="translate(257 278)"><circle r="13" /><path d="M0-5v10M-5 0h10" /></g>
          <g transform="translate(652 277)"><circle r="13" /><path d="M0-5v10M-5 0h10" /></g>
        </g>}
        <g className="map-incident-marker" role="button" tabIndex={0} aria-label="Open priority incident 1042 in Sector 04" onClick={openIncident} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); openIncident(); } }}>
          <circle className="map-incident-marker__ring" cx="535" cy="167" r="26" />
          <circle className="map-incident-marker__halo" cx="535" cy="167" r="17" />
          <circle className="map-incident-marker__dot" cx="535" cy="167" r="7" filter="url(#marker-glow)" />
          <rect className="map-incident-marker__label-bg" x="553" y="146" width="102" height="37" rx="4" />
          <text className="map-incident-marker__label" x="564" y="161">#1042 · P1</text>
          <text className="map-incident-marker__sub" x="564" y="174">FLASH FLOOD</text>
        </g>
      </svg>
      <div className="map-compass" aria-hidden="true"><span>N</span><div><i /><i /><i /><i /></div></div>
      <div className="map-note"><CircleDot size={11} /> SIMULATED MAP DATA <span>·</span> NOT TO SCALE</div>
    </div>
  );
}

function MapPanel({ onSelectIncident }: { onSelectIncident: () => void }) {
  const [layers, setLayers] = useState({ flood: true, teams: true });
  const [focused, setFocused] = useState(false);
  const showToast = useToast();
  const toggleLayer = (key: "flood" | "teams") => setLayers((current) => ({ ...current, [key]: !current[key] }));
  const focusMap = () => {
    setFocused(true);
    showToast({ title: "Sector 04 centered", detail: "Schematic view · operational actions are not connected", tone: "info" });
    window.setTimeout(() => setFocused(false), 850);
  };

  return (
    <Card className="map-panel">
      <div className="map-panel__header">
        <SectionHeader eyebrow="GEOSPATIAL AWARENESS" title="Live disaster map" />
        <div className="map-panel__header-meta"><StatusBadge tone="info" dot>DEMO LAYER</StatusBadge><span>UPDATED 00:18 AGO</span></div>
      </div>
      <div className="map-panel__visual-wrap">
        <MapLayer floodVisible={layers.flood} teamsVisible={layers.teams} onSelectIncident={onSelectIncident} focusPulse={focused} />
        <div className="map-layers" aria-label="Map layers">
          <button className={layers.flood ? "map-layer map-layer--active" : "map-layer"} aria-pressed={layers.flood} onClick={() => toggleLayer("flood")}><span className="map-layer__swatch map-layer__swatch--flood" /> Flood extent</button>
          <button className={layers.teams ? "map-layer map-layer--active" : "map-layer"} aria-pressed={layers.teams} onClick={() => toggleLayer("teams")}><span className="map-layer__swatch map-layer__swatch--team" /> Field units</button>
        </div>
        <button className="map-focus" onClick={focusMap} aria-label="Center the map on Sector 04"><Crosshair size={15} /></button>
      </div>
      <div className="map-panel__footer">
        <div className="map-legend"><span><i className="legend-dot legend-dot--red" /> Priority incident</span><span><i className="legend-dot legend-dot--blue" /> Response unit</span><span><i className="legend-dot legend-dot--water" /> Flood extent</span></div>
        <span className="map-scale">SECTOR 04 <b /> 1.4 KM</span>
      </div>
    </Card>
  );
}

function IncidentDetail({ incident, onClose }: { incident: Incident; onClose: () => void }) {
  return (
    <Dialog title={`Incident #${incident.id}`} eyebrow="SIMULATED INCIDENT RECORD · VIEW ONLY" onClose={onClose} footer={<Button variant="secondary" onClick={onClose}>Close details</Button>}>
      <div className="incident-detail__summary">
        <SeverityBadge severity={incident.severity} />
        <span className="incident-detail__type">{incident.type}</span>
        <StatusBadge tone={incident.status === "New" ? "warning" : "info"}>{incident.status}</StatusBadge>
      </div>
      <div className="incident-detail__location"><MapPin size={16} /><span><strong>{incident.location}</strong><small>Eastern district · fictional demo coordinates</small></span></div>
      <blockquote className="incident-detail__message">“{incident.message}”</blockquote>
      <div className="incident-detail__facts">
        <div><span>PEOPLE REPORTED</span><strong>{incident.peopleAffected}</strong></div>
        <div><span>VULNERABLE PERSONS</span><strong>{incident.vulnerablePeople}</strong></div>
        <div><span>RECEIVED</span><strong>{incident.reportedAt}</strong></div>
      </div>
      <div className="incident-detail__notice"><Shield size={15} /><span>This is simulated foundation data. No dispatch, triage, or citizen contact actions are connected in Phase 0.</span></div>
    </Dialog>
  );
}

function IncidentPanel({ onSelectIncident }: { onSelectIncident: (incident: Incident) => void }) {
  const rows = useMemo(() => incidents.filter((incident) => incident.severity === "Critical" || incident.severity === "High"), []);
  const columns: DataColumn<Incident>[] = [
    { key: "priority", title: "PRI", render: (row) => <SeverityBadge severity={row.severity} compact /> },
    { key: "incident", title: "PRIORITY INCIDENTS", render: (row) => <div className="incident-cell"><strong>{row.type}</strong><span>#{row.id} <i /> {row.location} · {row.peopleAffected} people</span></div> },
    { key: "age", title: "AGE", align: "right", className: "incident-age", render: (row) => <span>{row.reportedAt}</span> },
  ];
  return (
    <Card className="incident-panel">
      <div className="incident-panel__header">
        <SectionHeader eyebrow="NEEDS ATTENTION" title="Priority incidents" />
        <StatusBadge tone="critical">{rows.length.toString().padStart(2, "0")} HIGH PRIORITY</StatusBadge>
      </div>
      <DataTable rows={rows} columns={columns} label="Priority incidents" onRowClick={onSelectIncident} />
      <div className="incident-panel__footer"><span>Showing simulated reports</span><span className="incident-panel__view-label">OPEN A ROW FOR DETAILS <ArrowUpRight size={12} /></span></div>
    </Card>
  );
}

function ReadinessPanel() {
  return (
    <Card className="readiness-panel">
      <div className="support-panel__header"><SectionHeader eyebrow="FIELD READINESS" title="Response units" /><StatusBadge tone="info" dot>SIMULATED</StatusBadge></div>
      <div className="readiness-panel__summary"><strong>04</strong><span>teams reporting</span><span className="readiness-panel__divider" /><strong>16</strong><span>responders</span><span className="readiness-panel__summary-note"><ArrowUpRight size={12} /> 3 on call</span></div>
      <div className="team-list">
        {rescueTeams.slice(0, 3).map((team) => {
          const tone = team.status === "On scene" ? "critical" : team.status === "Mobilizing" ? "warning" : "success";
          return (
            <div className="team-row" key={team.id}>
              <span className={`team-row__icon team-row__icon--${tone}`}><Truck size={15} /></span>
              <div className="team-row__details"><strong>{team.name}</strong><span>{team.location} <i /> {team.members} responders</span></div>
              <div className="team-row__status"><StatusBadge tone={tone}>{team.status}</StatusBadge><ProgressIndicator value={team.availability} showValue={false} tone={team.status === "Mobilizing" ? "amber" : team.status === "On scene" ? "red" : "green"} /></div>
            </div>
          );
        })}
      </div>
      <div className="readiness-panel__footnote"><Shield size={13} /> Demonstration status only · no dispatch controls</div>
    </Card>
  );
}

function NetworkPanel() {
  return (
    <Card className="network-panel">
      <div className="support-panel__header"><SectionHeader eyebrow="SYSTEM / NETWORK" title="Signal health" /><span className="network-health"><span className="system-dot" /> NOMINAL</span></div>
      <div className="network-list">
        {systemSignals.map((signal) => {
          const tone = signal.status === "Standby" ? "info" : "success";
          const Icon = signal.id === "rainfall" ? Droplets : signal.id === "radio" ? RadioTower : Signal;
          return (
            <div className="network-row" key={signal.id}>
              <span className="network-row__icon"><Icon size={15} /></span>
              <span className="network-row__copy"><strong>{signal.name}</strong><small>{signal.source}</small></span>
              <span className="network-row__state"><StatusBadge tone={tone} dot>{signal.status}</StatusBadge><small>{signal.latency}</small></span>
            </div>
          );
        })}
      </div>
      <div className="network-panel__foot"><span>LAST SYNCHRONIZATION</span><strong>Just now</strong><span className="network-panel__demo">LOCAL DEMO STATE</span></div>
    </Card>
  );
}

function SituationPanel() {
  return (
    <Card className="situation-panel">
      <div className="support-panel__header"><SectionHeader eyebrow="SITUATION LOG" title="Recent signals" /><span className="activity-count">03 EVENTS</span></div>
      <div className="situation-timeline">
        <TimelineItem icon={AlertTriangle} title="Priority report received" detail="Flash flood · Sector 04" time="03m" tone="red" />
        <TimelineItem icon={CloudRain} title="Rainfall threshold elevated" detail="86 mm recorded / 3 hours" time="12m" tone="amber" />
        <TimelineItem icon={Radio} title="District radio check-in" detail="All channels responding" time="18m" tone="green" last />
      </div>
      <div className="situation-panel__foot"><span>Activity is part of the simulated feed</span><CircleDot size={12} /></div>
    </Card>
  );
}

function EmergencyBanner({ onReview }: { onReview: () => void }) {
  return (
    <section className="emergency-banner" aria-labelledby="emergency-title">
      <span className="emergency-banner__rail" />
      <div className="emergency-banner__icon"><AlertTriangle size={20} strokeWidth={1.8} /></div>
      <div className="emergency-banner__copy">
        <div className="emergency-banner__eyebrow"><span>ACTIVE EMERGENCY</span><i /> FLASH-FLOOD WATCH <i /> SECTOR 04</div>
        <h1 id="emergency-title">Escalated water levels in the eastern floodplain</h1>
        <p>One priority report indicates four people isolated, including an elderly resident. Demo scenario · not a live dispatch.</p>
      </div>
      <div className="emergency-banner__side"><StatusBadge tone="critical" dot>P1 · CRITICAL</StatusBadge><Button variant="danger" size="sm" icon={ChevronRight} onClick={onReview}>Review #1042</Button></div>
      <div className="emergency-banner__stamp"><span>WATER LEVEL</span><strong>2.4<small>m</small></strong><em><ArrowUpRight size={12} /> RISING</em></div>
    </section>
  );
}

export default function CommandCenter() {
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [refreshedAt, setRefreshedAt] = useState("18 sec ago");
  const showToast = useToast();

  const onRefresh = () => {
    setRefreshedAt("just now");
    showToast({ title: "Situation feed refreshed", detail: "Showing the latest simulated command-center state.", tone: "success" });
  };
  const onPlaceholder = (label: string) => showToast({ title: `${label} is planned for a later phase`, detail: "This Phase 0 prototype keeps advanced workflows intentionally out of scope.", tone: "info" });
  const critical = incidents.filter((incident) => incident.severity === "Critical").length;
  const peopleInPriority = incidents.filter((incident) => incident.severity === "Critical" || incident.severity === "High").reduce((total, incident) => total + incident.peopleAffected, 0);
  const openShelters = shelters.filter((shelter) => shelter.status !== "Full").length;

  return (
    <div className="app-shell">
      <NavigationRail open={sidebarOpen} onClose={() => setSidebarOpen(false)} onPlaceholder={onPlaceholder} />
      <main className="app-main">
        <TopBar
          onMenu={() => setSidebarOpen(true)}
          onNotifications={() => showToast({ title: "All systems nominal", detail: "No new platform notifications in this simulated session.", tone: "info" })}
        />
        <div className="command-page">
          <div className="command-page__inner">
            <div className="page-heading">
              <div><span className="page-kicker"><span className="page-kicker__line" /> MONSOON RESPONSE <i>/</i> EASTERN DISTRICT</span><h2>Situation overview</h2><p>One operational picture for changing conditions across the district.</p></div>
              <div className="page-heading__actions"><StatusBadge tone="warning" dot>PHASE 0 · SIMULATION</StatusBadge><Button variant="secondary" size="sm" icon={RefreshCw} onClick={onRefresh}>Refresh feed</Button></div>
            </div>

            <EmergencyBanner onReview={() => setSelectedIncident(incidents[0])} />

            <section className="kpi-grid" aria-label="Operational indicators">
              <KpiCard icon={Activity} label="Active incidents" value={String(incidents.length).padStart(2, "0")} note="Across 4 monitored sectors" trend="+02" tone="blue" />
              <KpiCard icon={AlertTriangle} label="Critical priority" value={String(critical).padStart(2, "0")} note="Requires command attention" tone="red" />
              <KpiCard icon={Truck} label="Teams reporting" value={String(rescueTeams.length).padStart(2, "0")} note="16 responders · demo state" trend="+01" tone="amber" />
              <KpiCard icon={Users} label="People in priority zones" value={String(peopleInPriority).padStart(2, "0")} note={`${openShelters} receiving shelters open`} tone="green" />
            </section>

            <section className="dashboard-grid" aria-label="Map and priority incidents">
              <MapPanel onSelectIncident={() => setSelectedIncident(incidents[0])} />
              <IncidentPanel onSelectIncident={setSelectedIncident} />
            </section>

            <section className="support-grid" aria-label="Response readiness and system status">
              <ReadinessPanel />
              <NetworkPanel />
              <SituationPanel />
            </section>

            <footer className="page-footer"><div><ShieldCheck size={14} /><span>RAKSHA FOUNDATION</span><i /> <span>COMMAND CENTER</span></div><span>SIMULATED OPERATIONAL DATA <b>·</b> REFRESHED {refreshedAt.toUpperCase()}</span><span>DESIGNED FOR RESILIENT RESPONSE</span></footer>
          </div>
        </div>
      </main>
      {selectedIncident && <IncidentDetail incident={selectedIncident} onClose={() => setSelectedIncident(null)} />}
    </div>
  );
}
