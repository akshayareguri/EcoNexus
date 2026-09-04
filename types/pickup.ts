export type WasteActionDecision = "REUSE" | "RECYCLE" | "SAFE_DISPOSAL";
export type DestinationType = "NONE" | "RECYCLER" | "MUNICIPALITY";

export type PickupStatus = 
  | "PENDING"
  | "ACCEPTED"
  | "EN_ROUTE"
  | "COLLECTED"
  | "COMPLETED";

export interface WastePickupRequest {
  pickupRequestId: string;
  wasteItem: string;
  wasteCategory: string;
  recommendedAction: WasteActionDecision;
  destinationType: DestinationType;
  destinationId: string;
  destinationName: string;
  citizenName: string;
  location: string;
  image: string;
  status: PickupStatus;
  createdAt: string;
  pointsEarned: number;
  pointsAwarded?: boolean;
}

export interface RecyclerOption {
  id: string;
  name: string;
  acceptedMaterials: string[];
  contact: string;
  rating: number;
}
