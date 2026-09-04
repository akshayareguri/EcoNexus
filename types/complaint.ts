export type ComplaintPriority = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";

export type ComplaintStatus = 
  | "Reported"
  | "AI Triaged"
  | "Assigned"
  | "En Route"
  | "Collected/Resolved";

export interface WasteComplaint {
  id: string;
  photo: string;
  location: string;
  ward: string;
  detectedIssue: string;
  severityScore: number;
  priority: ComplaintPriority;
  status: ComplaintStatus;
  submittedAt: string;
  assignedCrew: string;
  pointsEarned: number;
  pointsAwarded?: boolean;
}
