export type WasteReportPriority = "critical" | "high" | "medium" | "low" | "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";

export interface WasteReport {
  id?: string;
  reportId?: string;
  reporterId: string;
  reporterName: string;
  issueType: string;
  description: string;
  location: string;
  latitude: number | null;
  longitude: number | null;
  imageUrl?: string | null;
  priority: WasteReportPriority;
  status: "reported" | "Reported" | string;
  createdAt: string;
  updatedAt: string;
}
