import React, { useState, useEffect } from "react";
import { ShieldCheck, Lock, CheckCircle2, Calendar, Award, Compass, RefreshCw, X, Quote } from "lucide-react";
import { motion } from "motion/react";
import { WinEntry } from "../types";

interface PublicVerificationProps {
  sharedEntryId: string;
  onClose: () => void;
}

export default function PublicVerification({ sharedEntryId, onClose }: PublicVerificationProps) {
  const [loading, setLoading] = useState(true);
  const [entry, setEntry] = useState<WinEntry | null>(null);
  const [formSubmitted, setFormSubmitted] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    contact: "" // email or phone
  });
  const [error, setError] = useState("");

  useEffect(() => {
    setLoading(true);
    let found: WinEntry | null = null;

    try {
      const storedShares = JSON.parse(localStorage.getItem("lumina_shared_entries") || "{}");
      if (storedShares[sharedEntryId]) {
        found = storedShares[sharedEntryId];
      }
    } catch (e) {
      console.error("Error reading shared cache", e);
    }

    if (!found) {
      // Fallback demo entry
      found = {
        id: sharedEntryId,
        userId: "sovereign-user",
        date: new Date().toISOString().split("T")[0],
        timestamp: Date.now(),
        win: "Spearheaded modular architectural transition for core services, eliminating latency bottlenecks.",
        transcript: "Spent time refactoring key query pathways and cached hot profiles, reducing CPU bottlenecks and accelerating responsiveness across the platform.",
        feedback: "You demonstrated exceptional system design and crisis navigation under peak demands.",
        resiliencePoint: true,
        tags: ["architecture", "scaling", "latency-relief"]
      };
    }

    setEntry(found);

    // If already verified previously
    if (found.verification) {
      setFormData({
        name: found.verification.verifierName,
        contact: found.verification.verifierContact || found.verification.verifierEmail || ""
      });
      setFormSubmitted(true);
    }

    setLoading(false);
  }, [sharedEntryId]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.contact.trim()) {
      setError("Please provide your name and an email or phone number to confirm.");
      return;
    }

    setError("");

    // Save attributable confirmation into localStorage cache
    try {
      const storedShares = JSON.parse(localStorage.getItem("lumina_shared_entries") || "{}");
      if (entry) {
        const verifiedEntry: WinEntry = {
          ...entry,
          verification: {
            verifierName: formData.name.trim(),
            verifierContact: formData.contact.trim(),
            verifiedAt: Date.now()
          }
        };
        storedShares[sharedEntryId] = verifiedEntry;
        localStorage.setItem("lumina_shared_entries", JSON.stringify(storedShares));

        // Also save in verified list
        const verifiedMap = JSON.parse(localStorage.getItem("lumina_verifications_map") || "{}");
        verifiedMap[sharedEntryId] = verifiedEntry.verification;
        localStorage.setItem("lumina_verifications_map", JSON.stringify(verifiedMap));

        setEntry(verifiedEntry);
      }
    } catch (err) {
      console.error("Error persisting verification confirmation:", err);
    }

    setFormSubmitted(true);
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return "recent";
    const d = new Date(dateStr);
    return isNaN(d.getTime())
      ? dateStr
      : d.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-earth-50 flex flex-col items-center justify-center p-6 text-center">
        <RefreshCw className="w-8 h-8 text-sage animate-spin mb-3" />
        <p className="text-xs font-mono text-earth-600 uppercase tracking-widest font-bold">
          Resolving entry...
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-earth-50 text-earth-900 font-sans flex flex-col items-center justify-center p-4 sm:p-6 relative">
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-xl w-full bg-white rounded-3xl border border-earth-200 shadow-xl relative z-10 overflow-hidden flex flex-col text-left"
      >
        {/* Header brand strip */}
        <div className="bg-earth-900 text-earth-50 px-6 py-4 flex justify-between items-center border-b border-earth-800">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-sage" />
            <span className="font-serif text-sm tracking-tight font-semibold">
              Lumina Verified Win Confirmation
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-white/10 rounded-full transition-colors text-earth-300 hover:text-white cursor-pointer"
            title="Go to main application"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 sm:p-8 space-y-6">
          {/* User Invitation Callout */}
          <div className="p-4 bg-sage/5 border border-sage/20 rounded-2xl space-y-1">
            <span className="text-[10px] font-mono uppercase tracking-wider text-sage font-bold block">
              Private Reflection Share
            </span>
            <p className="text-base font-serif italic text-earth-900">
              "I logged something from {formatDate(entry?.date)} I'm proud of — want to see it?"
            </p>
          </div>

          {/* Win Card */}
          <div className="p-6 bg-earth-50 rounded-2xl border border-earth-200 space-y-3">
            <div className="flex items-center justify-between text-earth-500 text-xs font-mono">
              <span className="flex items-center gap-1.5 font-bold">
                <Calendar className="w-3.5 h-3.5 text-earth-400" />
                {formatDate(entry?.date)}
              </span>
              <span className="text-[9px] uppercase px-2 py-0.5 rounded bg-white border border-earth-200 font-bold">
                {entry?.resiliencePoint ? "Resilience Point" : "Small Win"}
              </span>
            </div>

            <p className="text-lg font-serif text-earth-900 font-bold leading-snug">
              "{entry?.win}"
            </p>

            {entry?.tags && entry.tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {entry.tags.map((tag, idx) => (
                  <span
                    key={idx}
                    className="text-[10px] font-mono text-earth-600 bg-white border border-earth-200 px-2 py-0.5 rounded-full"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            )}
          </div>

          {!formSubmitted ? (
            /* Confirmation Form */
            <div className="space-y-4 pt-2">
              <div className="space-y-1">
                <h4 className="text-sm font-serif font-bold text-earth-900">
                  Confirm This Achievement
                </h4>
                <p className="text-xs text-earth-600 leading-relaxed">
                  No login or account needed. Entering your name and email or phone attaches an attributable confirmation to this entry.
                </p>
              </div>

              {error && (
                <div className="p-3 bg-red-50 text-red-800 border border-red-200 rounded-xl text-xs">
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-3.5">
                <div className="space-y-1">
                  <label className="text-[10px] font-mono uppercase tracking-wider text-earth-600 font-bold block pl-1">
                    Your Full Name
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Jordan Miller"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full bg-earth-50 border border-earth-200 rounded-xl px-3.5 py-2 text-xs text-earth-900 placeholder-earth-400 focus:outline-none focus:border-sage/40"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-mono uppercase tracking-wider text-earth-600 font-bold block pl-1">
                    Email or Phone Number
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. jordan@example.com or +1 555-0192"
                    value={formData.contact}
                    onChange={(e) => setFormData({ ...formData, contact: e.target.value })}
                    className="w-full bg-earth-50 border border-earth-200 rounded-xl px-3.5 py-2 text-xs text-earth-900 placeholder-earth-400 focus:outline-none focus:border-sage/40"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 bg-earth-900 hover:bg-earth-800 text-white rounded-xl text-xs font-mono font-bold uppercase tracking-wider transition-all cursor-pointer shadow-sm"
                >
                  Confirm & Attain Verification
                </button>
              </form>
            </div>
          ) : (
            /* Confirmed Status */
            <motion.div
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              className="p-5 bg-sage/10 border border-sage/25 rounded-2xl space-y-3 text-center"
            >
              <div className="w-10 h-10 rounded-full bg-sage/20 text-sage flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h4 className="text-base font-serif font-bold text-earth-900">
                  Verification Confirmed
                </h4>
                <p className="text-xs text-earth-700 leading-relaxed">
                  Attributable confirmation recorded: <strong>{formData.name}</strong> ({formData.contact}).
                </p>
                <p className="text-[11px] text-earth-500 font-mono pt-1">
                  Confirmed on {new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                </p>
              </div>

              <button
                type="button"
                onClick={onClose}
                className="mt-2 px-4 py-2 bg-earth-900 hover:bg-earth-800 text-white rounded-xl text-xs font-mono uppercase font-bold tracking-wider cursor-pointer"
              >
                Go to Lumina Hub
              </button>
            </motion.div>
          )}
        </div>

        <div className="bg-earth-50 px-6 py-3 border-t border-earth-200 text-center">
          <p className="text-[9px] font-mono text-earth-400 uppercase tracking-widest">
            Attributable Verification • No Stranger Leaderboards
          </p>
        </div>
      </motion.div>
    </div>
  );
}
