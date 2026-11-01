import { useState } from "react";
import { useLocation } from "wouter";
import {
  ArrowRight,
  AlertTriangle,
  Building2,
  CheckCircle2,
  CircleDot,
  Clock3,
  Droplets,
  HeartPulse,
  MapPin,
  PackageCheck,
  Route as RouteIcon,
  ShieldCheck,
  Truck,
  Utensils,
} from "lucide-react";
import { Button, Card, ProgressIndicator, SectionHeader, SeverityBadge, StatusBadge } from "@/components/system/ui";
import { useToast } from "@/components/system/feedback";
import type { Shelter } from "@/types/disaster";
import { useOperations } from "@/features/command-center/OperationsContext";
import { NavigationRail, TopBar } from "@/features/command-center/CommandCenter";
import { chooseRecommendedShelter, getShelterOccupancyBand, getShelterOccupancyPercent } from "./engine";

function bandTone(band: string): "success" | "warning" | "critical" {
  return band === "AVAILABLE" ? "success" : band === "LIMITED" ? "warning" : "critical";
}

function accessLabel(shelter: Shelter) {
  if (shelter.routeAccess === "Safe") return "LOW RISK";
  if (shelter.routeAccess === "Higher risk") return "HIGHER RISK";
  if (shelter.routeAccess === "High risk") return "HIGH RISK";
  return "NOT RATED";
}

function accessTone(shelter: Shelter): "success" | "warning" | "critical" | "neutral" {
  if (shelter.routeAccess === "Safe") return "success";
  if (shelter.routeAccess === "High risk") return "critical";
  if (shelter.routeAccess === "Higher risk") return "warning";
  return "neutral";
}

function operationalLabel(shelter: Shelter, band: string) {
  if (band === "NEAR CAPACITY") return band;
  if (shelter.status === "Open") return "AVAILABLE";
  return shelter.status.toUpperCase();
}

function ShelterCard({ shelter, recommended }: { shelter: Shelter; recommended: boolean }) {
  const occupancy = getShelterOccupancyPercent(shelter);
  const band = getShelterOccupancyBand(occupancy);
  const status = operationalLabel(shelter, band);
  const tone = bandTone(band);
  return (
    <article className={`shelters-resources__shelter-card ${recommended ? "is-recommended" : ""}`}>
      <div className="shelters-resources__shelter-head">
        <div className="shelters-resources__shelter-mark"><Building2 size={15} aria-hidden="true" /></div>
        <div className="shelters-resources__shelter-title"><strong>{shelter.name}</strong><span>{shelter.location}</span></div>
        {recommended && <StatusBadge tone="success" dot>RECOMMENDED</StatusBadge>}
      </div>
      <div className="shelters-resources__shelter-status"><StatusBadge tone={tone} dot>{status}</StatusBadge><StatusBadge tone={tone}>{band} CAPACITY BAND</StatusBadge></div>
      <ProgressIndicator value={occupancy} label="OCCUPANCY" tone={tone === "success" ? "green" : tone === "warning" ? "amber" : "red"} />
      <div className="shelters-resources__shelter-metrics">
        <div><span>ACCESS RISK</span><StatusBadge tone={accessTone(shelter)}>{accessLabel(shelter)}</StatusBadge></div>
        <div><span>FROM INCIDENT #1043</span><strong>{shelter.routeDistanceKm?.toFixed(1) ?? "—"} KM</strong></div>
      </div>
    </article>
  );
}

export default function SheltersResourcesPage() {
  const { state } = useOperations();
  const [, navigate] = useLocation();
  const showToast = useToast();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const incident = state.incidents.find((item) => item.id === "1043") ?? null;
  const routeReady = Boolean(
    incident?.routeAnalysisStatus === "Complete"
    && incident.recommendedRoute === "Road C"
    && incident.destinationShelter === "SHELTER 07"
    && incident.routeEta === 11
    && incident.routeRisk === "Low",
  );
  const shelters = ["shelter-01", "shelter-07", "shelter-12"]
    .map((id) => state.shelters.find((shelter) => shelter.id === id))
    .filter((shelter): shelter is Shelter => shelter !== undefined);
  const recommendedShelter = chooseRecommendedShelter(state.shelters, routeReady ? incident : null);
  const shelter07 = state.shelters.find((shelter) => shelter.id === "shelter-07") ?? null;
  const shelter07Occupancy = shelter07 ? getShelterOccupancyPercent(shelter07) : 0;
  const assignedTeam = incident?.rescueTeamId
    ? state.rescueTeams.find((team) => team.id === incident.rescueTeamId)
    : incident
      ? state.rescueTeams.find((team) => team.assignedIncidentId === incident.id)
      : null;
  const rescueTeam = assignedTeam ?? state.rescueTeams.find((team) => team.id === "team-bravo") ?? null;
  const reliefStock = state.resources.find((resource) => resource.category === "Relief" && resource.available > 0);
  const medicalStock = state.resources.find((resource) => resource.category === "Medical" && resource.available > 0);
  const reliefAvailable = Boolean(reliefStock);
  const medicalAvailable = Boolean(medicalStock);
  const emergencyCapacityAvailable = Boolean(shelter07 && shelter07.status !== "Full" && shelter07Occupancy < 100);
  const rainfall = state.riskZones.find((zone) => zone.id === "zone-04-east")?.rainfallMm ?? 0;

  const openIncidentFlow = () => navigate(incident ? "/safe-routing" : "/citizen-sos");
  const onNotifications = () => showToast({
    title: "Shelter status is simulated",
    detail: "Availability is derived from the local operations dataset; no live logistics connection is active.",
    tone: "info",
  });

  return (
    <div className="app-shell">
      <NavigationRail
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        onPlaceholder={(label) => showToast({ title: `${label} is planned for a later phase`, detail: "This demo view uses local simulated operations data.", tone: "info" })}
        rainfall={rainfall}
        systemStatus={state.systemStatus}
        activePage="shelters-resources"
        onNavigate={navigate}
      />
      <main className="app-main">
        <TopBar onMenu={() => setSidebarOpen(true)} systemStatus={state.systemStatus} onNotifications={onNotifications} pageContext="OPERATIONS / SHELTER NETWORK" pageTitle="SHELTERS & RESOURCES" />
        <div className="command-page">
          <div className="command-page__inner shelters-resources">
            <div className="page-heading shelters-resources__heading">
              <div><span className="page-kicker"><span className="page-kicker__line" /> EASTERN DISTRICT <i>/</i> SAFE CAPACITY</span><h2>SHELTERS & RESOURCES</h2><p>CAPACITY · ACCESS · EMERGENCY READINESS</p></div>
              <div className="page-heading__actions"><StatusBadge tone="info" dot>PHASE 6 · SIMULATION</StatusBadge><Button size="sm" icon={ArrowRight} onClick={openIncidentFlow}>{incident ? "VIEW #1043 ROUTE" : "OPEN CITIZEN SOS"}</Button></div>
            </div>

            <div className="shelters-resources__notice"><ShieldCheck size={15} aria-hidden="true" /><span><strong>LOCAL DEMO STATUS</strong> Resource availability and occupancy are simulated from the shared RAKSHA operations store. No live logistics or emergency-service connection is active.</span></div>

            <section className="shelters-resources__top-grid" aria-label="Incident destination and shelter recommendation">
              <Card className="shelters-resources__incident">
                <div className="shelters-resources__card-heading">
                  <SectionHeader eyebrow={incident ? "ACTIVE INCIDENT" : "SHARED INCIDENT HANDOFF"} title={incident ? `#${incident.id} · ${incident.type.toUpperCase()}` : "AWAITING INCIDENT #1043"} />
                  {incident ? <SeverityBadge severity={incident.severity} priority={incident.priority} /> : <StatusBadge tone="neutral">NOT REGISTERED</StatusBadge>}
                </div>
                {incident ? <>
                  <div className="shelters-resources__incident-location"><MapPin size={14} aria-hidden="true" /><strong>{incident.location.toUpperCase()}</strong><span>{incident.status === "Rescue dispatched" ? "RESCUE DISPATCHED" : incident.priority === "P0" ? "IMMEDIATE RESPONSE · P0" : incident.status.toUpperCase()}</span></div>
                  <div className="shelters-resources__route-box">
                    <div><span>SAFE DESTINATION</span><strong>{routeReady ? incident.destinationShelter : "SHELTER 07 · ROUTE PENDING"}</strong></div>
                    {routeReady ? <StatusBadge tone="success" dot>ROAD C · LOW RISK</StatusBadge> : <StatusBadge tone="warning">VERIFY ROUTE</StatusBadge>}
                  </div>
                  {routeReady && <div className="shelters-resources__route-metrics"><div><RouteIcon size={13} /><strong>6.2 KM</strong><span>ROAD C</span></div><div><Clock3 size={13} /><strong>11 MIN</strong><span>ROUTE ETA</span></div><div><CheckCircle2 size={13} /><strong>LOW</strong><span>FLOOD RISK</span></div></div>}
                  {incident.status === "Rescue dispatched" && rescueTeam && <div className="shelters-resources__dispatch"><Truck size={14} /><strong>{rescueTeam.name}</strong><StatusBadge tone="info" dot>EN ROUTE · ETA {incident.rescueEtaMinutes ?? rescueTeam.etaMinutes ?? "—"} MIN</StatusBadge></div>}
                  {!routeReady && <Button className="shelters-resources__action" size="sm" icon={ArrowRight} onClick={() => navigate("/safe-routing")}>OPEN SAFE ROUTING</Button>}
                </> : <div className="shelters-resources__waiting"><CircleDot size={17} /><span>Submit the fictional SOS and complete the existing triage and route flow to connect Shelter 07 to the shared Incident #1043.</span><Button size="sm" icon={ArrowRight} onClick={() => navigate("/citizen-sos")}>OPEN CITIZEN SOS</Button></div>}
              </Card>

              <Card className="shelters-resources__recommendation">
                <div className="shelters-resources__card-heading"><SectionHeader eyebrow="SAFETY-FIRST DESTINATION" title="Recommended shelter" /><StatusBadge tone="success" dot>RECOMMENDED</StatusBadge></div>
                {recommendedShelter ? <>
                  <div className="shelters-resources__recommendation-name"><span><Building2 size={17} /></span><div><strong>{recommendedShelter.name}</strong><small>{recommendedShelter.location}</small></div></div>
                  <div className="shelters-resources__recommendation-metrics"><div><strong>{getShelterOccupancyPercent(recommendedShelter)}%</strong><span>OCCUPIED</span></div><div><strong>{accessLabel(recommendedShelter)}</strong><span>ACCESS</span></div><div><strong>{recommendedShelter.routeDistanceKm?.toFixed(1) ?? "—"} KM</strong><span>DISTANCE</span></div></div>
                  <div className="shelters-resources__reason"><CheckCircle2 size={14} /><span>Shelter 07 is recommended because it has lower occupancy and the safest available route from Incident #1043.</span></div>
                </> : <div className="shelters-resources__waiting"><AlertTriangle size={17} /><span>No shelter records are available in the shared operations state.</span></div>}
              </Card>
            </section>

            <Card className="shelters-resources__overview">
              <div className="shelters-resources__card-heading"><SectionHeader eyebrow="CENTRALIZED DEMO SHELTERS" title="Shelter capacity & access" /><span className="shelters-resources__count">{shelters.length.toString().padStart(2, "0")} LOCATIONS</span></div>
              <div className="shelters-resources__shelter-grid">
                {shelters.map((shelter) => <ShelterCard key={shelter.id} shelter={shelter} recommended={shelter.id === recommendedShelter?.id} />)}
                {shelters.length === 0 && <div className="shelters-resources__empty">No shelter records are available in the shared operations state.</div>}
              </div>
              <p className="shelters-resources__rule-note">Occupancy bands: below 80% AVAILABLE · 80–90% LIMITED · above 90% NEAR CAPACITY. Shelter 01 remains OPEN while its 82% capacity band is LIMITED.</p>
            </Card>

            <section className="shelters-resources__bottom-grid" aria-label="Shelter 07 resources and emergency readiness">
              <Card className="shelters-resources__resource-card">
                <div className="shelters-resources__card-heading"><SectionHeader eyebrow="SHELTER 07 · LOCAL DEMO STOCK" title="Resource availability" /><StatusBadge tone="info">SIMULATED</StatusBadge></div>
                <div className="shelters-resources__resource-grid">
                  <ResourceStatus icon={Utensils} label="FOOD" available={reliefAvailable} detail={reliefStock ? `${reliefStock.available} ${reliefStock.unit} · district pool` : "No demo stock"} />
                  <ResourceStatus icon={Droplets} label="WATER" available={reliefAvailable} detail={reliefStock ? `${reliefStock.available} ${reliefStock.unit} · district pool` : "No demo stock"} />
                  <ResourceStatus icon={HeartPulse} label="MEDICAL SUPPORT" available={medicalAvailable} detail={medicalStock ? `${medicalStock.available} ${medicalStock.unit} · ${medicalStock.location}` : "No demo stock"} />
                  <ResourceStatus icon={PackageCheck} label="EMERGENCY CAPACITY" available={emergencyCapacityAvailable} detail={shelter07 ? `${100 - shelter07Occupancy}% capacity remaining` : "Shelter record unavailable"} />
                </div>
                <p className="shelters-resources__stock-note">District stock is shown as a local demo indicator; shelter-specific inventory allocation is not simulated.</p>
              </Card>

              <Card className="shelters-resources__operation-card">
                <div className="shelters-resources__card-heading"><SectionHeader eyebrow="OPERATION READINESS" title="Emergency resource summary" /><StatusBadge tone="neutral">DEMO OVERVIEW</StatusBadge></div>
                <div className="shelters-resources__operation-list">
                  <OperationStatus icon={Truck} label="RESCUE TEAMS" value={`${rescueTeam?.name ?? "TEAM BRAVO"} · ${(rescueTeam?.status ?? "Unavailable").toUpperCase()}`} tone={rescueTeam?.status === "En route" ? "info" : rescueTeam?.status === "Available" ? "success" : "warning"} />
                  <OperationStatus icon={HeartPulse} label="MEDICAL" value={medicalAvailable ? "AVAILABLE" : "REVIEW REQUIRED"} tone={medicalAvailable ? "success" : "warning"} />
                  <OperationStatus icon={Utensils} label="FOOD" value={reliefAvailable ? "AVAILABLE" : "REVIEW REQUIRED"} tone={reliefAvailable ? "success" : "warning"} />
                  <OperationStatus icon={Droplets} label="WATER" value={reliefAvailable ? "AVAILABLE" : "REVIEW REQUIRED"} tone={reliefAvailable ? "success" : "warning"} />
                  <OperationStatus icon={Building2} label="SHELTER CAPACITY" value={shelter07 ? `SHELTER 07 · ${shelter07Occupancy}% OCCUPIED` : "SHELTER RECORD UNAVAILABLE"} tone={emergencyCapacityAvailable ? "success" : "warning"} />
                </div>
              </Card>
            </section>

            <footer className="page-footer shelters-resources__footer"><div><ShieldCheck size={14} /><span>RAKSHA</span><i /><span>SHELTERS & RESOURCES</span></div><span>LOCAL DEMO INVENTORY <b>·</b> SAME INCIDENT #1043</span><span>NO LIVE LOGISTICS CONNECTED</span></footer>
          </div>
        </div>
      </main>
    </div>
  );
}

function ResourceStatus({ icon: Icon, label, available, detail }: { icon: typeof HeartPulse; label: string; available: boolean; detail: string }) {
  return <div className="shelters-resources__resource-item"><span className={`shelters-resources__resource-icon ${available ? "is-available" : "is-unavailable"}`}><Icon size={14} aria-hidden="true" /></span><div><strong>{label}</strong><span>{detail}</span></div><StatusBadge tone={available ? "success" : "warning"} dot>{available ? "AVAILABLE" : "UNAVAILABLE"}</StatusBadge></div>;
}

function OperationStatus({ icon: Icon, label, value, tone }: { icon: typeof Truck; label: string; value: string; tone: "success" | "warning" | "info" }) {
  return <div className="shelters-resources__operation-row"><span className={`shelters-resources__operation-icon is-${tone}`}><Icon size={14} aria-hidden="true" /></span><span>{label}</span><strong>{value}</strong></div>;
}
