import React from "react";
import { Shield, LogOut, Mic, FolderOpen, Info, ShieldCheck, Calendar, Award, Users } from "lucide-react";
import { motion } from "motion/react";
import { UserSession, WinEntry } from "../types";
import { calculateStreak } from "../utils/sovereignMetrics";

interface HeaderProps {
  user: UserSession;
  entries: WinEntry[];
  activeTab: "command" | "vault" | "insights" | "card" | "circle" | "story";
  setActiveTab: (tab: "command" | "vault" | "insights" | "card" | "circle" | "story") => void;
  onLogout: () => void;
}

export default function Header({ user, entries, activeTab, setActiveTab, onLogout }: HeaderProps) {
  const streak = calculateStreak(entries);

  return (
    <header className="border-b border-earth-200 bg-white/85 backdrop-blur-md sticky top-0 z-50 px-4 py-3" id="lumina-global-header">
      <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-3">
        
        {/* Brand Identity */}
        <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-start">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-sage/10 rounded-lg border border-sage/20 text-sage">
              <Shield className="w-5 h-5" />
            </div>
            <div className="text-left">
              <h1 className="text-lg font-serif font-bold text-earth-900 tracking-tight flex items-center gap-2">
                LUMINA
              </h1>
              <p className="text-[9px] font-mono tracking-widest text-earth-500 uppercase">
                Sovereign Reflection Suite
              </p>
            </div>
          </div>

          {/* Quiet Streak Indicator in Header */}
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-earth-100 border border-earth-200 text-xs font-mono text-earth-800">
            <span className="w-2 h-2 rounded-full bg-sage" />
            <span>Streak: {streak} {streak === 1 ? "day" : "days"}</span>
          </div>
        </div>

        {/* Tab Navigation Switches */}
        <nav className="flex items-center flex-wrap justify-center bg-earth-100 p-1 rounded-2xl border border-earth-200/60 text-xs font-mono">
          <button
            type="button"
            onClick={() => setActiveTab("command")}
            className={`px-3 py-1.5 rounded-xl uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer ${
              activeTab === "command" 
                ? "bg-white text-terracotta border border-earth-200 shadow-sm font-bold" 
                : "text-earth-600 hover:text-earth-900"
            }`}
          >
            <Mic className="w-3.5 h-3.5" />
            Check-in
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("insights")}
            className={`px-3 py-1.5 rounded-xl uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer ${
              activeTab === "insights" 
                ? "bg-white text-sage border border-earth-200 shadow-sm font-bold" 
                : "text-earth-600 hover:text-earth-900"
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            Mirror
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("card")}
            className={`px-3 py-1.5 rounded-xl uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer ${
              activeTab === "card" 
                ? "bg-white text-earth-900 border border-earth-200 shadow-sm font-bold" 
                : "text-earth-600 hover:text-earth-900"
            }`}
          >
            <Award className="w-3.5 h-3.5" />
            "Did I Win?"
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("circle")}
            className={`px-3 py-1.5 rounded-xl uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer ${
              activeTab === "circle" 
                ? "bg-white text-sage border border-earth-200 shadow-sm font-bold" 
                : "text-earth-600 hover:text-earth-900"
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            Circle
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("vault")}
            className={`px-3 py-1.5 rounded-xl uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer ${
              activeTab === "vault" 
                ? "bg-white text-earth-900 border border-earth-200 shadow-sm font-bold" 
                : "text-earth-600 hover:text-earth-900"
            }`}
          >
            <FolderOpen className="w-3.5 h-3.5" />
            Vault
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("story")}
            className={`px-3 py-1.5 rounded-xl uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer ${
              activeTab === "story" 
                ? "bg-white text-earth-900 border border-earth-200 shadow-sm font-bold" 
                : "text-earth-600 hover:text-earth-900"
            }`}
          >
            <Info className="w-3.5 h-3.5" />
            About
          </button>
        </nav>

        {/* Profile & Logout */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-right">
            <div className="hidden sm:block">
              <div className="text-xs font-semibold text-earth-900 max-w-[120px] truncate">
                {user.displayName || "User"}
              </div>
              <div className="text-[9px] font-mono text-sage flex items-center justify-end gap-1 font-semibold">
                <ShieldCheck className="w-2.5 h-2.5" />
                {user.isDemo ? "Guest Session" : "Vault Sovereign"}
              </div>
            </div>

            <img 
              src={user.photoURL || `https://api.dicebear.com/7.x/initials/svg?seed=${user.displayName || "U"}&background=%23eae4d8&color=%23231c16&radius=50`}
              alt="Profile"
              className="w-8 h-8 rounded-full border border-earth-200"
              referrerPolicy="no-referrer"
            />
          </div>

          <button
            type="button"
            onClick={onLogout}
            className="p-1.5 hover:bg-earth-100 rounded-lg text-earth-400 hover:text-red-600 transition-colors cursor-pointer"
            title="Sign out of vault"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>

      </div>
    </header>
  );
}
