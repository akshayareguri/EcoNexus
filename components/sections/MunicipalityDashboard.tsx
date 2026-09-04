"use client";

import React, { useState } from "react";
import { 
  Building2, 
  AlertTriangle, 
  MapPin, 
  Truck, 
  CheckCircle2, 
  Clock, 
  BarChart3, 
  PieChart, 
  ShieldAlert, 
  ArrowUpRight,
  Map,
  Sparkles,
  UserCheck,
  Loader2
} from "lucide-react";
import { WasteComplaint, ComplaintStatus, ComplaintPriority } from "@/types/complaint";
import { WastePickupRequest, PickupStatus } from "@/types/pickup";
import { WasteReport } from "@/types/wasteReport";
import { WasteRequest } from "@/types/wasteRequest";
import { getStoredRecordImage } from "@/services/firestoreService";

interface MunicipalityDashboardProps {
  complaints?: WasteComplaint[];
  pickupRequests?: WastePickupRequest[];
  wasteReports?: WasteReport[];
  wasteRequests?: WasteRequest[];
  isLoading?: boolean;
  error?: string | null;
  onUpdateComplaintStatus?: (id: string, newStatus: ComplaintStatus, assignedCrew?: string) => void;
  onUpdatePickupStatus?: (requestId: string, newStatus: PickupStatus) => void;
  onUpdateWasteReportStatus?: (reportId: string, status: string, assignedCrew?: string) => void;
  onUpdateWasteRequestStatus?: (requestId: string, status: string) => void;
}

interface DisplayComplaint {
  id: string;
  photo: string;
  location: string;
  ward: string;
  detectedIssue: string;
  description?: string;
  reporterName?: string;
  reporterId?: string;
  severityScore: number;
  priority: ComplaintPriority;
  status: ComplaintStatus;
  rawStatus?: string;
  submittedAt: string;
  assignedCrew: string;
  pointsEarned: number;
}

interface DisplaySafeDisposal {
  pickupRequestId: string;
  wasteItem: string;
  wasteCategory: string;
  recommendedAction: "SAFE_DISPOSAL";
  destinationType: "MUNICIPALITY";
  destinationId: string;
  destinationName: string;
  citizenName: string;
  userId?: string;
  location: string;
  image: string;
  status: PickupStatus;
  rawStatus?: string;
  createdAt: string;
  pointsEarned: number;
}

function getPriorityRank(priority?: string): number {
  const p = (priority || "").toUpperCase();
  if (p === "CRITICAL") return 4;
  if (p === "HIGH") return 3;
  if (p === "MEDIUM") return 2;
  if (p === "LOW") return 1;
  return 0;
}

export const MunicipalityDashboard: React.FC<MunicipalityDashboardProps> = ({
  complaints = [],
  pickupRequests = [],
  wasteReports,
  wasteRequests,
  isLoading = false,
  error = null,
  onUpdateComplaintStatus,
  onUpdatePickupStatus,
  onUpdateWasteReportStatus,
  onUpdateWasteRequestStatus,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<"complaints" | "safe-disposal">("complaints");
  const [selectedWardFilter, setSelectedWardFilter] = useState<string>("All Wards");

  // Determine if using Firestore wasteReports
  const hasFirestoreReports = Array.isArray(wasteReports) && wasteReports.length > 0;
  // Determine if using Firestore wasteRequests
  const hasFirestoreRequests = Array.isArray(wasteRequests) && wasteRequests.length > 0;

  // Unified complaints list
  const displayComplaints: DisplayComplaint[] = hasFirestoreReports
    ? wasteReports.map((rep) => {
        const normPriority = (rep.priority || "high").toUpperCase() as ComplaintPriority;
        const rawStatus = (rep.status || "reported").toLowerCase();
        let normStatus: ComplaintStatus = "Reported";
        if (rawStatus === "assigned") normStatus = "Assigned";
        else if (rawStatus === "en_route" || rawStatus === "en route") normStatus = "En Route";
        else if (rawStatus === "resolved" || rawStatus === "collected/resolved" || rawStatus === "completed") normStatus = "Collected/Resolved";

        let ward = "Ward 1";
        if (rep.location) {
          const wardMatch = rep.location.match(/Ward\s*\d+/i);
          if (wardMatch) ward = wardMatch[0];
        }

        const repId = rep.reportId || rep.id || "REP-UNKNOWN";
        const storedImage = getStoredRecordImage("wasteReport", repId);
        const resolvedPhoto = storedImage || rep.imageUrl || "https://images.unsplash.com/photo-1530587191325-3db32d826c18?auto=format&fit=crop&w=600&q=80";

        return {
          id: repId,
          photo: resolvedPhoto,
          location: rep.location || "Community Ward",
          ward,
          detectedIssue: rep.issueType + (rep.description ? `: ${rep.description}` : ""),
          description: rep.description,
          reporterName: rep.reporterName || "Eco Citizen",
          reporterId: rep.reporterId,
          severityScore: normPriority === "CRITICAL" ? 94 : normPriority === "HIGH" ? 78 : normPriority === "MEDIUM" ? 52 : 28,
          priority: normPriority,
          status: normStatus,
          rawStatus: rep.status,
          submittedAt: rep.createdAt ? (rep.createdAt.includes("T") ? new Date(rep.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : rep.createdAt) : "Recently",
          assignedCrew: (rep as unknown as { assignedCrew?: string }).assignedCrew || "Unassigned",
          pointsEarned: 10,
        };
      })
    : complaints.map((c) => ({
        ...c,
        photo: getStoredRecordImage("wasteReport", c.id) || c.photo,
        reporterName: "Eco Citizen",
        rawStatus: c.status,
      }));

  // Unified safe disposal requests list
  const firestoreSafeDisposals = hasFirestoreRequests
    ? wasteRequests.filter((r) => r.action === "safe_disposal")
    : [];

  const legacySafeDisposals = pickupRequests.filter(
    (req) => req.destinationType === "MUNICIPALITY"
  );

  const displaySafeDisposals: DisplaySafeDisposal[] = (hasFirestoreRequests && firestoreSafeDisposals.length > 0)
    ? firestoreSafeDisposals.map((req) => {
        const rawStatus = (req.status || "pending").toUpperCase();
        let normStatus: PickupStatus = "PENDING";
        if (rawStatus === "ACCEPTED") normStatus = "ACCEPTED";
        else if (rawStatus === "EN_ROUTE" || rawStatus === "EN ROUTE") normStatus = "EN_ROUTE";
        else if (rawStatus === "COMPLETED" || rawStatus === "COLLECTED" || rawStatus === "RESOLVED") normStatus = "COMPLETED";

        const reqId = req.requestId || req.id || "REQ-UNKNOWN";
        const storedImage = getStoredRecordImage("wasteRequest", reqId);
        const resolvedImage = storedImage || (req as unknown as { image?: string }).image || "https://images.unsplash.com/photo-1619725002198-6a689b72f41d?auto=format&fit=crop&w=600&q=80";

        return {
          pickupRequestId: reqId,
          wasteItem: req.itemName,
          wasteCategory: req.category || "Hazardous Waste",
          recommendedAction: "SAFE_DISPOSAL" as const,
          destinationType: "MUNICIPALITY" as const,
          destinationId: "muni-hhw-team",
          destinationName: "Municipal HHW Fleet",
          citizenName: req.userName || "Eco Citizen",
          userId: req.userId,
          location: req.location || "Community Ward",
          image: resolvedImage,
          status: normStatus,
          rawStatus: req.status,
          createdAt: req.createdAt ? (req.createdAt.includes("T") ? new Date(req.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : req.createdAt) : "Recently",
          pointsEarned: 15,
        };
      })
    : legacySafeDisposals.map((r) => ({
        ...r,
        image: getStoredRecordImage("wasteRequest", r.pickupRequestId) || r.image,
        recommendedAction: "SAFE_DISPOSAL" as const,
        destinationType: "MUNICIPALITY" as const,
        rawStatus: r.status,
      }));

  const filteredComplaints = displayComplaints.filter((item) => {
    if (selectedWardFilter === "All Wards") return true;
    return item.ward === selectedWardFilter;
  });

  // Sort active queue by Priority: CRITICAL -> HIGH -> MEDIUM -> LOW
  const activeQueue = filteredComplaints
    .filter((item) => item.status !== "Collected/Resolved")
    .sort((a, b) => {
      const rankA = getPriorityRank(a.priority);
      const rankB = getPriorityRank(b.priority);
      if (rankA !== rankB) return rankB - rankA;
      return 0;
    });

  const resolvedCount = displayComplaints.filter(
    (item) => item.status === "Collected/Resolved"
  ).length;

  const resolutionRate = displayComplaints.length > 0
    ? ((resolvedCount / displayComplaints.length) * 100).toFixed(1)
    : "100.0";

  const criticalAlerts = displayComplaints.filter(
    (c) => (c.priority === "CRITICAL" || c.priority === ("critical" as unknown)) && c.status !== "Collected/Resolved"
  ).length;

  // Ward counts computation
  const wardStats = ["Ward 1", "Ward 2", "Ward 3", "Ward 4"].map((ward) => {
    const wardComplaints = displayComplaints.filter((c) => c.ward === ward);
    const count = wardComplaints.length;
    const maxCount = Math.max(1, displayComplaints.length);
    const pct = Math.round((count / maxCount) * 100);
    const urgency = count >= 3 ? "High" : count >= 1 ? "Moderate" : "Low";
    return { ward, count, urgency, pct };
  });

  const handleUpdateReport = (id: string, nextStatus: string, crew?: string) => {
    if (onUpdateWasteReportStatus) {
      onUpdateWasteReportStatus(id, nextStatus, crew);
    } else if (onUpdateComplaintStatus) {
      let legacyStatus: ComplaintStatus = "Reported";
      if (nextStatus === "assigned") legacyStatus = "Assigned";
      else if (nextStatus === "en_route") legacyStatus = "En Route";
      else if (nextStatus === "resolved" || nextStatus === "Collected/Resolved") legacyStatus = "Collected/Resolved";
      onUpdateComplaintStatus(id, legacyStatus, crew);
    }
  };

  const handleUpdateWasteReq = (id: string, nextStatus: string) => {
    if (onUpdateWasteRequestStatus) {
      onUpdateWasteRequestStatus(id, nextStatus);
    } else if (onUpdatePickupStatus) {
      let legacyStatus: PickupStatus = "PENDING";
      const u = nextStatus.toUpperCase();
      if (u === "ACCEPTED") legacyStatus = "ACCEPTED";
      else if (u === "EN_ROUTE") legacyStatus = "EN_ROUTE";
      else if (u === "COMPLETED") legacyStatus = "COMPLETED";
      onUpdatePickupStatus(id, legacyStatus);
    }
  };

  return (
    <div className="space-y-8 pb-12">
      
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-emerald-950 to-teal-950 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 relative z-10">
          <div className="space-y-3 max-w-3xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 text-xs font-bold uppercase tracking-wider">
              <Building2 className="w-3.5 h-3.5" />
              Municipal Authority Command Center
            </div>
            <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight">
              Municipality Fleet &amp; Waste Triage
            </h1>
            <p className="text-emerald-100/80 text-sm sm:text-base leading-relaxed">
              Real-time municipal dispatch dashboard. Manages public waste complaints and direct safe-disposal pickup requests for household hazardous waste.
            </p>
          </div>

          <div className="flex items-center gap-3">
            {isLoading && (
              <span className="flex items-center gap-1.5 bg-emerald-500/20 text-emerald-300 text-xs font-bold px-3 py-1.5 rounded-full border border-emerald-500/30">
                <Loader2 className="w-3.5 h-3.5 animate-spin" /> Live Syncing...
              </span>
            )}
            <select
              value={selectedWardFilter}
              onChange={(e) => setSelectedWardFilter(e.target.value)}
              className="bg-slate-800 border border-slate-700 text-white text-xs font-bold px-3.5 py-2.5 rounded-xl focus:outline-none focus:border-emerald-500"
            >
              <option value="All Wards">All Wards (Citywide)</option>
              <option value="Ward 1">Ward 1 - North District</option>
              <option value="Ward 2">Ward 2 - Greenwood</option>
              <option value="Ward 3">Ward 3 - Metro Central</option>
              <option value="Ward 4">Ward 4 - Oakridge</option>
            </select>
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-2xl text-xs font-semibold flex items-center justify-between">
          <span>Failed to load municipal data from Firestore: {error}</span>
        </div>
      )}

      {/* KPI Overview Statistics Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-2">
          <div className="flex justify-between items-center text-slate-500 text-xs font-bold uppercase">
            <span>Public Complaints</span>
            <AlertTriangle className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-slate-900">
            {displayComplaints.length}
          </div>
          <p className="text-[11px] text-emerald-600 font-semibold flex items-center gap-1">
            <ArrowUpRight className="w-3.5 h-3.5" />
            Report Waste Issue stream
          </p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-2">
          <div className="flex justify-between items-center text-slate-500 text-xs font-bold uppercase">
            <span>Safe Disposal Requests</span>
            <ShieldAlert className="w-4 h-4 text-red-600" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-red-600">
            {displaySafeDisposals.length}
          </div>
          <p className="text-[11px] text-slate-500 font-medium">HHW &amp; Battery Pickups</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-2">
          <div className="flex justify-between items-center text-slate-500 text-xs font-bold uppercase">
            <span>Resolution Rate</span>
            <CheckCircle2 className="w-4 h-4 text-teal-600" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-slate-900">
            {resolutionRate}%
          </div>
          <p className="text-[11px] text-teal-600 font-semibold">
            {resolvedCount} resolved of {displayComplaints.length} total
          </p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-2">
          <div className="flex justify-between items-center text-slate-500 text-xs font-bold uppercase">
            <span>Critical AI Alerts</span>
            <Clock className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-amber-600">
            {criticalAlerts}
          </div>
          <p className="text-[11px] text-emerald-600 font-semibold">Active high priority</p>
        </div>
      </div>

      {/* View Switcher Sub-Tabs */}
      <div className="flex items-center gap-2 bg-white p-2 rounded-2xl border border-slate-200 shadow-xs">
        <button
          onClick={() => setActiveSubTab("complaints")}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
            activeSubTab === "complaints"
              ? "bg-slate-900 text-white shadow-xs"
              : "text-slate-600 hover:bg-slate-100"
          }`}
        >
          <AlertTriangle className="w-4 h-4 text-amber-400" />
          Public Waste Complaints ({displayComplaints.length})
        </button>

        <button
          onClick={() => setActiveSubTab("safe-disposal")}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
            activeSubTab === "safe-disposal"
              ? "bg-red-700 text-white shadow-xs"
              : "text-slate-600 hover:bg-slate-100"
          }`}
        >
          <ShieldAlert className="w-4 h-4 text-red-200" />
          Safe Disposal HHW Pickups ({displaySafeDisposals.length})
        </button>
      </div>

      {/* STREAM 1: PUBLIC WASTE COMPLAINTS */}
      {activeSubTab === "complaints" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* AI Priority Queue */}
          <div className="lg:col-span-7 space-y-6">
            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-4">
              
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div>
                  <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-emerald-600" />
                    AI Priority Queue (Public Complaints)
                  </h2>
                  <p className="text-xs text-slate-500">Sorted by priority (Critical &rarr; High &rarr; Medium &rarr; Low)</p>
                </div>
                <span className="text-xs font-extrabold bg-slate-100 text-slate-700 px-3 py-1 rounded-full">
                  {activeQueue.length} Active Queue Items
                </span>
              </div>

              <div className="space-y-4">
                {isLoading && activeQueue.length === 0 ? (
                  <div className="py-12 text-center text-slate-500 space-y-3">
                    <Loader2 className="w-8 h-8 text-emerald-600 animate-spin mx-auto" />
                    <p className="text-xs font-semibold">Fetching public waste complaints from Firestore...</p>
                  </div>
                ) : activeQueue.length === 0 ? (
                  <div className="py-12 text-center text-slate-500 space-y-2">
                    <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto" />
                    <p className="font-bold text-sm">All Priority Public Complaints Collected / Resolved!</p>
                  </div>
                ) : (
                  activeQueue.map((item) => (
                    <div 
                      key={item.id}
                      className="p-4 rounded-xl border border-slate-200 bg-slate-50/60 space-y-3 hover:border-slate-300 transition-colors"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-3">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img 
                            src={item.photo} 
                            alt={item.id} 
                            className="w-14 h-14 object-cover rounded-lg border border-slate-200 shadow-xs flex-shrink-0" 
                          />
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold text-slate-900">{item.id}</span>
                              <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold uppercase ${
                                item.priority === "CRITICAL" ? "bg-red-600 text-white" : item.priority === "HIGH" ? "bg-amber-600 text-white" : "bg-blue-600 text-white"
                              }`}>
                                {item.priority} (Severity: {item.severityScore})
                              </span>
                            </div>
                            <h3 className="font-bold text-sm text-slate-900">{item.detectedIssue}</h3>
                            {item.reporterName && (
                              <p className="text-[11px] text-slate-500">Citizen Reporter: <strong>{item.reporterName}</strong></p>
                            )}
                          </div>
                        </div>
                        <span className="text-[11px] text-slate-400 font-medium">{item.submittedAt}</span>
                      </div>

                      <div className="flex items-center justify-between text-xs text-slate-600">
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5 text-red-500" />
                          {item.location} ({item.ward})
                        </span>
                        <span className="font-semibold text-slate-700">
                          Crew: {item.assignedCrew}
                        </span>
                      </div>

                      <div className="pt-3 border-t border-slate-200/80 flex items-center justify-between">
                        <span className={`text-xs font-bold ${
                          item.status === "Reported" || item.rawStatus === "reported" || item.status === "AI Triaged"
                            ? "text-red-600"
                            : item.status === "Assigned" || item.rawStatus === "assigned"
                            ? "text-blue-600"
                            : item.status === "En Route" || item.rawStatus === "en_route"
                            ? "text-amber-700"
                            : "text-emerald-700"
                        }`}>
                          Status: {item.status}
                        </span>

                        <div className="flex items-center gap-2">
                          {(item.status === "Reported" || item.rawStatus === "reported" || item.status === "AI Triaged") && (
                            <button
                              onClick={() => handleUpdateReport(item.id, "assigned", "Crew #1 (Fleet Truck T-01)")}
                              className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-3 py-1.5 rounded-lg text-xs shadow-xs transition-colors flex items-center gap-1"
                            >
                              <UserCheck className="w-3.5 h-3.5" />
                              Assign Crew
                            </button>
                          )}

                          {(item.status === "Assigned" || item.rawStatus === "assigned") && (
                            <button
                              onClick={() => handleUpdateReport(item.id, "en_route", "Fleet Truck T-01 (En Route)")}
                              className="bg-amber-600 hover:bg-amber-700 text-white font-bold px-3 py-1.5 rounded-lg text-xs shadow-xs transition-colors flex items-center gap-1"
                            >
                              <Truck className="w-3.5 h-3.5" />
                              Dispatch Fleet
                            </button>
                          )}

                          {item.status !== "Collected/Resolved" && item.rawStatus !== "resolved" && item.rawStatus !== "Collected/Resolved" && (
                            <button
                              onClick={() => handleUpdateReport(item.id, "resolved")}
                              className="bg-emerald-700 hover:bg-emerald-800 text-white font-bold px-3 py-1.5 rounded-lg text-xs shadow-xs transition-colors flex items-center gap-1"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              Mark Collected/Resolved
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>

            </div>

            {/* Ward Breakdown Cards */}
            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-4">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-3">
                <BarChart3 className="w-5 h-5 text-emerald-600" />
                Complaints by Municipal Ward
              </h3>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {wardStats.map((w) => (
                  <div key={w.ward} className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-bold text-slate-800">{w.ward}</span>
                      <span className="text-[10px] font-bold text-slate-500">{w.count} reports</span>
                    </div>
                    <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
                      <div className="bg-emerald-600 h-1.5 rounded-full" style={{ width: `${Math.max(10, w.pct)}%` }} />
                    </div>
                    <span className="text-[10px] font-semibold text-slate-500 block">Density: {w.urgency}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right Column: GIS Map */}
          <div className="lg:col-span-5 space-y-6">
            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Map className="w-5 h-5 text-emerald-600" />
                  Waste Complaint GIS Map
                </h3>
                <span className="text-xs font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                  Live Hotspots
                </span>
              </div>

              <div className="relative h-64 bg-slate-900 rounded-2xl overflow-hidden border border-slate-800 flex items-center justify-center p-4 group">
                <div className="absolute inset-0 bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:16px_16px] opacity-60" />
                
                <div className="absolute top-1/4 left-1/3 flex items-center gap-1.5 bg-red-600/90 text-white text-[10px] font-bold px-2 py-1 rounded-full shadow-lg border border-red-400 animate-pulse cursor-pointer">
                  <MapPin className="w-3 h-3" />
                  Ward 3 Spill ({criticalAlerts} Critical)
                </div>

                <div className="absolute bottom-1/3 right-1/4 flex items-center gap-1.5 bg-amber-500/90 text-white text-[10px] font-bold px-2 py-1 rounded-full shadow-lg border border-amber-300 cursor-pointer">
                  <MapPin className="w-3 h-3" />
                  Ward 1 Park (En Route)
                </div>

                <div className="relative z-10 text-center space-y-1 bg-slate-950/80 backdrop-blur-md p-3.5 rounded-xl border border-slate-800 max-w-xs">
                  <p className="text-xs font-bold text-white">GIS Spatial Incident Overlay</p>
                  <p className="text-[10px] text-slate-400">Interactive ward mapping layer active. Displays {displayComplaints.length} synchronized citizen reports.</p>
                </div>
              </div>
            </div>

            {/* Waste Category Split */}
            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-4">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-3">
                <PieChart className="w-5 h-5 text-emerald-600" />
                Waste Category Split
              </h3>

              <div className="space-y-3">
                {[
                  { label: "Plastics & Packaging", pct: 38, color: "bg-emerald-600" },
                  { label: "Hazardous & Solvents", pct: 24, color: "bg-red-600" },
                  { label: "E-Waste & Batteries", pct: 18, color: "bg-amber-600" },
                  { label: "Organic / Yard Waste", pct: 12, color: "bg-teal-600" },
                  { label: "Construction Debris", pct: 8, color: "bg-slate-600" },
                ].map((cat) => (
                  <div key={cat.label} className="space-y-1">
                    <div className="flex justify-between text-xs font-semibold text-slate-700">
                      <span>{cat.label}</span>
                      <span>{cat.pct}%</span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                      <div className={`${cat.color} h-2 rounded-full`} style={{ width: `${cat.pct}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

        </div>
      )}

      {/* STREAM 2: SAFE DISPOSAL PICKUP REQUESTS FOR MUNICIPALITY */}
      {activeSubTab === "safe-disposal" && (
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-red-600" />
                Safe Disposal HHW Collection Requests
              </h2>
              <p className="text-xs text-slate-500">Citizen requests generated from &quot;Manage My Waste&quot; for hazardous batteries &amp; chemical disposal</p>
            </div>
            <span className="text-xs font-extrabold bg-red-100 text-red-800 px-3 py-1 rounded-full border border-red-200">
              {displaySafeDisposals.length} Requests
            </span>
          </div>

          {isLoading && displaySafeDisposals.length === 0 ? (
            <div className="py-12 text-center text-slate-500 space-y-3">
              <Loader2 className="w-8 h-8 text-red-600 animate-spin mx-auto" />
              <p className="text-xs font-semibold">Fetching safe disposal requests from Firestore...</p>
            </div>
          ) : displaySafeDisposals.length === 0 ? (
            <div className="py-12 text-center text-slate-500 space-y-2">
              <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto" />
              <p className="font-bold text-sm">No Pending Safe Disposal Pickup Requests</p>
            </div>
          ) : (
            <div className="space-y-4">
              {displaySafeDisposals.map((req) => (
                <div 
                  key={req.pickupRequestId}
                  className="p-5 rounded-2xl border border-slate-200 bg-slate-50/60 space-y-4 hover:border-red-300 transition-colors"
                >
                  <div className="flex flex-col sm:flex-row items-start justify-between gap-4">
                    <div className="flex items-start gap-4">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img 
                        src={req.image} 
                        alt={req.wasteItem} 
                        className="w-16 h-16 object-cover rounded-xl border border-slate-200 shadow-xs flex-shrink-0"
                      />
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-slate-900">{req.pickupRequestId}</span>
                          <span className="bg-red-100 text-red-800 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full border border-red-200">
                            HAZARDOUS: {req.wasteCategory}
                          </span>
                        </div>
                        <h3 className="font-bold text-sm text-slate-900">{req.wasteItem}</h3>
                        <p className="text-xs text-slate-500">Citizen: <strong>{req.citizenName}</strong> • {req.location}</p>
                      </div>
                    </div>

                    <div className="text-right space-y-1">
                      <span className="text-[11px] text-slate-400 font-medium block">{req.createdAt}</span>
                      <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold ${
                        req.status === "PENDING" || req.rawStatus === "pending"
                          ? "bg-amber-100 text-amber-800 border border-amber-200"
                          : req.status === "ACCEPTED" || req.rawStatus === "accepted"
                          ? "bg-blue-100 text-blue-800 border border-blue-200"
                          : req.status === "EN_ROUTE" || req.rawStatus === "en_route"
                          ? "bg-purple-100 text-purple-800 border border-purple-200"
                          : "bg-emerald-100 text-emerald-800 border border-emerald-200"
                      }`}>
                        Status: {req.status}
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pt-3 border-t border-slate-200/80 gap-3 text-xs">
                    <span className="text-slate-600">
                      Destination Team: <strong>{req.destinationName}</strong>
                    </span>

                    <div className="flex items-center gap-2">
                      {(req.status === "PENDING" || req.rawStatus === "pending") && (
                        <button
                          onClick={() => handleUpdateWasteReq(req.pickupRequestId, "accepted")}
                          className="bg-red-600 hover:bg-red-700 text-white font-bold px-3.5 py-1.5 rounded-xl text-xs shadow-xs transition-colors flex items-center gap-1"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Accept Safe Disposal Pickup
                        </button>
                      )}

                      {(req.status === "ACCEPTED" || req.rawStatus === "accepted") && (
                        <button
                          onClick={() => handleUpdateWasteReq(req.pickupRequestId, "en_route")}
                          className="bg-purple-600 hover:bg-purple-700 text-white font-bold px-3.5 py-1.5 rounded-xl text-xs shadow-xs transition-colors flex items-center gap-1"
                        >
                          <Truck className="w-3.5 h-3.5" />
                          Dispatch HHW Fleet
                        </button>
                      )}

                      {(req.status === "EN_ROUTE" || req.rawStatus === "en_route") && (
                        <button
                          onClick={() => handleUpdateWasteReq(req.pickupRequestId, "completed")}
                          className="bg-emerald-700 hover:bg-emerald-800 text-white font-bold px-3.5 py-1.5 rounded-xl text-xs shadow-xs transition-colors flex items-center gap-1"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Mark Collected &amp; Release Eco Points
                        </button>
                      )}

                      {(req.status === "COMPLETED" || req.rawStatus === "completed") && (
                        <span className="text-xs font-bold text-emerald-700 flex items-center gap-1">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                          Collected &amp; Eco Points Released
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

    </div>
  );
};
