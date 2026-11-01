import { useState } from "react";
import { useLocation } from "wouter";
import { AlertTriangle, Check, CheckCircle2, CloudUpload, Clock3, Radio, ShieldCheck, Wifi, WifiOff } from "lucide-react";
import { useToast } from "@/components/system/feedback";
import { Button, Card, SectionHeader, StatusBadge } from "@/components/system/ui";
import { useOperations } from "@/features/command-center/OperationsContext";
import { NavigationRail, TopBar } from "@/features/command-center/CommandCenter";
import type { Incident } from "@/types/disaster";
type OfflinePhase = "connected" | "offline" | "syncing" | "synced";

const SYNC_STEPS = ["CONNECTED", "OFFLINE QUEUE", "NETWORK RESTORED", "SYNCING", "SYNC COMPLETE"] as const;

function localTime() {
  return new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

export default function OfflineModePage() {
  const { state, addIncident, updateSystemStatus, setOfflineRequest } = useOperations();
  const showToast = useToast();
  const [, navigate] = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [phase, setPhase] = useState<OfflinePhase>(() => {
    const queued = state.offlineQueue?.find((item) => item.id === "1044");
    if (state.systemStatus.network === "Disconnected") return "offline";
    if (queued?.status === "SYNCED") return "synced";
    if (queued?.status === "SYNCING") return "syncing";
    return "connected";
  });
  const request = state.offlineQueue?.find((item) => item.id === "1044") ?? null;
  const connected = state.systemStatus.network === "Connected";
  const isSyncing = phase === "syncing";
  const rainfall = state.riskZones.find((zone) => zone.id === "zone-04-east")?.rainfallMm ?? 0;
  const syncedIncidentExists = state.incidents.some((incident) => incident.id === "1044");

  const simulateFailure = () => {
    if (!connected || isSyncing || request?.status === "SYNCED" || syncedIncidentExists) return;
    updateSystemStatus({ network: "Disconnected", dataSync: "Paused" });
    setPhase("offline");
    showToast({ title: "NETWORK CONNECTION LOST", detail: "Offline-first demo simulation active. No live communications are in use.", tone: "warning" });
  };

  const createOfflineSos = () => {
    if (connected || request || syncedIncidentExists || isSyncing) return;
    setOfflineRequest({ id: "1044", type: "Flash Flood", location: "Sector 05", people: 3, priority: "PENDING TRIAGE", reportedAt: localTime(), status: "QUEUED OFFLINE" });
    showToast({ title: "OFFLINE SOS QUEUED", detail: "Demo request #1044 is stored locally and waiting for simulated synchronization.", tone: "info" });
  };

  const restoreNetwork = () => {
    if (connected || isSyncing) return;
    updateSystemStatus({ network: "Connected", dataSync: request ? "Paused" : "Live" });
    if (!request) {
      setPhase("connected");
      showToast({ title: "NETWORK RESTORED", detail: "Connection status is simulated locally.", tone: "success" });
      return;
    }

    setPhase("syncing");
    setOfflineRequest({ ...request, status: "SYNCING" });
    window.setTimeout(() => {
      const incident: Incident = {
        id: "1044",
        type: "Flash Flood",
        location: "Sector 05",
        peopleAffected: 3,
        vulnerablePeople: 0,
        severity: "Pending triage",
        priority: "Pending",
        status: "SOS received",
        reportedAt: request.reportedAt,
        message: "Offline-first demo SOS created locally during simulated network loss.",
        source: "Citizen SOS",
        coordinates: { x: 79, y: 30 },
        timeline: [{ time: request.reportedAt, title: "OFFLINE SOS SYNCHRONIZED", detail: "Local demo queue · no live service", tone: "blue" }],
      };
      if (!syncedIncidentExists) addIncident(incident);
      updateSystemStatus({ network: "Connected", dataSync: "Live", lastSync: "Just now" });
      setOfflineRequest({ ...request, status: "SYNCED" });
      setPhase("synced");
      showToast({ title: "OFFLINE SOS SYNCHRONIZED", detail: "Incident #1044 is now visible in the shared operations state.", tone: "success" });
    }, 900);
  };

  const stepIndex = phase === "connected" ? 0 : phase === "offline" ? 1 : phase === "syncing" ? 3 : 4;
  const onNotifications = () => showToast({ title: "OFFLINE-FIRST DEMO SIMULATION", detail: "Offline queue and synchronization are local demo behavior, not an emergency communications service.", tone: "info" });

  return (
    <div className="app-shell">
      <NavigationRail
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        onPlaceholder={(label) => showToast({ title: `${label} is planned for a later phase`, detail: "This demo view uses local simulated operations data.", tone: "info" })}
        rainfall={rainfall}
        systemStatus={state.systemStatus}
        activePage="offline-mode"
        onNavigate={navigate}
      />
      <main className="app-main">
        <TopBar onMenu={() => setSidebarOpen(true)} systemStatus={state.systemStatus} onNotifications={onNotifications} pageContext="OPERATIONS / RESILIENCE" pageTitle="OFFLINE MODE" />
        <div className="command-page">
          <div className="command-page__inner offline-mode">
            <div className="page-heading offline-mode__heading">
              <div><span className="page-kicker"><span className="page-kicker__line" /> EASTERN DISTRICT <i>/</i> CONNECTIVITY RESILIENCE</span><h2>OFFLINE MODE</h2><p>CAPTURE LOCALLY · SYNCHRONIZE WHEN RESTORED</p></div>
              <StatusBadge tone="info" dot>PHASE 7 · SIMULATION</StatusBadge>
            </div>

            <div className="offline-mode__notice"><ShieldCheck size={15} aria-hidden="true" /><span><strong>OFFLINE-FIRST DEMO SIMULATION</strong> Queue and synchronization are local/in-memory only. This is not a production emergency communications system.</span></div>

            <section className="offline-mode__grid" aria-label="Offline resilience controls and queue">
              <Card className="offline-mode__network">
                <div className="offline-mode__card-heading">
                  <SectionHeader eyebrow="NETWORK STATUS" title={connected ? "NETWORK CONNECTED" : "OFFLINE MODE"} />
                  <StatusBadge tone={connected ? "success" : "critical"} dot>{connected ? "CONNECTED" : "OFFLINE"}</StatusBadge>
                </div>
                {!connected && <div className="offline-mode__connection-warning" role="status"><AlertTriangle size={16} /><strong>NETWORK CONNECTION LOST</strong></div>}
                {phase === "syncing" && <div className="offline-mode__sync-banner" role="status"><CloudUpload size={16} /><span><strong>NETWORK RESTORED</strong><small>SYNCING OFFLINE DATA...</small></span></div>}
                {phase === "synced" && <div className="offline-mode__sync-banner offline-mode__sync-banner--complete" role="status"><CheckCircle2 size={16} /><span><strong>OFFLINE SOS SYNCHRONIZED</strong><small>#1044 is now in centralized operations.</small></span></div>}
                <div className="offline-mode__controls">
                  <Button variant="danger" icon={WifiOff} disabled={!connected || isSyncing || request?.status === "SYNCED"} onClick={simulateFailure}>SIMULATE NETWORK FAILURE</Button>
                  <Button icon={Radio} disabled={connected || Boolean(request) || isSyncing} onClick={createOfflineSos}>CREATE OFFLINE SOS</Button>
                  <Button variant="primary" icon={Wifi} disabled={connected || isSyncing} onClick={restoreNetwork}>RESTORE NETWORK</Button>
                </div>
              </Card>

              <Card className="offline-mode__queue">
                <div className="offline-mode__card-heading"><SectionHeader eyebrow="LOCAL REQUEST BUFFER" title="OFFLINE QUEUE" /><StatusBadge tone={request?.status === "SYNCED" ? "success" : request ? "warning" : "neutral"}>{request ? `${request.status}` : "EMPTY"}</StatusBadge></div>
                {request ? (
                  <article className="offline-mode__request">
                    <div className="offline-mode__request-heading"><div><strong>#{request.id} — SOS</strong><span>Flash Flood · Sector 05</span></div><StatusBadge tone={request.status === "SYNCED" ? "success" : request.status === "SYNCING" ? "info" : "warning"} dot>{request.status}</StatusBadge></div>
                    <div className="offline-mode__request-meta"><span>PEOPLE <strong>3</strong></span><span>PRIORITY <strong>PENDING TRIAGE</strong></span>{request.reportedAt && <span><Clock3 size={12} /> {request.reportedAt}</span>}</div>
                    <div className="offline-mode__request-sync">{request.status === "QUEUED OFFLINE" ? "WAITING FOR SYNC" : request.status === "SYNCING" ? "SYNCING OFFLINE DATA..." : "OFFLINE SOS SYNCHRONIZED"}</div>
                  </article>
                ) : <div className="offline-mode__empty"><Radio size={16} /><span>No emergency requests are waiting in the local demo queue.</span></div>}
                {syncedIncidentExists && <div className="offline-mode__central-note"><Check size={13} /> #1044 appears in the shared operations incident list.</div>}
              </Card>
            </section>

            <Card className="offline-mode__sync-flow">
              <div className="offline-mode__card-heading"><SectionHeader eyebrow="SIMULATED DATA HANDOFF" title="Synchronization status" /><StatusBadge tone="info">LOCAL DEMO</StatusBadge></div>
              <ol className="offline-mode__steps" aria-label="Offline synchronization sequence">
                {SYNC_STEPS.map((step, index) => {
                  const completed = index < stepIndex || phase === "synced";
                  const active = index === stepIndex && phase !== "synced";
                  return <li key={step} className={completed ? "is-complete" : active ? "is-active" : ""}><span className="offline-mode__step-mark">{completed ? <Check size={13} /> : index + 1}</span><strong>{step}</strong></li>;
                })}
              </ol>
              <p className="offline-mode__flow-note">{phase === "synced" ? "SYNC COMPLETE · Request #1044 was added to the shared local operations state." : phase === "syncing" ? "NETWORK RESTORED · SYNCING OFFLINE DATA..." : phase === "offline" ? "OFFLINE QUEUE · Requests remain local until the simulated network is restored." : "CONNECTED · No request is waiting for synchronization."}</p>
            </Card>

            <footer className="page-footer offline-mode__footer"><div><ShieldCheck size={14} /><span>RAKSHA</span><i /><span>OFFLINE RESILIENCE</span></div><span>LOCAL SIMULATION ONLY <b>·</b> NO LIVE EMERGENCY SERVICE</span></footer>
          </div>
        </div>
      </main>
    </div>
  );
}
