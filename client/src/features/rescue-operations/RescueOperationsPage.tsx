import { useMemo, useState } from "react";
import { useLocation } from "wouter";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  CircleDot,
  Clock3,
  HeartPulse,
  MapPin,
  ShieldCheck,
  Truck,
  Users,
} from "lucide-react";
import { useToast } from "@/components/system/feedback";
import { Button, Card, SectionHeader, SeverityBadge, StatusBadge, TimelineItem } from "@/components/system/ui";
import { NavigationRail, TopBar } from "@/features/command-center/CommandCenter";
import { useOperations } from "@/features/command-center/OperationsContext";
import type { IncidentTimelineEvent, RescueTeam, TeamStatus } from "@/types/disaster";
import { recommendRescueTeam } from "./engine";

const FEATURED_TEAM_IDS = ["team-alpha", "team-bravo", "team-charlie"] as const;

type BadgeTone = "critical" | "warning" | "success" | "info";

function statusTone(status: TeamStatus): BadgeTone {
  if (status === "Available") return "success";
  if (status === "En route") return "info";
  if (status === "Busy" || status === "Mobilizing" || status === "Staged") return "warning";
  return "critical";
}

function titleCaseTeam(name: string) {
  return name.toLowerCase().replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function RescueTeamCard({ team, recommended, dispatched }: { team: RescueTeam; recommended: boolean; dispatched: boolean }) {
  return (
    <article className={`rescue-team-card ${recommended ? "is-recommended" : ""} ${dispatched ? "is-dispatched" : ""}`}>
      <div className="rescue-team-card__heading">
        <span className={`rescue-team-card__icon rescue-team-card__icon--${statusTone(team.status)}`}><Truck size={15} aria-hidden="true" /></span>
        <div><strong>{team.name}</strong><span>{team.role}</span></div>
        <StatusBadge tone={statusTone(team.status)} dot>{team.status.toUpperCase()}</StatusBadge>
      </div>
      <div className="rescue-team-card__location"><MapPin size={12} aria-hidden="true" /><span>{team.location}</span>{dispatched && <span className="rescue-team-card__destination">INCIDENT #1043</span>}</div>
      <div className="rescue-team-card__metrics">
        <div><span>CAPACITY</span><strong>{team.capacity ?? "—"} <small>PEOPLE</small></strong></div>
        <div><span>MEDICAL SUPPORT</span><strong className={team.medicalSupport ? "is-yes" : "is-no"}>{team.medicalSupport ? "YES" : "NO"}</strong></div>
        <div><span>DISTANCE</span><strong>{team.distanceKm?.toFixed(1) ?? "—"} <small>KM</small></strong></div>
        <div><span>ETA</span><strong>{team.etaMinutes ?? "—"} <small>MIN</small></strong></div>
      </div>
      {recommended && <div className="rescue-team-card__recommendation"><CheckCircle2 size={12} aria-hidden="true" /> RECOMMENDED FOR INCIDENT #1043</div>}
    </article>
  );
}

function responseTimeline(
  incident: NonNullable<ReturnType<typeof useOperations>["state"]["incidents"][number] | null>,
  team: RescueTeam | null,
  reason: string | undefined,
  routeReady: boolean,
  dispatched: boolean,
): IncidentTimelineEvent[] {
  if (!incident) return [];
  const sosEvent = incident.timeline.find((event) => event.title === "SOS RECEIVED")
    ?? incident.timeline.find((event) => event.title === "INCIDENT REGISTERED");
  const triageEvent: IncidentTimelineEvent[] = incident.triageStatus === "Complete"
    ? [{ time: "PHASE 3", title: "AI TRIAGE COMPLETED", detail: `${incident.severity.toUpperCase()} / ${incident.priority} · ${incident.recommendedAction?.toUpperCase() ?? "IMMEDIATE RESCUE REQUIRED"}.`, tone: "red" }]
    : [];
  const criticalEvent = incident.timeline.find((event) => event.title.includes("CRITICAL") && event.title.includes(incident.priority));
  const routeEvent = routeReady
    ? incident.timeline.find((event) => event.title === "SAFE ROUTE IDENTIFIED")
      ?? { time: "PHASE 4", title: "SAFE ROUTE IDENTIFIED", detail: `${incident.recommendedRoute} → ${incident.destinationShelter} · ${incident.routeDistanceKm?.toFixed(1)} km · ${incident.routeRisk?.toUpperCase()} risk`, tone: "green" as const }
    : undefined;
  const recommendationEvent = team && reason
    ? incident.timeline.find((event) => event.title.includes("RECOMMENDED") && event.title.includes(team.name))
      ?? { time: "READY", title: `${team.name} RECOMMENDED`, detail: reason, tone: "green" as const }
    : undefined;
  const dispatchEvent = dispatched && team
    ? incident.timeline.find((event) => event.title.includes("DISPATCHED") && event.title.includes(team.name))
    : undefined;
  const etaEvent = dispatched && team
    ? incident.timeline.find((event) => event.title === "TEAM EN ROUTE")
      ?? { time: `ETA ${incident.rescueEtaMinutes ?? team.etaMinutes ?? "—"} MIN`, title: "TEAM EN ROUTE", detail: `${team.name} responding to ${incident.location}.`, tone: "blue" as const }
    : undefined;
  return [sosEvent, ...triageEvent, criticalEvent, routeEvent, recommendationEvent, dispatchEvent, etaEvent]
    .filter((event): event is IncidentTimelineEvent => Boolean(event));
}

export default function RescueOperationsPage() {
  const { state, dispatchRescueTeam } = useOperations();
  const showToast = useToast();
  const [, setLocation] = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const incident = state.incidents.find((item) => item.id === "1043") ?? null;
  const recommendation = useMemo(() => recommendRescueTeam(state.rescueTeams, incident), [state.rescueTeams, incident]);
  const assignedTeam = incident?.rescueTeamId
    ? state.rescueTeams.find((team) => team.id === incident.rescueTeamId) ?? null
    : null;
  const selectedTeam = assignedTeam ?? recommendation?.team ?? null;
  const reason = incident?.rescueRecommendationReason ?? recommendation?.reason;
  const dispatched = incident?.status === "Rescue dispatched" && assignedTeam !== null;
  const triageReady = incident?.triageStatus === "Complete" && incident.severity === "Critical" && incident.priority === "P0";
  const routeReady = incident?.routeAnalysisStatus === "Complete"
    && incident.recommendedRoute === "Road C"
    && incident.destinationShelter === "SHELTER 07"
    && incident.routeRisk === "Low";
  const canDispatch = Boolean(
    incident
    && selectedTeam
    && recommendation
    && !dispatched
    && triageReady
    && routeReady
    && selectedTeam.status === "Available"
    && (selectedTeam.capacity ?? 0) >= incident.peopleAffected,
  );
  const featuredTeams = FEATURED_TEAM_IDS
    .map((id) => state.rescueTeams.find((team) => team.id === id))
    .filter((team): team is RescueTeam => team !== undefined);
  const timeline = incident ? responseTimeline(incident, selectedTeam, reason, routeReady, dispatched) : [];

  const navigate = (path: string) => {
    setLocation(path);
    setSidebarOpen(false);
  };
  const onPlaceholder = (label: string) => showToast({
    title: `${label} is planned for a later phase`,
    detail: "Rescue Operations, Safe Routing, AI Triage, Citizen SOS, and the Command Center are active in this prototype.",
    tone: "info",
  });

  const dispatchTeam = () => {
    if (!incident || !selectedTeam || !recommendation || !canDispatch) return;
    const displayName = titleCaseTeam(selectedTeam.name);
    const eventTime = new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
    const timelineEvents: IncidentTimelineEvent[] = [
      { time: "READY", title: `${selectedTeam.name} RECOMMENDED`, detail: reason ?? recommendation.reason, tone: "green" },
      { time: eventTime, title: `${selectedTeam.name} DISPATCHED`, detail: `${displayName} dispatched to Incident #${incident.id}.`, tone: "blue" },
      { time: `ETA ${selectedTeam.etaMinutes ?? "—"} MIN`, title: "TEAM EN ROUTE", detail: `${displayName} responding to ${incident.location}.`, tone: "blue" },
    ];
    const accepted = dispatchRescueTeam({
      incidentId: incident.id,
      teamId: selectedTeam.id,
      reason: reason ?? recommendation.reason,
      dispatchedAt: new Date().toISOString(),
      timelineEvents,
    });
    if (accepted) {
      showToast({ title: `${selectedTeam.name} DISPATCHED`, detail: `${displayName} is now en route. Simulated demo only · no live dispatch is connected.`, tone: "success" });
    } else {
      showToast({ title: "Dispatch not completed", detail: "The team is no longer available or Incident #1043 has not passed the safe-route checks. Review the shared operational state.", tone: "warning" });
    }
  };

  return (
    <div className="app-shell">
      <NavigationRail
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        onPlaceholder={onPlaceholder}
        rainfall={state.riskZones.find((zone) => zone.id === "zone-04-east")?.rainfallMm ?? 0}
        systemStatus={state.systemStatus}
        activePage="rescue-operations"
        onNavigate={navigate}
      />
      <main className="app-main">
        <TopBar
          onMenu={() => setSidebarOpen(true)}
          systemStatus={state.systemStatus}
          pageContext="OPERATIONS / FIELD RESPONSE"
          pageTitle="RESCUE OPERATIONS"
          onNotifications={() => showToast({ title: "Rescue Operations", detail: dispatched ? `Incident #1043 · ${selectedTeam?.name} en route · ETA ${incident?.rescueEtaMinutes ?? selectedTeam?.etaMinutes ?? "—"} min.` : "Local response recommendation ready for operator review.", tone: "info" })}
        />
        <div className="command-page">
          <div className="command-page__inner rescue-operations">
            <div className="page-heading rescue-operations__heading">
              <div>
                <span className="page-kicker"><span className="page-kicker__line" /> RAKSHA RESPONSE <i>/</i> FIELD UNITS</span>
                <h2>RESCUE OPERATIONS</h2>
                <p>SAFETY-FIRST TEAM RECOMMENDATION · LOCAL DEMO</p>
              </div>
              <div className="page-heading__actions"><StatusBadge tone={dispatched ? "info" : "success"} dot>{dispatched ? "TEAM EN ROUTE" : "LOCAL RESPONSE ENGINE"}</StatusBadge></div>
            </div>

            <div className="rescue-operations__notice" role="note"><ShieldCheck size={15} aria-hidden="true" /><span><strong>SIMULATED DISPATCH</strong> Shared demo state updates locally · no live emergency service or external team dispatch is connected.</span></div>

            {!incident && <div className="rescue-operations__prerequisite" role="status">
              <div><strong>Incident #1043 is not in this session yet.</strong><span>Submit the fictional Flash Flood report in Citizen SOS; the same incident will appear here.</span></div>
              <Button variant="secondary" icon={ArrowRight} onClick={() => navigate("/citizen-sos")}>OPEN CITIZEN SOS</Button>
            </div>}

            <section className="rescue-operations__summary-grid" aria-label="Incident and safe route summary">
              <Card className="rescue-incident-card">
                <div className="rescue-incident-card__header"><SectionHeader eyebrow={incident ? `ACTIVE INCIDENT · #${incident.id}` : "ACTIVE INCIDENT"} title={incident?.type ?? "Flash Flood"} />
                  {incident && <StatusBadge tone={dispatched ? "info" : triageReady ? "critical" : "warning"} dot>{dispatched ? "RESCUE DISPATCHED" : "IMMEDIATE RESCUE REQUIRED"}</StatusBadge>}
                </div>
                {incident ? <>
                  <div className="rescue-incident-card__location"><MapPin size={14} aria-hidden="true" /><strong>{incident.location.toUpperCase()}</strong><span>SIMULATED LOCATION</span></div>
                  <div className="rescue-incident-card__facts">
                    <div><SeverityBadge severity={incident.severity} priority={incident.priority} /><span>SEVERITY / PRIORITY</span></div>
                    <div><strong><Users size={13} aria-hidden="true" /> {incident.peopleAffected}</strong><span>PEOPLE AFFECTED</span></div>
                    <div><strong><HeartPulse size={13} aria-hidden="true" /> {incident.vulnerablePeople}</strong><span>ELDERLY / VULNERABLE</span></div>
                  </div>
                  <div className="rescue-incident-card__action"><AlertTriangle size={13} aria-hidden="true" /><span>{incident.recommendedAction?.toUpperCase() ?? "IMMEDIATE RESCUE REQUIRED"}</span></div>
                </> : <div className="rescue-incident-card__empty"><CircleDot size={16} /><span>Waiting for the shared Incident #1043 record.</span></div>}
              </Card>

              <Card className="rescue-route-card">
                <div className="rescue-route-card__header"><SectionHeader eyebrow="PHASE 4 · SAFE EVACUATION ROUTE" title="Destination route" /><StatusBadge tone={routeReady ? "success" : "warning"} dot>{routeReady ? "SAFE ROUTE FOUND" : "ROUTE REQUIRED"}</StatusBadge></div>
                {routeReady && incident ? <>
                  <div className="rescue-route-card__path"><span>{incident.recommendedRoute}</span><ArrowRight size={16} aria-hidden="true" /><span>{incident.destinationShelter}</span></div>
                  <div className="rescue-route-card__metrics"><div><strong>{incident.routeDistanceKm?.toFixed(1)} KM</strong><span>DISTANCE</span></div><div><strong>{incident.routeEta} MIN</strong><span>ROUTE ETA</span></div><div><strong>LOW</strong><span>FLOOD RISK</span></div></div>
                </> : <div className="rescue-route-card__empty"><span>Complete Safe Routing before dispatching a team.</span><Button variant="secondary" size="sm" icon={ArrowRight} onClick={() => navigate("/safe-routing")}>OPEN SAFE ROUTING</Button></div>}
              </Card>
            </section>

            {!triageReady && incident && <div className="rescue-operations__prerequisite" role="status"><div><strong>Critical/P0 triage required before dispatch.</strong><span>Run the existing local AI Triage flow for Incident #1043.</span></div><Button variant="secondary" icon={ArrowRight} onClick={() => navigate("/ai-triage")}>OPEN AI TRIAGE</Button></div>}

            <section className="rescue-operations__main-grid" aria-label="Rescue unit recommendation">
              <Card className="rescue-team-panel">
                <div className="rescue-team-panel__header"><SectionHeader eyebrow="CENTRALIZED DEMO ROSTER" title="Rescue teams" action={<span className="rescue-team-panel__count">{featuredTeams.length.toString().padStart(2, "0")} UNITS</span>} /></div>
                <div className="rescue-team-list">
                  {featuredTeams.map((team) => <RescueTeamCard key={team.id} team={team} recommended={team.id === selectedTeam?.id && !dispatched} dispatched={team.id === assignedTeam?.id && dispatched} />)}
                  {featuredTeams.length === 0 && <div className="rescue-team-list__empty">No rescue team records are available in the shared operations store.</div>}
                </div>
              </Card>

              <Card className="rescue-recommendation-card">
                <SectionHeader eyebrow="DETERMINISTIC LOCAL SELECTION" title="Recommended response unit" />
                {selectedTeam ? <>
                  <div className="rescue-recommendation-card__team"><span className="rescue-recommendation-card__icon"><Truck size={17} aria-hidden="true" /></span><div><span>RESPONSE UNIT</span><strong>{selectedTeam.name}</strong></div><StatusBadge tone={dispatched ? "info" : "success"} dot>{dispatched ? "DISPATCHED" : "RECOMMENDED"}</StatusBadge></div>
                  <div className="rescue-recommendation-card__metrics"><div><strong>{selectedTeam.etaMinutes ?? "—"} MIN</strong><span>ETA</span></div><div><strong>{selectedTeam.capacity ?? "—"} PEOPLE</strong><span>CAPACITY</span></div><div><strong>{selectedTeam.medicalSupport ? "AVAILABLE" : "NOT AVAILABLE"}</strong><span>MEDICAL SUPPORT</span></div></div>
                  <div className="rescue-recommendation-card__distance"><MapPin size={12} aria-hidden="true" /><span>Distance: <strong>{selectedTeam.distanceKm?.toFixed(1) ?? "—"} KM</strong></span><span className="rescue-recommendation-card__location">{selectedTeam.location}</span></div>
                  <div className="rescue-recommendation-card__reason"><CheckCircle2 size={13} aria-hidden="true" /><span>Closest available team with sufficient capacity and medical support.</span></div>
                  {reason && <p className="rescue-recommendation-card__detail">{reason}</p>}
                  <Button variant={dispatched ? "secondary" : "primary"} icon={dispatched ? CheckCircle2 : Truck} className="rescue-dispatch-button" disabled={!canDispatch} onClick={dispatchTeam}>
                    {dispatched ? `${selectedTeam.name} EN ROUTE` : canDispatch ? `DISPATCH ${selectedTeam.name}` : "DISPATCH HELD · VERIFY INCIDENT"}
                  </Button>
                </> : !incident ? (
                  <div className="rescue-recommendation-card__empty rescue-recommendation-card__empty--waiting">
                    <CircleDot size={18} aria-hidden="true" />
                    <strong>AWAITING INCIDENT #1043</strong>
                    <span>Team selection will run when the shared incident is registered.</span>
                  </div>
                ) : (
                  <div className="rescue-recommendation-card__empty"><AlertTriangle size={18} aria-hidden="true" /><strong>NO AVAILABLE RESCUE TEAM</strong><span>MANUAL OPERATOR REVIEW REQUIRED</span></div>
                )}
              </Card>
            </section>

            <Card className="rescue-timeline-card">
              <div className="rescue-timeline-card__heading"><SectionHeader eyebrow="SHARED INCIDENT HISTORY" title="Rescue timeline" /><Clock3 size={15} aria-hidden="true" /></div>
              {timeline.length > 0 ? <div className="rescue-timeline-list">
                {timeline.map((event, index) => {
                  const Icon = event.title.includes("DISPATCHED") || event.title === "TEAM EN ROUTE" ? Truck : event.tone === "red" ? AlertTriangle : event.tone === "green" ? CheckCircle2 : CircleDot;
                  return <TimelineItem key={`${event.time}-${event.title}`} icon={Icon} title={event.title} detail={event.detail} time={event.time} tone={event.tone} last={index === timeline.length - 1} />;
                })}
              </div> : <div className="rescue-timeline-card__empty">Incident events will appear here from the shared SOS, triage, routing, and dispatch flows.</div>}
            </Card>

            <footer className="page-footer rescue-operations__footer"><div><ShieldCheck size={14} /><span>RAKSHA</span><i /><span>RESCUE OPERATIONS</span></div><span>LOCAL DETERMINISTIC DEMO <b>·</b> SAME INCIDENT #1043</span><span>NO LIVE DISPATCH CONNECTED</span></footer>
          </div>
        </div>
      </main>
    </div>
  );
}
