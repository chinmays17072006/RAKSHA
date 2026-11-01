import { useRef, useState } from "react";
import { useLocation } from "wouter";
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  BrainCircuit,
  Check,
  CheckCircle2,
  CircleDot,
  Clock3,
  HeartPulse,
  LoaderCircle,
  MapPin,
  ShieldCheck,
  Sparkles,
  Users,
} from "lucide-react";
import { useToast } from "@/components/system/feedback";
import { Button, Card, SectionHeader, SeverityBadge, StatusBadge, TimelineItem } from "@/components/system/ui";
import { NavigationRail, TopBar } from "@/features/command-center/CommandCenter";
import { useOperations } from "@/features/command-center/OperationsContext";
import type { Incident, IncidentTimelineEvent } from "@/types/disaster";
import { triageIncident, type TriageAssessment } from "./engine";

const SELECTABLE_INCIDENT_IDS = ["1043", "1042", "1041"] as const;
const PROCESSING_STEPS = [
  "RECEIVING INCIDENT",
  "ANALYZING EMERGENCY",
  "ASSESSING RISK",
  "ASSIGNING PRIORITY",
] as const;
const wait = (milliseconds: number) => new Promise<void>((resolve) => window.setTimeout(resolve, milliseconds));

function vulnerableSummary(incident: Incident) {
  if (incident.vulnerablePerson === "Elderly Person") return `${Math.max(incident.vulnerablePeople, 1)} ELDERLY PERSON${incident.vulnerablePeople > 1 ? "S" : ""}`;
  if (incident.vulnerablePerson === "None" || incident.vulnerablePeople === 0) return "NONE REPORTED";
  if (incident.vulnerablePerson === "Multiple Vulnerable People") return "MULTIPLE VULNERABLE PEOPLE";
  return incident.vulnerablePerson?.toUpperCase() ?? `${incident.vulnerablePeople} VULNERABLE PERSON(S)`;
}

function triageTimeline(incident: Incident, assessment: TriageAssessment): IncidentTimelineEvent[] {
  const severity = assessment.severity ?? incident.severity;
  const priority = assessment.priority ?? incident.priority;
  const recommendation = assessment.recommendedAction ?? "Operator review";
  const recommendationText = `${recommendation.charAt(0).toUpperCase()}${recommendation.slice(1).toLowerCase()}`;
  const assignmentTitle = `${severity.toUpperCase()} / ${priority} ASSIGNED`;
  const assignmentTone = severity === "Critical" ? "red" : "amber";
  const recommendationTitle = /rescue/i.test(recommendation)
    ? "RESCUE RECOMMENDATION GENERATED"
    : "RECOMMENDATION GENERATED";

  if (incident.id === "1043") {
    return [
      { time: "10:42:01", title: "SOS RECEIVED", detail: "Citizen-submitted report · simulated record", tone: "blue" },
      { time: "10:42:03", title: "LOCATION VERIFIED", detail: `${incident.location} · simulated location`, tone: "blue" },
      { time: "10:42:04", title: "INCIDENT REGISTERED", detail: `${incident.type} · ${incident.peopleAffected} people affected`, tone: "amber" },
      { time: "10:42:08", title: "AI TRIAGE STARTED", detail: "Local deterministic rules · no external AI service", tone: "blue" },
      { time: "10:42:10", title: assignmentTitle, detail: "Priority requires operator review · no dispatch", tone: assignmentTone },
      { time: "10:42:11", title: recommendationTitle, detail: `${recommendationText} recommended · no team dispatched`, tone: "green" },
    ];
  }

  const analysisStarted = Date.now() - 3_000;
  const formatTime = (offset: number) => new Date(analysisStarted + offset).toLocaleTimeString("en-GB", {
    hour: "2-digit", minute: "2-digit", second: "2-digit",
  });
  const priorEvents = incident.timeline.length > 0
    ? incident.timeline
    : [{ time: incident.reportedAt, title: "SOS RECEIVED", detail: `${incident.type} · ${incident.location} · simulated report`, tone: "blue" as const }];

  return [
    ...priorEvents,
    { time: formatTime(0), title: "AI TRIAGE STARTED", detail: "Local deterministic rules · no external AI service", tone: "blue" },
    { time: formatTime(1_500), title: assignmentTitle, detail: `${recommendationText} recommended · operator review required · no dispatch`, tone: assignmentTone },
    { time: formatTime(3_000), title: recommendationTitle, detail: `${recommendationText} · no team dispatched`, tone: "green" },
  ];
}

function TriageResult({ incident }: { incident: Incident }) {
  if (incident.triageStatus === "Manual review required") {
    return (
      <section className="ai-triage-result ai-triage-result--manual" aria-labelledby="triage-result-title">
        <div className="ai-triage-result__heading"><StatusBadge tone="warning" dot>MANUAL REVIEW REQUIRED</StatusBadge><AlertTriangle size={17} aria-hidden="true" /></div>
        <h3 id="triage-result-title">INSUFFICIENT INFORMATION</h3>
        <p>This report was not assigned a severity or priority. An operator must review the missing details.</p>
      </section>
    );
  }

  if (incident.triageStatus !== "Complete") {
    return (
      <section className="ai-triage-result ai-triage-result--pending" aria-labelledby="triage-result-title">
        <div className="ai-triage-result__heading"><StatusBadge tone="info" dot>AWAITING ANALYSIS</StatusBadge><BrainCircuit size={17} aria-hidden="true" /></div>
        <h3 id="triage-result-title">NO TRIAGE RESULT YET</h3>
        <p>Run the local rule check to create an operational priority recommendation. No AI reasoning or dispatch is simulated.</p>
      </section>
    );
  }

  const severity = incident.severity;
  const critical = severity === "Critical";
  const tone = critical ? "critical" : severity === "High" ? "warning" : "info";
  return (
    <section className={`ai-triage-result ${critical ? "ai-triage-result--critical" : "ai-triage-result--complete"}`} aria-labelledby="triage-result-title" aria-live="polite">
      <div className="ai-triage-result__heading">
        <StatusBadge tone="success" dot>AI TRIAGE COMPLETE</StatusBadge>
        <span className="ai-triage-result__confidence"><Sparkles size={13} aria-hidden="true" /> {incident.aiConfidence ?? 0}% CONFIDENCE</span>
      </div>
      <div className="ai-triage-result__priority-row">
        <div className="ai-triage-result__severity"><span>SEVERITY</span><strong className={`ai-triage-result__severity-value ai-triage-result__severity-value--${tone}`}>{severity.toUpperCase()}</strong></div>
        <div className="ai-triage-result__priority"><span>PRIORITY</span><strong>{incident.priority}</strong></div>
      </div>
      <div className="ai-triage-result__facts">
        <div><span>PEOPLE AFFECTED</span><strong>{incident.peopleAffected}</strong></div>
        <div><span>VULNERABLE PERSON</span><strong>{incident.vulnerablePerson?.toLowerCase().includes("elderly") ? "ELDERLY — YES" : incident.vulnerablePeople > 0 ? "YES" : "NONE REPORTED"}</strong></div>
        <div><span>RECOMMENDED ACTION</span><strong>{incident.recommendedAction?.toUpperCase() ?? "OPERATOR REVIEW"}</strong></div>
        <div><span>MEDICAL SUPPORT</span><strong>{incident.medicalSupport?.toUpperCase() ?? "REVIEW"}</strong></div>
      </div>
    </section>
  );
}

export default function AITriagePage() {
  const { state, updateIncident } = useOperations();
  const showToast = useToast();
  const [, setLocation] = useLocation();
  const [selectedIncidentId, setSelectedIncidentId] = useState("1043");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStep, setProcessingStep] = useState(0);
  const processingGuard = useRef(false);

  const selectedIncident = state.incidents.find((incident) => incident.id === selectedIncidentId) ?? null;
  const demoAvailable = state.incidents.some((incident) => incident.id === "1043");
  const selectionItems = SELECTABLE_INCIDENT_IDS.map((id) => state.incidents.find((incident) => incident.id === id)).filter((incident): incident is Incident => incident !== undefined);
  const primaryZone = state.riskZones.find((zone) => zone.id === "zone-04-east");
  const analysisComplete = selectedIncident?.triageStatus === "Complete";
  const manualReview = selectedIncident?.triageStatus === "Manual review required";

  const onPlaceholder = (label: string) => showToast({ title: `${label} is planned for a later phase`, detail: "AI Triage, Citizen SOS, and the Phase 1 Command Center are active in this prototype.", tone: "info" });
  const navigate = (path: string) => {
    setLocation(path);
    setSidebarOpen(false);
  };

  const runAnalysis = async () => {
    if (!selectedIncident || isProcessing || processingGuard.current || analysisComplete) return;
    processingGuard.current = true;
    setIsProcessing(true);
    setProcessingStep(0);

    try {
      for (let step = 1; step <= PROCESSING_STEPS.length; step += 1) {
        setProcessingStep(step);
        await wait(250);
      }

      const latestIncident = state.incidents.find((incident) => incident.id === selectedIncident.id) ?? selectedIncident;
      const assessment = triageIncident(latestIncident);
      if (assessment.outcome === "manual-review") {
        const reviewTime = new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
        const manualReviewEvent: IncidentTimelineEvent = {
          time: reviewTime,
          title: "INSUFFICIENT INFORMATION",
          detail: "Manual review required · no severity or priority was assigned.",
          tone: "amber",
        };
        updateIncident(latestIncident.id, {
          triageStatus: "Manual review required",
          timeline: [
            ...latestIncident.timeline.filter((event) => event.title !== "INSUFFICIENT INFORMATION"),
            manualReviewEvent,
          ],
        });
        showToast({ title: "MANUAL REVIEW REQUIRED", detail: `Incident #${latestIncident.id} · insufficient information. No severity or priority was assigned.`, tone: "warning" });
      } else {
        updateIncident(latestIncident.id, {
          triageStatus: "Complete",
          severity: assessment.severity!,
          priority: assessment.priority!,
          status: assessment.severity === "Critical" ? "Triaged — Critical" : "Under review",
          recommendedAction: assessment.recommendedAction,
          medicalSupport: assessment.medicalSupport,
          aiConfidence: assessment.confidence,
          aiAssessment: assessment.explanation,
          triagedAt: new Date().toISOString(),
          timeline: triageTimeline(latestIncident, assessment),
        });
        showToast({
          title: "AI TRIAGE COMPLETE",
          detail: `Incident #${latestIncident.id}\n${assessment.severity?.toUpperCase()} / ${assessment.priority}\n${assessment.recommendedAction?.toLowerCase()} recommended.`,
          tone: "success",
        });
      }
    } catch {
      showToast({ title: "Triage could not be completed", detail: "No incident was replaced or removed. Please try again.", tone: "warning" });
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
        activePage="ai-triage"
        onNavigate={navigate}
      />
      <main className="app-main">
        <TopBar
          onMenu={() => setSidebarOpen(true)}
          systemStatus={state.systemStatus}
          pageContext="OPERATIONS / INCIDENT INTELLIGENCE"
          pageTitle="AI TRIAGE"
          onNotifications={() => showToast({ title: "Triage notifications", detail: analysisComplete ? `Incident #${selectedIncidentId} · ${selectedIncident?.severity.toUpperCase()} / ${selectedIncident?.priority}` : "No new triage notifications.", tone: "info" })}
        />
        <div className="command-page">
          <div className="command-page__inner ai-triage-page">
            <div className="page-heading ai-triage-heading">
              <div>
                <span className="page-kicker"><span className="page-kicker__line" /> RAKSHA RESPONSE <i>/</i> INCIDENT INTELLIGENCE</span>
                <h2>AI TRIAGE</h2>
                <p>DETERMINISTIC LOCAL PRIORITIZATION</p>
              </div>
              <div className="page-heading__actions"><StatusBadge tone="info" dot>LOCAL DEMO ENGINE</StatusBadge></div>
            </div>

            <div className="ai-triage-simulation-note" role="note"><ShieldCheck size={15} aria-hidden="true" /><span><strong>SIMULATED DECISION SUPPORT</strong> Rule-based demo only · no live AI, dispatch, or emergency service is connected.</span></div>

            <Card className="ai-triage-selector-card">
              <div className="ai-triage-selector__copy"><span className="section-eyebrow">INCIDENT SELECTOR</span><strong>Choose a report for local rule analysis</strong></div>
              <label className="ai-triage-selector__field" htmlFor="triage-incident-select"><span>SELECT INCIDENT</span>
                <select id="triage-incident-select" value={selectedIncidentId} disabled={isProcessing} onChange={(event) => setSelectedIncidentId(event.target.value)}>
                  {selectionItems.some((incident) => incident.id === "1043")
                    ? <option value="1043">#1043 — Flash Flood — Sector 04</option>
                    : <option value="1043" disabled>#1043 — submit the Citizen SOS demo first</option>}
                  {selectionItems.filter((incident) => incident.id !== "1043").map((incident) => <option key={incident.id} value={incident.id}>#{incident.id} — {incident.type} — {incident.location}</option>)}
                </select>
              </label>
            </Card>

            {!demoAvailable && <div className="ai-triage-missing-demo" role="status"><div><strong>Incident #1043 is not in this session yet.</strong><span>Load and submit the fictional Flash Flood demo from Citizen SOS; the same record will appear here automatically.</span></div><Button variant="secondary" icon={ArrowRight} onClick={() => navigate("/citizen-sos")}>OPEN CITIZEN SOS</Button></div>}

            {selectedIncident ? (
              <div className="ai-triage-main-grid">
                <Card className="ai-triage-incident-card">
                  <div className="ai-triage-card-heading"><SectionHeader eyebrow={`SOURCE ${selectedIncident.source.toUpperCase()} · INCIDENT #${selectedIncident.id}`} title={selectedIncident.type} /><StatusBadge tone={selectedIncident.triageStatus === "Complete" ? "success" : selectedIncident.severity === "Critical" ? "critical" : "warning"} dot>{selectedIncident.status.toUpperCase()}</StatusBadge></div>
                  <div className="ai-triage-location"><MapPin size={14} aria-hidden="true" /><strong>{selectedIncident.location.toUpperCase()}</strong><span>SIMULATED LOCATION</span></div>
                  <div className="ai-triage-summary-grid">
                    <div><span>PEOPLE</span><strong><Users size={14} aria-hidden="true" /> {selectedIncident.peopleAffected}</strong></div>
                    <div><span>VULNERABLE PERSON</span><strong><HeartPulse size={14} aria-hidden="true" /> {vulnerableSummary(selectedIncident)}</strong></div>
                    <div><span>SEVERITY</span><strong><AlertTriangle size={14} aria-hidden="true" /> {selectedIncident.severity.toUpperCase()}</strong></div>
                    <div><span>PRIORITY</span><strong><Activity size={14} aria-hidden="true" /> {selectedIncident.priority}</strong></div>
                  </div>
                  <blockquote className="ai-triage-message">“{selectedIncident.message}”</blockquote>
                </Card>

                <Card className="ai-triage-action-card">
                  <div className="ai-triage-action-card__heading"><span className="ai-triage-engine-mark"><BrainCircuit size={17} aria-hidden="true" /></span><div><span className="section-eyebrow">LOCAL RULE ENGINE</span><strong>{analysisComplete ? "Assessment registered" : manualReview ? "Manual review flagged" : "Ready to assess"}</strong></div><StatusBadge tone={analysisComplete ? "success" : manualReview ? "warning" : "info"} dot>{analysisComplete ? "COMPLETE" : manualReview ? "REVIEW" : "READY"}</StatusBadge></div>
                  <p>Transparent demo rules evaluate the incident report and vulnerability indicators. No model call is made.</p>
                  <Button variant="primary" size="md" icon={isProcessing ? LoaderCircle : analysisComplete ? CheckCircle2 : BrainCircuit} className={`ai-triage-analyze ${isProcessing ? "ai-triage-analyze--loading" : ""}`} onClick={runAnalysis} disabled={!selectedIncident || isProcessing || analysisComplete}>
                    {isProcessing ? "ANALYZING INCIDENT…" : analysisComplete ? "AI TRIAGE COMPLETE" : manualReview ? "RUN RULE CHECK AGAIN" : "ANALYZE INCIDENT"}
                  </Button>
                  {(isProcessing || analysisComplete || manualReview) && <ol className="ai-triage-steps" aria-live="polite">
                    {PROCESSING_STEPS.map((step, index) => {
                      const complete = !isProcessing && (analysisComplete || manualReview) || isProcessing && index < processingStep - 1;
                      const active = isProcessing && index === processingStep - 1;
                      return <li key={step} className={`${complete ? "is-complete" : ""} ${active ? "is-active" : ""}`}>
                        <span className="ai-triage-step__icon">{complete ? <Check size={12} aria-hidden="true" /> : active ? <LoaderCircle size={12} className="spin" aria-hidden="true" /> : index + 1}</span>
                        <span className="ai-triage-step__label">{step}</span>
                        <span className="ai-triage-step__state">{complete ? "DONE" : active ? "IN PROGRESS" : "WAITING"}</span>
                      </li>;
                    })}
                  </ol>}
                  {!isProcessing && analysisComplete && <Button className="ai-triage-command-link" variant="secondary" icon={ArrowRight} onClick={() => navigate("/")}>VIEW COMMAND CENTER</Button>}
                </Card>
              </div>
            ) : (
              <Card className="ai-triage-empty-card"><CircleDot size={20} aria-hidden="true" /><strong>Incident #1043 is waiting for a Citizen SOS submission.</strong><span>Run the Citizen SOS demo first; triage will use that same centralized incident record.</span></Card>
            )}

            {selectedIncident && <div className="ai-triage-lower-grid">
              <Card className="ai-triage-result-card"><SectionHeader eyebrow="RISK CLASSIFICATION" title="AI triage result" /><TriageResult incident={selectedIncident} />
                {selectedIncident.triageStatus === "Complete" && <div className="ai-triage-assessment"><span className="section-eyebrow">AI ASSESSMENT · OPERATIONAL SUMMARY</span><p>{selectedIncident.aiAssessment}</p></div>}
              </Card>
              <Card className="ai-triage-timeline-card"><div className="ai-triage-timeline-heading"><SectionHeader eyebrow="SIMULATED EVENT HISTORY" title="Triage timeline" /><Clock3 size={15} aria-hidden="true" /></div>
                <div className="ai-triage-timeline">
                  {selectedIncident.timeline.length > 0
                    ? selectedIncident.timeline.map((event, index) => <TimelineItem key={`${event.time}-${event.title}`} icon={event.tone === "red" ? AlertTriangle : event.tone === "green" ? CheckCircle2 : CircleDot} title={event.title} detail={event.detail} time={event.time} tone={event.tone} last={index === selectedIncident.timeline.length - 1} />)
                    : <div className="ai-triage-no-timeline"><CircleDot size={14} /><span>Timeline events will appear after an analysis is run.</span></div>}
                </div>
              </Card>
            </div>}

            <footer className="page-footer ai-triage-footer"><div><ShieldCheck size={14} /><span>RAKSHA</span><i /><span>AI SOS TRIAGE</span></div><span>LOCAL DETERMINISTIC DEMO <b>·</b> OPERATOR REVIEW REQUIRED</span><span>NO DISPATCH CONNECTED</span></footer>
          </div>
        </div>
      </main>
    </div>
  );
}
