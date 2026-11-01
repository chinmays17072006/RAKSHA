import { useCallback, useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import {
  Activity,
  AlertTriangle,
  Building2,
  BrainCircuit,
  CheckCircle2,
  CloudRain,
  Database,
  LifeBuoy,
  Play,
  Radio,
  RadioTower,
  Route as RouteIcon,
  ShieldCheck,
  Truck,
  Wifi,
  WifiOff,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Button, Card, ProgressIndicator, SectionHeader, SeverityBadge, StatusBadge } from "@/components/system/ui";
import { useToast } from "@/components/system/feedback";
import { NavigationRail, TopBar } from "@/features/command-center/CommandCenter";
import { useOperations } from "@/features/command-center/OperationsContext";
import { triageIncident } from "@/features/ai-triage/engine";
import { analyzeSafeRoutes } from "@/features/safe-routing/engine";
import { recommendRescueTeam } from "@/features/rescue-operations/engine";
import type { Incident, IncidentTimelineEvent } from "@/types/disaster";

const STEPS: { title: string; segment: string; icon: LucideIcon }[] = [
  { title: "DISASTER DETECTED", segment: "DISASTER", icon: CloudRain },
  { title: "CITIZEN SOS RECEIVED", segment: "SOS", icon: LifeBuoy },
  { title: "AI TRIAGE COMPLETE", segment: "AI", icon: BrainCircuit },
  { title: "SAFE ROUTE IDENTIFIED", segment: "ROUTE", icon: RouteIcon },
  { title: "RESCUE UNIT RECOMMENDED", segment: "RESCUE", icon: Truck },
  { title: "TEAM BRAVO DISPATCHED", segment: "DISPATCH", icon: Radio },
  { title: "SAFE DESTINATION", segment: "SHELTER", icon: Building2 },
  { title: "NETWORK FAILURE DETECTED", segment: "OFFLINE", icon: WifiOff },
  { title: "OFFLINE SOS QUEUED", segment: "OFFLINE", icon: Database },
  { title: "NETWORK RESTORED", segment: "SYNC", icon: Wifi },
  { title: "RESCUE OPERATION ACTIVE", segment: "COMPLETE", icon: CheckCircle2 },
];
const SEGMENTS = ["DISASTER", "SOS", "AI", "ROUTE", "RESCUE", "DISPATCH", "SHELTER", "OFFLINE", "SYNC", "COMPLETE"];
const OFFLINE_SOS_MESSAGE = "Offline-first demo SOS created locally during simulated network loss.";
const SOS_MESSAGE = "Water has entered our house. Four people are trapped inside. My grandmother is with us and cannot walk.";

type SyncPhase = "idle" | "syncing" | "synced";
type DemoField = { label: string; value: string };

function localTime() {
  return new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

function upsertEvent(timeline: IncidentTimelineEvent[], event: IncidentTimelineEvent) {
  return [...timeline.filter((item) => item.title !== event.title), event];
}

function displayTeamName(name: string) {
  return name.toLowerCase().replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export default function DemoModePage() {
  const {
    state,
    createIncident,
    updateIncident,
    updateSystemStatus,
    setOfflineRequest,
    addIncident,
    dispatchRescueTeam,
    resetDemoScenario,
  } = useOperations();
  const showToast = useToast();
  const [, navigate] = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [demoStep, setDemoStep] = useState(0);
  const [syncPhase, setSyncPhase] = useState<SyncPhase>("idle");
  const [riskEscalated, setRiskEscalated] = useState(false);
  const syncTimer = useRef<number | null>(null);
  const autoStartHandled = useRef(false);

  const incident = state.incidents.find((item) => item.id === "1043") ?? null;
  const offlineRequest = state.offlineQueue?.find((request) => request.id === "1044") ?? null;
  const rescueTeam = state.rescueTeams.find((team) => team.id === "team-bravo") ?? null;
  const shelter = state.shelters.find((item) => item.id === "shelter-07") ?? null;
  const recommendation = recommendRescueTeam(state.rescueTeams, incident);
  const currentStep = demoStep > 0 ? STEPS[demoStep - 1] : null;
  const StepIcon = currentStep?.icon ?? RadioTower;
  const segmentIndex = demoStep === 0 ? -1 : demoStep <= 8 ? demoStep - 1 : demoStep === 9 ? 7 : demoStep === 10 ? 8 : 9;
  const stageTone = demoStep === 11 ? "complete" : demoStep === 1 || demoStep === 3 ? "critical" : demoStep === 8 || demoStep === 9 || demoStep === 10 ? "warning" : "info";

  useEffect(() => {
    if (demoStep !== 1) {
      setRiskEscalated(false);
      return;
    }
    const timer = window.setTimeout(() => setRiskEscalated(true), 650);
    return () => window.clearTimeout(timer);
  }, [demoStep]);

  useEffect(() => () => {
    if (syncTimer.current !== null) window.clearTimeout(syncTimer.current);
  }, []);

  const startDemo = useCallback(() => {
    if (syncTimer.current !== null) window.clearTimeout(syncTimer.current);
    syncTimer.current = null;
    const unrelated1044 = state.incidents.some((item) => item.id === "1044" && item.demoRunId !== "phase8")
      || (state.offlineQueue ?? []).some((item) => item.id === "1044" && item.demoRunId !== "phase8");
    if (unrelated1044) {
      showToast({ title: "UNRELATED INCIDENT #1044 EXISTS", detail: "Demo Mode will not overwrite separate operational data. Resolve #1044 outside this demo, then retry.", tone: "warning" });
      return;
    }
    resetDemoScenario();
    setSyncPhase("idle");
    setRiskEscalated(false);
    setDemoStep(1);
  }, [resetDemoScenario, showToast, state.incidents, state.offlineQueue]);

  useEffect(() => {
    if (autoStartHandled.current || new URLSearchParams(window.location.search).get("start") !== "1") return;
    autoStartHandled.current = true;
    window.history.replaceState(null, "", window.location.pathname);
    startDemo();
  }, [startDemo]);

  const resetDemo = () => {
    if (syncTimer.current !== null) window.clearTimeout(syncTimer.current);
    syncTimer.current = null;
    resetDemoScenario();
    setDemoStep(0);
    setSyncPhase("idle");
    setRiskEscalated(false);
    showToast({ title: "DEMO RESET", detail: "Incident #1043, Team Bravo, connectivity, and the local demo queue are ready for another run.", tone: "info" });
  };

  const getOrCreateIncident = (): Incident => {
    const existing = state.incidents.find((item) => item.id === "1043");
    if (existing) return existing;
    const createdAt = new Date().toISOString();
    const zone = state.riskZones.find((item) => item.id === "zone-04-east");
    return createIncident({
      type: "Flash Flood",
      location: "Sector 04",
      peopleAffected: 4,
      vulnerablePeople: 1,
      vulnerablePerson: "Elderly Person",
      severity: "Pending triage",
      priority: "Pending",
      status: "SOS received",
      reportedAt: "Just now",
      createdAt,
      message: SOS_MESSAGE,
      source: "Citizen SOS",
      coordinates: zone?.coordinates ?? { x: 59, y: 41 },
      timeline: [{ time: localTime(), title: "SOS RECEIVED", detail: "Citizen-submitted simulation · no dispatch is connected.", tone: "blue" }],
    });
  };

  const advanceDemo = () => {
    const nextStep = demoStep + 1;

    if (nextStep === 2) {
      getOrCreateIncident();
    }

    if (nextStep === 3) {
      const currentIncident = state.incidents.find((item) => item.id === "1043") ?? getOrCreateIncident();
      const assessment = triageIncident(currentIncident);
      if (assessment.outcome !== "complete") {
        showToast({ title: "AI TRIAGE NEEDS OPERATOR REVIEW", detail: "The shared incident did not meet the deterministic demo criteria.", tone: "warning" });
        return;
      }
      const event: IncidentTimelineEvent = {
        time: localTime(),
        title: "AI TRIAGE COMPLETE",
        detail: `${assessment.severity?.toUpperCase()} / ${assessment.priority} · ${assessment.confidence}% confidence · ${assessment.recommendedAction?.toUpperCase()}`,
        tone: "red",
      };
      updateIncident(currentIncident.id, {
        triageStatus: "Complete",
        severity: assessment.severity!,
        priority: assessment.priority!,
        status: assessment.severity === "Critical" ? "Triaged — Critical" : "Under review",
        recommendedAction: assessment.recommendedAction,
        medicalSupport: assessment.medicalSupport,
        aiConfidence: assessment.confidence,
        aiAssessment: assessment.explanation,
        triagedAt: new Date().toISOString(),
        timeline: upsertEvent(currentIncident.timeline, event),
      });
    }

    if (nextStep === 4) {
      const currentIncident = state.incidents.find((item) => item.id === "1043");
      const analysis = analyzeSafeRoutes(state.roads, state.shelters);
      if (!currentIncident || analysis.status !== "found" || !analysis.recommendedRoad || !analysis.recommendedShelter) {
        showToast({ title: "SAFE ROUTE NOT AVAILABLE", detail: "The local route engine requires an open safe road and destination.", tone: "warning" });
        return;
      }
      const routeEvent: IncidentTimelineEvent = {
        time: localTime(),
        title: "SAFE ROUTE IDENTIFIED",
        detail: `${analysis.recommendedRoad.name} → ${analysis.recommendedShelter.name} · ${analysis.recommendedRoad.distanceKm?.toFixed(1)} km · LOW RISK`,
        tone: "green",
      };
      updateIncident(currentIncident.id, {
        routeAnalysisStatus: "Complete",
        recommendedRoute: analysis.recommendedRoad.name,
        destinationShelter: analysis.recommendedShelter.name,
        routeDistanceKm: analysis.recommendedRoad.distanceKm,
        routeEta: analysis.recommendedRoad.etaMinutes,
        routeRisk: "Low",
        routeGeneratedAt: new Date().toISOString(),
        timeline: upsertEvent(currentIncident.timeline, routeEvent),
      });
    }

    if (nextStep === 6) {
      const currentIncident = state.incidents.find((item) => item.id === "1043");
      const suggested = recommendRescueTeam(state.rescueTeams, currentIncident ?? null);
      if (!currentIncident || !suggested) {
        showToast({ title: "NO AVAILABLE RESCUE TEAM", detail: "Manual operator review is required before continuing.", tone: "warning" });
        return;
      }
      const displayName = displayTeamName(suggested.team.name);
      const dispatchTime = localTime();
      const accepted = dispatchRescueTeam({
        incidentId: currentIncident.id,
        teamId: suggested.team.id,
        reason: suggested.reason,
        dispatchedAt: new Date().toISOString(),
        timelineEvents: [
          { time: "READY", title: `${suggested.team.name} RECOMMENDED`, detail: suggested.reason, tone: "green" },
          { time: dispatchTime, title: `${suggested.team.name} DISPATCHED`, detail: `${displayName} dispatched to Incident #${currentIncident.id}.`, tone: "blue" },
          { time: `ETA ${suggested.team.etaMinutes ?? 11} MIN`, title: "TEAM EN ROUTE", detail: `${displayName} responding to ${currentIncident.location}.`, tone: "blue" },
        ],
      });
      if (!accepted) {
        showToast({ title: "TEAM DISPATCH NOT COMPLETED", detail: "Review the shared incident, route, and team availability.", tone: "warning" });
        return;
      }
    }

    if (nextStep === 8) {
      updateSystemStatus({ network: "Disconnected", dataSync: "Paused" });
    }

    if (nextStep === 9) {
      setOfflineRequest({ id: "1044", type: "Flash Flood", location: "Sector 05", people: 3, priority: "PENDING TRIAGE", reportedAt: localTime(), status: "QUEUED OFFLINE", demoRunId: "phase8" });
    }

    if (nextStep === 10) {
      const request = state.offlineQueue?.find((item) => item.id === "1044")
        ?? { id: "1044" as const, type: "Flash Flood" as const, location: "Sector 05" as const, people: 3 as const, priority: "PENDING TRIAGE" as const, reportedAt: localTime(), status: "QUEUED OFFLINE" as const };
      updateSystemStatus({ network: "Connected", dataSync: "Paused" });
      setOfflineRequest({ ...request, status: "SYNCING" });
      setSyncPhase("syncing");
      setDemoStep(nextStep);
      syncTimer.current = window.setTimeout(() => {
        const syncedIncident = state.incidents.find((item) => item.id === "1044");
        if (!syncedIncident) {
          addIncident({
            id: "1044",
            type: "Flash Flood",
            location: "Sector 05",
            peopleAffected: 3,
            vulnerablePeople: 0,
            severity: "Pending triage",
            priority: "Pending",
            status: "SOS received",
            reportedAt: request.reportedAt,
            message: OFFLINE_SOS_MESSAGE,
            source: "Citizen SOS",
            demoRunId: "phase8",
            coordinates: { x: 79, y: 30 },
            timeline: [{ time: request.reportedAt, title: "OFFLINE SOS SYNCHRONIZED", detail: "Local demo queue · no live service", tone: "blue" }],
          });
        }
        updateSystemStatus({ network: "Connected", dataSync: "Live", lastSync: "Just now" });
        setOfflineRequest({ ...request, status: "SYNCED" });
        setSyncPhase("synced");
        showToast({ title: "OFFLINE SOS SYNCHRONIZED", detail: "Incident #1044 is now visible in the shared operations state.", tone: "success" });
        syncTimer.current = null;
      }, 900);
      return;
    }

    setDemoStep(nextStep);
  };

  const fields: DemoField[] = (() => {
    switch (demoStep) {
      case 1:
        return [{ label: "EVENT", value: "FLASH FLOOD" }, { label: "LOCATION", value: "SECTOR 04" }, { label: "RISK", value: riskEscalated ? "HIGH → CRITICAL" : "HIGH · ESCALATING" }];
      case 2:
        return [{ label: "INCIDENT", value: "#1043" }, { label: "PEOPLE", value: String(incident?.peopleAffected ?? 4) }, { label: "VULNERABILITY", value: "1 ELDERLY PERSON" }, { label: "LOCATION", value: incident?.location.toUpperCase() ?? "SECTOR 04" }];
      case 3:
        return [{ label: "SEVERITY", value: incident?.severity.toUpperCase() ?? "CRITICAL" }, { label: "PRIORITY", value: incident?.priority ?? "P0" }, { label: "CONFIDENCE", value: `${incident?.aiConfidence ?? 94}%` }, { label: "ACTION", value: incident?.recommendedAction?.toUpperCase() ?? "IMMEDIATE RESCUE" }];
      case 4: {
        const roadA = state.roads.find((road) => road.name === "Road A");
        const roadB = state.roads.find((road) => road.name === "Road B");
        const roadC = state.roads.find((road) => road.name === "Road C");
        return [
          { label: "ROAD A", value: `${roadA?.status.toUpperCase() ?? "BLOCKED"} · REJECTED` },
          { label: "ROAD B", value: `${roadB?.floodRisk?.toUpperCase() ?? "HIGH"} RISK · AVOID` },
          { label: "ROAD C", value: `${incident?.recommendedRoute === roadC?.name ? "SAFE · SELECTED" : "SAFE"}` },
          { label: "DESTINATION", value: incident?.destinationShelter ?? "SHELTER 07" },
          { label: "DISTANCE / ETA", value: `${incident?.routeDistanceKm?.toFixed(1) ?? "6.2"} KM · ${incident?.routeEta ?? 11} MIN` },
          { label: "RISK", value: incident?.routeRisk?.toUpperCase() ?? "LOW" },
        ];
      }
      case 5:
        return [{ label: "UNIT", value: recommendation?.team.name ?? "TEAM BRAVO" }, { label: "STATUS", value: recommendation?.team.status.toUpperCase() ?? "AVAILABLE" }, { label: "CAPACITY", value: `${recommendation?.team.capacity ?? 6} PEOPLE` }, { label: "MEDICAL / ETA", value: `${recommendation?.team.medicalSupport ? "YES" : "NO"} · ${recommendation?.team.etaMinutes ?? 11} MIN` }, { label: "REASON", value: "Closest available team with sufficient capacity and medical support." }];
      case 6:
        return [{ label: "UNIT", value: rescueTeam?.name ?? "TEAM BRAVO" }, { label: "STATUS", value: rescueTeam?.status.toUpperCase() ?? "EN ROUTE" }, { label: "INCIDENT", value: "#1043" }, { label: "ETA", value: `${incident?.rescueEtaMinutes ?? 11} MIN` }];
      case 7:
        return [{ label: "DESTINATION", value: shelter?.name ?? "SHELTER 07" }, { label: "OCCUPANCY", value: `${shelter?.routeCapacityPercent ?? 32}%` }, { label: "ACCESS", value: shelter?.routeAccess === "Safe" ? "LOW RISK" : shelter?.routeAccess?.toUpperCase() ?? "LOW RISK" }, { label: "RESOURCES", value: "FOOD · WATER · MEDICAL AVAILABLE" }];
      case 8:
        return [{ label: "NETWORK", value: state.systemStatus.network.toUpperCase() }, { label: "DATA SYNC", value: state.systemStatus.dataSync.toUpperCase() }, { label: "STATE", value: "OFFLINE MODE ACTIVE" }];
      case 9:
        return [{ label: "REQUEST", value: "OFFLINE SOS · #1044" }, { label: "LOCATION", value: offlineRequest?.location.toUpperCase() ?? "SECTOR 05" }, { label: "PEOPLE", value: String(offlineRequest?.people ?? 3) }, { label: "QUEUE", value: offlineRequest?.status ?? "QUEUED OFFLINE" }];
      case 10:
        return [{ label: "NETWORK", value: "RESTORED" }, { label: "SYNC", value: syncPhase === "synced" ? "COMPLETE" : "SYNCING OFFLINE DATA…" }, { label: "REQUEST", value: `#1044 · ${offlineRequest?.status ?? "SYNCING"}` }];
      case 11:
        return [{ label: "INCIDENT", value: "#1043 · CRITICAL / P0" }, { label: "ROUTE", value: "ROAD C → SHELTER 07" }, { label: "RESCUE", value: `${rescueTeam?.name ?? "TEAM BRAVO"} · EN ROUTE` }, { label: "ETA", value: "11 MIN" }, { label: "OFFLINE RESILIENCE", value: "#1044 · SYNC COMPLETE" }];
      default:
        return [];
    }
  })();

  const nextDisabled = demoStep === 10 && syncPhase !== "synced";
  const currentTone = demoStep === 11 ? "success" : demoStep === 0 ? "neutral" : demoStep === 8 || demoStep === 9 || demoStep === 10 ? "warning" : demoStep === 1 || demoStep === 3 ? "critical" : "info";
  const rainfall = state.riskZones.find((zone) => zone.id === "zone-04-east")?.rainfallMm ?? 0;

  return (
    <div className="app-shell">
      <NavigationRail open={sidebarOpen} onClose={() => setSidebarOpen(false)} onPlaceholder={(label) => showToast({ title: `${label} is planned for a later phase`, detail: "Demo Mode uses local simulated operations data.", tone: "info" })} rainfall={rainfall} systemStatus={state.systemStatus} activePage="demo" onNavigate={navigate} />
      <main className="app-main">
        <TopBar onMenu={() => setSidebarOpen(true)} systemStatus={state.systemStatus} onNotifications={() => showToast({ title: "LOCAL DEMONSTRATION", detail: "This deterministic sequence does not connect to live emergency services.", tone: "info" })} pageContext="OPERATIONS / DEMONSTRATION" pageTitle="RAKSHA DEMO MODE" />
        <div className="command-page">
          <div className="command-page__inner demo-mode">
            <div className="page-heading demo-mode__heading">
              <div><span className="page-kicker"><span className="page-kicker__line" /> RAKSHA RESPONSE <i>/</i> END-TO-END DEMONSTRATION</span><h2>RAKSHA DEMO MODE</h2><p>ONE LOCAL STORY · SHARED OPERATIONAL STATE</p></div>
              <div className="page-heading__actions">
                <StatusBadge tone="info" dot>LIVE DEMONSTRATION</StatusBadge>
                {demoStep === 0 ? <Button variant="primary" size="sm" icon={Play} onClick={startDemo}>START RAKSHA DEMO</Button> : demoStep < 11 ? <Button variant="primary" size="sm" icon={Activity} disabled={nextDisabled} onClick={advanceDemo}>NEXT STEP</Button> : <Button variant="primary" size="sm" icon={Play} onClick={startDemo}>RUN DEMO AGAIN</Button>}
                {demoStep > 0 && <Button variant="secondary" size="sm" icon={RadioTower} onClick={resetDemo}>RESET DEMO</Button>}
              </div>
            </div>

            <div className="demo-mode__notice" role="note"><ShieldCheck size={15} aria-hidden="true" /><span><strong>SIMULATED HACKATHON DEMONSTRATION</strong> Uses deterministic local records and existing RAKSHA operations. No live dispatch, emergency communication, GPS, or external AI is connected.</span></div>

            <div className="demo-mode__layout">
              <Card className={`demo-mode__stage demo-mode__stage--${stageTone}`} aria-live="polite">
                <div className="demo-mode__stage-head"><span className="demo-mode__step-id">{demoStep === 0 ? "READY TO BEGIN" : `STEP ${String(demoStep).padStart(2, "0")} / 11`}</span><StatusBadge tone={currentTone} dot>{demoStep === 0 ? "READY" : demoStep === 11 ? "COMPLETE" : "IN PROGRESS"}</StatusBadge></div>
                <div className="demo-mode__stage-title"><span className="demo-mode__stage-icon"><StepIcon size={19} aria-hidden="true" /></span><div><h3>{demoStep === 10 && syncPhase === "synced" ? "SOS #1044 SYNCHRONIZED" : currentStep?.title ?? "OPERATIONAL STORY"}</h3><p>{demoStep === 0 ? "Start the simulated flash-flood response and follow each operational handoff." : demoStep === 11 ? "All response milestones are visible in the shared local operations state." : demoStep === 10 && syncPhase === "syncing" ? "NETWORK RESTORED · SYNCHRONIZING THE LOCAL OFFLINE QUEUE." : "DETERMINISTIC LOCAL WORKFLOW · NO LIVE SERVICES CONNECTED."}</p></div></div>
                {demoStep === 0 ? <div className="demo-mode__fields"><div className="demo-mode__field"><span>SCENARIO</span><strong>FLASH FLOOD · SECTOR 04</strong></div><div className="demo-mode__field"><span>PRIMARY INCIDENT</span><strong>#1043 · 4 PEOPLE · 1 ELDERLY PERSON</strong></div><div className="demo-mode__field"><span>RESPONSE PATH</span><strong>TRIAGE → SAFE ROUTE → RESCUE → OFFLINE SYNC</strong></div></div> : <div className="demo-mode__fields">{fields.map((field) => <div className="demo-mode__field" key={field.label}><span>{field.label}</span><strong>{field.value}</strong></div>)}</div>}
                {demoStep === 11 && <div className="demo-mode__final-message">RAKSHA HAS COORDINATED THE RESPONSE.</div>}
                {demoStep === 0 && <p className="demo-mode__fineprint">Use NEXT STEP to advance the demonstration at your own pace. RESET DEMO restores the pre-dispatch scenario and clears only the local demo queue.</p>}
              </Card>

              <div className="demo-mode__side">
                <Card>
                  <SectionHeader eyebrow="OPERATIONAL SEQUENCE" title="Demo progress" action={<StatusBadge tone="info">{String(demoStep).padStart(2, "0")} / 11</StatusBadge>} />
                  <ProgressIndicator value={demoStep / 11 * 100} label="SEQUENCE COMPLETE" tone={demoStep === 11 ? "green" : "blue"} />
                  <ol className="demo-mode__sequence" aria-label="End-to-end demo sequence">
                    {SEGMENTS.map((segment, index) => <li key={segment} className={index < segmentIndex ? "is-complete" : index === segmentIndex ? "is-active" : ""}>{index < segmentIndex ? <CheckCircle2 size={11} /> : <span>{String(index + 1).padStart(2, "0")}</span>}{segment}</li>)}
                  </ol>
                </Card>
                <Card>
                  <SectionHeader eyebrow="SHARED OPERATIONS STORE" title="Current records" />
                  <div className="demo-mode__record-list">
                    <div className="demo-mode__record-row"><span>INCIDENT #1043</span><strong>{incident ? `${incident.severity.toUpperCase()} · ${incident.priority}` : "AWAITING SOS"}</strong></div>
                    <div className="demo-mode__record-row"><span>SAFE ROUTE</span><strong>{incident?.routeAnalysisStatus === "Complete" ? "ROAD C → SHELTER 07" : "PENDING"}</strong></div>
                    <div className="demo-mode__record-row"><span>TEAM BRAVO</span><strong>{rescueTeam?.status.toUpperCase() ?? "UNAVAILABLE"}</strong></div>
                    <div className="demo-mode__record-row"><span>NETWORK</span><strong>{state.systemStatus.network.toUpperCase()}</strong></div>
                    <div className="demo-mode__record-row"><span>OFFLINE SOS #1044</span><strong>{offlineRequest?.status ?? (state.incidents.some((item) => item.id === "1044") ? "SYNCED" : "NOT CREATED")}</strong></div>
                  </div>
                </Card>
              </div>
            </div>

            <footer className="page-footer demo-mode__footer"><div><ShieldCheck size={14} /><span>RAKSHA</span><i /><span>END-TO-END DEMO MODE</span></div><span>LOCAL, DETERMINISTIC SIMULATION <b>·</b> 11 STEPS</span><span>NO LIVE EMERGENCY SERVICE</span></footer>
          </div>
        </div>
      </main>
    </div>
  );
}
