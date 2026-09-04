export interface Reward {
  id?: string;
  rewardId?: string;
  name: string;
  description: string;
  pointsCost: number;
  category: string;
  available: boolean;
  createdAt?: string;
  merchant?: string;
  image?: string;
  code?: string;
}

export interface RewardRedemption {
  id?: string;
  redemptionId?: string;
  userId: string;
  userName: string;
  rewardId: string;
  rewardName: string;
  pointsSpent: number;
  status: "redeemed";
  createdAt: string;
  code?: string;
}
