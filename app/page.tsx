"use client";

import React, { useState, useEffect } from "react";
import { Navbar } from "@/components/Navbar";
import { NavigationTabs, SectionTab } from "@/components/NavigationTabs";
import { ManageWaste } from "@/components/sections/ManageWaste";
import { CircularExchange } from "@/components/sections/CircularExchange";
import { ReportIssue } from "@/components/sections/ReportIssue";
import { EcoRewards } from "@/components/sections/EcoRewards";
import { RecyclerDashboard } from "@/components/sections/RecyclerDashboard";
import { MunicipalityDashboard } from "@/components/sections/MunicipalityDashboard";
import { Leaf, ShieldCheck } from "lucide-react";
import { WasteComplaint, ComplaintStatus } from "@/types/complaint";
import { WastePickupRequest, PickupStatus } from "@/types/pickup";
import { ExchangeListing, ExchangeRequest, ExchangeRequestStatus } from "@/types/exchange";
import { PointsTransaction } from "@/types/pointsTransaction";
import { WasteReport } from "@/types/wasteReport";
import { WasteRequest } from "@/types/wasteRequest";
import { Reward } from "@/types/reward";
import {
  subscribeToComplaints,
  saveComplaintToFirestore,
  updateComplaintStatusInFirestore,
  subscribeToPickupRequests,
  savePickupRequestToFirestore,
  updatePickupStatusInFirestore,
  subscribeToExchangeListings,
  saveExchangeListingToFirestore,
  updateExchangeListingStatusInFirestore,
  subscribeToExchangeRequests,
  saveExchangeRequestToFirestore,
  updateExchangeRequestStatusInFirestore,
  syncUserPointsToFirestore,
  awardEcoPointsTransaction,
  subscribeToUserEcoPoints,
  subscribeToPointsTransactions,
  subscribeToWasteReports,
  updateWasteReportStatusInFirestore,
  subscribeToWasteRequests,
  updateWasteRequestStatusInFirestore,
  seedInitialRewardsIfEmpty,
  subscribeToRewards,
  redeemRewardTransaction,
} from "@/services/firestoreService";
import { AuthModal } from "@/components/AuthModal";
import { subscribeToAuthChanges, logOutUser, UserProfile } from "@/services/authService";
import { User as FirebaseUser } from "firebase/auth";

const INITIAL_COMPLAINTS: WasteComplaint[] = [
  {
    id: "REP-9021",
    photo: "https://images.unsplash.com/photo-1530587191325-3db32d826c18?auto=format&fit=crop&w=600&q=80",
    location: "Corner of 14th Ave & Spruce St",
    ward: "Ward 3",
    detectedIssue: "Illegal Dumping - Solvents & Debris",
    severityScore: 98,
    priority: "CRITICAL",
    status: "Reported",
    submittedAt: "12 mins ago",
    assignedCrew: "Unassigned",
    pointsEarned: 50,
    pointsAwarded: false,
  },
  {
    id: "REP-9018",
    photo: "https://images.unsplash.com/photo-1611284446314-60a58ac0deb9?auto=format&fit=crop&w=600&q=80",
    location: "Central Park East Entrance",
    ward: "Ward 1",
    detectedIssue: "Overflowing Commercial Trash Receptacle",
    severityScore: 84,
    priority: "HIGH",
    status: "En Route",
    submittedAt: "45 mins ago",
    assignedCrew: "Crew #2 (Fleet Truck T-04)",
    pointsEarned: 50,
    pointsAwarded: false,
  },
  {
    id: "REP-9015",
    photo: "https://images.unsplash.com/photo-1503596476-1c12a8ba09a9?auto=format&fit=crop&w=600&q=80",
    location: "Oakridge Residential Alley",
    ward: "Ward 4",
    detectedIssue: "Discarded Furniture & Mattress Obstruction",
    severityScore: 62,
    priority: "MEDIUM",
    status: "AI Triaged",
    submittedAt: "1.5 hours ago",
    assignedCrew: "Crew #5 (Fleet Truck T-08)",
    pointsEarned: 50,
    pointsAwarded: false,
  },
];

const INITIAL_PICKUP_REQUESTS: WastePickupRequest[] = [
  {
    pickupRequestId: "PICKUP-8801",
    wasteItem: "PET Plastic Beverage Bottles (5kg)",
    wasteCategory: "Rigid Plastics",
    recommendedAction: "RECYCLE",
    destinationType: "RECYCLER",
    destinationId: "rec-1",
    destinationName: "EcoRecycle Plastics & Packaging Ltd",
    citizenName: "Jane Doe (Citizen)",
    location: "742 Evergreen Terrace, Ward 2",
    image: "https://images.unsplash.com/photo-1527016021513-b09758b777bd?auto=format&fit=crop&w=600&q=80",
    status: "PENDING",
    createdAt: "30 mins ago",
    pointsEarned: 30,
    pointsAwarded: false,
  },
  {
    pickupRequestId: "PICKUP-8802",
    wasteItem: "Swollen Li-Ion Laptop Batteries (2 units)",
    wasteCategory: "Electronic Waste",
    recommendedAction: "SAFE_DISPOSAL",
    destinationType: "MUNICIPALITY",
    destinationId: "muni-hhw-team",
    destinationName: "Ward 3 EcoHub Municipal HHW Fleet",
    citizenName: "Jane Doe (Citizen)",
    location: "1088 Metro Boulevard, Ward 3",
    image: "https://images.unsplash.com/photo-1619725002198-6a689b72f41d?auto=format&fit=crop&w=600&q=80",
    status: "PENDING",
    createdAt: "1 hour ago",
    pointsEarned: 50,
    pointsAwarded: false,
  },
];

const INITIAL_EXCHANGE_LISTINGS: ExchangeListing[] = [
  {
    id: "item-1",
    title: "Ergonomic Office Desk Chair",
    category: "Furniture",
    condition: "Good",
    location: "Greenwood Ward 2",
    distance: "0.8 miles away",
    postedBy: "Sarah Jenkins",
    postedTime: "2 hours ago",
    image: "https://images.unsplash.com/photo-1580481072645-022f9a6d1270?auto=format&fit=crop&w=600&q=80",
    description: "Fully working adjustable mesh chair. Upgraded my home office, perfect for students or remote work.",
    status: "Available",
  },
  {
    id: "item-2",
    title: "Vintage Wood & Brass Table Lamp",
    category: "Home & Lighting",
    condition: "Like New",
    location: "Oakridge Ward 4",
    distance: "1.4 miles away",
    postedBy: "David Chen",
    postedTime: "5 hours ago",
    image: "https://images.unsplash.com/photo-1507473885765-e6ed057f782c?auto=format&fit=crop&w=600&q=80",
    description: "Works perfectly with warm LED bulb. Beautiful wooden base, moving to a furnished apartment.",
    status: "Available",
  },
  {
    id: "item-3",
    title: "Children's Wooden Building Blocks Set",
    category: "Toys & Books",
    condition: "Good",
    location: "Pine District Ward 1",
    distance: "2.1 miles away",
    postedBy: "Elena Rostova",
    postedTime: "1 day ago",
    image: "https://images.unsplash.com/photo-1587654780291-39c9404d746b?auto=format&fit=crop&w=600&q=80",
    description: "Complete 100-piece natural wood block set. Non-toxic finish. Kids have grown out of it.",
    status: "Available",
  },
  {
    id: "item-4",
    title: "Standing Electric Espresso Grinder",
    category: "Appliances",
    condition: "Like New",
    location: "Central Ward 3",
    distance: "0.5 miles away",
    postedBy: "Marcus Thorne",
    postedTime: "1 day ago",
    image: "https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?auto=format&fit=crop&w=600&q=80",
    description: "Stainless steel burr grinder. Cleaned and tested. Includes original dosing cup.",
    status: "Available",
  },
];

const INITIAL_EXCHANGE_REQUESTS: ExchangeRequest[] = [
  {
    requestId: "EX-REQ-101",
    listingId: "item-1",
    itemName: "Ergonomic Office Desk Chair",
    itemImage: "https://images.unsplash.com/photo-1580481072645-022f9a6d1270?auto=format&fit=crop&w=600&q=80",
    itemCategory: "Furniture",
    owner: "Sarah Jenkins",
    requester: "You (Current User)",
    status: "PENDING",
    createdAt: "1 hour ago",
    pointsEarned: 40,
    pointsAwarded: false,
  },
  {
    requestId: "EX-REQ-102",
    listingId: "item-2",
    itemName: "Vintage Wood & Brass Table Lamp",
    itemImage: "https://images.unsplash.com/photo-1507473885765-e6ed057f782c?auto=format&fit=crop&w=600&q=80",
    itemCategory: "Home & Lighting",
    owner: "You (Current User)",
    requester: "Alex Rivera",
    status: "PENDING",
    createdAt: "3 hours ago",
    pointsEarned: 40,
    pointsAwarded: false,
  },
];

export default function Home() {
  const [activeTab, setActiveTab] = useState<SectionTab>("manage-waste");
  const [currentRole, setCurrentRole] = useState<"citizen" | "recycler" | "municipality">("citizen");
  const [userPoints, setUserPoints] = useState<number>(850);

  // Authentication State
  const [authUser, setAuthUser] = useState<FirebaseUser | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  
  // Shared States
  const [complaints, setComplaints] = useState<WasteComplaint[]>(INITIAL_COMPLAINTS);
  const [pickupRequests, setPickupRequests] = useState<WastePickupRequest[]>(INITIAL_PICKUP_REQUESTS);
  const [exchangeListings, setExchangeListings] = useState<ExchangeListing[]>(INITIAL_EXCHANGE_LISTINGS);
  const [exchangeRequests, setExchangeRequests] = useState<ExchangeRequest[]>(INITIAL_EXCHANGE_REQUESTS);
  const [pointsTransactions, setPointsTransactions] = useState<PointsTransaction[]>([]);
  const [wasteReports, setWasteReports] = useState<WasteReport[]>([]);
  const [wasteRequests, setWasteRequests] = useState<WasteRequest[]>([]);
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [isReportsLoading, setIsReportsLoading] = useState<boolean>(true);
  const [isWasteRequestsLoading, setIsWasteRequestsLoading] = useState<boolean>(true);
  const [isRewardsLoading, setIsRewardsLoading] = useState<boolean>(true);
  const [rewardsError, setRewardsError] = useState<string | null>(null);

  // Sync real-time data & auth state from Firebase
  useEffect(() => {
    // Seed default rewards in Firestore if collection is empty
    seedInitialRewardsIfEmpty();

    let unsubUserPoints = () => {};
    let unsubUserTx = () => {};

    const unsubscribeAuth = subscribeToAuthChanges((u, profile) => {
      setAuthUser(u);
      setUserProfile(profile);

      unsubUserPoints();
      unsubUserTx();

      if (u) {
        unsubUserPoints = subscribeToUserEcoPoints(u.uid, (pts) => {
          setUserPoints(pts);
        });
        unsubUserTx = subscribeToPointsTransactions(u.uid, (txs) => {
          setPointsTransactions(txs);
        });
      }
    });

    const unsubscribeComplaints = subscribeToComplaints((data) => {
      if (data && data.length > 0) setComplaints(data);
    });
    const unsubscribePickups = subscribeToPickupRequests((data) => {
      if (data && data.length > 0) setPickupRequests(data);
    });
    const unsubscribeListings = subscribeToExchangeListings((data) => {
      if (data && data.length > 0) setExchangeListings(data);
    });
    const unsubscribeRequests = subscribeToExchangeRequests((data) => {
      if (data && data.length > 0) setExchangeRequests(data);
    });
    const unsubscribeWasteReports = subscribeToWasteReports((data) => {
      setWasteReports(data);
      setIsReportsLoading(false);
    });
    const unsubscribeWasteRequests = subscribeToWasteRequests((data) => {
      setWasteRequests(data);
      setIsWasteRequestsLoading(false);
    });
    const unsubscribeRewards = subscribeToRewards((data) => {
      setRewards(data);
      setIsRewardsLoading(false);
      setRewardsError(null);
    });

    return () => {
      unsubscribeAuth();
      unsubUserPoints();
      unsubUserTx();
      unsubscribeComplaints();
      unsubscribePickups();
      unsubscribeListings();
      unsubscribeRequests();
      unsubscribeWasteReports();
      unsubscribeWasteRequests();
      unsubscribeRewards();
    };
  }, []);

  const handleRoleChange = (role: "citizen" | "recycler" | "municipality") => {
    setCurrentRole(role);
    if (role === "recycler") {
      setActiveTab("recycler-dashboard");
    } else if (role === "municipality") {
      setActiveTab("municipality-dashboard");
    } else {
      if (activeTab === "recycler-dashboard" || activeTab === "municipality-dashboard") {
        setActiveTab("manage-waste");
      }
    }
  };

  const handleAwardEcoPoints = async (
    userId: string,
    type: string,
    points: number,
    description: string,
    referenceId: string
  ) => {
    const targetUid = userId || authUser?.uid || "anonymous-citizen";
    const res = await awardEcoPointsTransaction(targetUid, type, points, description, referenceId);
    if (res.success && res.newTotal !== undefined) {
      setUserPoints(res.newTotal);
    }
  };

  const handleDeductPoints = (points: number): boolean => {
    if (userPoints >= points) {
      setUserPoints((prev) => {
        const nextPoints = prev - points;
        syncUserPointsToFirestore("anonymous-citizen", nextPoints);
        return nextPoints;
      });
      return true;
    }
    return false;
  };

  // Complaint Handlers (Public Reports)
  const handleAddComplaint = (newComplaint: WasteComplaint) => {
    setComplaints((prev) => [newComplaint, ...prev]);
    saveComplaintToFirestore(newComplaint);
  };

  const handleUpdateComplaintStatus = (
    id: string,
    newStatus: ComplaintStatus,
    assignedCrew?: string
  ) => {
    let computedCrew: string | undefined;
    let targetComplaint: WasteComplaint | undefined;

    setComplaints((prev) =>
      prev.map((c) => {
        if (c.id === id) {
          targetComplaint = c;
          computedCrew =
            assignedCrew ??
            (newStatus === "Assigned"
              ? "Crew #1 (Fleet Truck T-01)"
              : newStatus === "En Route"
              ? "Fleet Truck T-01 (En Route)"
              : c.assignedCrew);
          return {
            ...c,
            status: newStatus,
            assignedCrew: computedCrew,
          };
        }
        return c;
      })
    );

    updateComplaintStatusInFirestore(id, newStatus, computedCrew);

    // Award +10 Eco Points ONLY when status becomes Collected/Resolved
    if (newStatus === "Collected/Resolved" && targetComplaint) {
      const desc = `Verified public waste issue report collected/resolved (${targetComplaint.detectedIssue}) (+10 Eco Points)`;
      handleAwardEcoPoints(authUser?.uid || "anonymous-citizen", "WASTE_REPORT", 10, desc, id);
    }
  };

  const handleUpdateWasteReportStatus = async (
    reportId: string,
    status: string,
    assignedCrew?: string
  ) => {
    let computedCrew = assignedCrew;
    if (!computedCrew) {
      if (status === "assigned") computedCrew = "Crew #1 (Fleet Truck T-01)";
      else if (status === "en_route") computedCrew = "Fleet Truck T-01 (En Route)";
    }

    setWasteReports((prev) =>
      prev.map((r) => {
        if (r.reportId === reportId || r.id === reportId) {
          return {
            ...r,
            status,
            ...(computedCrew ? { assignedCrew: computedCrew } : {}),
          };
        }
        return r;
      })
    );

    await updateWasteReportStatusInFirestore(reportId, status, computedCrew);

    if (status === "resolved" || status === "Collected/Resolved") {
      const targetRep = wasteReports.find((r) => r.reportId === reportId || r.id === reportId);
      const recipientId = targetRep?.reporterId || authUser?.uid || "anonymous-citizen";
      const issueLabel = targetRep?.issueType || "Public Waste Issue";
      const desc = `Verified public waste issue report collected/resolved (${issueLabel}) (+10 Eco Points)`;
      await handleAwardEcoPoints(recipientId, "WASTE_REPORT", 10, desc, reportId);
    }
  };

  const handleUpdateWasteRequestStatus = async (
    requestId: string,
    status: string
  ) => {
    setWasteRequests((prev) =>
      prev.map((r) => {
        if (r.requestId === requestId || r.id === requestId) {
          return {
            ...r,
            status,
          };
        }
        return r;
      })
    );

    await updateWasteRequestStatusInFirestore(requestId, status);

    if (status === "completed" || status === "COMPLETED") {
      const targetReq = wasteRequests.find((r) => r.requestId === requestId || r.id === requestId);
      const recipientId = targetReq?.userId || authUser?.uid || "anonymous-citizen";
      const itemLabel = targetReq?.itemName || "Hazardous Waste";
      const desc = `Completed municipal safe disposal collection (${itemLabel}) (+15 Eco Points)`;
      await handleAwardEcoPoints(recipientId, "SAFE_DISPOSAL", 15, desc, requestId);
    }
  };

  // Waste Pickup Request Handlers (Recycler & Municipality Safe Disposal)
  const handleCreatePickupRequest = (newRequest: WastePickupRequest) => {
    setPickupRequests((prev) => [newRequest, ...prev]);
    savePickupRequestToFirestore(newRequest);
  };

  const handleUpdatePickupStatus = (requestId: string, newStatus: PickupStatus) => {
    let targetReq: WastePickupRequest | undefined;

    setPickupRequests((prev) =>
      prev.map((r) => {
        if (r.pickupRequestId === requestId) {
          targetReq = r;
          return {
            ...r,
            status: newStatus,
          };
        }
        return r;
      })
    );

    updatePickupStatusInFirestore(requestId, newStatus);

    // Award points ONLY when pickup status becomes COMPLETED
    if (newStatus === "COMPLETED" && targetReq) {
      const isRecycle = targetReq.destinationType === "RECYCLER";
      const pts = isRecycle ? 20 : 15;
      const actType = isRecycle ? "RECYCLING" : "SAFE_DISPOSAL";
      const desc = isRecycle
        ? `Completed verified recycling pickup (${targetReq.wasteItem}) (+20 Eco Points)`
        : `Completed municipal safe disposal collection (${targetReq.wasteItem}) (+15 Eco Points)`;

      handleAwardEcoPoints(authUser?.uid || "anonymous-citizen", actType, pts, desc, requestId);
    }
  };

  // Circular Exchange Handlers
  const handleAddListing = (newListing: ExchangeListing) => {
    setExchangeListings((prev) => [newListing, ...prev]);
    saveExchangeListingToFirestore(newListing);
  };

  const handleCreateExchangeRequest = (newRequest: ExchangeRequest) => {
    setExchangeRequests((prev) => [newRequest, ...prev]);
    saveExchangeRequestToFirestore(newRequest);
  };

  const handleUpdateExchangeStatus = (requestId: string, newStatus: ExchangeRequestStatus) => {
    let targetReq: ExchangeRequest | undefined;

    setExchangeRequests((prev) =>
      prev.map((r) => {
        if (r.requestId === requestId || r.id === requestId) {
          targetReq = r;
          return {
            ...r,
            status: newStatus,
          };
        }
        return r;
      })
    );

    updateExchangeRequestStatusInFirestore(requestId, newStatus);

    if (targetReq) {
      const norm = (newStatus || "").toLowerCase();
      let nextListingStatus: string | undefined;
      if (norm === "accepted") {
        nextListingStatus = "reserved";
      } else if (norm === "rejected") {
        nextListingStatus = "available";
      } else if (norm === "completed") {
        nextListingStatus = "Adopted";

        // Award +25 Eco Points on completed handover
        const desc = `Completed community item exchange handover (${targetReq.itemName}) (+25 Eco Points)`;
        handleAwardEcoPoints(targetReq.requesterId || authUser?.uid || "anonymous-citizen", "EXCHANGE_HANDOVER", 25, desc, requestId);
      }

      if (nextListingStatus && targetReq.listingId) {
        const targetListingId = targetReq.listingId;
        setExchangeListings((prevListings) =>
          prevListings.map((l) => (l.id === targetListingId ? { ...l, status: nextListingStatus } : l))
        );
        updateExchangeListingStatusInFirestore(targetListingId, nextListingStatus);
      }
    }
  };

  const handleRedeemReward = async (reward: Reward) => {
    if (!authUser) {
      return { success: false, error: "Please log in to redeem Eco Points rewards." };
    }

    const userId = authUser.uid;
    const userName = userProfile?.displayName || authUser.displayName || authUser.email || "Eco Citizen";
    const rewardId = reward.rewardId || reward.id || "";

    const res = await redeemRewardTransaction(userId, userName, rewardId);

    if (res.success && res.newPoints !== undefined) {
      setUserPoints(res.newPoints);
    }

    return res;
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col selection:bg-emerald-500 selection:text-white">
      
      {/* Navbar Header */}
      <Navbar
        currentRole={currentRole}
        onRoleChange={handleRoleChange}
        userPoints={userPoints}
        authUser={authUser}
        userProfile={userProfile}
        onOpenAuthModal={() => setIsAuthModalOpen(true)}
        onLogout={logOutUser}
      />

      {/* Primary Navigation Tabs */}
      <NavigationTabs
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        currentRole={currentRole}
      />

      {/* Main Content View Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-16">
        
        {activeTab === "manage-waste" && (
          <ManageWaste
            onRequestPickup={handleCreatePickupRequest}
            onAwardPoints={handleAwardEcoPoints}
            authUser={authUser}
            userProfile={userProfile}
            onOpenAuthModal={() => setIsAuthModalOpen(true)}
          />
        )}
        
        {activeTab === "circular-exchange" && (
          <CircularExchange
            listings={exchangeListings}
            requests={exchangeRequests}
            onAddListing={handleAddListing}
            onCreateRequest={handleCreateExchangeRequest}
            onUpdateExchangeStatus={handleUpdateExchangeStatus}
            authUser={authUser}
            userProfile={userProfile}
            onOpenAuthModal={() => setIsAuthModalOpen(true)}
          />
        )}
        
        {activeTab === "report-issue" && (
          <ReportIssue
            complaints={complaints}
            onAddComplaint={handleAddComplaint}
            authUser={authUser}
            userProfile={userProfile}
            onOpenAuthModal={() => setIsAuthModalOpen(true)}
          />
        )}
        
        {activeTab === "eco-rewards" && (
          <EcoRewards
            userPoints={userPoints}
            onDeductPoints={handleDeductPoints}
            transactions={pointsTransactions}
            rewards={rewards}
            isLoading={isRewardsLoading}
            error={rewardsError}
            authUser={authUser}
            userProfile={userProfile}
            onOpenAuthModal={() => setIsAuthModalOpen(true)}
            onRedeemReward={handleRedeemReward}
          />
        )}
        
        {activeTab === "recycler-dashboard" && (
          <RecyclerDashboard
            pickupRequests={pickupRequests}
            onUpdatePickupStatus={handleUpdatePickupStatus}
          />
        )}
        
        {activeTab === "municipality-dashboard" && (
          <MunicipalityDashboard
            complaints={complaints}
            pickupRequests={pickupRequests}
            wasteReports={wasteReports}
            wasteRequests={wasteRequests}
            isLoading={isReportsLoading || isWasteRequestsLoading}
            onUpdateComplaintStatus={handleUpdateComplaintStatus}
            onUpdatePickupStatus={handleUpdatePickupStatus}
            onUpdateWasteReportStatus={handleUpdateWasteReportStatus}
            onUpdateWasteRequestStatus={handleUpdateWasteRequestStatus}
          />
        )}

      </main>

      {/* Footer */}
      <footer className="bg-slate-900 text-slate-400 border-t border-slate-800 py-8 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center space-x-2 text-xs font-semibold text-slate-300">
            <div className="w-6 h-6 rounded-lg bg-emerald-600 flex items-center justify-center text-white">
              <Leaf className="w-4 h-4" />
            </div>
            <span>EcoNexus Platform</span>
            <span className="text-slate-600">•</span>
            <span className="text-slate-500 font-normal">AI-Powered Responsible Waste Recovery &amp; Municipal Action System</span>
          </div>

          <div className="flex items-center space-x-6 text-xs font-medium">
            <span className="flex items-center gap-1 text-emerald-400">
              <ShieldCheck className="w-4 h-4" /> Hackathon Production Build
            </span>
            <span className="text-slate-500">React 19 • Next.js • Tailwind CSS</span>
          </div>
        </div>
      </footer>

      {/* Authentication Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
      />

    </div>
  );
}
