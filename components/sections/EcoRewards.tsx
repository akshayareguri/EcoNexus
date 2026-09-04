"use client";

import React, { useState } from "react";
import { 
  Award, 
  Gift, 
  Clock, 
  X, 
  Ticket,
  Loader2,
  Lock
} from "lucide-react";
import { PointsTransaction } from "@/types/pointsTransaction";
import { Reward, RewardRedemption } from "@/types/reward";
import { User as FirebaseUser } from "firebase/auth";
import { UserProfile } from "@/services/authService";

interface EcoRewardsProps {
  userPoints: number;
  onDeductPoints: (points: number) => boolean;
  transactions?: PointsTransaction[];
  rewards?: Reward[];
  isLoading?: boolean;
  error?: string | null;
  authUser?: FirebaseUser | null;
  userProfile?: UserProfile | null;
  onOpenAuthModal?: () => void;
  onRedeemReward?: (reward: Reward) => Promise<{ success: boolean; error?: string; redemption?: RewardRedemption }>;
}

interface ActivityLog {
  id: string;
  action: string;
  category: "Report" | "Recycle" | "Exchange" | "Upcycle";
  points: number;
  date: string;
}

const RECENT_ACTIVITIES: ActivityLog[] = [
  {
    id: "act-1",
    action: "Reported Illegal Construction Dumping in Ward 3",
    category: "Report",
    points: 50,
    date: "Today, 11:30 AM",
  },
  {
    id: "act-2",
    action: "Analyzed & Upcycled Glass Jar to Storage Planter",
    category: "Upcycle",
    points: 20,
    date: "Yesterday",
  },
  {
    id: "act-3",
    action: "Recycled E-Waste Li-Ion Battery Pack at EcoHub",
    category: "Recycle",
    points: 30,
    date: "Sep 2, 2026",
  },
  {
    id: "act-4",
    action: "Gave away Vintage Desk Lamp on Circular Exchange",
    category: "Exchange",
    points: 40,
    date: "Aug 29, 2026",
  },
];

const FALLBACK_VOUCHERS: Reward[] = [
  {
    id: "v-1",
    rewardId: "v-1",
    name: "$10 Public Transit Pass Credit",
    category: "Public Transit",
    pointsCost: 300,
    description: "Valid for local metro bus and light rail system rides across all city zones.",
    merchant: "City Metro Transit Authority",
    image: "https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?auto=format&fit=crop&w=600&q=80",
    code: "METRO-ECO-8821",
    available: true,
  },
  {
    id: "v-2",
    rewardId: "v-2",
    name: "20% Off Organic Zero-Waste Market",
    category: "Eco Grocery",
    pointsCost: 200,
    description: "Discount coupon on bulk grains, eco-soaps, and zero-plastic home goods.",
    merchant: "Green Earth Market",
    image: "https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=600&q=80",
    code: "GREEN20-X892",
    available: true,
  },
  {
    id: "v-3",
    rewardId: "v-3",
    name: "City Botanical Gardens Day Pass",
    category: "Parks & Recreation",
    pointsCost: 250,
    description: "Free single admission to municipal greenhouses, orchid gardens, and eco tours.",
    merchant: "Department of Parks & Wildlife",
    image: "https://images.unsplash.com/photo-1585320806297-9794b3e4eeae?auto=format&fit=crop&w=600&q=80",
    code: "GARDEN-PASS-901",
    available: true,
  },
  {
    id: "v-4",
    rewardId: "v-4",
    name: "$15 Municipal Water Tax Rebate",
    category: "Municipal Perks",
    pointsCost: 500,
    description: "Direct credit applied against your monthly city water and recycling bill.",
    merchant: "City Financial Services",
    image: "https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?auto=format&fit=crop&w=600&q=80",
    code: "TAX-REBATE-771A",
    available: true,
  },
];

export const EcoRewards: React.FC<EcoRewardsProps> = ({ 
  userPoints, 
  onDeductPoints, 
  transactions,
  rewards,
  isLoading = false,
  error = null,
  authUser,
  onOpenAuthModal,
  onRedeemReward
}) => {
  const [activities] = useState<ActivityLog[]>(RECENT_ACTIVITIES);
  const [selectedReward, setSelectedReward] = useState<Reward | null>(null);
  const [redeemedCode, setRedeemedCode] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isRedeeming, setIsRedeeming] = useState<boolean>(false);

  const displayRewards = (rewards && rewards.length > 0) ? rewards : FALLBACK_VOUCHERS;

  const handleClaimRewardClick = async (reward: Reward) => {
    setErrorMessage(null);

    if (!authUser) {
      if (onOpenAuthModal) onOpenAuthModal();
      setErrorMessage("Please log in or sign up to redeem Eco Points rewards.");
      return;
    }

    if (userPoints < reward.pointsCost) {
      setErrorMessage(`Insufficient Eco Points. You need ${reward.pointsCost - userPoints} more points to redeem this reward.`);
      return;
    }

    setIsRedeeming(true);

    try {
      if (onRedeemReward) {
        const res = await onRedeemReward(reward);
        if (res.success && res.redemption) {
          setRedeemedCode(res.redemption.code || reward.code || "ECO-SUCCESS-VOUCHER");
        } else {
          setErrorMessage(res.error || "Failed to redeem reward. Please try again.");
        }
      } else {
        // Fallback local state deduction if no async handler is provided
        const success = onDeductPoints(reward.pointsCost);
        if (success) {
          setRedeemedCode(reward.code || "ECO-LOCAL-VOUCHER");
        } else {
          setErrorMessage("Failed to deduct Eco Points.");
        }
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Redemption failed.";
      setErrorMessage(msg);
    } finally {
      setIsRedeeming(false);
    }
  };

  return (
    <div className="space-y-8 pb-12">
      
      {/* Hero Points Card */}
      <div className="bg-gradient-to-r from-emerald-900 via-teal-900 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 relative z-10">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 text-xs font-bold uppercase tracking-wider">
              <Award className="w-3.5 h-3.5" />
              Citizen Eco Rewards & Impact Tracker
            </div>
            <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight">
              Eco Points & Rewards Wallet
            </h1>
            <p className="text-emerald-100/80 text-sm sm:text-base leading-relaxed">
              Every responsible waste action—reporting dump sites, recycling e-waste, and upcycling—earns you Eco Points. Redeem them for real community rewards and municipal perks!
            </p>
          </div>

          <div className="bg-white/10 backdrop-blur-md border border-white/20 p-6 rounded-2xl text-center space-y-2 w-full md:w-auto flex-shrink-0">
            <span className="text-xs font-bold uppercase text-emerald-300 tracking-wider">
              Available Balance
            </span>
            <div className="text-4xl font-black text-white flex items-center justify-center gap-2">
              <Award className="w-8 h-8 text-amber-400 animate-pulse" />
              {userPoints}
            </div>
            <div className="text-[11px] font-semibold text-emerald-200 bg-emerald-950/60 px-3 py-1 rounded-full border border-emerald-500/30">
              Tier: Level 3 Eco Guardian
            </div>
          </div>
        </div>

        {/* Level Progress Bar */}
        <div className="mt-6 pt-4 border-t border-emerald-800/60 space-y-2">
          <div className="flex justify-between text-xs text-emerald-200">
            <span>Level 3 Eco Guardian</span>
            <span>Level 4 Master Recycler (1,000 pts needed)</span>
          </div>
          <div className="w-full bg-emerald-950/80 rounded-full h-2 overflow-hidden border border-emerald-800">
            <div 
              className="bg-gradient-to-r from-amber-400 to-emerald-400 h-2 rounded-full transition-all duration-500" 
              style={{ width: `${Math.min(100, (userPoints / 1000) * 100)}%` }}
            />
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-2xl text-xs font-semibold">
          Error loading rewards: {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Column: Reward Marketplace Grid */}
        <div className="lg:col-span-8 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Gift className="w-5 h-5 text-emerald-600" />
              Redeem Eco-Friendly Rewards & Vouchers
            </h2>
            <span className="text-xs text-slate-500 font-medium">
              {displayRewards.length} Active Rewards
            </span>
          </div>

          {isLoading && displayRewards.length === 0 ? (
            <div className="py-12 text-center text-slate-500 space-y-3">
              <Loader2 className="w-8 h-8 text-emerald-600 animate-spin mx-auto" />
              <p className="text-xs font-semibold">Loading Eco Rewards from Firestore...</p>
            </div>
          ) : displayRewards.length === 0 ? (
            <div className="py-12 text-center text-slate-500 space-y-2">
              <Gift className="w-10 h-10 text-slate-300 mx-auto" />
              <p className="font-bold text-sm">No Rewards Currently Available</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {displayRewards.map((reward) => (
                <div 
                  key={reward.id || reward.rewardId || reward.name}
                  className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs hover:shadow-lg transition-all flex flex-col justify-between"
                >
                  <div>
                    <div className="relative h-40 bg-slate-100">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img 
                        src={reward.image || "https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?auto=format&fit=crop&w=600&q=80"} 
                        alt={reward.name}
                        className="w-full h-full object-cover"
                      />
                      <span className="absolute top-3 left-3 bg-slate-900/80 backdrop-blur-md text-white text-[10px] font-bold px-2.5 py-1 rounded-full">
                        {reward.category}
                      </span>
                      {reward.available === false && (
                        <span className="absolute top-3 right-3 bg-red-600 text-white text-[10px] font-bold px-2.5 py-1 rounded-full">
                          Sold Out
                        </span>
                      )}
                    </div>

                    <div className="p-5 space-y-2">
                      <h3 className="font-bold text-slate-900 text-sm">
                        {reward.name}
                      </h3>
                      <p className="text-xs text-slate-500 leading-relaxed">
                        {reward.description}
                      </p>
                      {reward.merchant && (
                        <p className="text-[11px] text-slate-400 font-medium">
                          Provided by: {reward.merchant}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="p-5 pt-0 border-t border-slate-100 mt-4 flex items-center justify-between">
                    <div className="flex items-center gap-1 font-extrabold text-emerald-700 text-sm">
                      <Award className="w-4 h-4 text-emerald-600" />
                      {reward.pointsCost} pts
                    </div>

                    <button
                      onClick={() => {
                        setSelectedReward(reward);
                        setRedeemedCode(null);
                        setErrorMessage(null);
                      }}
                      disabled={reward.available === false}
                      className={`font-bold px-4 py-2 rounded-xl text-xs shadow-xs transition-colors flex items-center gap-1 ${
                        reward.available === false
                          ? "bg-slate-200 text-slate-400 cursor-not-allowed"
                          : "bg-emerald-700 hover:bg-emerald-800 text-white"
                      }`}
                    >
                      Redeem Reward
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right Column: Recent Responsible Activities History Timeline */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-4">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-3">
              <Clock className="w-5 h-5 text-emerald-600" />
              Recent Responsible Activities
            </h3>

            <div className="space-y-4">
              {transactions && transactions.length > 0 ? (
                transactions.map((tx) => (
                  <div key={tx.id || tx.referenceId} className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100">
                    <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-xs flex-shrink-0 mt-0.5">
                      +{tx.points}
                    </div>
                    <div className="space-y-1">
                      <p className="font-bold text-xs text-slate-900 leading-tight">
                        {tx.description}
                      </p>
                      <div className="flex items-center gap-2 text-[10px] text-slate-400">
                        <span className="bg-emerald-100 text-emerald-800 px-1.5 py-0.2 rounded font-semibold uppercase">
                          {tx.type}
                        </span>
                        <span>{tx.createdAt ? new Date(tx.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "Recently"}</span>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                activities.map((act) => (
                  <div key={act.id} className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100">
                    <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-xs flex-shrink-0 mt-0.5">
                      +{act.points}
                    </div>
                    <div className="space-y-1">
                      <p className="font-bold text-xs text-slate-900 leading-tight">
                        {act.action}
                      </p>
                      <div className="flex items-center gap-2 text-[10px] text-slate-400">
                        <span className="bg-slate-200 text-slate-700 px-1.5 py-0.2 rounded font-semibold">
                          {act.category}
                        </span>
                        <span>{act.date}</span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

      </div>

      {/* Redeem Voucher Modal */}
      {selectedReward && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-5 relative border border-slate-100">
            <button
              onClick={() => setSelectedReward(null)}
              className="absolute right-5 top-5 text-slate-400 hover:text-slate-700 p-1"
            >
              <X className="w-5 h-5" />
            </button>

            {redeemedCode ? (
              <div className="py-6 text-center space-y-4">
                <div className="w-14 h-14 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center mx-auto">
                  <Ticket className="w-8 h-8" />
                </div>
                <h3 className="text-xl font-extrabold text-slate-900">Voucher Successfully Claimed!</h3>
                <p className="text-xs text-slate-500">
                  Present this unique digital voucher code at checkout or on the merchant app.
                </p>

                <div className="bg-slate-900 text-emerald-400 p-4 rounded-2xl font-mono text-lg font-bold tracking-widest border border-slate-800 shadow-inner">
                  {redeemedCode}
                </div>

                <p className="text-[11px] text-slate-400">Valid for 30 days. Deducted {selectedReward.pointsCost} Eco Points.</p>
                <div className="pt-2">
                  <button
                    onClick={() => setSelectedReward(null)}
                    className="w-full py-2.5 rounded-xl text-xs font-bold bg-slate-900 text-white hover:bg-slate-800"
                  >
                    Close
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className="space-y-1">
                  <h3 className="text-lg font-extrabold text-slate-900">
                    Confirm Reward Redemption
                  </h3>
                  <p className="text-xs text-slate-500">
                    You are redeeming points for: <strong>{selectedReward.name}</strong>
                  </p>
                </div>

                {!authUser && (
                  <div className="bg-amber-50 border border-amber-200 text-amber-800 p-3 rounded-xl text-xs font-medium flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <Lock className="w-4 h-4 text-amber-600" /> Log in required to claim rewards.
                    </span>
                    <button
                      onClick={() => {
                        if (onOpenAuthModal) onOpenAuthModal();
                      }}
                      className="bg-amber-600 hover:bg-amber-700 text-white font-bold px-2.5 py-1 rounded-lg text-[11px]"
                    >
                      Log In
                    </button>
                  </div>
                )}

                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-600 font-medium">Item Cost:</span>
                    <span className="font-extrabold text-emerald-700">{selectedReward.pointsCost} Eco Points</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-600 font-medium">Your Current Balance:</span>
                    <span className="font-bold text-slate-900">{userPoints} Eco Points</span>
                  </div>
                </div>

                {errorMessage && (
                  <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-xl text-xs font-semibold">
                    {errorMessage}
                  </div>
                )}

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    onClick={() => setSelectedReward(null)}
                    className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => handleClaimRewardClick(selectedReward)}
                    disabled={isRedeeming || !authUser}
                    className={`px-5 py-2.5 rounded-xl text-xs font-bold shadow-md flex items-center gap-1.5 ${
                      isRedeeming || !authUser
                        ? "bg-slate-300 text-slate-500 cursor-not-allowed"
                        : "bg-emerald-700 hover:bg-emerald-800 text-white"
                    }`}
                  >
                    {isRedeeming && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    Claim Voucher ({selectedReward.pointsCost} pts)
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

    </div>
  );
};
