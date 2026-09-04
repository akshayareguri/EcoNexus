"use client";

import React, { useState } from "react";
import { X, Mail, Lock, User, ShieldCheck, Leaf, AlertCircle, RefreshCw } from "lucide-react";
import { signUpWithEmail, logInWithEmail } from "@/services/authService";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [role, setRole] = useState<"citizen" | "recycler" | "municipality">("citizen");
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (mode === "signup") {
        if (!email.trim() || !password || !displayName.trim()) {
          setError("Please fill in all fields (Full Name, Email, Password).");
          setLoading(false);
          return;
        }
        await signUpWithEmail(email, password, displayName, role);
      } else {
        if (!email.trim() || !password) {
          setError("Please enter your Email and Password.");
          setLoading(false);
          return;
        }
        await logInWithEmail(email, password);
      }

      setLoading(false);
      if (onSuccess) onSuccess();
      onClose();
    } catch (err: unknown) {
      setLoading(false);
      const firebaseErr = err as { code?: string; message?: string };
      const errCode = firebaseErr.code || "";
      const errMsg = firebaseErr.message || "";

      if (errCode === "auth/invalid-credential" || errCode === "auth/user-not-found" || errCode === "auth/wrong-password") {
        setError("Invalid email or password. Please check your credentials and try again.");
      } else if (errCode === "auth/email-already-in-use") {
        setError("This email address is already registered. Please log in instead.");
      } else if (errCode === "auth/weak-password") {
        setError("Password should be at least 6 characters long.");
      } else if (errCode.includes("api-key-not-valid") || errCode.includes("invalid-api-key") || errMsg.includes("API key not valid")) {
        setError("Firebase Web API Key is invalid or unconfigured. Please update NEXT_PUBLIC_FIREBASE_API_KEY in .env.local with a valid API key from Firebase Console.");
      } else {
        setError(errMsg || "An authentication error occurred. Please try again.");
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white rounded-3xl max-w-md w-full overflow-hidden shadow-2xl border border-slate-200 relative animate-scaleUp">
        
        {/* Top Header Banner */}
        <div className="bg-gradient-to-r from-emerald-900 via-teal-900 to-slate-900 p-6 text-white relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-emerald-200 hover:text-white bg-white/10 hover:bg-white/20 p-2 rounded-full transition-all"
          >
            <X className="w-5 h-5" />
          </button>
          
          <div className="flex items-center gap-2.5 mb-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center text-emerald-300">
              <Leaf className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-300">EcoNexus Account</span>
          </div>

          <h2 className="text-xl font-extrabold tracking-tight">
            {mode === "login" ? "Welcome Back to EcoNexus" : "Create Your EcoNexus Account"}
          </h2>
          <p className="text-emerald-100/80 text-xs mt-1">
            {mode === "login" 
              ? "Sign in to manage waste, earn Eco Points, and list items."
              : "Register as a citizen, recycler, or municipal officer."}
          </p>

          {/* Mode Tabs */}
          <div className="flex bg-slate-900/60 p-1 rounded-xl mt-4 border border-white/10">
            <button
              type="button"
              onClick={() => { setMode("login"); setError(null); }}
              className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
                mode === "login" ? "bg-emerald-600 text-white shadow-xs" : "text-emerald-200 hover:text-white"
              }`}
            >
              Log In
            </button>
            <button
              type="button"
              onClick={() => { setMode("signup"); setError(null); }}
              className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
                mode === "signup" ? "bg-emerald-600 text-white shadow-xs" : "text-emerald-200 hover:text-white"
              }`}
            >
              Sign Up
            </button>
          </div>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          
          {error && (
            <div className="bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-xl p-3.5 flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {mode === "signup" && (
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Full Name / Display Name
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type="text"
                  required
                  placeholder="e.g. Jane Doe"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:border-emerald-500 focus:bg-white"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Email Address
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="email"
                required
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:border-emerald-500 focus:bg-white"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Password
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="password"
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:border-emerald-500 focus:bg-white"
              />
            </div>
          </div>

          {mode === "signup" && (
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Primary Account Role
              </label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as "citizen" | "recycler" | "municipality")}
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:border-emerald-500"
              >
                <option value="citizen">Citizen (Waste Recovery &amp; Exchange)</option>
                <option value="recycler">Certified Recycler &amp; Facility</option>
                <option value="municipality">Municipal Authority &amp; Fleet</option>
              </select>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {loading ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                {mode === "login" ? "Authenticating..." : "Creating Account..."}
              </>
            ) : (
              <>
                <ShieldCheck className="w-4 h-4" />
                {mode === "login" ? "Log In to EcoNexus" : "Create Free Account"}
              </>
            )}
          </button>
        </form>

        {/* Footer info */}
        <div className="bg-slate-50 px-6 py-3 border-t border-slate-100 text-center">
          <p className="text-[11px] text-slate-500 font-medium">
            Protected by Firebase Authentication &amp; Firestore Security
          </p>
        </div>
      </div>
    </div>
  );
};
