import type { Incident, IncidentPriority, Severity } from "@/types/disaster";

export interface TriageAssessment {
  outcome: "complete" | "manual-review";
  severity?: Exclude<Severity, "Pending triage">;
  priority?: Exclude<IncidentPriority, "Pending">;
  confidence?: number;
  recommendedAction?: string;
  medicalSupport?: "Recommended" | "Not indicated";
  explanation: string;
  missingInformation: string[];
}

const PRIMARY_ASSESSMENT = "Critical priority assigned because the report indicates active flooding, multiple people trapped, and an elderly person requiring assistance.";

/**
 * A deliberately small, transparent rules engine for the prototype. It does not
 * call a model or mutate the supplied incident. Operational review remains
 * necessary before any real-world action.
 */
export function triageIncident(incident: Incident): TriageAssessment {
  const message = incident.message.trim();
  const incidentText = `${incident.type} ${message}`.toLowerCase();
  const missingInformation: string[] = [];

  if (!incident.type.trim()) missingInformation.push("Emergency type");
  if (!incident.location.trim()) missingInformation.push("Location");
  if (message.length < 12 || message.split(/\s+/).filter(Boolean).length < 3) missingInformation.push("A useful emergency description");
  if (!Number.isFinite(incident.peopleAffected) || incident.peopleAffected < 1) missingInformation.push("Number of people");

  if (missingInformation.length > 0) {
    return {
      outcome: "manual-review",
      explanation: "Insufficient information to assess this report automatically. Manual review is required; no severity or priority has been assigned.",
      missingInformation,
    };
  }

  const activeFlood = /\b(?:flash flood|flood(?:ing)?|water ingress|inundation|rising water|water has entered)\b/.test(incidentText);
  const peopleTrapped = /\b(?:trapped|stranded|cannot get out|can't get out|unable to leave)\b/.test(incidentText);
  const multiplePeople = incident.peopleAffected > 1;
  const vulnerableLabel = (incident.vulnerablePerson ?? "").toLowerCase();
  const assistanceRequired = incident.vulnerablePeople > 0
    || (vulnerableLabel.length > 0 && vulnerableLabel !== "none")
    || /\b(?:elderly|wheelchair|person with disability|pregnant person|requires assistance)\b/.test(incidentText);
  const inabilityToWalk = /\b(?:cannot|can't|unable to)\s+walk\b/.test(incidentText);
  const immediateDanger = peopleTrapped
    || inabilityToWalk
    || /\b(?:immediate danger|fast[- ]moving|rapidly rising|surrounded)\b/.test(incidentText);

  if (activeFlood && peopleTrapped && multiplePeople && assistanceRequired && inabilityToWalk && immediateDanger) {
    return {
      outcome: "complete",
      severity: "Critical",
      priority: "P0",
      confidence: 94,
      recommendedAction: "Immediate Rescue",
      medicalSupport: "Recommended",
      explanation: PRIMARY_ASSESSMENT,
      missingInformation: [],
    };
  }

  if (activeFlood && peopleTrapped && (multiplePeople || assistanceRequired)) {
    return {
      outcome: "complete",
      severity: "High",
      priority: "P1",
      confidence: 84,
      recommendedAction: "Prioritize operator review",
      medicalSupport: assistanceRequired ? "Recommended" : "Not indicated",
      explanation: "High-priority review recommended because the report describes people at risk during flooding.",
      missingInformation: [],
    };
  }

  if (activeFlood && (multiplePeople || assistanceRequired)) {
    return {
      outcome: "complete",
      severity: "High",
      priority: "P1",
      confidence: 80,
      recommendedAction: "Verify exposure and safe access",
      medicalSupport: assistanceRequired ? "Recommended" : "Not indicated",
      explanation: "Operator review is recommended because multiple people or a person requiring assistance may be affected by flooding.",
      missingInformation: [],
    };
  }

  if (peopleTrapped || immediateDanger || assistanceRequired) {
    return {
      outcome: "complete",
      severity: "Moderate",
      priority: "P2",
      confidence: 72,
      recommendedAction: "Review reported conditions",
      medicalSupport: assistanceRequired ? "Recommended" : "Not indicated",
      explanation: "The report includes a safety concern that should be reviewed by an operator.",
      missingInformation: [],
    };
  }

  return {
    outcome: "complete",
    severity: "Medium",
    priority: "P2",
    confidence: 68,
    recommendedAction: "Verify reported conditions",
    medicalSupport: "Not indicated",
    explanation: "The report contains enough information for an initial review; an operator should verify conditions.",
    missingInformation: [],
  };
}
