export type WasteActionType = "recycle" | "safe_disposal";

export interface WasteRequest {
  id?: string;
  requestId?: string;
  userId: string;
  userName: string;
  action: WasteActionType;
  itemName: string;
  category: string;
  location: string;
  status: "pending" | "PENDING" | string;
  image?: string;
  imageUrl?: string;
  createdAt: string;
  updatedAt: string;
}
