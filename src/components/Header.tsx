import React, { useState, useRef, useEffect } from "react";
import { Menu, LogOut, Mic, FolderOpen, Info, Calendar, Award, Users, X, User as UserIcon } from "lucide-react";
import { UserSession, WinEntry } from "../types";

interface HeaderProps {
  user: UserSession;
  entries: WinEntry[];
  activeTab: "command" | "vault" | "insights" | "card" | "circle" | "story";
  setActiveTab: (tab: "command" | "vault" | "insights" | "card" | "circle" | "story") => void;
  onLogout: () => void;
}

export default function Header({ user, activeTab, setActiveTab, onLogout }: HeaderProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    }
    if (isMenuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isMenuOpen]);

  return (
    <header className="border-b border-earth-200 bg-white/90 backdrop-blur-md sticky top-0 z-50 px-4 py-3" id="lumina-global-header">
      <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-3">
        
        {/* Brand Identity: Clean Lumina Title */}
        <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-start">
          <h1 className="text-xl font-serif font-bold text-earth-900 tracking-tight">
            Lumina
          </h1>
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
            Record
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

        {/* 3-Lines Menu Button & Dropdown Drawer */}
        <div className="relative" ref={menuRef}>
          <button
            type="button"
            onClick={() => setIsMenuOpen((prev) => !prev)}
            className="p-2 rounded-xl border border-earth-200 bg-earth-50 hover:bg-earth-100 text-earth-700 hover:text-earth-900 transition-colors cursor-pointer flex items-center justify-center shadow-2xs"
            aria-label="Open user menu"
            id="lumina-user-menu-btn"
          >
            {isMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>

          {isMenuOpen && (
            <div className="absolute right-0 mt-2 w-64 bg-white rounded-2xl border border-earth-200 shadow-lg py-3 px-3 z-50 text-left animate-in fade-in slide-in-from-top-2 duration-150">
              <div className="px-2 py-1.5 border-b border-earth-100 mb-2 space-y-1">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full bg-earth-100 flex items-center justify-center text-earth-700">
                    <UserIcon className="w-4 h-4" />
                  </div>
                  <div className="truncate">
                    <div className="text-sm font-semibold text-earth-900 truncate">
                      {user.displayName || "User"}
                    </div>
                    {user.email && (
                      <div className="text-[11px] font-mono text-earth-500 truncate">
                        {user.email}
                      </div>
                    )}
                  </div>
                </div>
                <div className="pt-1">
                  <span className="inline-block text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded bg-sage/10 text-sage font-medium">
                    {user.isDemo ? "Guest Session" : "Active Account"}
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  setIsMenuOpen(false);
                  onLogout();
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                id="lumina-logout-btn"
              >
                <LogOut className="w-4 h-4" />
                <span>Log Out</span>
              </button>
            </div>
          )}
        </div>

      </div>
    </header>
  );
}
