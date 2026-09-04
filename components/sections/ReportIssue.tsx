"use client";

import React, { useState } from "react";
import { 
  AlertTriangle, 
  Camera, 
  MapPin, 
  Sparkles, 
  Award, 
  CheckCircle2, 
  Send,
  Navigation,
  Building2,
  FileText
} from "lucide-react";
import { User as FirebaseUser } from "firebase/auth";
import { UserProfile } from "@/services/authService";
import { WasteComplaint } from "@/types/complaint";
import { WasteReport, WasteReportPriority } from "@/types/wasteReport";
import { 
  saveWasteReportToFirestore, 
  compressImageDataUrl, 
  saveRecordImageToLocalStorage 
} from "@/services/firestoreService";
import { Lock, RefreshCw, AlertCircle } from "lucide-react";

interface ReportIssueProps {
  complaints: WasteComplaint[];
  onAddComplaint: (complaint: WasteComplaint) => void;
  authUser?: FirebaseUser | null;
  userProfile?: UserProfile | null;
  onOpenAuthModal?: () => void;
}

export const ReportIssue: React.FC<ReportIssueProps> = ({
  complaints,
  onAddComplaint,
  authUser,
  userProfile,
  onOpenAuthModal,
}) => {
  // Submission Form State
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [address, setAddress] = useState("742 Evergreen Terrace, Ward 2");
  const [description, setDescription] = useState("");
  const [isLocating, setIsLocating] = useState(false);
  const [isAiProcessing, setIsAiProcessing] = useState(false);
  const [detectedIssue, setDetectedIssue] = useState<string>("Illegal Construction & Packaging Debris");
  const [priority, setPriority] = useState<"CRITICAL" | "HIGH" | "MEDIUM" | "LOW">("HIGH");
  const [isSubmitted, setIsSubmitted] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const handleSimulatedPhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onloadend = async () => {
        if (typeof reader.result === "string") {
          const rawDataUrl = reader.result;
          const compressed = await compressImageDataUrl(rawDataUrl, 400, 400, 0.7);
          setImagePreview(compressed);
        }
      };
      reader.readAsDataURL(file);
      
      // Simulate AI analysis of the photo
      setIsAiProcessing(true);
      setTimeout(() => {
        setDetectedIssue("Illegal Chemical & Battery Dumping");
        setPriority("CRITICAL");
        setIsAiProcessing(false);
      }, 700);
    }
  };

  const handleDetectLocation = () => {
    setIsLocating(true);
    setTimeout(() => {
      setAddress("1088 Metro Boulevard, Ward 3 (GPS Auto-Detected)");
      setIsLocating(false);
    }, 500);
  };

  const handleSubmitReport = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    if (!imagePreview && !address) return;

    if (!authUser) {
      setSubmitError("You must be logged in to submit an official waste report.");
      if (onOpenAuthModal) onOpenAuthModal();
      return;
    }

    setIsSubmitting(true);
    try {
      let wardName = "Ward 3";
      const lowerAddress = address.toLowerCase();
      if (lowerAddress.includes("ward 1")) wardName = "Ward 1";
      else if (lowerAddress.includes("ward 2")) wardName = "Ward 2";
      else if (lowerAddress.includes("ward 4")) wardName = "Ward 4";

      const repId = `REP-${Math.floor(1000 + Math.random() * 9000)}`;
      const reporterName = userProfile?.displayName || authUser.displayName || authUser.email?.split("@")[0] || "Eco Citizen";
      const nowIso = new Date().toISOString();

      let finalCompressed = imagePreview || undefined;
      if (imagePreview && imagePreview.startsWith("data:image/")) {
        finalCompressed = await compressImageDataUrl(imagePreview, 400, 400, 0.7);
        saveRecordImageToLocalStorage("wasteReport", repId, finalCompressed);
      }

      const wasteReport: WasteReport = {
        id: repId,
        reportId: repId,
        reporterId: authUser.uid,
        reporterName: reporterName,
        issueType: detectedIssue,
        description: description.trim() || `Public waste report for ${detectedIssue} at ${address}`,
        location: address,
        latitude: 37.7749,
        longitude: -122.4194,
        imageUrl: finalCompressed,
        priority: priority.toLowerCase() as WasteReportPriority,
        status: "reported",
        createdAt: nowIso,
        updatedAt: nowIso,
      };

      await saveWasteReportToFirestore(wasteReport);

      const newComplaint: WasteComplaint = {
        id: repId,
        photo: finalCompressed || "https://images.unsplash.com/photo-1530587191325-3db32d826c18?auto=format&fit=crop&w=600&q=80",
        location: address,
        ward: wardName,
        detectedIssue: detectedIssue,
        severityScore: priority === "CRITICAL" ? 95 : priority === "HIGH" ? 80 : priority === "MEDIUM" ? 60 : 40,
        priority: priority,
        status: "Reported",
        submittedAt: "Just now",
        assignedCrew: "Unassigned",
        pointsEarned: 50,
        pointsAwarded: false,
      };

      onAddComplaint(newComplaint);
      setIsSubmitted(true);

      setTimeout(() => {
        setIsSubmitted(false);
        setImagePreview(null);
        setDescription("");
      }, 2500);
    } catch (err: unknown) {
      console.error("Error submitting waste report:", err);
      setSubmitError("Failed to save waste report to Firestore. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const getPriorityBadgeClass = (p: string) => {
    switch (p) {
      case "CRITICAL":
        return "bg-red-600 text-white";
      case "HIGH":
        return "bg-amber-600 text-white";
      case "MEDIUM":
        return "bg-blue-600 text-white";
      default:
        return "bg-slate-600 text-white";
    }
  };

  return (
    <div className="space-y-8 pb-12">
      
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-red-950 via-slate-900 to-emerald-950 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="max-w-3xl space-y-3 relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-500/20 border border-red-400/30 text-red-300 text-xs font-bold uppercase tracking-wider">
            <AlertTriangle className="w-3.5 h-3.5" />
            Citizen Waste Issue Reporting
          </div>
          <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight">
            Report Waste Issues to Municipality
          </h1>
          <p className="text-red-100/80 text-sm sm:text-base leading-relaxed">
            Spot illegal dumping, overflowing public bins, or hazardous spills? Submit a photo with GPS location. AI prioritizes the report and routes it directly to municipal cleanup crews. Earn +50 Eco Points!
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Column: Submission Form */}
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-6">
            
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <Camera className="w-5 h-5 text-emerald-600" />
                  New Waste Incident Report
                </h2>
                <p className="text-xs text-slate-500">Capture photo &amp; location for instant AI triage</p>
              </div>

              <div className="bg-emerald-100 border border-emerald-200 text-emerald-800 text-xs font-extrabold px-3 py-1.5 rounded-full flex items-center gap-1.5">
                <Award className="w-4 h-4 text-emerald-600" />
                Earn +50 Points
              </div>
            </div>

            {isSubmitted ? (
              <div className="py-12 text-center space-y-4 animate-scaleUp">
                <div className="w-16 h-16 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-10 h-10" />
                </div>
                <h3 className="text-xl font-extrabold text-slate-900">
                  Report Submitted &amp; Verified!
                </h3>
                <p className="text-xs text-slate-600 max-w-sm mx-auto">
                  AI has routed your report to the <strong>Municipal Dispatch Team</strong>. You earned <strong className="text-emerald-700">+50 Eco Points</strong>!
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmitReport} className="space-y-5">
                
                {/* Photo Dropzone */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                    1. Upload or Take Photo
                  </label>
                  <div className="relative border-2 border-dashed border-slate-300 hover:border-emerald-500 bg-slate-50 rounded-2xl p-6 text-center cursor-pointer transition-all">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleSimulatedPhotoUpload}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                    />
                    
                    {imagePreview ? (
                      <div className="relative max-h-48 mx-auto inline-block rounded-xl overflow-hidden shadow-md">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={imagePreview} alt="Incident preview" className="max-h-48 rounded-xl" />
                        <span className="absolute bottom-2 right-2 bg-slate-900/80 text-white text-[10px] font-bold px-2 py-1 rounded">
                          Photo Attached
                        </span>
                      </div>
                    ) : (
                      <div className="space-y-2 pointer-events-none">
                        <Camera className="w-10 h-10 text-slate-400 mx-auto" />
                        <p className="text-xs font-bold text-slate-700">Click to capture or upload dump site photo</p>
                        <p className="text-[11px] text-slate-400">Captures visual context for AI severity scoring</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Location Picker */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                    2. Location &amp; Ward
                  </label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <MapPin className="w-4 h-4 text-red-500 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        required
                        value={address}
                        onChange={(e) => setAddress(e.target.value)}
                        className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 text-xs font-medium focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={handleDetectLocation}
                      disabled={isLocating}
                      className="px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl flex items-center gap-1.5 transition-colors border border-slate-200"
                    >
                      <Navigation className={`w-3.5 h-3.5 text-emerald-600 ${isLocating ? "animate-spin" : ""}`} />
                      GPS Auto
                    </button>
                  </div>
                </div>

                {/* Additional Description Input */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                    3. Issue Description &amp; Details
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Provide additional details about the waste issue..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-emerald-500"
                  />
                </div>

                {/* AI Issue Identification & Priority Preview Box */}
                <div className="bg-slate-900 text-white p-4 rounded-xl space-y-3">
                  <div className="flex items-center justify-between text-xs border-b border-slate-800 pb-2">
                    <span className="flex items-center gap-1.5 font-bold text-emerald-400">
                      <Sparkles className="w-4 h-4" />
                      AI Automated Triage Assessment
                    </span>
                    {isAiProcessing ? (
                      <span className="text-[10px] text-amber-400 font-semibold animate-pulse">Running AI Vision...</span>
                    ) : (
                      <span className="text-[10px] text-slate-400">Confidence: 97%</span>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase font-bold">Detected Issue Type</span>
                      <p className="font-bold text-slate-100 mt-0.5">{detectedIssue}</p>
                    </div>

                    <div>
                      <span className="text-[10px] text-slate-400 uppercase font-bold">Assigned Priority</span>
                      <div className="mt-0.5 flex items-center gap-2">
                        <span className={`px-2.5 py-0.5 rounded-md text-[10px] font-extrabold uppercase ${getPriorityBadgeClass(priority)}`}>
                          {priority} Priority
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Municipality Collection Workflow Tracker */}
                <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/60 space-y-3">
                  <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                    <Building2 className="w-4 h-4 text-emerald-600" />
                    Municipality Collection Workflow Pipeline:
                  </h4>

                  <div className="grid grid-cols-4 gap-1 text-center relative">
                    <div className="space-y-1">
                      <div className="w-6 h-6 rounded-full bg-emerald-600 text-white text-[10px] font-bold flex items-center justify-center mx-auto">1</div>
                      <p className="text-[10px] font-bold text-slate-800">Reported</p>
                    </div>
                    <div className="space-y-1">
                      <div className="w-6 h-6 rounded-full bg-emerald-600 text-white text-[10px] font-bold flex items-center justify-center mx-auto">2</div>
                      <p className="text-[10px] font-bold text-slate-800">Assigned</p>
                    </div>
                    <div className="space-y-1">
                      <div className="w-6 h-6 rounded-full bg-slate-300 text-slate-600 text-[10px] font-bold flex items-center justify-center mx-auto">3</div>
                      <p className="text-[10px] font-medium text-slate-500">En Route</p>
                    </div>
                    <div className="space-y-1">
                      <div className="w-6 h-6 rounded-full bg-slate-300 text-slate-600 text-[10px] font-bold flex items-center justify-center mx-auto">4</div>
                      <p className="text-[10px] font-medium text-slate-500">Collected/Resolved</p>
                    </div>
                  </div>
                </div>

                {!authUser && (
                  <div className="bg-amber-50 border border-amber-200 text-amber-900 text-xs rounded-xl p-3.5 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Lock className="w-4 h-4 text-amber-600 flex-shrink-0" />
                      <span>Authentication required. Please log in to submit a waste report.</span>
                    </div>
                    {onOpenAuthModal && (
                      <button
                        type="button"
                        onClick={onOpenAuthModal}
                        className="px-3 py-1 bg-amber-600 text-white font-bold text-xs rounded-lg hover:bg-amber-700 transition-colors"
                      >
                        Log In / Sign Up
                      </button>
                    )}
                  </div>
                )}

                {submitError && (
                  <div className="bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-xl p-3 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
                    <span>{submitError}</span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 disabled:opacity-50 text-white font-bold py-3 rounded-xl shadow-md text-sm flex items-center justify-center gap-2 transition-all"
                >
                  {isSubmitting ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Saving Report to Firestore...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      Submit Official Report (+50 Eco Points)
                    </>
                  )}
                </button>
              </form>
            )}

          </div>
        </div>

        {/* Right Column: Community Incident Feed */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-4">
            
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <FileText className="w-5 h-5 text-emerald-600" />
                Live Ward Reports Feed
              </h3>
              <span className="text-xs text-slate-500 font-medium">{complaints.length} Total Reports</span>
            </div>

            <div className="space-y-4">
              {complaints.map((rep) => (
                <div key={rep.id} className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={rep.photo} alt={rep.id} className="w-12 h-12 object-cover rounded-lg border" />
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase">{rep.id} • {rep.ward}</span>
                        <h4 className="font-bold text-xs text-slate-900">{rep.detectedIssue}</h4>
                      </div>
                    </div>
                    <span className={`px-2 py-0.5 rounded text-[9px] font-extrabold uppercase ${getPriorityBadgeClass(rep.priority)}`}>
                      {rep.priority}
                    </span>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-slate-200/60 text-[11px] text-slate-500">
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-red-500" />
                      {rep.location}
                    </span>
                    <span className={`font-semibold px-2 py-0.5 rounded-full text-[10px] ${
                      rep.status === "Collected/Resolved"
                        ? "bg-emerald-100 text-emerald-800"
                        : rep.status === "En Route"
                        ? "bg-amber-100 text-amber-800"
                        : rep.status === "Assigned"
                        ? "bg-blue-100 text-blue-800"
                        : "bg-slate-200 text-slate-800"
                    }`}>
                      {rep.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>

          </div>
        </div>

      </div>
    </div>
  );
};
