import type { Incident, RescueTeam } from "@/types/disaster";

export interface RescueRecommendation {
  team: RescueTeam;
  reason: string;
}

function displayTeamName(name: string) {
  return name.toLowerCase().replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function recommendRescueTeam(teams: RescueTeam[], incident: Incident | null): RescueRecommendation | null {
  if (!incident) return null;

  const eligibleTeams = teams.filter((team) =>
    team.status === "Available"
    && (team.capacity ?? 0) >= incident.peopleAffected,
  );
  if (eligibleTeams.length === 0) return null;

  const needsMedicalSupport = incident.vulnerablePeople > 0;
  const rankedTeams = [...eligibleTeams].sort((left, right) => {
    const leftMedical = needsMedicalSupport && left.medicalSupport ? 1 : 0;
    const rightMedical = needsMedicalSupport && right.medicalSupport ? 1 : 0;
    if (leftMedical !== rightMedical) return rightMedical - leftMedical;
    const etaDifference = (left.etaMinutes ?? Number.MAX_SAFE_INTEGER) - (right.etaMinutes ?? Number.MAX_SAFE_INTEGER);
    if (etaDifference !== 0) return etaDifference;
    return (left.distanceKm ?? Number.MAX_SAFE_INTEGER) - (right.distanceKm ?? Number.MAX_SAFE_INTEGER);
  });

  const team = rankedTeams[0];
  const reason = team.medicalSupport
    ? `${displayTeamName(team.name)} is the closest available team with sufficient capacity and medical support for the incident.`
    : `${displayTeamName(team.name)} is the closest available team with sufficient capacity; no medical-capable team is available.`;

  return { team, reason };
}
