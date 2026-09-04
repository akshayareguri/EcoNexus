"use client";

import React, { useState } from "react";
import { 
  Repeat, 
  Plus, 
  Search, 
  MapPin, 
  User, 
  MessageSquare, 
  X,
  PackageCheck,
  Info,
  Clock,
  Upload,
  CheckCircle2,
  XCircle,
  Inbox,
  Send,
  Lock,
  AlertCircle,
  RefreshCw
} from "lucide-react";
import { User as FirebaseUser } from "firebase/auth";
import { UserProfile } from "@/services/authService";
import { ExchangeListing, ExchangeRequest, ExchangeRequestStatus } from "@/types/exchange";
import { 
  getCategoryFallbackImage, 
  compressImageDataUrl, 
  saveListingImageToLocalStorage 
} from "@/services/firestoreService";

interface CircularExchangeProps {
  listings: ExchangeListing[];
  requests: ExchangeRequest[];
  onAddListing: (listing: ExchangeListing) => Promise<void> | void;
  onCreateRequest: (request: ExchangeRequest) => void;
  onUpdateExchangeStatus: (requestId: string, newStatus: ExchangeRequestStatus) => void;
  authUser?: FirebaseUser | null;
  userProfile?: UserProfile | null;
  onOpenAuthModal?: () => void;
  isLoadingListings?: boolean;
}

export const CircularExchange: React.FC<CircularExchangeProps> = ({
  listings,
  requests,
  onAddListing,
  onCreateRequest,
  onUpdateExchangeStatus,
  authUser,
  userProfile,
  onOpenAuthModal,
  isLoadingListings,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<"browse" | "my-requests" | "incoming-requests">("browse");
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [searchQuery, setSearchQuery] = useState<string>("");
  
  // Modal states
  const [isListingModalOpen, setIsListingModalOpen] = useState(false);
  const [selectedRequestItem, setSelectedRequestItem] = useState<ExchangeListing | null>(null);
  const [requestSuccessMessage, setRequestSuccessMessage] = useState(false);
  const [customMessage, setCustomMessage] = useState("");

  // New listing form state
  const [newTitle, setNewTitle] = useState("");
  const [newCategory, setNewCategory] = useState("Furniture");
  const [newCondition, setNewCondition] = useState<"Like New" | "Good" | "Fair">("Good");
  const [newLocation, setNewLocation] = useState("Ward 2 - Greenwood");
  const [newDescription, setNewDescription] = useState("");
  const [newImagePreview, setNewImagePreview] = useState<string | null>(null);
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const categories = ["All", "Furniture", "Home & Lighting", "Appliances", "Toys & Books", "Electronics"];

  const filteredListings = listings.filter((item) => {
    const matchesCategory = selectedCategory === "All" || item.category === selectedCategory;
    const matchesSearch = item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          item.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const currentUserId = authUser?.uid;
  const userDisplayName = userProfile?.displayName || authUser?.displayName || authUser?.email?.split("@")[0] || "";

  const isItemOwner = (item: ExchangeListing) => {
    if (!authUser) return false;
    if (item.ownerId && item.ownerId === currentUserId) return true;
    if (item.postedBy && userDisplayName && item.postedBy.toLowerCase() === userDisplayName.toLowerCase()) return true;
    if (item.ownerName && userDisplayName && item.ownerName.toLowerCase() === userDisplayName.toLowerCase()) return true;
    if (item.postedBy === "You (Current User)" || item.ownerName === "You (Current User)") return true;
    return false;
  };

  const hasUserRequested = (item: ExchangeListing) => {
    if (!authUser) return false;
    return requests.some((r) => {
      if (r.listingId !== item.id) return false;
      const isRequester =
        (r.requesterId && r.requesterId === currentUserId) ||
        (r.requesterName && userDisplayName && r.requesterName.toLowerCase() === userDisplayName.toLowerCase()) ||
        r.requester === "You (Current User)";
      const statusNorm = (r.status || "").toLowerCase();
      return isRequester && (statusNorm === "pending" || statusNorm === "accepted");
    });
  };

  // Sent requests by current user
  const mySentRequests = requests.filter((r) => {
    if (authUser && r.requesterId && r.requesterId === currentUserId) return true;
    if (userDisplayName && r.requesterName && r.requesterName.toLowerCase() === userDisplayName.toLowerCase()) return true;
    if (r.requester === "You (Current User)") return true;
    return false;
  });

  // Incoming requests for items listed by current user
  const incomingRequests = requests.filter((r) => {
    if (authUser && r.ownerId && r.ownerId === currentUserId) return true;
    if (userDisplayName && r.ownerName && r.ownerName.toLowerCase() === userDisplayName.toLowerCase()) return true;
    if (r.owner === "You (Current User)" || r.owner === "Sarah Jenkins" || r.owner === "David Chen") return true;
    return false;
  });

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onloadend = async () => {
        if (typeof reader.result === "string") {
          const rawDataUrl = reader.result;
          const compressed = await compressImageDataUrl(rawDataUrl, 300, 300, 0.55);
          setNewImagePreview(compressed);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCreateListing = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!authUser) {
      setFormError("You must be logged in to create an Exchange listing.");
      if (onOpenAuthModal) onOpenAuthModal();
      return;
    }

    if (!newTitle.trim()) {
      setFormError("Please enter an item title.");
      return;
    }

    setIsSubmitting(true);
    try {
      const nowIso = new Date().toISOString();
      const ownerId = authUser.uid;
      const ownerName = userProfile?.displayName || authUser.displayName || authUser.email?.split("@")[0] || "Eco Citizen";
      const categoryFallback = getCategoryFallbackImage(newCategory);
      
      let finalImage = categoryFallback;
      if (newImagePreview) {
        finalImage = await compressImageDataUrl(newImagePreview, 300, 300, 0.55);
      }

      const newItemId = `item-${Date.now()}`;

      if (finalImage.startsWith("data:image/")) {
        saveListingImageToLocalStorage(newItemId, finalImage);
      }

      const newItem: ExchangeListing = {
        id: newItemId,
        ownerId: ownerId,
        ownerName: ownerName,
        itemName: newTitle.trim(),
        title: newTitle.trim(),
        category: newCategory,
        condition: newCondition,
        location: newLocation || "Ward 2 - Greenwood",
        distance: "0.2 miles away",
        postedBy: ownerName,
        postedTime: "Just now",
        image: finalImage,
        imageUrl: finalImage,
        description: newDescription.trim() || "Usable pre-loved item looking for a new owner.",
        status: "available",
        createdAt: nowIso,
        updatedAt: nowIso,
      };

      await onAddListing(newItem);
      setIsListingModalOpen(false);
      setNewTitle("");
      setNewDescription("");
      setNewImagePreview(null);
    } catch (err: unknown) {
      console.error("Error creating exchange listing:", err);
      setFormError("Failed to save exchange listing to Firestore. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSendRequestSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRequestItem) return;

    if (!authUser) {
      if (onOpenAuthModal) onOpenAuthModal();
      return;
    }

    const currentUserName = userProfile?.displayName || authUser.displayName || authUser.email?.split("@")[0] || "Eco Citizen";
    const reqId = `EX-REQ-${Math.floor(1000 + Math.random() * 9000)}`;
    const nowIso = new Date().toISOString();

    const newReq: ExchangeRequest = {
      id: reqId,
      requestId: reqId,
      listingId: selectedRequestItem.id,
      itemName: selectedRequestItem.title || selectedRequestItem.itemName || "Usable Item",
      itemImage: selectedRequestItem.image || selectedRequestItem.imageUrl || "",
      itemCategory: selectedRequestItem.category || "General",
      ownerId: selectedRequestItem.ownerId || "",
      ownerName: selectedRequestItem.postedBy || selectedRequestItem.ownerName || "Eco Citizen",
      owner: selectedRequestItem.postedBy || selectedRequestItem.ownerName || "Eco Citizen",
      requesterId: authUser.uid,
      requesterName: currentUserName,
      requester: currentUserName,
      status: "pending",
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    onCreateRequest(newReq);
    setRequestSuccessMessage(true);

    setTimeout(() => {
      setSelectedRequestItem(null);
      setRequestSuccessMessage(false);
      setCustomMessage("");
    }, 1200);
  };

  return (
    <div className="space-y-8 pb-12">
      
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-teal-950 via-slate-900 to-emerald-950 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 relative z-10">
          <div className="space-y-3 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-500/20 border border-teal-400/30 text-teal-300 text-xs font-bold uppercase tracking-wider">
              <Repeat className="w-3.5 h-3.5" />
              Community Item Sharing Marketplace
            </div>
            <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight">
              Circular Economy Exchange
            </h1>
            <p className="text-teal-100/80 text-sm sm:text-base leading-relaxed">
              List functional items you no longer need so neighbors can claim them for free. Track incoming &amp; sent requests to complete exchanges and earn Eco Points!
            </p>
          </div>

          <button
            onClick={() => setIsListingModalOpen(true)}
            className="flex-shrink-0 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-bold px-5 py-3 rounded-2xl shadow-lg shadow-emerald-900/40 flex items-center gap-2 text-sm transition-all transform hover:-translate-y-0.5"
          >
            <Plus className="w-5 h-5" />
            List Usable Item
          </button>
        </div>

        {/* Feature distinction reminder alert */}
        <div className="mt-6 pt-4 border-t border-teal-800/60 flex items-center gap-2 text-xs text-teal-200">
          <Info className="w-4 h-4 text-teal-400 flex-shrink-0" />
          <span>
            <strong>Separate Feature:</strong> This exchange connects neighbors for item gifting. It is distinct from the <em>&quot;Put to Another Use&quot;</em> personal DIY tool.
          </span>
        </div>
      </div>

      {/* Sub-Navigation Tabs: Browse Marketplace vs My Requests vs Incoming Requests */}
      <div className="flex items-center justify-between bg-white p-2 rounded-2xl border border-slate-200 shadow-xs overflow-x-auto">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveSubTab("browse")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              activeSubTab === "browse"
                ? "bg-emerald-700 text-white shadow-xs"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            <Search className="w-4 h-4" />
            Browse Marketplace ({filteredListings.length})
          </button>

          <button
            onClick={() => setActiveSubTab("my-requests")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              activeSubTab === "my-requests"
                ? "bg-emerald-700 text-white shadow-xs"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            <Send className="w-4 h-4" />
            My Exchange Requests ({mySentRequests.length})
          </button>

          <button
            onClick={() => setActiveSubTab("incoming-requests")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              activeSubTab === "incoming-requests"
                ? "bg-emerald-700 text-white shadow-xs"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            <Inbox className="w-4 h-4" />
            Incoming Requests ({incomingRequests.length})
          </button>
        </div>
      </div>

      {/* TAB 1: BROWSE MARKETPLACE */}
      {activeSubTab === "browse" && (
        <div className="space-y-6">
          {isLoadingListings && (
            <div className="bg-white p-4 rounded-2xl border border-slate-200 text-center text-xs font-bold text-emerald-700 flex items-center justify-center gap-2">
              <RefreshCw className="w-4 h-4 animate-spin" />
              Loading exchange listings from Firestore...
            </div>
          )}
          {/* Search & Filter Controls */}
          <div className="bg-white rounded-2xl p-4 sm:p-6 border border-slate-200 shadow-xs space-y-4">
            <div className="flex flex-col md:flex-row gap-4 justify-between items-center">
              
              {/* Search Input */}
              <div className="relative w-full md:w-80">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search items (e.g. lamp, desk, blocks)..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                />
              </div>

              {/* Category Chips */}
              <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto pb-1 md:pb-0 scrollbar-none">
                {categories.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                      selectedCategory === cat
                        ? "bg-emerald-700 text-white shadow-xs"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>

            </div>
          </div>

          {/* Item Cards Grid / Empty State */}
          {filteredListings.length === 0 ? (
            <div className="bg-white rounded-2xl p-12 border border-slate-200 text-center space-y-4 shadow-xs">
              <div className="w-14 h-14 mx-auto rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <PackageCheck className="w-7 h-7" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-slate-800">
                  No items available for exchange
                </h3>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  {searchQuery || selectedCategory !== "All"
                    ? "No listings match your search or category filter."
                    : "Be the first to list a pre-loved item for community exchange!"}
                </p>
              </div>
              {!searchQuery && selectedCategory === "All" && (
                <button
                  onClick={() => {
                    if (!authUser) {
                      if (onOpenAuthModal) onOpenAuthModal();
                    } else {
                      setIsListingModalOpen(true);
                    }
                  }}
                  className="inline-flex items-center gap-2 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold px-4 py-2 rounded-xl transition-colors shadow-xs"
                >
                  <Plus className="w-4 h-4" />
                  List an Item for Exchange
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {filteredListings.map((item) => (
                <div 
                  key={item.id}
                  className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs hover:shadow-lg transition-all duration-200 flex flex-col group"
                >
                  <div className="relative h-48 bg-slate-100 overflow-hidden">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={item.image}
                      alt={item.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <span className="absolute top-3 left-3 bg-slate-900/80 backdrop-blur-md text-white text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider">
                      {item.category}
                    </span>
                    <span className="absolute top-3 right-3 bg-emerald-100 text-emerald-800 text-[10px] font-extrabold px-2.5 py-1 rounded-full border border-emerald-200">
                      {item.condition}
                    </span>
                  </div>

                  <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                    <div className="space-y-2">
                      <h3 className="font-bold text-slate-900 text-sm line-clamp-1 group-hover:text-emerald-700 transition-colors">
                        {item.title}
                      </h3>
                      <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
                        {item.description}
                      </p>
                    </div>

                    <div className="pt-3 border-t border-slate-100 space-y-3">
                      <div className="flex items-center justify-between text-[11px] text-slate-500">
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5 text-slate-400" />
                          {item.location}
                        </span>
                        <span className="flex items-center gap-1 text-slate-400">
                          <Clock className="w-3 h-3" />
                          {item.postedTime}
                        </span>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-xs text-slate-600 font-medium flex items-center gap-1.5">
                          <User className="w-3.5 h-3.5 text-emerald-600" />
                          {item.postedBy}
                        </span>

                        {item.status?.toLowerCase() === "reserved" ? (
                          <span className="text-xs font-bold text-purple-700 bg-purple-100 px-3 py-1 rounded-xl">
                            Reserved
                          </span>
                        ) : item.status?.toLowerCase() === "adopted" ? (
                          <span className="text-xs font-bold text-slate-600 bg-slate-200 px-3 py-1 rounded-xl">
                            Handover Completed
                          </span>
                        ) : isItemOwner(item) ? (
                          <span className="text-xs font-bold text-teal-700 bg-teal-100 px-3 py-1 rounded-xl flex items-center gap-1">
                            <User className="w-3.5 h-3.5" />
                            Listed by You
                          </span>
                        ) : hasUserRequested(item) ? (
                          <span className="text-xs font-bold text-amber-700 bg-amber-100 px-3 py-1 rounded-xl">
                            Request Pending
                          </span>
                        ) : (
                          <button
                            onClick={() => {
                              if (!authUser) {
                                if (onOpenAuthModal) onOpenAuthModal();
                              } else {
                                setSelectedRequestItem(item);
                              }
                            }}
                            className="bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold px-3.5 py-1.5 rounded-xl text-xs transition-colors flex items-center gap-1 border border-emerald-200"
                          >
                            <PackageCheck className="w-3.5 h-3.5" />
                            Request Item
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: MY EXCHANGE REQUESTS */}
      {activeSubTab === "my-requests" && (
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Send className="w-5 h-5 text-emerald-600" />
                My Sent Exchange Requests
              </h2>
              <p className="text-xs text-slate-500">Items you have requested from neighbors in the community</p>
            </div>
            <span className="text-xs font-extrabold bg-slate-100 text-slate-700 px-3 py-1 rounded-full">
              {mySentRequests.length} Requests
            </span>
          </div>

          {mySentRequests.length === 0 ? (
            <div className="py-12 text-center text-slate-500 space-y-2">
              <PackageCheck className="w-10 h-10 text-emerald-600 mx-auto" />
              <p className="font-bold text-sm">No Sent Requests Yet</p>
              <p className="text-xs text-slate-400">Browse the marketplace and click &quot;Request Item&quot; to request usable goods.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {mySentRequests.map((req) => {
                const normStatus = (req.status || "pending").toLowerCase();
                const reqIdStr = req.requestId || req.id || "";
                return (
                  <div key={reqIdStr} className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={req.itemImage || "https://images.unsplash.com/photo-1524758631624-e2822e304c36?auto=format&fit=crop&w=600&q=80"} alt={req.itemName} className="w-16 h-16 object-cover rounded-xl border" />
                      <div className="space-y-1 text-xs">
                        <span className="text-[10px] font-bold text-slate-400 uppercase">{reqIdStr} • {req.itemCategory || "General"}</span>
                        <h3 className="font-bold text-sm text-slate-900">{req.itemName}</h3>
                        <p className="text-slate-500">Listing Owner: <strong>{req.ownerName || req.owner || "Item Owner"}</strong> • {req.createdAt}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 self-end sm:self-center">
                      <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                        normStatus === "pending"
                          ? "bg-amber-100 text-amber-800 border border-amber-200"
                          : normStatus === "accepted"
                          ? "bg-blue-100 text-blue-800 border border-blue-200"
                          : normStatus === "rejected"
                          ? "bg-red-100 text-red-800 border border-red-200"
                          : "bg-emerald-100 text-emerald-800 border border-emerald-200"
                      }`}>
                        Status: {normStatus === "pending" ? "Pending Approval" : normStatus === "accepted" ? "Accepted (Item Reserved)" : normStatus === "rejected" ? "Rejected" : "Completed"}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: INCOMING REQUESTS */}
      {activeSubTab === "incoming-requests" && (
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Inbox className="w-5 h-5 text-emerald-600" />
                Incoming Item Requests
              </h2>
              <p className="text-xs text-slate-500">Requests from community members for items you have listed</p>
            </div>
            <span className="text-xs font-extrabold bg-slate-100 text-slate-700 px-3 py-1 rounded-full">
              {incomingRequests.length} Incoming
            </span>
          </div>

          {incomingRequests.length === 0 ? (
            <div className="py-12 text-center text-slate-500 space-y-2">
              <Inbox className="w-10 h-10 text-emerald-600 mx-auto" />
              <p className="font-bold text-sm">No Incoming Requests Right Now</p>
            </div>
          ) : (
            <div className="space-y-4">
              {incomingRequests.map((req) => {
                const normStatus = (req.status || "pending").toLowerCase();
                const reqIdStr = req.requestId || req.id || "";
                return (
                  <div key={reqIdStr} className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={req.itemImage || "https://images.unsplash.com/photo-1524758631624-e2822e304c36?auto=format&fit=crop&w=600&q=80"} alt={req.itemName} className="w-16 h-16 object-cover rounded-xl border" />
                      <div className="space-y-1 text-xs">
                        <span className="text-[10px] font-bold text-slate-400 uppercase">{reqIdStr} • {req.itemCategory || "General"}</span>
                        <h3 className="font-bold text-sm text-slate-900">{req.itemName}</h3>
                        <p className="text-slate-500">Requested by: <strong>{req.requesterName || req.requester || "Citizen Requester"}</strong> • {req.createdAt}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-center">
                      {normStatus === "pending" ? (
                        <>
                          <button
                            onClick={() => onUpdateExchangeStatus(reqIdStr, "accepted")}
                            className="bg-emerald-700 hover:bg-emerald-800 text-white font-bold px-3.5 py-1.5 rounded-xl text-xs transition-colors flex items-center gap-1"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Accept Request
                          </button>
                          <button
                            onClick={() => onUpdateExchangeStatus(reqIdStr, "rejected")}
                            className="bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold px-3 py-1.5 rounded-xl text-xs transition-colors flex items-center gap-1"
                          >
                            <XCircle className="w-3.5 h-3.5" />
                            Reject
                          </button>
                        </>
                      ) : (
                        <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                          normStatus === "accepted"
                            ? "bg-blue-100 text-blue-800 border border-blue-200"
                            : normStatus === "rejected"
                            ? "bg-red-100 text-red-800 border border-red-200"
                            : "bg-emerald-100 text-emerald-800 border border-emerald-200"
                        }`}>
                          Status: {normStatus === "accepted" ? "Accepted (Item Reserved)" : normStatus === "rejected" ? "Rejected" : "Completed"}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* List New Item Modal */}
      {isListingModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl space-y-6 relative border border-slate-100 animate-scaleUp max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => {
                setIsListingModalOpen(false);
                setNewImagePreview(null);
              }}
              className="absolute right-5 top-5 text-slate-400 hover:text-slate-700 p-1"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="space-y-1">
              <h2 className="text-xl font-extrabold text-slate-900 flex items-center gap-2">
                <Plus className="w-5 h-5 text-emerald-600" />
                List a Pre-Loved Usable Item
              </h2>
              <p className="text-xs text-slate-500">
                Provide details for your usable item so nearby community members can claim it.
              </p>
            </div>

            {!authUser && (
              <div className="bg-amber-50 border border-amber-200 text-amber-800 text-xs rounded-xl p-3.5 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Lock className="w-4 h-4 text-amber-600 flex-shrink-0" />
                  <span>Authentication required. Please log in to create a listing.</span>
                </div>
                {onOpenAuthModal && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsListingModalOpen(false);
                      onOpenAuthModal();
                    }}
                    className="px-3 py-1 bg-amber-600 text-white font-bold text-xs rounded-lg hover:bg-amber-700 transition-colors"
                  >
                    Log In / Sign Up
                  </button>
                )}
              </div>
            )}

            {formError && (
              <div className="bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-xl p-3 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleCreateListing} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Item Title
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Wooden Dining Chair"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-emerald-500"
                />
              </div>

              {/* Upload Item Image Field */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Upload Item Photo
                </label>
                <div className="relative border-2 border-dashed border-slate-300 hover:border-emerald-500 bg-slate-50 rounded-xl p-4 text-center cursor-pointer transition-all">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageSelect}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                  />
                  {newImagePreview ? (
                    <div className="relative max-h-36 mx-auto inline-block rounded-lg overflow-hidden shadow-xs">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={newImagePreview} alt="Item photo preview" className="max-h-36 rounded-lg object-cover mx-auto" />
                      <span className="absolute bottom-1 right-1 bg-slate-900/80 text-white text-[9px] font-bold px-2 py-0.5 rounded">
                        Photo Attached
                      </span>
                    </div>
                  ) : (
                    <div className="space-y-1 pointer-events-none">
                      <Upload className="w-6 h-6 text-slate-400 mx-auto" />
                      <p className="text-xs font-bold text-slate-700">Click to select item photo from device</p>
                      <p className="text-[10px] text-slate-400">PNG, JPG, WEBP</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Category
                  </label>
                  <select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-emerald-500"
                  >
                    <option value="Furniture">Furniture</option>
                    <option value="Home &amp; Lighting">Home &amp; Lighting</option>
                    <option value="Appliances">Appliances</option>
                    <option value="Toys &amp; Books">Toys &amp; Books</option>
                    <option value="Electronics">Electronics</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Condition
                  </label>
                  <select
                    value={newCondition}
                    onChange={(e) => setNewCondition(e.target.value as "Like New" | "Good" | "Fair")}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-emerald-500"
                  >
                    <option value="Like New">Like New</option>
                    <option value="Good">Good</option>
                    <option value="Fair">Fair</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Pickup Location / Ward
                </label>
                <input
                  type="text"
                  value={newLocation}
                  onChange={(e) => setNewLocation(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Description &amp; Pickup Instructions
                </label>
                <textarea
                  rows={3}
                  placeholder="Describe condition, dimensions, or preferred pickup times..."
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="pt-2 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setIsListingModalOpen(false);
                    setNewImagePreview(null);
                    setFormError(null);
                  }}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !authUser}
                  className="px-5 py-2.5 rounded-xl text-xs font-bold bg-emerald-700 hover:bg-emerald-800 text-white shadow-md disabled:opacity-50 flex items-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      Publishing...
                    </>
                  ) : (
                    "Publish Listing"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Request Item Modal */}
      {selectedRequestItem && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-5 relative border border-slate-100">
            <button
              onClick={() => setSelectedRequestItem(null)}
              className="absolute right-5 top-5 text-slate-400 hover:text-slate-700 p-1"
            >
              <X className="w-5 h-5" />
            </button>

            {requestSuccessMessage ? (
              <div className="py-8 text-center space-y-3">
                <PackageCheck className="w-12 h-12 text-emerald-600 mx-auto animate-bounce" />
                <h3 className="text-lg font-bold text-slate-900">Exchange Request Created!</h3>
                <p className="text-xs text-slate-500">
                  Request added to <strong>My Exchange Requests</strong>. Status is set to <strong>PENDING</strong>.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSendRequestSubmit} className="space-y-4">
                <div className="space-y-2">
                  <h3 className="text-lg font-extrabold text-slate-900">
                    Request Item Pickup
                  </h3>
                  <p className="text-xs text-slate-500">
                    You are requesting <strong>{selectedRequestItem.title}</strong> posted by {selectedRequestItem.postedBy}.
                  </p>
                </div>

                <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 flex gap-3 items-center">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img 
                    src={selectedRequestItem.image} 
                    alt={selectedRequestItem.title} 
                    className="w-14 h-14 object-cover rounded-lg border"
                  />
                  <div className="text-xs space-y-0.5">
                    <p className="font-bold text-slate-900">{selectedRequestItem.title}</p>
                    <p className="text-slate-500">{selectedRequestItem.location}</p>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Message to Owner
                  </label>
                  <textarea
                    rows={3}
                    value={customMessage}
                    onChange={(e) => setCustomMessage(e.target.value)}
                    placeholder={`Hi ${selectedRequestItem.postedBy}, I can pick up this item today between 4 PM - 7 PM!`}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedRequestItem(null)}
                    className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2.5 rounded-xl text-xs font-bold bg-emerald-700 hover:bg-emerald-800 text-white shadow-md flex items-center gap-1.5"
                  >
                    <MessageSquare className="w-4 h-4" />
                    Submit Pickup Request
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

    </div>
  );
};
