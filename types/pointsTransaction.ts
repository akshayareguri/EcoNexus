export type EcoPointsActionType = 
  | "REUSE" 
  | "RECYCLING" 
  | "SAFE_DISPOSAL" 
  | "EXCHANGE_HANDOVER" 
  | "WASTE_REPORT"
  | "REDEEM"
  | string;

export interface PointsTransaction {
  id?: string;
  userId: string;
  type: EcoPointsActionType;
  points: number;
  description: string;
  referenceId: string;
  createdAt: string;
}
