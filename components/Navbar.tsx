"use client";

import React from "react";
import { Leaf, Award, User, Menu, X, Building2, Recycle, LogIn, LogOut, ShieldCheck } from "lucide-react";
import { User as FirebaseUser } from "firebase/auth";
import { UserProfile } from "@/services/authService";

interface NavbarProps {
  currentRole: "citizen" | "recycler" | "municipality";
  onRoleChange: (role: "citizen" | "recycler" | "municipality") => void;
  userPoints: number;
  authUser?: FirebaseUser | null;
  userProfile?: UserProfile | null;
  onOpenAuthModal?: () => void;
  onLogout?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentRole,
  onRoleChange,
  userPoints,
  authUser,
  userProfile,
  onOpenAuthModal,
  onLogout,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);

  const userDisplayName = userProfile?.displayName || authUser?.displayName || authUser?.email?.split("@")[0] || null;

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-emerald-100 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          
          {/* Logo & Platform Name */}
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white shadow-md shadow-emerald-500/20">
              <Leaf className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-xl tracking-tight bg-gradient-to-r from-emerald-800 via-teal-700 to-emerald-600 bg-clip-text text-transparent">
                  EcoNexus
                </span>
                <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider border border-emerald-200">
                  AI Waste Recovery
                </span>
              </div>
              <p className="text-[11px] text-slate-500 font-medium hidden sm:block">
                Intelligent Waste Recovery &amp; Municipal Action System
              </p>
            </div>
          </div>

          {/* Center / Right Control Area */}
          <div className="hidden md:flex items-center space-x-4">
            
            {/* Citizen Points Badge */}
            {currentRole === "citizen" && (
              <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200/80 px-3.5 py-1.5 rounded-full shadow-xs">
                <Award className="w-4 h-4 text-emerald-600 animate-pulse" />
                <span className="text-xs font-semibold text-slate-600">Eco Points:</span>
                <span className="text-sm font-extrabold text-emerald-700">{userPoints} pts</span>
              </div>
            )}

            {/* Role Switcher Pill */}
            <div className="bg-slate-100 p-1 rounded-xl flex items-center border border-slate-200">
              <button
                onClick={() => onRoleChange("citizen")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  currentRole === "citizen"
                    ? "bg-white text-emerald-800 shadow-xs border border-slate-200/60"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <User className="w-3.5 h-3.5" />
                Citizen Portal
              </button>

              <button
                onClick={() => onRoleChange("recycler")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  currentRole === "recycler"
                    ? "bg-teal-700 text-white shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <Recycle className="w-3.5 h-3.5" />
                Recycler View
              </button>

              <button
                onClick={() => onRoleChange("municipality")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  currentRole === "municipality"
                    ? "bg-emerald-700 text-white shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <Building2 className="w-3.5 h-3.5" />
                Municipality View
              </button>
            </div>

            {/* Authentication User Controls */}
            {authUser ? (
              <div className="flex items-center gap-2 border-l border-slate-200 pl-3">
                <div className="flex items-center gap-1.5 bg-slate-100 border border-slate-200 px-3 py-1.5 rounded-xl text-xs font-bold text-slate-800">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="truncate max-w-[120px]">{userDisplayName}</span>
                </div>
                <button
                  onClick={onLogout}
                  title="Log Out"
                  className="p-2 rounded-xl bg-slate-100 hover:bg-rose-50 hover:text-rose-600 text-slate-600 transition-colors border border-slate-200"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="border-l border-slate-200 pl-3">
                <button
                  onClick={onOpenAuthModal}
                  className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-3.5 py-2 rounded-xl shadow-xs transition-all"
                >
                  <LogIn className="w-3.5 h-3.5" />
                  Log In / Sign Up
                </button>
              </div>
            )}

          </div>

          {/* Mobile menu button */}
          <div className="flex md:hidden items-center space-x-2">
            {currentRole === "citizen" && (
              <div className="flex items-center gap-1 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full text-xs font-bold text-emerald-700">
                <Award className="w-3.5 h-3.5 text-emerald-600" />
                {userPoints} pts
              </div>
            )}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-lg text-slate-600 hover:bg-slate-100 focus:outline-none"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>

        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-slate-200 bg-white px-4 pt-3 pb-4 space-y-3">
          
          {/* Auth Bar Mobile */}
          <div className="border-b border-slate-100 pb-3">
            {authUser ? (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-xs">
                    {userDisplayName?.[0]?.toUpperCase() || "U"}
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-900">{userDisplayName}</p>
                    <p className="text-[10px] text-slate-500">{authUser.email}</p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    if (onLogout) onLogout();
                    setMobileMenuOpen(false);
                  }}
                  className="px-3 py-1.5 bg-rose-50 text-rose-700 text-xs font-bold rounded-lg border border-rose-200 flex items-center gap-1"
                >
                  <LogOut className="w-3 h-3" />
                  Log Out
                </button>
              </div>
            ) : (
              <button
                onClick={() => {
                  if (onOpenAuthModal) onOpenAuthModal();
                  setMobileMenuOpen(false);
                }}
                className="w-full py-2.5 bg-emerald-600 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 shadow-xs"
              >
                <LogIn className="w-4 h-4" />
                Log In / Sign Up
              </button>
            )}
          </div>

          <div className="text-xs font-bold uppercase text-slate-400 tracking-wider">Switch View</div>
          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={() => {
                onRoleChange("citizen");
                setMobileMenuOpen(false);
              }}
              className={`p-2.5 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 border ${
                currentRole === "citizen"
                  ? "bg-emerald-50 border-emerald-300 text-emerald-800"
                  : "bg-slate-50 border-slate-200 text-slate-700"
              }`}
            >
              <User className="w-4 h-4" />
              Citizen
            </button>

            <button
              onClick={() => {
                onRoleChange("recycler");
                setMobileMenuOpen(false);
              }}
              className={`p-2.5 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 border ${
                currentRole === "recycler"
                  ? "bg-teal-700 text-white border-teal-800"
                  : "bg-slate-50 border-slate-200 text-slate-700"
              }`}
            >
              <Recycle className="w-4 h-4" />
              Recycler
            </button>

            <button
              onClick={() => {
                onRoleChange("municipality");
                setMobileMenuOpen(false);
              }}
              className={`p-2.5 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 border ${
                currentRole === "municipality"
                  ? "bg-emerald-700 text-white border-emerald-800"
                  : "bg-slate-50 border-slate-200 text-slate-700"
              }`}
            >
              <Building2 className="w-4 h-4" />
              Municipality
            </button>
          </div>
        </div>
      )}
    </header>
  );
};
