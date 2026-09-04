export type ExchangeRequestStatus = "pending" | "accepted" | "rejected" | "PENDING" | "ACCEPTED" | "REJECTED" | "COMPLETED" | string;

export interface ExchangeListing {
  id: string;
  ownerId?: string;
  ownerName?: string;
  itemName?: string;
  title: string;
  category: string;
  condition: "Like New" | "Good" | "Fair" | string;
  location: string;
  distance?: string;
  postedBy?: string;
  postedTime?: string;
  image?: string;
  imageUrl?: string;
  description: string;
  status: "available" | "reserved" | "Available" | "Requested" | "Adopted" | "Reserved" | string;
  createdAt?: string;
  updatedAt?: string;
}

export interface ExchangeRequest {
  id?: string;
  requestId: string;
  listingId: string;
  itemName: string;
  itemImage?: string;
  itemCategory?: string;
  ownerId?: string;
  ownerName?: string;
  owner?: string;
  requesterId?: string;
  requesterName?: string;
  requester?: string;
  status: ExchangeRequestStatus;
  createdAt: string;
  updatedAt?: string;
  completedAt?: string;
  pointsEarned?: number;
  pointsAwarded?: boolean;
}
