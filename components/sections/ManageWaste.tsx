"use client";

import React, { useState } from "react";
import { 
  Upload, 
  Sparkles, 
  Recycle, 
  CheckCircle2, 
  Info, 
  ShieldAlert,
  Lightbulb,
  FileImage,
  ChevronRight,
  Send,
  Building2,
  Truck,
  RefreshCw,
  AlertCircle,
  Lock
} from "lucide-react";
import { User as FirebaseUser } from "firebase/auth";
import { UserProfile } from "@/services/authService";
import { WastePickupRequest } from "@/types/pickup";
import { WasteRequest } from "@/types/wasteRequest";
import { analyzeWasteImage, WasteAnalysisResult, RECYCLER_DIRECTORY } from "@/services/wasteAnalysisService";
import { 
  saveWasteAnalysisRecordToFirestore, 
  saveWasteRequestToFirestore,
  compressImageDataUrl,
  saveRecordImageToLocalStorage
} from "@/services/firestoreService";

interface ManageWasteProps {
  onRequestPickup?: (request: WastePickupRequest) => void;
  onAwardPoints?: (userId: string, type: string, points: number, description: string, referenceId: string) => Promise<void> | void;
  authUser?: FirebaseUser | null;
  userProfile?: UserProfile | null;
  onOpenAuthModal?: () => void;
}

export const ManageWaste: React.FC<ManageWasteProps> = ({ 
  onRequestPickup,
  onAwardPoints,
  authUser,
  userProfile,
  onOpenAuthModal
}) => {
  const [uploadedImageSrc, setUploadedImageSrc] = useState<string | null>(null);
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<WasteAnalysisResult | null>(null);

  // Recycler selection & pickup state
  const [selectedRecyclerId, setSelectedRecyclerId] = useState<string>(RECYCLER_DIRECTORY.plastics.id);
  const [pickupRequested, setPickupRequested] = useState(false);
  const [upcycleCompleted, setUpcycleCompleted] = useState(false);
  const [lastRequestId, setLastRequestId] = useState<string | null>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [requestError, setRequestError] = useState<string | null>(null);
  const [analysisError, setAnalysisError] = useState<string | null>(null);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setUploadedFileName(file.name);
      setPickupRequested(false);
      setRequestError(null);
      setAnalysisError(null);
      setIsAnalyzing(true);
      setAnalysisResult(null);

      const reader = new FileReader();
      reader.onloadend = async () => {
        if (typeof reader.result === "string") {
          const rawDataUrl = reader.result;
          const compressed = await compressImageDataUrl(rawDataUrl, 400, 400, 0.7);
          setUploadedImageSrc(compressed);

          try {
            // Trigger Featherless AI waste analysis server endpoint
            const result = await analyzeWasteImage(rawDataUrl, file.name);
            setAnalysisResult(result);
            saveWasteAnalysisRecordToFirestore(result);
            if (result.recycleDetails?.assignedRecycler) {
              setSelectedRecyclerId(result.recycleDetails.assignedRecycler.id);
            }
          } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : "Failed to analyze image using Featherless AI.";
            console.error("ManageWaste analysis error:", msg);
            setAnalysisError(msg);
          } finally {
            setIsAnalyzing(false);
          }
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleReset = () => {
    setUploadedImageSrc(null);
    setUploadedFileName(null);
    setAnalysisResult(null);
    setPickupRequested(false);
    setLastRequestId(null);
    setRequestError(null);
    setAnalysisError(null);
  };

  const handleCreateWasteRequest = async () => {
    if (!analysisResult) return;
    setRequestError(null);

    // "Put to Another Use" should NOT create a waste collection request
    if (analysisResult.recommendedAction === "REUSE") {
      return;
    }

    if (!authUser) {
      setRequestError("You must be logged in to create a waste collection request.");
      if (onOpenAuthModal) onOpenAuthModal();
      return;
    }

    setIsSubmitting(true);
    try {
      const isRecycle = analysisResult.recommendedAction === "RECYCLE";
      const actionType = isRecycle ? "recycle" : "safe_disposal";
      const userName = userProfile?.displayName || authUser.displayName || authUser.email?.split("@")[0] || "Eco Citizen";
      const reqId = `WASTE-REQ-${Math.floor(1000 + Math.random() * 9000)}`;
      const nowIso = new Date().toISOString();

      let finalCompressed = uploadedImageSrc || undefined;
      if (uploadedImageSrc && uploadedImageSrc.startsWith("data:image/")) {
        finalCompressed = await compressImageDataUrl(uploadedImageSrc, 400, 400, 0.7);
        saveRecordImageToLocalStorage("wasteRequest", reqId, finalCompressed);
      }

      const wasteReq: WasteRequest = {
        id: reqId,
        requestId: reqId,
        userId: authUser.uid,
        userName: userName,
        action: actionType,
        itemName: analysisResult.itemName,
        category: analysisResult.category,
        location: "742 Evergreen Terrace, Ward 2",
        status: "pending",
        imageUrl: finalCompressed,
        createdAt: nowIso,
        updatedAt: nowIso,
      };

      // Persist waste request to Firestore (no Base64 image stored in Firestore payload)
      await saveWasteRequestToFirestore(wasteReq);

      const selectedRecycler = Object.values(RECYCLER_DIRECTORY).find(r => r.id === selectedRecyclerId) || 
                                analysisResult.recycleDetails?.assignedRecycler || 
                                RECYCLER_DIRECTORY.plastics;

      const newRequest: WastePickupRequest = {
        pickupRequestId: reqId,
        wasteItem: analysisResult.itemName,
        wasteCategory: analysisResult.category,
        recommendedAction: analysisResult.recommendedAction,
        destinationType: isRecycle ? "RECYCLER" : "MUNICIPALITY",
        destinationId: isRecycle ? selectedRecycler.id : "muni-hhw-team",
        destinationName: isRecycle ? selectedRecycler.name : (analysisResult.safeDisposalDetails?.authorizedTeam || "Ward 3 Municipal HHW Fleet"),
        citizenName: userName,
        location: "742 Evergreen Terrace, Ward 2",
        image: finalCompressed || "",
        status: "PENDING",
        createdAt: "Just now",
        pointsEarned: isRecycle ? 30 : 50,
        pointsAwarded: false,
      };

      if (onRequestPickup) {
        onRequestPickup(newRequest);
      }

      setLastRequestId(reqId);
      setPickupRequested(true);
    } catch (err: unknown) {
      console.error("Error creating waste request:", err);
      setRequestError("Failed to save waste request to Firestore. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-8 pb-12">
      
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-emerald-900 via-teal-900 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 translate-x-12 -translate-y-12 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="max-w-3xl relative z-10 space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 text-xs font-bold uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5" />
            AI Waste Decision Engine
          </div>
          <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight">
            Manage My Waste &amp; User Image Analysis
          </h1>
          <p className="text-emerald-100/80 text-sm sm:text-base leading-relaxed">
            Upload a photo of your waste item below. The AI analysis engine identifies material properties and determines the <strong>ONE BEST ACTION</strong> out of REUSE, RECYCLE, or SAFE DISPOSAL.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Column: Real User Image Upload & Properties */}
        <div className="lg:col-span-5 space-y-6">
          
          {/* Upload Dropzone Container */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-slate-800">
                1. Upload Waste Photo
              </h2>
              {uploadedImageSrc && (
                <button
                  onClick={handleReset}
                  className="text-xs text-emerald-700 hover:text-emerald-800 font-bold flex items-center gap-1"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  Upload New Image
                </button>
              )}
            </div>

            <div className="relative border-2 border-dashed border-emerald-300/80 hover:border-emerald-500 bg-emerald-50/40 hover:bg-emerald-50/80 rounded-2xl p-6 transition-all text-center cursor-pointer group">
              <input 
                type="file" 
                accept="image/*" 
                onChange={handleImageUpload}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
              />
              
              {uploadedImageSrc ? (
                <div className="space-y-3">
                  <div className="relative max-h-56 mx-auto inline-block rounded-xl overflow-hidden shadow-md">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img 
                      src={uploadedImageSrc} 
                      alt="Uploaded waste item" 
                      className="max-h-56 rounded-xl object-cover" 
                    />
                    <span className="absolute bottom-2 right-2 bg-slate-900/80 text-white text-[10px] font-bold px-2 py-1 rounded">
                      User Photo Attached
                    </span>
                  </div>
                  <p className="text-xs font-bold text-emerald-800 flex items-center justify-center gap-1">
                    <FileImage className="w-4 h-4" />
                    {uploadedFileName || "Uploaded Waste Image"}
                  </p>
                </div>
              ) : (
                <div className="space-y-3 pointer-events-none">
                  <div className="w-14 h-14 mx-auto rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Upload className="w-7 h-7" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-800">
                      Click to upload or take photo of waste
                    </p>
                    <p className="text-xs text-slate-500 mt-1">
                      Upload any bottle, container, battery, garment, or packaging
                    </p>
                  </div>
                  <span className="inline-block bg-emerald-100 text-emerald-800 text-[11px] font-bold px-3 py-1 rounded-full">
                    PNG, JPG, WEBP
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Analysis Error State */}
          {analysisError && (
            <div className="bg-red-50 border border-red-200 text-red-800 rounded-2xl p-5 text-xs font-medium space-y-3">
              <div className="flex items-center gap-2 font-bold text-sm text-red-900">
                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
                Featherless AI Analysis Error
              </div>
              <p>{analysisError}</p>
              <button
                onClick={handleReset}
                className="px-3 py-1.5 bg-red-600 text-white font-bold rounded-lg hover:bg-red-700 text-xs inline-flex items-center gap-1"
              >
                <RefreshCw className="w-3.5 h-3.5" /> Try Another Photo
              </button>
            </div>
          )}

          {/* Identified Properties Card */}
          {analysisResult && (
            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-4 animate-fadeIn">
              <h3 className="text-sm font-bold text-slate-800 border-b border-slate-100 pb-2 flex items-center justify-between">
                <span>Featherless AI Analysis Summary</span>
                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                  Qwen Vision AI
                </span>
              </h3>
              
              <div className="flex items-start gap-4">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img 
                  src={analysisResult.imageSrc} 
                  alt={analysisResult.itemName} 
                  className="w-20 h-20 object-cover rounded-xl border border-slate-200 shadow-xs flex-shrink-0"
                />
                <div className="space-y-1 text-xs">
                  <h4 className="font-bold text-slate-900 text-sm">{analysisResult.itemName}</h4>
                  <p className="text-slate-600"><strong className="text-slate-700">Category:</strong> {analysisResult.category}</p>
                  <p className="text-slate-600"><strong className="text-slate-700">Material:</strong> {analysisResult.material}</p>
                  <p className="text-slate-600"><strong className="text-slate-700">Confidence:</strong> {analysisResult.confidence}%</p>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Right Column: Single Best AI Action Recommendation */}
        <div className="lg:col-span-7 space-y-6">
          
          {isAnalyzing ? (
            <div className="bg-white rounded-2xl p-12 border border-slate-200 text-center space-y-4 shadow-xs">
              <RefreshCw className="w-10 h-10 text-emerald-600 animate-spin mx-auto" />
              <h3 className="text-base font-bold text-slate-900">
                Analyzing waste photo with Featherless AI...
              </h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Running Qwen Vision model to inspect material composition and determine the single best recovery action.
              </p>
            </div>
          ) : !analysisResult ? (
            <div className="bg-white rounded-2xl p-12 border border-slate-200 text-center space-y-3 shadow-xs">
              <Upload className="w-12 h-12 text-slate-300 mx-auto" />
              <h3 className="text-base font-bold text-slate-700">
                No Waste Image Uploaded Yet
              </h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                Please upload a photo of your waste item using the upload box on the left. Featherless AI will analyze your image and recommend the best action.
              </p>
            </div>
          ) : (
            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-6 animate-fadeIn">
              
              {/* Header: ONE BEST ACTION */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
                <div className="flex items-center gap-3">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-md ${
                    analysisResult.recommendedAction === "REUSE"
                      ? "bg-gradient-to-tr from-amber-500 to-yellow-600"
                      : analysisResult.recommendedAction === "RECYCLE"
                      ? "bg-gradient-to-tr from-blue-600 to-teal-500"
                      : "bg-gradient-to-tr from-red-600 to-rose-700"
                  }`}>
                    {analysisResult.recommendedAction === "REUSE" && <Lightbulb className="w-6 h-6" />}
                    {analysisResult.recommendedAction === "RECYCLE" && <Recycle className="w-6 h-6" />}
                    {analysisResult.recommendedAction === "SAFE_DISPOSAL" && <ShieldAlert className="w-6 h-6" />}
                  </div>

                  <div>
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                      AI Primary Recommendation
                    </span>
                    <h2 className="text-xl font-extrabold text-slate-900">
                      {analysisResult.recommendedAction === "REUSE" && "PUT TO ANOTHER USE (REUSE)"}
                      {analysisResult.recommendedAction === "RECYCLE" && "STANDARD RECYCLING (RECYCLE)"}
                      {analysisResult.recommendedAction === "SAFE_DISPOSAL" && "SAFE DISPOSAL (HAZARDOUS)"}
                    </h2>
                  </div>
                </div>

                <span className="text-xs font-extrabold px-3.5 py-1.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                  Confidence: {analysisResult.confidence}%
                </span>
              </div>

              {/* AI Decision Explanation Card */}
              <div className="bg-slate-900 text-white p-5 rounded-2xl space-y-2">
                <div className="flex items-center gap-2 text-xs font-bold text-emerald-400">
                  <Sparkles className="w-4 h-4" />
                  Why Featherless AI Selected This Single Action:
                </div>
                <p className="text-xs text-slate-200 leading-relaxed font-medium">
                  {analysisResult.aiReasoning}
                </p>
                <div className="pt-2 border-t border-slate-800 text-[10px] text-slate-400 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Powered by Featherless AI (Qwen Vision Model)</span>
                </div>
              </div>

              {/* ACTION-SPECIFIC WORKFLOW CONTAINERS */}

              {/* 1. REUSE WORKFLOW */}
              {analysisResult.recommendedAction === "REUSE" && analysisResult.reuseDetails && (
                <div className="space-y-4 animate-fadeIn">
                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-3.5 text-xs text-amber-900 flex items-start gap-2.5">
                    <Info className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <strong>Personal Household Re-use Notice:</strong> This action provides upcycling instructions for <em>you</em> to repurpose this item yourself at home. No pickup is required. It is strictly separate from the Circular Economy Exchange marketplace.
                    </div>
                  </div>

                  <div className="border border-slate-200 rounded-2xl p-5 bg-slate-50/60 space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-base font-bold text-slate-900">
                        {analysisResult.reuseDetails.title}
                      </h3>
                      <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-200 text-slate-700">
                        Difficulty: {analysisResult.reuseDetails.difficulty}
                      </span>
                    </div>

                    <div className="space-y-2">
                      <h4 className="text-xs font-bold uppercase text-slate-600 tracking-wider">
                        Step-by-Step DIY Instructions:
                      </h4>
                      <ol className="space-y-2">
                        {analysisResult.reuseDetails.steps.map((step, idx) => (
                          <li key={idx} className="flex items-start gap-3 bg-white p-3 rounded-xl border border-slate-200 text-xs text-slate-700">
                            <span className="w-5 h-5 rounded-full bg-amber-500 text-white flex items-center justify-center text-[10px] font-bold flex-shrink-0 mt-0.5">
                              {idx + 1}
                            </span>
                            <span>{step}</span>
                          </li>
                        ))}
                      </ol>
                    </div>

                    <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 flex items-center justify-between text-xs text-emerald-900 font-medium">
                      <span className="flex items-center gap-1.5">
                        <Sparkles className="w-4 h-4 text-emerald-600" />
                        Environmental Impact:
                      </span>
                      <span className="font-bold">{analysisResult.reuseDetails.impact}</span>
                    </div>

                    <div className="pt-2 border-t border-slate-200">
                      {upcycleCompleted ? (
                        <div className="p-3 bg-emerald-100 border border-emerald-300 rounded-xl text-center text-xs font-bold text-emerald-900 flex items-center justify-center gap-2">
                          <CheckCircle2 className="w-4.5 h-4.5 text-emerald-600" />
                          <span>Upcycling Completed! +10 Eco Points Awarded.</span>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            if (!authUser) {
                              if (onOpenAuthModal) onOpenAuthModal();
                              return;
                            }
                            const refId = `REUSE_${analysisResult.itemName.replace(/\s+/g, "_")}`;
                            if (onAwardPoints && authUser) {
                              onAwardPoints(
                                authUser.uid,
                                "REUSE",
                                10,
                                `Analyzed & upcycled ${analysisResult.itemName} (+10 Eco Points)`,
                                refId
                              );
                            }
                            setUpcycleCompleted(true);
                          }}
                          className="w-full bg-amber-600 hover:bg-amber-700 text-white font-bold py-2.5 rounded-xl shadow-md text-xs flex items-center justify-center gap-2 transition-all"
                        >
                          <CheckCircle2 className="w-4 h-4" />
                          Mark DIY Upcycling Completed (+10 Eco Points)
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* 2. RECYCLE WORKFLOW */}
              {analysisResult.recommendedAction === "RECYCLE" && analysisResult.recycleDetails && (
                <div className="space-y-5 animate-fadeIn">
                  <div className="border border-slate-200 rounded-2xl p-5 bg-slate-50/60 space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-base font-bold text-slate-900">
                        Recycling Material Preparation Guidelines
                      </h3>
                      <span className={`text-xs font-bold px-3 py-1 rounded-full ${analysisResult.recycleDetails.binColor}`}>
                        {analysisResult.recycleDetails.binName}
                      </span>
                    </div>

                    <ul className="space-y-2">
                      {analysisResult.recycleDetails.instructions.map((inst, idx) => (
                        <li key={idx} className="flex items-start gap-2 text-xs text-slate-700 bg-white p-2.5 rounded-xl border border-slate-200">
                          <CheckCircle2 className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                          <span>{inst}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Recycler Selection & Request Routing */}
                  <div className="bg-blue-50/80 border border-blue-200 rounded-2xl p-5 space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                          <Recycle className="w-4 h-4 text-blue-600" />
                          Select Certified Recycler for Pickup
                        </h4>
                        <p className="text-xs text-slate-500">Recycling requests route directly to certified recycling partners</p>
                      </div>
                    </div>

                    <div className="space-y-2">
                      {Object.values(RECYCLER_DIRECTORY).map((rec) => (
                        <label 
                          key={rec.id}
                          className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                            selectedRecyclerId === rec.id
                              ? "border-blue-600 bg-white shadow-xs"
                              : "border-slate-200 hover:border-blue-300 bg-slate-50"
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <input 
                              type="radio" 
                              name="recycler" 
                              checked={selectedRecyclerId === rec.id}
                              onChange={() => setSelectedRecyclerId(rec.id)}
                              className="text-blue-600 focus:ring-blue-500"
                            />
                            <div className="text-xs">
                              <p className="font-bold text-slate-900">{rec.name}</p>
                              <p className="text-[11px] text-slate-500">Accepts: {rec.acceptedMaterials.join(", ")}</p>
                            </div>
                          </div>
                          <span className="text-[11px] font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded">
                            ★ {rec.rating}
                          </span>
                        </label>
                      ))}
                    </div>

                    {!authUser && (
                      <div className="bg-amber-50 border border-amber-200 text-amber-900 text-xs rounded-xl p-3 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Lock className="w-4 h-4 text-amber-600 flex-shrink-0" />
                          <span>Please log in to submit a waste collection request.</span>
                        </div>
                        {onOpenAuthModal && (
                          <button
                            type="button"
                            onClick={onOpenAuthModal}
                            className="px-3 py-1 bg-amber-600 text-white font-bold text-xs rounded-lg hover:bg-amber-700 transition-colors"
                          >
                            Log In
                          </button>
                        )}
                      </div>
                    )}

                    {requestError && (
                      <div className="bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-xl p-3 flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
                        <span>{requestError}</span>
                      </div>
                    )}

                    {pickupRequested ? (
                      <div className="p-4 bg-emerald-100 border border-emerald-300 rounded-xl text-center space-y-1 text-emerald-900 text-xs font-bold animate-scaleUp">
                        <CheckCircle2 className="w-6 h-6 text-emerald-600 mx-auto" />
                        <p>Recycling Request Saved &amp; Sent Successfully!</p>
                        <p className="text-[11px] text-emerald-700 font-normal">
                          Tracking ID: <strong>{lastRequestId}</strong> • Status: <span className="uppercase font-bold bg-amber-200 text-amber-900 px-2 py-0.5 rounded">Pending</span>
                        </p>
                      </div>
                    ) : (
                      <button
                        onClick={handleCreateWasteRequest}
                        disabled={isSubmitting}
                        className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold py-3 rounded-xl shadow-md text-xs flex items-center justify-center gap-2 transition-all"
                      >
                        {isSubmitting ? (
                          <>
                            <RefreshCw className="w-4 h-4 animate-spin" />
                            Saving Waste Request to Firestore...
                          </>
                        ) : (
                          <>
                            <Send className="w-4 h-4" />
                            Request Recycling Pickup from Partner (+30 Eco Points upon completion)
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* 3. SAFE DISPOSAL WORKFLOW */}
              {analysisResult.recommendedAction === "SAFE_DISPOSAL" && analysisResult.safeDisposalDetails && (
                <div className="space-y-5 animate-fadeIn">
                  <div className="bg-red-50 border border-red-200 rounded-2xl p-4 text-xs text-red-900 flex items-start gap-2.5 font-semibold">
                    <ShieldAlert className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                    <div>{analysisResult.safeDisposalDetails.warning}</div>
                  </div>

                  <div className="border border-slate-200 rounded-2xl p-5 bg-slate-50/60 space-y-4">
                    <h3 className="text-sm font-bold text-slate-900">
                      Required Safe Disposal Protocol
                    </h3>

                    <ul className="space-y-2">
                      {analysisResult.safeDisposalDetails.instructions.map((inst, idx) => (
                        <li key={idx} className="flex items-start gap-2 text-xs text-slate-700 bg-white p-2.5 rounded-xl border border-slate-200">
                          <ChevronRight className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                          <span>{inst}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Municipality Safe Disposal Request Routing */}
                  <div className="bg-slate-900 text-white rounded-2xl p-5 space-y-4">
                    <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                      <div>
                        <h4 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                          <Building2 className="w-4 h-4 text-red-400" />
                          Authorized Municipal Collection Team
                        </h4>
                        <p className="text-xs text-slate-400 mt-0.5">
                          Destination: <strong>{analysisResult.safeDisposalDetails.authorizedTeam}</strong>
                        </p>
                      </div>
                    </div>

                    {!authUser && (
                      <div className="bg-amber-950/80 border border-amber-800 text-amber-200 text-xs rounded-xl p-3 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Lock className="w-4 h-4 text-amber-400 flex-shrink-0" />
                          <span>Please log in to submit a municipal disposal request.</span>
                        </div>
                        {onOpenAuthModal && (
                          <button
                            type="button"
                            onClick={onOpenAuthModal}
                            className="px-3 py-1 bg-amber-600 text-white font-bold text-xs rounded-lg hover:bg-amber-700 transition-colors"
                          >
                            Log In
                          </button>
                        )}
                      </div>
                    )}

                    {requestError && (
                      <div className="bg-rose-950/80 border border-rose-800 text-rose-200 text-xs rounded-xl p-3 flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />
                        <span>{requestError}</span>
                      </div>
                    )}

                    {pickupRequested ? (
                      <div className="p-4 bg-emerald-950 border border-emerald-800 rounded-xl text-center space-y-1 text-emerald-300 text-xs font-bold animate-scaleUp">
                        <CheckCircle2 className="w-6 h-6 text-emerald-400 mx-auto" />
                        <p>Safe Disposal Request Saved &amp; Sent to Municipality!</p>
                        <p className="text-[11px] text-emerald-400/80 font-normal">
                          Tracking ID: <strong>{lastRequestId}</strong> • Status: <span className="uppercase font-bold bg-amber-500/30 border border-amber-500/50 text-amber-300 px-2 py-0.5 rounded">Pending</span>
                        </p>
                      </div>
                    ) : (
                      <button
                        onClick={handleCreateWasteRequest}
                        disabled={isSubmitting}
                        className="w-full bg-gradient-to-r from-red-600 to-rose-700 hover:from-red-700 hover:to-rose-800 disabled:opacity-50 text-white font-bold py-3 rounded-xl shadow-md text-xs flex items-center justify-center gap-2 transition-all"
                      >
                        {isSubmitting ? (
                          <>
                            <RefreshCw className="w-4 h-4 animate-spin" />
                            Saving Safe Disposal Request to Firestore...
                          </>
                        ) : (
                          <>
                            <Truck className="w-4 h-4" />
                            Request Municipal Safe Disposal Collection (+50 Eco Points upon completion)
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </div>
              )}

            </div>
          )}

        </div>

      </div>
    </div>
  );
};
