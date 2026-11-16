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
    { id: "languages", label: "Supported Languages (95+)", icon: <Globe className="w-4 h-4" /> },
    { id: "story", label: "Product Info", icon: <Info className="w-4 h-4" /> },
  ];

  const landingItems: Array<{ id: string; label: string; icon: React.ReactNode }> = [
    { id: "landing-product", label: "Product Info", icon: <Layers className="w-4 h-4" /> },
    { id: "landing-languages", label: "Supported Languages (95+)", icon: <Globe className="w-4 h-4" /> },
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
            className="fixed inset-0 bg-[#1D241F]/25 backdrop-blur-xs z-50"
          />

          <motion.aside
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", stiffness: 380, damping: 36 }}
            className="fixed top-0 right-0 bottom-0 w-full max-w-[320px] glass-panel-strong z-50 flex flex-col border-l border-[#233428]/12 shadow-2xl text-left"
            role="dialog"
            aria-label="Navigation Menu"
          >
            <div className="px-5 py-4 border-b border-[#233428]/10 flex items-center justify-between">
              <LuminaLogo size={26} />
              <button
                type="button"
                onClick={onClose}
                aria-label="Close menu"
                className="w-9 h-9 rounded-xl border border-[#233428]/12 bg-[#EFF2EA] hover:bg-[#E2E8DA] text-[#1D241F] flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-4 py-5 space-y-6">
              <div className="space-y-1">
                <div className="px-2 pb-1 text-[11px] font-mono uppercase tracking-widest text-[#546257]">
                  {mode === "workspace" ? "Workspace" : "Menu"}
                </div>

                {mode === "workspace" && onSelectTab ? (
                  workspaceItems.map((item) => {
                    const active = activeTab === item.id;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => {
                          onSelectTab(item.id);
                          onClose();
                        }}
                        className={`w-full min-h-[42px] px-3.5 py-2 rounded-xl flex items-center gap-3 text-sm font-medium transition-colors cursor-pointer ${
                          active
                            ? "bg-[#4B6B53]/12 border border-[#4B6B53]/30 text-[#1D241F] font-semibold"
                            : "border border-transparent text-[#546257] hover:text-[#1D241F] hover:bg-[#EFF2EA]"
                        }`}
                      >
                        <span className={active ? "text-[#4B6B53]" : "text-[#546257]"}>
                          {item.icon}
                        </span>
                        <span>{item.label}</span>
                      </button>
                    );
                  })
                ) : (
                  <>
                    {landingItems.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => {
                          onClose();
                          onScrollSection?.(item.id);
                        }}
                        className="w-full min-h-[42px] px-3.5 py-2 rounded-xl flex items-center gap-3 text-sm font-medium text-[#546257] hover:text-[#1D241F] hover:bg-[#EFF2EA] transition-colors cursor-pointer"
                      >
                        <span className="text-[#4B6B53]">{item.icon}</span>
                        <span>{item.label}</span>
                      </button>
                    ))}
                    {onOpenApp && (
                      <button
                        type="button"
                        onClick={() => {
                          onClose();
                          onOpenApp();
                        }}
                        className="w-full min-h-[42px] mt-2 px-4 py-2 rounded-xl btn-sage text-sm font-semibold flex items-center justify-between cursor-pointer"
                      >
                        <span>Open App</span>
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    )}
                  </>
                )}
              </div>

              <div className="space-y-2 border-t border-[#233428]/10 pt-5">
                <div className="px-2 pb-1 text-[11px] font-mono uppercase tracking-widest text-[#546257] flex items-center gap-1.5">
                  <Sliders className="w-3.5 h-3.5" />
                  <span>Settings</span>
                </div>

                {mode === "workspace" && onToggleAutoRecord && (
                  <label className="w-full min-h-[42px] px-3.5 py-2 rounded-xl bg-[#F4F6F0] border border-[#233428]/10 flex items-center justify-between gap-3 cursor-pointer">
                    <span className="text-xs text-[#1D241F]">Auto-record on open</span>
                    <input
                      type="checkbox"
                      checked={autoRecord}
                      onChange={(e) => onToggleAutoRecord(e.target.checked)}
                      className="w-4 h-4 accent-[#4B6B53] rounded cursor-pointer"
                    />
                  </label>
                )}

                {mode === "workspace" && (
                  <div className="rounded-xl bg-[#F4F6F0] border border-[#233428]/10 overflow-hidden">
                    <button
                      type="button"
                      onClick={() => setShowShortcuts(!showShortcuts)}
                      className="w-full min-h-[42px] px-3.5 py-2 flex items-center justify-between text-xs text-[#1D241F] hover:bg-[#EAEFE3] cursor-pointer"
                    >
                      <span className="flex items-center gap-2.5">
                        <Keyboard className="w-4 h-4 text-[#4B6B53]" />
                        <span>Shortcuts</span>
                      </span>
                      <span className="font-mono text-[11px] text-[#546257]">
                        {showShortcuts ? "Hide" : "Show"}
                      </span>
                    </button>
                    {showShortcuts && (
                      <div className="px-3.5 pb-3 pt-1.5 space-y-1 text-[11px] font-mono text-[#546257] border-t border-[#233428]/10">
                        <div className="flex justify-between">
                          <span>Start / Stop Mic</span>
                          <span className="text-[#1D241F]">Space</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Close Drawer</span>
                          <span className="text-[#1D241F]">Esc</span>
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
                  className="w-full min-h-[42px] px-3.5 py-2 rounded-xl flex items-center gap-3 text-xs font-medium text-[#546257] hover:text-[#1D241F] hover:bg-[#EFF2EA] transition-colors cursor-pointer"
                >
                  <Shield className="w-4 h-4 text-[#4B6B53]" />
                  <span>Privacy Policy</span>
                </button>
              </div>
            </div>

            {mode === "workspace" && user && (
              <div className="p-4 border-t border-[#233428]/10 bg-[#F4F6F0]/80 space-y-3">
                <div className="min-w-0">
                  <div className="text-sm font-medium text-[#1D241F] truncate">
                    {user.displayName || "Builder"}
                  </div>
                  <div className="text-[11px] font-mono text-[#546257] truncate">
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
                    className="w-full min-h-[40px] px-3.5 py-2 rounded-xl bg-white hover:bg-[#C86F52]/10 border border-[#233428]/12 hover:border-[#C86F52]/40 text-xs font-medium text-[#1D241F] flex items-center justify-center gap-2 transition-colors cursor-pointer"
                  >
                    <LogOut className="w-4 h-4 text-[#C86F52]" />
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
