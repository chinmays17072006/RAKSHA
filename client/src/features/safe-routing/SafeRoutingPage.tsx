import { useMemo, useRef, useState } from "react";
import { useLocation } from "wouter";
import {
  AlertTriangle,
  ArrowRight,
  Building2,
  Check,
  CheckCircle2,
  CircleDot,
  Clock3,
  LoaderCircle,
  MapPin,
  Navigation2,
  Route as RouteIcon,
  Shield,
  ShieldCheck,
  TriangleAlert,
  X,
} from "lucide-react";
import { Button, Card, SectionHeader, SeverityBadge, StatusBadge } from "@/components/system/ui";
import { useToast } from "@/components/system/feedback";
import { NavigationRail, TopBar } from "@/features/command-center/CommandCenter";
import { useOperations } from "@/features/command-center/OperationsContext";
import type { Incident, Road, Shelter } from "@/types/disaster";
import { analyzeSafeRoutes, type RoadEvaluation } from "./engine";

const ANALYSIS_STEPS = [
  "ANALYZING ROAD CONDITIONS",
  "CHECKING FLOOD RISK",
  "EVALUATING SHELTER ACCESS",
  "CALCULATING SAFE ROUTE",
  "ROUTE SELECTED",
] as const;
const wait = (milliseconds: number) => new Promise<void>((resolve) => window.setTimeout(resolve, milliseconds));

function RoadMap({
  evaluations,
  incident,
  recommendedRoute,
  recommendedShelter,
  selectedRoadId,
  onSelectRoad,
}: {
  evaluations: RoadEvaluation[];
  incident: Incident;
  recommendedRoute?: string;
  recommendedShelter?: string;
  selectedRoadId: string | null;
  onSelectRoad: (roadId: string) => void;
}) {
  const roadById = new Map(evaluations.map((evaluation) => [evaluation.road.id, evaluation]));
  const geometry = [
    { id: "route-a", path: "M 440 165 C 390 116 306 87 190 78", labelX: 286, labelY: 90 },
    { id: "route-b", path: "M 440 165 C 520 145 612 134 735 127", labelX: 605, labelY: 137 },
    { id: "route-c", path: "M 440 165 C 472 220 534 266 643 295", labelX: 527, labelY: 248 },
  ];
  const onRoadKeyDown = (event: React.KeyboardEvent<SVGPathElement>, roadId: string) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onSelectRoad(roadId);
    }
  };

  return (
    <div className="safe-route-map__frame">
      <svg className="safe-route-map" viewBox="0 0 900 360" role="img" aria-label="Simulated evacuation map showing Incident 1043 in Sector 04, three route choices, and Shelter 07">
        <defs>
          <pattern id="routing-grid" width="30" height="30" patternUnits="userSpaceOnUse">
            <path d="M30 0H0V30" fill="none" stroke="rgba(135,165,176,.09)" strokeWidth="1" />
          </pattern>
          <linearGradient id="routing-water" x1="0" x2="1" y1="0" y2="1">
            <stop offset="0" stopColor="#c75452" stopOpacity=".20" />
            <stop offset="1" stopColor="#c75452" stopOpacity=".04" />
          </linearGradient>
        </defs>
        <rect width="900" height="360" fill="#0e1a20" />
        <rect width="900" height="360" fill="url(#routing-grid)" />
        <path d="M22 99 130 103 184 135 262 128 329 160M67 289 164 253 221 268 292 241M574 54 610 91 690 87 778 105 862 89M557 330 618 294 701 305 793 281 870 294" fill="none" stroke="#283a42" strokeWidth="2" opacity=".75" />
        <path d="M20 166c70-24 124-15 179 5s93 18 139 2 87-41 135-28 91 40 139 37 91-24 156-8 85 28 132 19v105c-58-13-105-5-151 10s-104 7-144-11-92-24-138-10-94 31-149 22-100-34-154-26-85 22-144 17Z" fill="url(#routing-water)" />
        <path d="M520 80c45-20 94-14 133 7s58 43 54 82-35 56-76 48-94-18-116-47-29-67 5-90Z" fill="rgba(242,184,94,.08)" stroke="rgba(242,184,94,.25)" strokeDasharray="5 7" />
        <text x="40" y="41" className="safe-route-map__district">SECTOR 04 · EASTERN FLOODPLAIN</text>
        <text x="654" y="333" className="safe-route-map__map-note">SIMULATED NETWORK · NOT TO SCALE</text>
        <text x="440" y="131" textAnchor="middle" className="safe-route-map__sector-label">SECTOR 04</text>
        <text x="134" y="53" textAnchor="middle" className="safe-route-map__sector-label">SECTOR 01</text>
        <text x="762" y="97" textAnchor="middle" className="safe-route-map__sector-label">SECTOR 07</text>
        <text x="702" y="324" textAnchor="middle" className="safe-route-map__sector-label">SHELTER ACCESS ZONE</text>
        {geometry.map((line) => {
          const evaluation = roadById.get(line.id);
          if (!evaluation) return null;
          const road = evaluation.road;
          const isSelected = selectedRoadId === road.id;
          const isRecommended = recommendedRoute === road.name;
          const label = `${road.name} · ${(road.distanceKm ?? 0).toFixed(1)} KM`;
          return (
            <g key={road.id} className={`safe-route-map__route-group ${isSelected ? "is-selected" : ""}`}>
              <path
                d={line.path}
                className={`safe-route-map__road safe-route-map__road--${road.name.toLowerCase().replace(" ", "-")} ${isRecommended ? "is-recommended" : ""}`}
                role="button"
                tabIndex={0}
                aria-pressed={isSelected}
                aria-label={`${road.name}, ${road.status}, ${(road.distanceKm ?? 0).toFixed(1)} kilometres, ETA ${road.etaMinutes} minutes, ${road.floodRisk} flood risk. ${road.reason}`}
                onClick={() => onSelectRoad(road.id)}
                onKeyDown={(event) => onRoadKeyDown(event, road.id)}
              />
              <text x={line.labelX} y={line.labelY} className={`safe-route-map__road-label safe-route-map__road-label--${road.name.toLowerCase().replace(" ", "-")}`}>{label}</text>
            </g>
          );
        })}
        <g className="safe-route-map__incident" aria-label="Incident 1043">
          <circle cx="440" cy="165" r="25" />
          <circle cx="440" cy="165" r="14" />
          <path d="m440 156 8 14h-16l8-14Z" />
          <text x="440" y="204" textAnchor="middle">#{incident.id} · P0</text>
        </g>
        <g className={`safe-route-map__shelter ${recommendedShelter === "SHELTER 07" ? "is-recommended" : ""}`}>
          <rect x="627" y="280" width="31" height="27" rx="4" />
          <path d="m632 292 10-8 10 8v10h-20v-10Z" />
          <text x="643" y="322" textAnchor="middle">SHELTER 07</text>
        </g>
        <g className="safe-route-map__shelter safe-route-map__shelter--muted">
          <rect x="174" y="65" width="26" height="22" rx="4" />
          <path d="m178 75 9-7 9 7v8h-18v-8Z" />
          <text x="187" y="101" textAnchor="middle">SHELTER 01</text>
        </g>
        <g className="safe-route-map__shelter safe-route-map__shelter--muted">
          <rect x="724" y="115" width="26" height="22" rx="4" />
          <path d="m728 125 9-7 9 7v8h-18v-8Z" />
          <text x="737" y="151" textAnchor="middle">SHELTER 12</text>
        </g>
      </svg>
      <div className="safe-route-map__toolbar"><span><CircleDot size={12} /> NETWORK OVERVIEW</span><span><ShieldCheck size={12} /> SAFETY-FIRST</span></div>
      {selectedRoadId && roadById.has(selectedRoadId) && (() => {
        const road = roadById.get(selectedRoadId)!.road;
        return <div className="safe-route-map__selected" role="status">
          <button className="icon-button safe-route-map__close" onClick={() => onSelectRoad("")} aria-label="Close road details"><X size={13} /></button>
          <span className="section-eyebrow">ROAD CONDITION · SIMULATED</span>
          <strong>{road.name} <StatusBadge tone={road.status === "Blocked" ? "critical" : road.floodRisk === "High" ? "warning" : "success"}>{road.status.toUpperCase()}</StatusBadge></strong>
          <span>{road.reason}</span>
          <small>{(road.distanceKm ?? 0).toFixed(1)} km · ETA {road.etaMinutes} min · {road.floodRisk?.toUpperCase()} RISK</small>
        </div>;
      })()}
      <div className="safe-route-map__legend" aria-label="Route map legend">
        <span><i className="safe-route-map__legend-dot safe-route-map__legend-dot--blocked" />Blocked</span>
        <span><i className="safe-route-map__legend-dot safe-route-map__legend-dot--risk" />High risk</span>
        <span><i className="safe-route-map__legend-dot safe-route-map__legend-dot--safe" />Safe</span>
        <span><Building2 size={11} /> Shelter</span>
      </div>
    </div>
  );
}

function ProcessingSteps({ activeStep, complete }: { activeStep: number; complete: boolean }) {
  return <ol className="safe-routing-steps" aria-live="polite">
    {ANALYSIS_STEPS.map((step, index) => {
      const done = complete || (activeStep > 0 && index < activeStep - 1);
      const active = !complete && activeStep === index + 1;
      return <li key={step} className={`${done ? "is-complete" : ""} ${active ? "is-active" : ""}`}>
        <span className="safe-routing-step__icon">{done ? <Check size={11} aria-hidden="true" /> : active ? <LoaderCircle size={11} className="spin" aria-hidden="true" /> : index + 1}</span>
        <span className="safe-routing-step__label">{step}</span>
        <span className="safe-routing-step__state">{done ? "DONE" : active ? "IN PROGRESS" : "WAITING"}</span>
      </li>;
    })}
  </ol>;
}

function RoadComparison({ evaluations, analyzed, selectedRoadId, onSelectRoad }: {
  evaluations: RoadEvaluation[];
  analyzed: boolean;
  selectedRoadId: string | null;
  onSelectRoad: (id: string) => void;
}) {
  const iconFor = (disposition: RoadEvaluation["disposition"]) => disposition === "RECOMMENDED" ? CheckCircle2 : disposition === "REJECTED" ? X : TriangleAlert;
  return <Card className="safe-routing-comparison-card">
    <SectionHeader eyebrow="SAFETY-FIRST COMPARISON" title="Route options" action={<span className="safe-routing-comparison-hint">SAFETY · ROAD STATUS · FLOOD RISK · DISTANCE · ETA</span>} />
    <div className="safe-routing-road-list">
      {evaluations.map((evaluation) => {
        const { road } = evaluation;
        const displayDisposition = !analyzed && evaluation.disposition === "RECOMMENDED" ? "SAFE CANDIDATE" : evaluation.disposition;
        const Icon = iconFor(evaluation.disposition);
        const selected = selectedRoadId === road.id;
        return <button key={road.id} className={`safe-routing-road-row safe-routing-road-row--${road.safety?.toLowerCase().replace(" ", "-")} ${selected ? "is-selected" : ""} ${analyzed && evaluation.disposition === "RECOMMENDED" ? "is-recommended" : ""}`} onClick={() => onSelectRoad(road.id)} aria-pressed={selected}>
          <span className="safe-routing-road-row__heading"><strong>{road.name}</strong><span className={`safe-routing-road-row__decision safe-routing-road-row__decision--${evaluation.disposition.toLowerCase().replace(" ", "-")}`}><Icon size={12} aria-hidden="true" /> {displayDisposition}</span></span>
          <span className="safe-routing-road-row__metrics"><span>{road.status.toUpperCase()}</span><span>{(road.distanceKm ?? 0).toFixed(1)} km</span><span>{road.etaMinutes} min</span><span>{road.floodRisk?.toUpperCase()} RISK</span></span>
          <span className="safe-routing-road-row__reason">{road.reason}</span>
        </button>;
      })}
      {evaluations.length === 0 && <div className="safe-routing-empty-inline">No simulated evacuation road records are available.</div>}
    </div>
  </Card>;
}

function ShelterComparison({ shelters, recommendedShelter }: { shelters: Shelter[]; recommendedShelter?: string }) {
  const routeShelters = shelters.filter((shelter) => shelter.routeDistanceKm !== undefined).sort((a, b) => (a.routeDistanceKm ?? 0) - (b.routeDistanceKm ?? 0));
  return <Card className="safe-routing-shelter-card">
    <SectionHeader eyebrow="SHELTER ACCESS" title="Available destinations" />
    <div className="safe-routing-shelter-list">
      {routeShelters.map((shelter) => {
        const recommended = shelter.name === recommendedShelter;
        return <article key={shelter.id} className={`safe-routing-shelter ${recommended ? "is-recommended" : ""}`}>
          <div className="safe-routing-shelter__top"><span className="safe-routing-shelter__icon"><Building2 size={15} aria-hidden="true" /></span><strong>{shelter.name}</strong>{recommended && <StatusBadge tone="success" dot>RECOMMENDED</StatusBadge>}</div>
          <div className="safe-routing-shelter__metrics"><span><strong>{shelter.routeCapacityPercent}%</strong><small>CAPACITY</small></span><span><strong>{shelter.routeDistanceKm?.toFixed(1)} km</strong><small>DISTANCE</small></span></div>
          <div className="safe-routing-shelter__access"><span>ACCESS</span><StatusBadge tone={shelter.routeAccess === "Safe" ? "success" : "warning"}>{shelter.routeAccess?.toUpperCase()}</StatusBadge></div>
          {recommended && <small className="safe-routing-shelter__reason">Lower occupancy and safer access through Road C.</small>}
        </article>;
      })}
    </div>
  </Card>;
}

export default function SafeRoutingPage() {
  const { state, updateIncident } = useOperations();
  const showToast = useToast();
  const [, setLocation] = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStep, setProcessingStep] = useState(0);
  const [selectedRoadId, setSelectedRoadId] = useState<string | null>(null);
  const processingGuard = useRef(false);
  const incident = state.incidents.find((item) => item.id === "1043") ?? null;
  const analysis = useMemo(() => analyzeSafeRoutes(state.roads, state.shelters), [state.roads, state.shelters]);
  const routeComplete = incident?.routeAnalysisStatus === "Complete";
  const noSafeRoute = incident?.routeAnalysisStatus === "No safe route";
  const hasCriticalAssessment = incident?.triageStatus === "Complete" && incident.priority === "P0" && incident.severity === "Critical";
  const recommendedRoad = incident?.recommendedRoute ? state.roads.find((road) => road.name === incident.recommendedRoute) : undefined;
  const recommendedShelter = incident?.destinationShelter ? state.shelters.find((shelter) => shelter.name === incident.destinationShelter) : undefined;
  const displayedSelectedRoadId = selectedRoadId ?? (routeComplete ? recommendedRoad?.id ?? null : null);
  const selectedRoad = state.roads.find((road) => road.id === displayedSelectedRoadId) ?? null;
  const primaryZone = state.riskZones.find((zone) => zone.id === "zone-04-east");
  const navigate = (path: string) => {
    setLocation(path);
    setSidebarOpen(false);
  };
  const onPlaceholder = (label: string) => showToast({ title: `${label} is planned for a later phase`, detail: "Safe Routing, AI Triage, Citizen SOS, and the Command Center are active in this prototype.", tone: "info" });

  const runRouteAnalysis = async () => {
    if (!incident || !hasCriticalAssessment || isProcessing || processingGuard.current) return;
    processingGuard.current = true;
    setIsProcessing(true);
    setProcessingStep(0);
    try {
      for (let step = 1; step <= ANALYSIS_STEPS.length; step += 1) {
        setProcessingStep(step);
        await wait(210);
      }
      if (analysis.status === "found" && analysis.recommendedRoad && analysis.recommendedShelter) {
        const road = analysis.recommendedRoad;
        const shelter = analysis.recommendedShelter;
        updateIncident(incident.id, {
          routeAnalysisStatus: "Complete",
          recommendedRoute: road.name,
          destinationShelter: shelter.name,
          routeDistanceKm: road.distanceKm,
          routeEta: road.etaMinutes,
          routeRisk: road.floodRisk,
          routeGeneratedAt: new Date().toISOString(),
        });
        setSelectedRoadId(road.id);
        showToast({ title: "SAFE ROUTE FOUND", detail: `${road.name} → ${shelter.name} · ${road.distanceKm?.toFixed(1)} km · ${road.etaMinutes} min · LOW RISK`, tone: "success" });
      } else {
        updateIncident(incident.id, {
          routeAnalysisStatus: "No safe route",
          recommendedRoute: undefined,
          destinationShelter: undefined,
          routeDistanceKm: undefined,
          routeEta: undefined,
          routeRisk: undefined,
          routeGeneratedAt: new Date().toISOString(),
        });
        setSelectedRoadId(null);
        showToast({ title: "NO SAFE ROUTE AVAILABLE", detail: "Manual operator review required. No destination was selected.", tone: "warning" });
      }
    } catch {
      showToast({ title: "Route analysis could not be completed", detail: "No incident was replaced. Review the local road records and try again.", tone: "warning" });
    } finally {
      setIsProcessing(false);
      setProcessingStep(0);
      processingGuard.current = false;
    }
  };

  return (
    <div className="app-shell">
      <NavigationRail
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        onPlaceholder={onPlaceholder}
        rainfall={primaryZone?.rainfallMm ?? 0}
        systemStatus={state.systemStatus}
        activePage="safe-routing"
        onNavigate={navigate}
      />
      <main className="app-main">
        <TopBar
          onMenu={() => setSidebarOpen(true)}
          systemStatus={state.systemStatus}
          pageContext="OPERATIONS / EVACUATION INTELLIGENCE"
          pageTitle="SAFE ROUTING"
          onNotifications={() => showToast({ title: "Route status", detail: routeComplete ? `Incident #1043 · ${incident?.recommendedRoute} → ${incident?.destinationShelter}` : noSafeRoute ? "No safe route available · manual review required." : "No route has been selected yet.", tone: routeComplete ? "success" : noSafeRoute ? "warning" : "info" })}
        />
        <div className="command-page">
          <div className="command-page__inner safe-routing-page">
            <div className="page-heading safe-routing-heading">
              <div>
                <span className="page-kicker"><span className="page-kicker__line" /> RAKSHA RESPONSE <i>/</i> EVACUATION NETWORK</span>
                <h2>SAFE EVACUATION ROUTING</h2>
                <p>DISASTER-AWARE ROUTE INTELLIGENCE</p>
                <span className="safe-routing-heading__support">Find the safest available route while accounting for blocked roads and disaster risk.</span>
              </div>
              <div className="page-heading__actions"><StatusBadge tone="info" dot>LOCAL ROUTE ENGINE</StatusBadge></div>
            </div>

            <div className="safe-routing-note" role="note"><ShieldCheck size={15} aria-hidden="true" /><span><strong>SIMULATED ROUTE INTELLIGENCE</strong> Local safety-first rules only · no live navigation, dispatch, or emergency service is connected.</span></div>

            {!incident ? (
              <Card className="safe-routing-empty" role="status">
                <RouteIcon size={25} aria-hidden="true" />
                <strong>Incident #1043 is not in this session yet.</strong>
                <span>Complete the Citizen SOS demo and run AI Triage first. Safe Routing will use that same shared incident record.</span>
                <div><Button variant="secondary" icon={ArrowRight} onClick={() => navigate("/citizen-sos")}>OPEN CITIZEN SOS</Button><Button variant="ghost" icon={ArrowRight} onClick={() => navigate("/ai-triage")}>OPEN AI TRIAGE</Button></div>
              </Card>
            ) : <>
              <Card className="safe-routing-incident-bar">
                <div className="safe-routing-incident-bar__identity"><span className="safe-routing-incident-bar__icon"><MapPin size={16} aria-hidden="true" /></span><div><span className="section-eyebrow">PRIMARY DEMO INCIDENT · #{incident.id}</span><strong>{incident.type} <i>·</i> {incident.location}</strong><small>{incident.peopleAffected} people · {incident.vulnerablePerson === "Elderly Person" ? "1 elderly person" : "vulnerability assessment recorded"}</small></div></div>
                <div className="safe-routing-incident-bar__status"><SeverityBadge severity={incident.severity} priority={incident.priority} /><StatusBadge tone={hasCriticalAssessment ? "critical" : "warning"} dot>{hasCriticalAssessment ? "CRITICAL / P0" : "AI TRIAGE REQUIRED"}</StatusBadge></div>
              </Card>

              {!hasCriticalAssessment && <div className="safe-routing-prerequisite" role="status"><TriangleAlert size={15} aria-hidden="true" /><span>Run AI Triage first. Safe Routing only generates a route for a confirmed CRITICAL / P0 incident.</span><Button variant="secondary" size="sm" icon={ArrowRight} onClick={() => navigate("/ai-triage")}>OPEN AI TRIAGE</Button></div>}

              <div className="safe-routing-main-grid">
                <Card className="safe-routing-map-card">
                  <div className="safe-routing-card-heading"><SectionHeader eyebrow="SIMULATED EVACUATION NETWORK" title="Route map" /><StatusBadge tone={routeComplete ? "success" : noSafeRoute ? "warning" : "info"} dot>{routeComplete ? "SAFE ROUTE FOUND" : noSafeRoute ? "MANUAL REVIEW" : "DEMO LAYER"}</StatusBadge></div>
                  <RoadMap
                    evaluations={analysis.evaluations}
                    incident={incident}
                    recommendedRoute={routeComplete ? incident.recommendedRoute : undefined}
                    recommendedShelter={routeComplete ? incident.destinationShelter : undefined}
                    selectedRoadId={displayedSelectedRoadId}
                    onSelectRoad={(id) => setSelectedRoadId(id || null)}
                  />
                </Card>

                <Card className="safe-routing-analysis-card">
                  <div className="safe-routing-analysis-card__head"><span className="safe-routing-analysis-card__icon"><Navigation2 size={17} aria-hidden="true" /></span><div><span className="section-eyebrow">SAFETY-FIRST ROUTE EVALUATION</span><strong>Incident #{incident.id} · Sector 04 → shelter</strong></div></div>
                  <p>Road status, flood exposure, safety, distance, ETA, and shelter access are weighed before any route is selected.</p>
                  <Button variant="primary" className="safe-routing-analyze" icon={isProcessing ? LoaderCircle : routeComplete ? CheckCircle2 : RouteIcon} disabled={!hasCriticalAssessment || isProcessing} onClick={runRouteAnalysis}>
                    {isProcessing ? "ANALYZING ROUTES…" : routeComplete ? "ROUTE ANALYSIS COMPLETE" : noSafeRoute ? "RECHECK SAFE ROUTES" : "ANALYZE SAFE ROUTES"}
                  </Button>
                  {(isProcessing || routeComplete || noSafeRoute) && <ProcessingSteps activeStep={processingStep} complete={!isProcessing} />}
                  {!isProcessing && routeComplete && <Button variant="secondary" className="safe-routing-command-link" icon={ArrowRight} onClick={() => navigate("/")}>VIEW COMMAND CENTER</Button>}
                  {hasCriticalAssessment && !routeComplete && !noSafeRoute && <div className="safe-routing-ready-note"><CircleDot size={13} aria-hidden="true" /> Ready to compare simulated access corridors.</div>}
                </Card>
              </div>

              <div className="safe-routing-result-grid">
                <Card className="safe-routing-result-card">
                  <SectionHeader eyebrow="ROUTE STATUS" title="Safe route recommendation" />
                  {routeComplete && recommendedRoad && recommendedShelter ? <>
                    <div className="safe-routing-result__banner"><span><CheckCircle2 size={17} aria-hidden="true" /> SAFE ROUTE FOUND</span><StatusBadge tone="success" dot>ROUTE ANALYSIS COMPLETE</StatusBadge></div>
                    <div className="safe-routing-result__facts">
                      <div><span>FROM</span><strong>Sector 04</strong></div>
                      <div><span>TO</span><strong>{recommendedShelter.name}</strong></div>
                      <div><span>ROUTE</span><strong>{recommendedRoad.name}</strong></div>
                      <div><span>DISTANCE</span><strong>{incident.routeDistanceKm?.toFixed(1)} km</strong></div>
                      <div><span>ETA</span><strong>{incident.routeEta} min</strong></div>
                      <div><span>RISK</span><strong className="safe-routing-result__low">{incident.routeRisk?.toUpperCase()}</strong></div>
                      <div><span>ROAD CONDITION</span><strong>{recommendedRoad.status.toUpperCase()}</strong></div>
                      <div><span>SHELTER CAPACITY</span><strong>{recommendedShelter.routeCapacityPercent}%</strong></div>
                    </div>
                    <div className="safe-routing-result__recommendation"><span className="section-eyebrow">RECOMMENDATION</span><strong>SAFE EVACUATION ROUTE</strong><small>{recommendedRoad.name} → {recommendedShelter.name} · no dispatch action has been taken.</small></div>
                  </> : noSafeRoute ? <div className="safe-routing-no-route" role="alert"><TriangleAlert size={18} aria-hidden="true" /><div><strong>NO SAFE ROUTE AVAILABLE</strong><span>MANUAL OPERATOR REVIEW REQUIRED</span><small>No road/shelter pair currently meets the safe-access criteria. No destination was assigned.</small></div></div> : <div className="safe-routing-pending" role="status"><CircleDot size={18} aria-hidden="true" /><span><strong>ROUTE ANALYSIS PENDING</strong><small>Run the local road and shelter evaluation to generate a route.</small></span></div>}
                </Card>

                <Card className="safe-routing-why-card">
                  <SectionHeader eyebrow="OPERATIONAL EXPLANATION" title="Why this route?" />
                  <p>Road A is blocked by floodwater. Road B remains open but has high flood risk. Road C provides the safest available access to Shelter 07.</p>
                  <div className="safe-routing-why-card__proof"><ShieldCheck size={15} aria-hidden="true" /><span>Safety is prioritized over shortest distance.</span></div>
                  <div className="safe-routing-status-list">
                    <div><span>ROUTE ANALYSIS</span><StatusBadge tone={routeComplete ? "success" : noSafeRoute ? "warning" : "neutral"}>{routeComplete ? "COMPLETE" : noSafeRoute ? "MANUAL REVIEW" : "NOT STARTED"}</StatusBadge></div>
                    <div><span>ROAD CONDITIONS</span><StatusBadge tone={routeComplete ? "success" : "info"}>{routeComplete ? "ASSESSED" : "READY"}</StatusBadge></div>
                    <div><span>SAFE ROUTE FOUND</span><StatusBadge tone={routeComplete ? "success" : noSafeRoute ? "warning" : "neutral"}>{routeComplete ? "YES" : noSafeRoute ? "NO" : "PENDING"}</StatusBadge></div>
                    <div><span>DESTINATION</span><strong>{routeComplete ? incident.destinationShelter : noSafeRoute ? "NONE · OPERATOR REVIEW" : "PENDING"}</strong></div>
                  </div>
                </Card>
              </div>

              <div className="safe-routing-comparison-grid">
                <RoadComparison evaluations={analysis.evaluations} analyzed={routeComplete} selectedRoadId={displayedSelectedRoadId} onSelectRoad={setSelectedRoadId} />
                <ShelterComparison shelters={state.shelters} recommendedShelter={routeComplete ? incident.destinationShelter : undefined} />
              </div>

              {selectedRoad && <div className="safe-routing-road-detail" role="status"><span className="safe-routing-road-detail__icon"><RouteIcon size={15} aria-hidden="true" /></span><div><span className="section-eyebrow">SELECTED ROAD CONDITION</span><strong>{selectedRoad.name} · {selectedRoad.status.toUpperCase()} · {selectedRoad.floodRisk?.toUpperCase()} RISK</strong><small>{selectedRoad.reason}</small></div><span className="safe-routing-road-detail__metrics">{selectedRoad.distanceKm?.toFixed(1)} km · {selectedRoad.etaMinutes} min</span><button className="icon-button" onClick={() => setSelectedRoadId(null)} aria-label="Clear selected road"><X size={14} /></button></div>}

              <footer className="page-footer safe-routing-footer"><div><Shield size={14} /><span>RAKSHA</span><i /><span>SAFE EVACUATION ROUTING</span></div><span>LOCAL SIMULATED NETWORK <b>·</b> OPERATOR REVIEW REQUIRED</span><span>NO LIVE DISPATCH CONNECTED</span></footer>
            </>}
          </div>
        </div>
      </main>
    </div>
  );
}
