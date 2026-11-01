import { describe, expect, it } from "vitest";
import type { Incident } from "@/types/disaster";
import { triageIncident } from "./engine";

const primaryDemo: Incident = {
  id: "1043",
  type: "Flash Flood",
  location: "Sector 04",
  peopleAffected: 4,
  vulnerablePeople: 1,
  vulnerablePerson: "Elderly Person",
  severity: "Pending triage",
  priority: "Pending",
  status: "SOS received",
  reportedAt: "Just now",
  message: "Water has entered our house. Four people are trapped inside. My grandmother is with us and cannot walk.",
  source: "Citizen SOS",
  coordinates: { x: 59, y: 41 },
  timeline: [],
};

describe("triageIncident", () => {
  it("assigns the specified Critical/P0 response to the complete #1043 demo", () => {
    const assessment = triageIncident(primaryDemo);
    expect(assessment).toMatchObject({
      outcome: "complete",
      severity: "Critical",
      priority: "P0",
      confidence: 94,
      recommendedAction: "Immediate Rescue",
      medicalSupport: "Recommended",
      explanation: "Critical priority assigned because the report indicates active flooding, multiple people trapped, and an elderly person requiring assistance.",
    });
  });

  it("requires manual review and assigns no severity or priority when key information is missing", () => {
    const assessment = triageIncident({ ...primaryDemo, message: "" });
    expect(assessment.outcome).toBe("manual-review");
    expect(assessment.missingInformation).toContain("A useful emergency description");
    expect(assessment.severity).toBeUndefined();
    expect(assessment.priority).toBeUndefined();
  });

  it("does not escalate a complete water-ingress report without the critical factors to P0", () => {
    const assessment = triageIncident({
      ...primaryDemo,
      id: "1041",
      type: "Water Ingress",
      location: "Sector 07",
      peopleAffected: 2,
      vulnerablePeople: 0,
      vulnerablePerson: "None",
      message: "Water is entering ground-floor rooms near the southern channel.",
    });
    expect(assessment.outcome).toBe("complete");
    expect(assessment.severity).toBe("High");
    expect(assessment.priority).toBe("P1");
    expect(assessment.priority).not.toBe("P0");
  });

  it("does not mutate the incident object", () => {
    const before = structuredClone(primaryDemo);
    triageIncident(primaryDemo);
    expect(primaryDemo).toEqual(before);
  });
});
