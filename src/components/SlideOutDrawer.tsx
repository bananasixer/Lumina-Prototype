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
  Smartphone,
  Copy,
  Check,
  Share2,
  ChevronDown,
  ChevronUp,
  ExternalLink,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { UserSession } from "../types";
import LuminaLogo from "./LuminaLogo";

export type AppViewTab = "command" | "vault" | "insights" | "card" | "languages" | "story";

const SHARED_APP_FALLBACK =
  "https://ais-pre-pysbhc7doz2yxoi5ztofkr-451678381807.asia-southeast1.run.app";
const SHORT_LINK_CACHE_KEY = "lumina_short_link_v2";

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
  const [showShortcutGuide, setShowShortcutGuide] = useState(true);
  const [shortUrl, setShortUrl] = useState<string>(() => {
    try {
      localStorage.removeItem("lumina_short_url");
      const saved = localStorage.getItem(SHORT_LINK_CACHE_KEY);
      if (saved && saved.startsWith("https://") && !saved.includes("is.gd")) {
        return saved;
      }
    } catch {}
    return SHARED_APP_FALLBACK;
  });
  const [isLoadingShortUrl, setIsLoadingShortUrl] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    const fetchShortLink = async () => {
      setIsLoadingShortUrl(true);
      try {
        const originParam =
          typeof window !== "undefined" ? encodeURIComponent(window.location.origin) : "";
        const resp = await fetch(`/api/short-link?url=${originParam}`);
        if (!resp.ok) return;
        const data = await resp.json();
        if (!cancelled && typeof data?.shortUrl === "string" && data.shortUrl.startsWith("https://")) {
          const clean = data.shortUrl.trim();
          setShortUrl(clean);
          try {
            localStorage.setItem(SHORT_LINK_CACHE_KEY, clean);
          } catch {}
        }
      } catch {
        // Keep fallback URL if network request fails
      } finally {
        if (!cancelled) setIsLoadingShortUrl(false);
      }
    };
    fetchShortLink();
    return () => {
      cancelled = true;
    };
  }, [isOpen]);

  const handleCopyShortLink = async () => {
    try {
      await navigator.clipboard.writeText(shortUrl);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    } catch {
      // Clipboard fallback ignored cleanly
    }
  };

  const handleNativeShare = async () => {
    if (typeof navigator === "undefined" || typeof navigator.share !== "function") {
      await handleCopyShortLink();
      return;
    }
    try {
      await navigator.share({
        title: "Lumina",
        text: "Open Lumina on your phone and add it to your home screen:",
        url: shortUrl,
      });
    } catch {
      // User cancelled share sheet
    }
  };

  // Workspace section: ONLY Record, Progress Card, History & Record, Mirror & Patterns
  const workspaceItems: Array<{ id: AppViewTab; label: string; icon: React.ReactNode }> = [
    { id: "command", label: "Record", icon: <Mic className="w-4 h-4" /> },
    { id: "card", label: "Progress Card", icon: <Award className="w-4 h-4" /> },
    { id: "vault", label: "History & Record", icon: <FolderOpen className="w-4 h-4" /> },
    { id: "insights", label: "Mirror & Patterns", icon: <Calendar className="w-4 h-4" /> },
  ];

  // Resources section (above Preferences): Create a Shortcut + Languages + Product Info
  const exploreItems: Array<{ id: AppViewTab; label: string; icon: React.ReactNode }> = [
    { id: "languages", label: "Languages", icon: <Globe className="w-4 h-4" /> },
    { id: "story", label: "Product Info", icon: <Info className="w-4 h-4" /> },
  ];

  const landingItems: Array<{ id: string; label: string; icon: React.ReactNode }> = [
    { id: "landing-product", label: "Capabilities", icon: <Layers className="w-4 h-4" /> },
    { id: "landing-languages", label: "Voice Capture", icon: <Globe className="w-4 h-4" /> },
    { id: "landing-how-it-works", label: "How It Works", icon: <Sparkles className="w-4 h-4" /> },
    { id: "landing-use-cases", label: "Use Cases", icon: <Compass className="w-4 h-4" /> },
  ];

  const renderCreateShortcutBlock = () => (
    <div className="rounded-2xl bg-[#FFFFFF] border border-[#0F8B8D]/16 overflow-hidden">
      <button
        type="button"
        onClick={() => setShowShortcutGuide(!showShortcutGuide)}
        className="w-full min-h-[44px] px-3.5 py-2.5 flex items-center justify-between text-sm font-medium text-[#1D1D1F] hover:bg-[#EDF7F6] transition-colors cursor-pointer"
      >
        <span className="flex items-center gap-3">
          <Smartphone className="w-4 h-4 text-[#0055FF]" />
          <span>Create a Shortcut</span>
        </span>
        <span className="text-[#86868B]">
          {showShortcutGuide ? (
            <ChevronUp className="w-4 h-4" />
          ) : (
            <ChevronDown className="w-4 h-4" />
          )}
        </span>
      </button>

      {showShortcutGuide && (
        <div className="px-3.5 pb-3.5 pt-2.5 space-y-3 border-t border-[#0F8B8D]/12 bg-[#EDF7F6]/45">
          <div className="flex items-center justify-between gap-2 rounded-xl bg-[#FFFFFF] border border-[#0F8B8D]/18 px-3 py-2">
            <a
              href={shortUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs font-mono font-medium text-[#0055FF] hover:underline truncate inline-flex items-center gap-1 min-w-0"
              title={shortUrl}
            >
              <span className="truncate">
                {isLoadingShortUrl && shortUrl === SHARED_APP_FALLBACK
                  ? "Generating short link..."
                  : shortUrl}
              </span>
              <ExternalLink className="w-3 h-3 shrink-0 opacity-75" />
            </a>

            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={handleCopyShortLink}
                aria-label="Copy app link"
                className="min-h-[30px] px-2.5 rounded-lg bg-[#EDF7F6] hover:bg-[#E1F2F1] border border-[#0F8B8D]/20 text-[11px] font-medium text-[#1D1D1F] inline-flex items-center gap-1 transition-colors cursor-pointer"
              >
                {copiedLink ? (
                  <>
                    <Check className="w-3 h-3 text-[#0F8B8D]" />
                    <span className="text-[#0F8B8D]">Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3 h-3 text-[#0F8B8D]" />
                    <span>Copy</span>
                  </>
                )}
              </button>
              {typeof navigator !== "undefined" && typeof navigator.share === "function" && (
                <button
                  type="button"
                  onClick={handleNativeShare}
                  aria-label="Share app link"
                  className="w-[30px] h-[30px] rounded-lg bg-[#EDF7F6] hover:bg-[#E1F2F1] border border-[#0F8B8D]/20 text-[#0055FF] inline-flex items-center justify-center transition-colors cursor-pointer"
                >
                  <Share2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="text-[11px] font-semibold text-[#1D1D1F]">
              Add Lumina to your phone home screen
            </div>
            <ol className="space-y-1 text-[11px] leading-relaxed text-[#515154]">
              <li className="flex items-start gap-2">
                <span className="font-semibold text-[#0F8B8D] tabular-nums shrink-0">1.</span>
                <span>Open the link in your mobile browser.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-semibold text-[#0055FF] tabular-nums shrink-0">2.</span>
                <span>Tap the three-dot menu icon (⋮) or Share button.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-semibold text-[#C86D44] tabular-nums shrink-0">3.</span>
                <span>Scroll down and select &ldquo;Add to Home screen&rdquo; or &ldquo;Create shortcut&rdquo;.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-semibold text-[#0F8B8D] tabular-nums shrink-0">4.</span>
                <span>Tap Add to launch Lumina directly anytime.</span>
              </li>
            </ol>
          </div>
        </div>
      )}
    </div>
  );

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
              {/* Section 1: Workspace (or Navigation on landing) */}
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

              {/* Section 2 (above Preferences): App & Guide — Create a Shortcut, Languages, Product Info */}
              <div className="space-y-2 border-t border-[#0F8B8D]/15 pt-5">
                <div className="px-3 pb-1 text-[11px] font-medium tracking-wide text-[#86868B] flex items-center gap-1.5">
                  <Compass className="w-3.5 h-3.5 text-[#0F8B8D]" />
                  <span>App &amp; Guide</span>
                </div>

                {renderCreateShortcutBlock()}

                {mode === "workspace" &&
                  onSelectTab &&
                  exploreItems.map((item, idx) => {
                    const active = activeTab === item.id;
                    const idleColor = idx === 0 ? "text-[#0F8B8D]" : "text-[#C86D44]";
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
                  })}
              </div>

              {/* Section 3: Preferences — Privacy Policy, Auto-record on Open, Keyboard Shortcuts */}
              <div className="space-y-2 border-t border-[#0F8B8D]/15 pt-5">
                <div className="px-3 pb-1 text-[11px] font-medium tracking-wide text-[#86868B] flex items-center gap-1.5">
                  <Sliders className="w-3.5 h-3.5 text-[#0F8B8D]" />
                  <span>Preferences</span>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenPrivacy();
                  }}
                  className="w-full min-h-[44px] px-3.5 py-2 rounded-2xl bg-[#FFFFFF] border border-[#0F8B8D]/16 flex items-center gap-3 text-xs font-medium text-[#1D1D1F] hover:bg-[#EDF7F6] transition-colors cursor-pointer"
                >
                  <Shield className="w-4 h-4 text-[#0F8B8D]" />
                  <span>Privacy Policy</span>
                </button>

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
