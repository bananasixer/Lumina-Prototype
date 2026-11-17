import React, { useEffect, useState } from "react";
import {
  X,
  Mic,
  FolderOpen,
  Calendar,
  Award,
  Globe,
  Info,
  Shield,
  LogOut,
  Sparkles,
  Keyboard,
  Sliders,
  ArrowRight,
  Compass,
  Layers,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { UserSession } from "../types";
import LuminaLogo from "./LuminaLogo";

export type AppViewTab = "command" | "vault" | "insights" | "card" | "languages" | "story";

interface SlideOutDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  mode: "landing" | "workspace";
  user?: UserSession | null;
  activeTab?: AppViewTab;
  onSelectTab?: (tab: AppViewTab) => void;
  onOpenApp?: () => void;
  onScrollSection?: (sectionId: string) => void;
  onOpenPrivacy: () => void;
  onLogout?: () => void;
  autoRecord?: boolean;
  onToggleAutoRecord?: (val: boolean) => void;
}

export default function SlideOutDrawer({
  isOpen,
  onClose,
  mode,
  user,
  activeTab,
  onSelectTab,
  onOpenApp,
  onScrollSection,
  onOpenPrivacy,
  onLogout,
  autoRecord = false,
  onToggleAutoRecord,
}: SlideOutDrawerProps) {
  const [showShortcuts, setShowShortcuts] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [isOpen, onClose]);

  const workspaceItems: Array<{ id: AppViewTab; label: string; icon: React.ReactNode }> = [
    { id: "command", label: "Record", icon: <Mic className="w-4 h-4" /> },
    { id: "card", label: "Progress Card", icon: <Award className="w-4 h-4" /> },
    { id: "vault", label: "History & Record", icon: <FolderOpen className="w-4 h-4" /> },
    { id: "insights", label: "Mirror & Patterns", icon: <Calendar className="w-4 h-4" /> },
    { id: "languages", label: "Languages", icon: <Globe className="w-4 h-4" /> },
    { id: "story", label: "Product Info", icon: <Info className="w-4 h-4" /> },
  ];

  const landingItems: Array<{ id: string; label: string; icon: React.ReactNode }> = [
    { id: "landing-product", label: "Capabilities", icon: <Layers className="w-4 h-4" /> },
    { id: "landing-languages", label: "Voice Capture", icon: <Globe className="w-4 h-4" /> },
    { id: "landing-how-it-works", label: "How It Works", icon: <Sparkles className="w-4 h-4" /> },
    { id: "landing-use-cases", label: "Use Cases", icon: <Compass className="w-4 h-4" /> },
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            onClick={onClose}
            className="fixed inset-0 bg-[#1D1D1F]/20 backdrop-blur-[2px] z-50"
          />

          <motion.aside
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", stiffness: 390, damping: 38 }}
            className="fixed top-0 right-0 bottom-0 w-full max-w-[330px] liquid-glass-drawer z-50 flex flex-col text-left"
            role="dialog"
            aria-label="Navigation Menu"
          >
            <div className="px-5 h-[60px] border-b border-[#0F8B8D]/15 flex items-center justify-between shrink-0">
              <LuminaLogo size={26} />
              <button
                type="button"
                onClick={onClose}
                aria-label="Close menu"
                className="w-11 h-11 rounded-full bg-[#EDF7F6] hover:bg-[#DFEFED] border border-[#0F8B8D]/20 text-[#0F8B8D] flex items-center justify-center transition-colors cursor-pointer active:scale-[0.97]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-4 py-6 space-y-6">
              <div className="space-y-1.5">
                <div className="px-3 pb-1 text-[11px] font-medium tracking-wide text-[#86868B]">
                  {mode === "workspace" ? "Workspace" : "Navigation"}
                </div>

                {mode === "workspace" && onSelectTab ? (
                  workspaceItems.map((item, idx) => {
                    const active = activeTab === item.id;
                    const idleColor =
                      idx % 3 === 0
                        ? "text-[#0F8B8D]"
                        : idx % 3 === 1
                        ? "text-[#0055FF]"
                        : "text-[#C86D44]";
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => {
                          onSelectTab(item.id);
                          onClose();
                        }}
                        className={`w-full min-h-[44px] px-3.5 py-2.5 rounded-2xl flex items-center gap-3 text-sm transition-colors cursor-pointer whitespace-nowrap ${
                          active
                            ? "bg-[#0F8B8D]/[0.11] text-[#0F8B8D] font-semibold"
                            : "text-[#515154] hover:text-[#1D1D1F] hover:bg-[#EDF7F6] font-medium"
                        }`}
                      >
                        <span className={active ? "text-[#0F8B8D]" : idleColor}>
                          {item.icon}
                        </span>
                        <span className="truncate">{item.label}</span>
                      </button>
                    );
                  })
                ) : (
                  <>
                    {landingItems.map((item, idx) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => {
                          onClose();
                          onScrollSection?.(item.id);
                        }}
                        className="w-full min-h-[44px] px-3.5 py-2.5 rounded-2xl flex items-center gap-3 text-sm font-medium text-[#515154] hover:text-[#1D1D1F] hover:bg-[#EDF7F6] transition-colors cursor-pointer whitespace-nowrap"
                      >
                        <span
                          className={
                            idx % 3 === 0
                              ? "text-[#0F8B8D]"
                              : idx % 3 === 1
                              ? "text-[#0055FF]"
                              : "text-[#C86D44]"
                          }
                        >
                          {item.icon}
                        </span>
                        <span className="truncate">{item.label}</span>
                      </button>
                    ))}
                    {onOpenApp && (
                      <button
                        type="button"
                        onClick={() => {
                          onClose();
                          onOpenApp();
                        }}
                        className="w-full min-h-[44px] mt-3 px-4 py-2.5 rounded-xl bg-[#1D1D1F] hover:bg-[#0F8B8D] text-white text-sm font-medium flex items-center justify-between transition-colors cursor-pointer"
                      >
                        <span>Sign In</span>
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    )}
                  </>
                )}
              </div>

              <div className="space-y-2 border-t border-[#0F8B8D]/15 pt-5">
                <div className="px-3 pb-1 text-[11px] font-medium tracking-wide text-[#86868B] flex items-center gap-1.5">
                  <Sliders className="w-3.5 h-3.5 text-[#0F8B8D]" />
                  <span>Preferences</span>
                </div>

                {mode === "workspace" && onToggleAutoRecord && (
                  <label className="w-full min-h-[44px] px-3.5 py-2.5 rounded-2xl bg-[#FFFFFF] border border-[#0F8B8D]/16 flex items-center justify-between gap-3 cursor-pointer">
                    <span className="text-xs font-medium text-[#1D1D1F]">Auto-record on open</span>
                    <input
                      type="checkbox"
                      checked={autoRecord}
                      onChange={(e) => onToggleAutoRecord(e.target.checked)}
                      className="w-4 h-4 accent-[#0F8B8D] rounded cursor-pointer"
                    />
                  </label>
                )}

                {mode === "workspace" && (
                  <div className="rounded-2xl bg-[#FFFFFF] border border-[#0F8B8D]/16 overflow-hidden">
                    <button
                      type="button"
                      onClick={() => setShowShortcuts(!showShortcuts)}
                      className="w-full min-h-[44px] px-3.5 py-2 flex items-center justify-between text-xs font-medium text-[#1D1D1F] hover:bg-[#EDF7F6] transition-colors cursor-pointer"
                    >
                      <span className="flex items-center gap-2.5">
                        <Keyboard className="w-4 h-4 text-[#0055FF]" />
                        <span>Keyboard Shortcuts</span>
                      </span>
                      <span className="text-[11px] text-[#86868B]">
                        {showShortcuts ? "Hide" : "Show"}
                      </span>
                    </button>
                    {showShortcuts && (
                      <div className="px-3.5 pb-3 pt-2 space-y-1.5 text-[11px] font-mono text-[#515154] border-t border-[#0F8B8D]/12 bg-[#EDF7F6]/70">
                        <div className="flex justify-between">
                          <span>Start / Stop Mic</span>
                          <span className="text-[#1D1D1F] font-semibold">Space</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Close Drawer</span>
                          <span className="text-[#1D1D1F] font-semibold">Esc</span>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenPrivacy();
                  }}
                  className="w-full min-h-[44px] px-3.5 py-2 rounded-2xl flex items-center gap-3 text-xs font-medium text-[#515154] hover:text-[#1D1D1F] hover:bg-[#EDF7F6] transition-colors cursor-pointer"
                >
                  <Shield className="w-4 h-4 text-[#0F8B8D]" />
                  <span>Privacy Policy</span>
                </button>
              </div>
            </div>

            {mode === "workspace" && user && (
              <div className="p-4 border-t border-[#0F8B8D]/15 bg-[#EDF7F6]/75 space-y-3 shrink-0">
                <div className="min-w-0 px-1">
                  <div className="text-sm font-semibold text-[#1D1D1F] truncate">
                    {user.displayName || "Builder"}
                  </div>
                  <div className="text-xs text-[#86868B] truncate">
                    {user.isDemo ? "Guest Session" : user.email || "Signed In"}
                  </div>
                </div>
                {onLogout && (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onLogout();
                    }}
                    id="lumina-logout-btn"
                    className="w-full min-h-[44px] px-4 py-2 rounded-full bg-white hover:bg-[#EDF7F6] border border-[#0F8B8D]/20 text-xs font-medium text-[#1D1D1F] flex items-center justify-center gap-2 transition-colors cursor-pointer active:scale-[0.97]"
                  >
                    <LogOut className="w-4 h-4 text-[#C86D44]" />
                    <span>Sign Out</span>
                  </button>
                )}
              </div>
            )}
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
