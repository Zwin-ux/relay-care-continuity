export const INCIDENT_TYPES = [
  "vulnerable_person_support",
  "shelter_supply",
  "infrastructure_hazard",
  "information_coordination",
  "volunteer_task"
] as const;

export const INCIDENT_STATES = [
  "RAW_SIGNAL",
  "PARSED_INCIDENT",
  "NEEDS_VERIFICATION",
  "ACTION_READY",
  "DISPATCHED",
  "FOLLOW_UP_REQUIRED",
  "RESOLVED",
  "REJECTED",
  "MERGED",
  "ESCALATED"
] as const;
