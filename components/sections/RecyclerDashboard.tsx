"use client";

import React, { useState } from "react";
import { 
  Recycle, 
  CheckCircle2, 
  Truck, 
  Clock, 
  MapPin, 
  User, 
  PackageCheck, 
  ArrowUpRight
} from "lucide-react";
import { WastePickupRequest, PickupStatus } from "@/types/pickup";
import { getStoredRecordImage } from "@/services/firestoreService";

interface RecyclerDashboardProps {
  pickupRequests: WastePickupRequest[];
  onUpdatePickupStatus: (requestId: string, newStatus: PickupStatus) => void;
}

export const RecyclerDashboard: React.FC<RecyclerDashboardProps> = ({
  pickupRequests,
  onUpdatePickupStatus,
}) => {
  const [statusFilter, setStatusFilter] = useState<string>("ALL");

  // Filter requests for recyclers (destinationType === "RECYCLER")
  const recyclerRequests = pickupRequests.filter(
    (req) => req.destinationType === "RECYCLER"
  );

  const filteredRequests = recyclerRequests.filter((req) => {
    if (statusFilter === "ALL") return true;
    return req.status === statusFilter;
  });

  const pendingCount = recyclerRequests.filter((r) => r.status === "PENDING").length;
  const enRouteCount = recyclerRequests.filter((r) => r.status === "EN_ROUTE" || r.status === "ACCEPTED").length;
  const completedCount = recyclerRequests.filter((r) => r.status === "COMPLETED").length;

  return (
    <div className="space-y-8 pb-12">
      
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-teal-950 via-slate-900 to-emerald-950 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 relative z-10">
          <div className="space-y-3 max-w-3xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-500/20 border border-teal-400/30 text-teal-300 text-xs font-bold uppercase tracking-wider">
              <Recycle className="w-3.5 h-3.5" />
              Certified Recycler &amp; Processing Facility Portal
            </div>
            <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight">
              Recycler Waste Pickup Command Center
            </h1>
            <p className="text-teal-100/80 text-sm sm:text-base leading-relaxed">
              Manage incoming citizen recycling requests for PET plastics, metals, paper, and e-waste. Coordinate pickup routes and verify material recovery to release citizen Eco Points.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-slate-800 border border-slate-700 text-white text-xs font-bold px-3.5 py-2.5 rounded-xl focus:outline-none focus:border-teal-500"
            >
              <option value="ALL">All Request Statuses</option>
              <option value="PENDING">Pending Pickups</option>
              <option value="ACCEPTED">Accepted</option>
              <option value="EN_ROUTE">En Route</option>
              <option value="COMPLETED">Completed</option>
            </select>
          </div>
        </div>
      </div>

      {/* Overview Statistics Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-2">
          <div className="flex justify-between items-center text-slate-500 text-xs font-bold uppercase">
            <span>Total Recycler Requests</span>
            <Recycle className="w-4 h-4 text-teal-600" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-slate-900">
            {recyclerRequests.length}
          </div>
          <p className="text-[11px] text-teal-600 font-semibold flex items-center gap-1">
            <ArrowUpRight className="w-3.5 h-3.5" />
            Active Recycling Channel
          </p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-2">
          <div className="flex justify-between items-center text-slate-500 text-xs font-bold uppercase">
            <span>Pending Pickups</span>
            <Clock className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-amber-600">
            {pendingCount}
          </div>
          <p className="text-[11px] text-slate-500 font-medium">Awaiting acceptance</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-2">
          <div className="flex justify-between items-center text-slate-500 text-xs font-bold uppercase">
            <span>En Route / Active</span>
            <Truck className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-blue-600">
            {enRouteCount}
          </div>
          <p className="text-[11px] text-slate-500 font-medium">Trucks dispatched</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-2">
          <div className="flex justify-between items-center text-slate-500 text-xs font-bold uppercase">
            <span>Completed Recoveries</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-emerald-700">
            {completedCount}
          </div>
          <p className="text-[11px] text-emerald-600 font-semibold">Points released</p>
        </div>
      </div>

      {/* Main Recycler Request Queue */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div>
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <PackageCheck className="w-5 h-5 text-teal-600" />
              Recycling Pickup Queue
            </h2>
            <p className="text-xs text-slate-500">Citizen requests routed directly to certified recyclers</p>
          </div>
          <span className="text-xs font-extrabold bg-teal-100 text-teal-800 px-3 py-1 rounded-full border border-teal-200">
            {filteredRequests.length} Requests
          </span>
        </div>

        {filteredRequests.length === 0 ? (
          <div className="py-12 text-center text-slate-500 space-y-2">
            <CheckCircle2 className="w-10 h-10 text-teal-600 mx-auto" />
            <p className="font-bold text-sm">No Recycling Pickup Requests in Queue</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredRequests.map((req) => {
              const reqImg = getStoredRecordImage("wasteRequest", req.pickupRequestId) || req.image || "https://images.unsplash.com/photo-1532996122724-e3c354a0b15b?auto=format&fit=crop&w=600&q=80";
              return (
                <div 
                  key={req.pickupRequestId}
                  className="p-5 rounded-2xl border border-slate-200 bg-slate-50/60 space-y-4 hover:border-teal-300 transition-colors"
                >
                  <div className="flex flex-col sm:flex-row items-start justify-between gap-4">
                    <div className="flex items-start gap-4">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img 
                        src={reqImg} 
                        alt={req.wasteItem} 
                        className="w-16 h-16 object-cover rounded-xl border border-slate-200 shadow-xs flex-shrink-0"
                      />
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-900">{req.pickupRequestId}</span>
                        <span className="bg-teal-100 text-teal-800 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full border border-teal-200">
                          {req.wasteCategory}
                        </span>
                      </div>
                      <h3 className="font-bold text-sm text-slate-900">{req.wasteItem}</h3>
                      <p className="text-xs text-slate-500 flex items-center gap-1">
                        <User className="w-3.5 h-3.5 text-teal-600" />
                        Citizen: <strong>{req.citizenName}</strong>
                      </p>
                    </div>
                  </div>

                  <div className="text-right space-y-1">
                    <span className="text-[11px] text-slate-400 font-medium block">{req.createdAt}</span>
                    <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold ${
                      req.status === "PENDING"
                        ? "bg-amber-100 text-amber-800 border border-amber-200"
                        : req.status === "ACCEPTED"
                        ? "bg-blue-100 text-blue-800 border border-blue-200"
                        : req.status === "EN_ROUTE"
                        ? "bg-purple-100 text-purple-800 border border-purple-200"
                        : "bg-emerald-100 text-emerald-800 border border-emerald-200"
                    }`}>
                      Status: {req.status}
                    </span>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pt-3 border-t border-slate-200/80 gap-3 text-xs">
                  <span className="flex items-center gap-1 text-slate-600">
                    <MapPin className="w-3.5 h-3.5 text-red-500" />
                    Pickup Location: <strong>{req.location}</strong>
                  </span>

                  <div className="flex items-center gap-2">
                    {req.status === "PENDING" && (
                      <button
                        onClick={() => onUpdatePickupStatus(req.pickupRequestId, "ACCEPTED")}
                        className="bg-teal-700 hover:bg-teal-800 text-white font-bold px-3.5 py-1.5 rounded-xl text-xs shadow-xs transition-colors flex items-center gap-1"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Accept Recycling Pickup
                      </button>
                    )}

                    {req.status === "ACCEPTED" && (
                      <button
                        onClick={() => onUpdatePickupStatus(req.pickupRequestId, "EN_ROUTE")}
                        className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-3.5 py-1.5 rounded-xl text-xs shadow-xs transition-colors flex items-center gap-1"
                      >
                        <Truck className="w-3.5 h-3.5" />
                        Mark Truck En Route
                      </button>
                    )}

                    {req.status === "EN_ROUTE" && (
                      <button
                        onClick={() => onUpdatePickupStatus(req.pickupRequestId, "COMPLETED")}
                        className="bg-emerald-700 hover:bg-emerald-800 text-white font-bold px-3.5 py-1.5 rounded-xl text-xs shadow-xs transition-colors flex items-center gap-1"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Mark Collected &amp; Release Eco Points
                      </button>
                    )}

                    {req.status === "COMPLETED" && (
                      <span className="text-xs font-bold text-emerald-700 flex items-center gap-1">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        Completed &amp; Eco Points Released
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
          </div>
        )}
      </div>

    </div>
  );
};
