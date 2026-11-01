import { useEffect, useRef, useState, type FormEvent } from "react";
import { useLocation } from "wouter";
import {
  AlertTriangle,
  Check,
  CheckCircle2,
  ClipboardCheck,
  CloudRain,
  LoaderCircle,
  MapPin,
  Mic,
  Navigation,
  Phone,
  ShieldCheck,
  UserRound,
  Users,
  Camera,
  ArrowLeft,
  LifeBuoy,
} from "lucide-react";
import { Dialog, useToast } from "@/components/system/feedback";
import { Button, Card, StatusBadge } from "@/components/system/ui";
import { useOperations } from "@/features/command-center/OperationsContext";
import { NavigationRail, TopBar } from "@/features/command-center/CommandCenter";
import type { Incident } from "@/types/disaster";

type SOSFormValues = {
  name: string;
  phone: string;
  location: string;
  emergencyType: string;
  people: string;
  vulnerablePerson: string;
  message: string;
};
type RequiredField = "name" | "phone" | "location" | "emergencyType" | "people" | "message";
type FormErrors = Partial<Record<RequiredField, string>>;

const EMPTY_FORM: SOSFormValues = {
  name: "",
  phone: "",
  location: "Sector 04",
  emergencyType: "",
  people: "1",
  vulnerablePerson: "None",
  message: "",
};
const SECTORS = ["Sector 01", "Sector 02", "Sector 03", "Sector 04", "Sector 05", "Sector 07", "Sector 09"];
const EMERGENCY_TYPES = ["Flash Flood", "Water Ingress", "Building Damage", "Medical Emergency", "Fire", "Road Accident", "Stranded Citizen", "Other"];
const VULNERABLE_TYPES = ["None", "Child", "Elderly Person", "Person with Disability", "Pregnant Person", "Multiple Vulnerable People"];
const PROCESSING_STEPS = ["RECEIVING SOS", "VERIFYING LOCATION", "REGISTERING INCIDENT", "SOS RECEIVED"];
const NOOP = () => undefined;
const wait = (milliseconds: number) => new Promise<void>((resolve) => window.setTimeout(resolve, milliseconds));
const MARKER_OFFSETS = [{ x: -9, y: -5 }, { x: 10, y: -7 }, { x: -7, y: 8 }, { x: 10, y: 8 }, { x: 0, y: -11 }];

function uniqueIncidentCoordinates(base: { x: number; y: number }, existingInSector: number) {
  const offset = MARKER_OFFSETS[Math.max(0, existingInSector - 1) % MARKER_OFFSETS.length];
  return {
    x: Math.max(5, Math.min(95, base.x + offset.x)),
    y: Math.max(7, Math.min(93, base.y + offset.y)),
  };
}

function FieldError({ id, children }: { id: string; children?: string }) {
  return children ? <span className="sos-field__error" id={id} role="alert">{children}</span> : null;
}

function requiredLabel(label: string) {
  return <>{label}<span className="sos-required" aria-hidden="true"> *</span></>;
}

function vulnerableCount(value: string, people: number) {
  if (value === "None") return 0;
  if (value === "Multiple Vulnerable People") return Math.min(2, people);
  return 1;
}

export default function CitizenSOSPage() {
  const { state, createIncident } = useOperations();
  const showToast = useToast();
  const [, setLocation] = useLocation();
  const [form, setForm] = useState<SOSFormValues>(EMPTY_FORM);
  const [errors, setErrors] = useState<FormErrors>({});
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [locationVerified, setLocationVerified] = useState(false);
  const [locating, setLocating] = useState(false);
  const [photoAttached, setPhotoAttached] = useState(false);
  const [voiceReady, setVoiceReady] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStep, setProcessingStep] = useState(0);
  const [successIncidentId, setSuccessIncidentId] = useState<string | null>(null);
  const submittingRef = useRef(false);
  const locationTimer = useRef<number | null>(null);

  const primaryZone = state.riskZones.find((zone) => zone.id === "zone-04-east");
  const successIncident = successIncidentId ? state.incidents.find((incident) => incident.id === successIncidentId) : null;
  const isSuccess = Boolean(successIncidentId && successIncident);

  useEffect(() => () => {
    if (locationTimer.current !== null) window.clearTimeout(locationTimer.current);
  }, []);

  const changeField = (field: keyof SOSFormValues, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
    if (field === "location") setLocationVerified(false);
  };

  const loadDemo = () => {
    setForm({
      name: "Rahul Kumar",
      phone: "+91 90000 00000",
      location: "Sector 04",
      emergencyType: "Flash Flood",
      people: "4",
      vulnerablePerson: "Elderly Person",
      message: "Water has entered our house. Four people are trapped inside. My grandmother is with us and cannot walk.",
    });
    setErrors({});
    setLocationVerified(false);
    setPhotoAttached(false);
    setVoiceReady(false);
    showToast({ title: "Demo emergency loaded", detail: "Fictional scenario only · no request has been sent.", tone: "info" });
  };

  const simulateLocation = () => {
    if (locationTimer.current !== null) window.clearTimeout(locationTimer.current);
    setLocating(true);
    setLocationVerified(false);
    locationTimer.current = window.setTimeout(() => {
      setForm((current) => ({ ...current, location: "Sector 04" }));
      setErrors((current) => ({ ...current, location: undefined }));
      setLocating(false);
      setLocationVerified(true);
      locationTimer.current = null;
    }, 650);
  };

  const validate = () => {
    const nextErrors: FormErrors = {};
    if (!form.name.trim()) nextErrors.name = "Enter your full name.";
    if (!form.phone.trim()) nextErrors.phone = "Enter a phone number.";
    if (!form.location.trim()) nextErrors.location = "Choose a location.";
    if (!form.emergencyType) nextErrors.emergencyType = "Select an emergency type.";
    if (!/^\d+$/.test(form.people) || Number(form.people) < 1 || Number(form.people) > 99) nextErrors.people = "Enter a whole number from 1 to 99.";
    if (!form.message.trim()) nextErrors.message = "Describe the emergency so the operations center can register it.";
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) {
      const firstInvalid = (["name", "phone", "location", "emergencyType", "people", "message"] as RequiredField[])
        .find((field) => nextErrors[field]);
      if (firstInvalid) window.setTimeout(() => document.getElementById(`sos-${firstInvalid}`)?.focus(), 0);
      return false;
    }
    return true;
  };

  const submitSOS = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (submittingRef.current || !validate()) return;
    submittingRef.current = true;
    setIsProcessing(true);
    setProcessingStep(0);

    try {
      for (let step = 1; step <= PROCESSING_STEPS.length; step += 1) {
        setProcessingStep(step);
        await wait(step === PROCESSING_STEPS.length ? 460 : 350);
      }

      const peopleAffected = Number(form.people);
      const selectedZone = state.riskZones.find((zone) => zone.sector.toLowerCase() === form.location.trim().toLowerCase());
      const existingInSector = state.incidents.filter((item) => item.location.toLowerCase() === form.location.trim().toLowerCase()).length;
      const baseCoordinates = selectedZone?.coordinates ?? primaryZone?.coordinates ?? { x: 59, y: 41 };
      const createdAt = new Date().toISOString();
      const receivedTime = new Date(createdAt).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit", second: "2-digit" });
      const incident: Omit<Incident, "id"> = {
        type: form.emergencyType,
        location: form.location.trim(),
        peopleAffected,
        vulnerablePeople: vulnerableCount(form.vulnerablePerson, peopleAffected),
        vulnerablePerson: form.vulnerablePerson,
        severity: "Pending triage",
        priority: "Pending",
        status: "SOS received",
        reportedAt: "Just now",
        createdAt,
        message: form.message.trim(),
        source: "Citizen SOS",
        coordinates: uniqueIncidentCoordinates(baseCoordinates, existingInSector),
        timeline: [{ time: receivedTime, title: "SOS RECEIVED", detail: "Citizen-submitted simulation · no dispatch is connected.", tone: "blue" }],
      };
      const createdIncident = createIncident(incident);
      setSuccessIncidentId(createdIncident.id);
      setIsProcessing(false);
      setProcessingStep(0);
      showToast({
        title: "NEW SOS RECEIVED",
        detail: `Incident #${createdIncident.id}\n${createdIncident.location}\n${createdIncident.peopleAffected} people\nSOS has been registered.`,
        tone: "success",
      });
    } catch {
      setIsProcessing(false);
      setProcessingStep(0);
      showToast({ title: "SOS could not be registered", detail: "No incident was created. Please review the form and try again.", tone: "warning" });
    } finally {
      submittingRef.current = false;
    }
  };

  const startAnother = () => {
    setForm(EMPTY_FORM);
    setErrors({});
    setLocationVerified(false);
    setPhotoAttached(false);
    setVoiceReady(false);
    setSuccessIncidentId(null);
  };

  const onPlaceholder = (label: string) => showToast({ title: `${label} is planned for a later phase`, detail: "Only Citizen SOS and the Phase 1 Command Center are active in this prototype.", tone: "info" });
  const navigate = (path: string) => {
    setLocation(path);
    setSidebarOpen(false);
  };

  return (
    <div className="app-shell">
      <NavigationRail
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        onPlaceholder={onPlaceholder}
        rainfall={primaryZone?.rainfallMm ?? 0}
        systemStatus={state.systemStatus}
        activePage="citizen-sos"
        onNavigate={navigate}
      />
      <main className="app-main">
        <TopBar
          onMenu={() => setSidebarOpen(true)}
          systemStatus={state.systemStatus}
          pageContext="OPERATIONS / CITIZEN RESPONSE"
          pageTitle="CITIZEN SOS"
          onNotifications={() => showToast({ title: "System operational", detail: `Network ${state.systemStatus.network.toLowerCase()} · data sync ${state.systemStatus.dataSync.toLowerCase()}.`, tone: "info" })}
        />
        <div className="command-page">
          <div className="command-page__inner citizen-sos-page">
            <div className="page-heading citizen-sos-heading">
              <div>
                <span className="page-kicker"><span className="page-kicker__line" /> RAKSHA RESPONSE <i>/</i> CITIZEN REPORT</span>
                <h2>CITIZEN SOS</h2>
                <p>REPORT AN EMERGENCY</p>
                <span className="citizen-sos-heading__support">Send your location and emergency information to the RAKSHA emergency operations center.</span>
              </div>
              <div className="page-heading__actions"><StatusBadge tone="warning" dot>SIMULATION · NO DISPATCH</StatusBadge></div>
            </div>

            <div className="sos-simulation-banner" role="note">
              <ShieldCheck size={17} aria-hidden="true" />
              <span><strong>PROTOTYPE ONLY</strong> This simulated interface does not contact emergency services or dispatch a rescue team. Do not enter real personal information.</span>
            </div>

            {isSuccess && successIncident ? (
              <section className="sos-success panel" aria-labelledby="sos-success-title">
                <div className="sos-success__mark"><Check size={27} aria-hidden="true" /></div>
                <span className="section-eyebrow">RAKSHA OPERATIONS CENTER · REQUEST REGISTERED</span>
                <h3 id="sos-success-title">SOS RECEIVED</h3>
                <p>Your emergency request has been received by the RAKSHA operations center.</p>
                <div className="sos-success__status"><StatusBadge tone="info" dot>SOS RECEIVED</StatusBadge><span>Simulated registration only · no team has been dispatched.</span></div>
                <dl className="sos-success__facts">
                  <div><dt>INCIDENT ID</dt><dd>#{successIncident.id}</dd></div>
                  <div><dt>STATUS</dt><dd>{successIncident.status.toUpperCase()}</dd></div>
                  <div><dt>LOCATION</dt><dd>{successIncident.location}</dd></div>
                  <div><dt>PEOPLE</dt><dd>{successIncident.peopleAffected}</dd></div>
                </dl>
                <div className="sos-success__receipt"><ClipboardCheck size={17} aria-hidden="true" /><span><strong>REQUEST REGISTERED</strong><small>Incident #{successIncident.id} is now visible in the simulated Command Center.</small></span></div>
                <div className="sos-success__actions">
                  <Button variant="secondary" icon={ArrowLeft} onClick={() => navigate("/")}>BACK TO COMMAND CENTER</Button>
                  <Button variant="primary" icon={LifeBuoy} onClick={startAnother}>SUBMIT ANOTHER SOS</Button>
                </div>
              </section>
            ) : (
              <div className="citizen-sos-grid">
                <Card className="sos-form-card">
                  <div className="sos-form-card__header">
                    <div><span className="section-eyebrow">EMERGENCY REPORT</span><h3>Tell us what happened</h3><p>Required fields are marked with <b>*</b>.</p></div>
                    <Button variant="secondary" size="sm" icon={ClipboardCheck} onClick={loadDemo}>LOAD DEMO EMERGENCY</Button>
                  </div>
                  <form className="sos-form" noValidate onSubmit={submitSOS}>
                    <div className="sos-form__row">
                      <div className="sos-field">
                        <label htmlFor="sos-name">{requiredLabel("FULL NAME")}</label>
                        <div className={`sos-control ${errors.name ? "sos-control--error" : ""}`}><UserRound size={15} aria-hidden="true" /><input id="sos-name" name="name" type="text" autoComplete="name" value={form.name} onChange={(event) => changeField("name", event.target.value)} placeholder="Name of the person reporting" required aria-invalid={Boolean(errors.name)} aria-describedby={errors.name ? "sos-name-error" : undefined} /></div>
                        <FieldError id="sos-name-error">{errors.name}</FieldError>
                      </div>
                      <div className="sos-field">
                        <label htmlFor="sos-phone">{requiredLabel("PHONE NUMBER")}</label>
                        <div className={`sos-control ${errors.phone ? "sos-control--error" : ""}`}><Phone size={15} aria-hidden="true" /><input id="sos-phone" name="phone" type="tel" autoComplete="tel" value={form.phone} onChange={(event) => changeField("phone", event.target.value)} placeholder="Phone number" required aria-invalid={Boolean(errors.phone)} aria-describedby={errors.phone ? "sos-phone-error" : "sos-phone-demo-note"} /></div>
                        <FieldError id="sos-phone-error">{errors.phone}</FieldError>
                        {!errors.phone && <small className="sos-field__hint" id="sos-phone-demo-note">Prototype only · contact details are not stored or sent.</small>}
                      </div>
                    </div>

                    <div className="sos-form__row">
                      <div className="sos-field">
                        <label htmlFor="sos-location">{requiredLabel("LOCATION")}</label>
                        <div className={`sos-control ${errors.location ? "sos-control--error" : ""}`}><MapPin size={15} aria-hidden="true" /><select id="sos-location" name="location" value={form.location} onChange={(event) => changeField("location", event.target.value)} required aria-invalid={Boolean(errors.location)} aria-describedby={errors.location ? "sos-location-error" : "sos-location-status"}>
                          <option value="">Choose a sector</option>{SECTORS.map((sector) => <option key={sector} value={sector}>{sector}</option>)}
                        </select></div>
                        <FieldError id="sos-location-error">{errors.location}</FieldError>
                        <div className="sos-location-footer"><span id="sos-location-status" className={locationVerified ? "sos-location-state sos-location-state--verified" : "sos-location-state"}>{locationVerified ? <><CheckCircle2 size={12} /> LOCATION VERIFIED · SIMULATED</> : "LOCATION / SECTOR 04 · DEMO AREA"}</span>
                          <button type="button" className="sos-location-action" onClick={simulateLocation} disabled={locating}><Navigation size={12} />{locating ? "LOCATING…" : "USE MY LOCATION"}</button>
                        </div>
                      </div>
                      <div className="sos-field">
                        <label htmlFor="sos-type">{requiredLabel("EMERGENCY TYPE")}</label>
                        <div className={`sos-control ${errors.emergencyType ? "sos-control--error" : ""}`}><AlertTriangle size={15} aria-hidden="true" /><select id="sos-type" name="emergencyType" value={form.emergencyType} onChange={(event) => changeField("emergencyType", event.target.value)} required aria-invalid={Boolean(errors.emergencyType)} aria-describedby={errors.emergencyType ? "sos-type-error" : undefined}>
                          <option value="">Select emergency type</option>{EMERGENCY_TYPES.map((type) => <option key={type} value={type}>{type}</option>)}
                        </select></div>
                        <FieldError id="sos-type-error">{errors.emergencyType}</FieldError>
                      </div>
                    </div>

                    <div className="sos-form__row">
                      <div className="sos-field">
                        <label htmlFor="sos-people">{requiredLabel("NUMBER OF PEOPLE")}</label>
                        <div className={`sos-control ${errors.people ? "sos-control--error" : ""}`}><Users size={15} aria-hidden="true" /><input id="sos-people" name="people" type="number" min="1" max="99" step="1" inputMode="numeric" value={form.people} onChange={(event) => changeField("people", event.target.value)} required aria-invalid={Boolean(errors.people)} aria-describedby={errors.people ? "sos-people-error" : undefined} /></div>
                        <FieldError id="sos-people-error">{errors.people}</FieldError>
                      </div>
                      <div className="sos-field">
                        <label htmlFor="sos-vulnerable">VULNERABLE PERSON</label>
                        <div className="sos-control"><Users size={15} aria-hidden="true" /><select id="sos-vulnerable" name="vulnerablePerson" value={form.vulnerablePerson} onChange={(event) => changeField("vulnerablePerson", event.target.value)}>{VULNERABLE_TYPES.map((type) => <option key={type} value={type}>{type}</option>)}</select></div>
                        <small className="sos-field__hint">Let the response center know if anyone may need extra assistance.</small>
                      </div>
                    </div>

                    <div className="sos-field sos-field--message">
                      <label htmlFor="sos-message">{requiredLabel("EMERGENCY MESSAGE")}</label>
                      <textarea id="sos-message" name="message" rows={4} maxLength={700} value={form.message} onChange={(event) => changeField("message", event.target.value)} placeholder="Describe the emergency, immediate dangers, and what help is needed…" required aria-invalid={Boolean(errors.message)} aria-describedby={errors.message ? "sos-message-error" : "sos-message-hint"} />
                      <div className="sos-message__meta"><FieldError id="sos-message-error">{errors.message}</FieldError>{!errors.message && <small id="sos-message-hint">Share key details; do not include sensitive information in this simulation.</small>}<span>{form.message.length}/700</span></div>
                    </div>

                    <div className="sos-attachments" aria-label="Optional simulated attachments">
                      <div className="sos-attachments__heading"><span className="section-eyebrow">OPTIONAL SUPPORTING DETAILS</span><small>Prototype-only controls</small></div>
                      <div className="sos-attachments__grid">
                        <button type="button" className={`sos-attachment ${photoAttached ? "sos-attachment--ready" : ""}`} aria-pressed={photoAttached} onClick={() => setPhotoAttached((value) => !value)}>
                          <span className="sos-attachment__icon">{photoAttached ? <Check size={15} /> : <Camera size={15} />}</span><span><strong>{photoAttached ? "PHOTO ATTACHED · DEMO" : "UPLOAD PHOTO"}</strong><small>{photoAttached ? "Simulated only · no image stored." : "Optional · image upload is not connected."}</small></span>
                        </button>
                        <button type="button" className={`sos-attachment ${voiceReady ? "sos-attachment--ready" : ""}`} aria-pressed={voiceReady} onClick={() => setVoiceReady((value) => !value)}>
                          <span className="sos-attachment__icon">{voiceReady ? <Check size={15} /> : <Mic size={15} />}</span><span><strong>{voiceReady ? "VOICE MESSAGE READY · DEMO" : "RECORD VOICE MESSAGE"}</strong><small>{voiceReady ? "No audio recorded or uploaded." : "Optional · voice capture is not connected."}</small>
                        </span>
                        </button>
                      </div>
                    </div>

                    <div className="sos-form__footer">
                      <span><ShieldCheck size={14} /> Simulated registration · no real dispatch is contacted.</span>
                      <Button type="submit" variant="primary" icon={LifeBuoy} disabled={isProcessing}>SEND SOS</Button>
                    </div>
                  </form>
                </Card>

                <aside className="sos-guidance" aria-label="SOS reporting guidance">
                  <Card className="sos-demo-card">
                    <div className="sos-demo-card__top"><span className="sos-demo-card__icon"><CloudRain size={16} /></span><StatusBadge tone="warning" dot>DEMO REGION</StatusBadge></div>
                    <span className="section-eyebrow">CURRENT SCENARIO</span>
                    <h3>Monsoon response area</h3>
                    <p>Sector 04 is the sample location used in this prototype. Location verification is simulated and does not request GPS permissions.</p>
                    <div className="sos-demo-card__location"><MapPin size={14} /><span>SECTOR 04 <small>EASTERN DISTRICT · SIMULATED</small></span></div>
                  </Card>
                  <Card className="sos-how-card">
                    <span className="section-eyebrow">WHAT HAPPENS NEXT</span>
                    <h3>Report registration</h3>
                    <ol className="sos-guidance-steps">
                      {PROCESSING_STEPS.map((step, index) => <li key={step}><span className="sos-guidance-steps__number">0{index + 1}</span><span><strong>{step}</strong><small>{index === 0 ? "Your report is received in this demo." : index === 1 ? "The selected sample sector is confirmed locally." : index === 2 ? "A simulated incident ID is generated." : "The Command Center demo is updated."}</small></span></li>)}
                    </ol>
                  </Card>
                  <div className="sos-safety-note"><AlertTriangle size={15} /><span><strong>Not a real emergency channel.</strong> This prototype cannot contact emergency services, verify your identity, or send responders.</span></div>
                </aside>
              </div>
            )}

            <footer className="page-footer citizen-sos-footer"><div><ShieldCheck size={14} /><span>RAKSHA</span><i /><span>CITIZEN SOS</span></div><span>SIMULATED LOCAL STATE <b>·</b> NO PERSONAL DATA TRANSMITTED</span><span>REPORTING FLOW · PHASE 2</span></footer>
          </div>
        </div>
      </main>

      {isProcessing && <Dialog title="Registering your SOS" eyebrow="SIMULATED RESPONSE FLOW" onClose={NOOP} dismissible={false}>
        <p className="sos-processing__intro">Please wait while the demo records your report. No AI triage or dispatch is taking place.</p>
        <ol className="sos-processing-steps" aria-live="polite" aria-label="SOS registration progress">
          {PROCESSING_STEPS.map((step, index) => {
            const number = index + 1;
            const complete = number < processingStep;
            const active = number === processingStep;
            return <li key={step} className={`${complete ? "is-complete" : ""} ${active ? "is-active" : ""}`}>
              <span className="sos-processing-steps__icon">{complete ? <Check size={14} /> : active && number < PROCESSING_STEPS.length ? <LoaderCircle size={14} className="sos-spin" /> : number === PROCESSING_STEPS.length && active ? <CheckCircle2 size={14} /> : <span>{String(number).padStart(2, "0")}</span>}</span>
              <span className="sos-processing-steps__label">{step}</span>
              <span className="sos-processing-steps__state">{complete ? "DONE" : active ? "IN PROGRESS" : "WAITING"}</span>
            </li>;
          })}
        </ol>
        <div className="sos-processing__foot"><span className="system-dot" /> LOCAL SIMULATION · NO EXTERNAL SERVICES</div>
      </Dialog>}
    </div>
  );
}
