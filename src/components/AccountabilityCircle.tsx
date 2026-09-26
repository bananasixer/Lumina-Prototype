import React, { useState } from "react";
import { UserSession, WinEntry, AccountabilityPartner } from "../types";
import { calculateStreak } from "../utils/sovereignMetrics";
import { Users, Plus, Trash2, Copy, Check, ShieldCheck, Lock, EyeOff } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface AccountabilityCircleProps {
  user: UserSession;
  entries: WinEntry[];
  onUpdateCircle: (circleData: { enabled: boolean; partners: AccountabilityPartner[] }) => void;
}

export default function AccountabilityCircle({
  user,
  entries,
  onUpdateCircle
}: AccountabilityCircleProps) {
  const circleConfig = user.accountabilityCircle || { enabled: false, partners: [] };
  const [isEnabled, setIsEnabled] = useState(circleConfig.enabled);
  const [partners, setPartners] = useState<AccountabilityPartner[]>(circleConfig.partners || []);
  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const streak = calculateStreak(entries);

  const handleToggleCircle = () => {
    const nextState = !isEnabled;
    setIsEnabled(nextState);
    onUpdateCircle({
      enabled: nextState,
      partners
    });
  };

  const handleAddPartner = (e: React.FormEvent) => {
    e.preventDefault();
    if (partners.length >= 3) {
      setError("The Accountability Circle is capped at 3 trusted individuals.");
      return;
    }

    if (!newName.trim() || !newEmail.trim()) {
      setError("Please provide a name and email.");
      return;
    }

    const partner: AccountabilityPartner = {
      id: Math.random().toString(36).substring(2, 9),
      name: newName.trim(),
      email: newEmail.trim(),
      inviteCode: `acc-${Math.random().toString(36).substring(2, 10)}`,
      addedAt: Date.now()
    };

    const updated = [...partners, partner];
    setPartners(updated);
    setNewName("");
    setNewEmail("");
    setError(null);

    onUpdateCircle({
      enabled: isEnabled,
      partners: updated
    });
  };

  const handleRemovePartner = (id: string) => {
    const updated = partners.filter((p) => p.id !== id);
    setPartners(updated);
    onUpdateCircle({
      enabled: isEnabled,
      partners: updated
    });
  };

  const handleCopyLink = (partner: AccountabilityPartner) => {
    const shareUrl = `${window.location.origin}?accountabilityUser=${encodeURIComponent(
      user.displayName || "User"
    )}&streak=${streak}&total=${entries.length}`;
    navigator.clipboard.writeText(shareUrl);
    setCopiedId(partner.id);
    setTimeout(() => setCopiedId(null), 2500);
  };

  return (
    <div className="space-y-6 max-w-2xl mx-auto text-left" id="accountability-circle-root">
      {/* Top Header Card */}
      <div className="bg-white p-6 sm:p-8 rounded-3xl border border-earth-200/90 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-earth-100 pb-5">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-terracotta" />
              <h3 className="text-xl font-serif text-earth-900 font-bold">
                Accountability Circle
              </h3>
            </div>
            <p className="text-xs text-earth-600 max-w-md leading-relaxed">
              Opt-in to invite 1–3 people who can see <strong>only your check-in streak count</strong>. They will <strong>never</strong> see your check-in content, recordings, or transcripts.
            </p>
          </div>

          {/* Toggle Switch */}
          <div className="flex items-center gap-2.5">
            <span className="text-xs font-mono font-bold text-earth-700">
              {isEnabled ? "Enabled" : "Off"}
            </span>
            <button
              type="button"
              onClick={handleToggleCircle}
              className={`w-12 h-6 flex items-center rounded-full p-1 transition-colors cursor-pointer ${
                isEnabled ? "bg-sage" : "bg-earth-200"
              }`}
            >
              <div
                className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                  isEnabled ? "translate-x-6" : "translate-x-0"
                }`}
              />
            </button>
          </div>
        </div>

        {/* Privacy Guarantee Box */}
        <div className="p-4 bg-earth-50 rounded-2xl border border-earth-200/80 flex items-start gap-3">
          <Lock className="w-4 h-4 text-sage flex-shrink-0 mt-0.5" />
          <div className="space-y-0.5 text-xs text-earth-700 leading-relaxed">
            <p className="font-bold text-earth-900">Zero Content Exposure Guarantee</p>
            <p>
              Your circle members see a single number: your consecutive daily streak ({streak} {streak === 1 ? "day" : "days"}). No public leaderboard, no ranking against strangers, no notifications to anyone without your action.
            </p>
          </div>
        </div>

        {/* Circle Active Management */}
        {isEnabled && (
          <div className="space-y-6 pt-2">
            {/* Add Partner Form */}
            <form onSubmit={handleAddPartner} className="space-y-3">
              <h4 className="text-xs font-mono uppercase tracking-wider text-earth-500 font-bold">
                Add Accountability Partner ({partners.length}/3)
              </h4>

              {error && (
                <div className="p-3 bg-red-50 text-red-800 rounded-xl text-xs font-medium border border-red-200">
                  {error}
                </div>
              )}

              {partners.length < 3 ? (
                <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
                  <input
                    type="text"
                    required
                    placeholder="Partner name (e.g. Maya)"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    className="sm:col-span-2 bg-earth-50 border border-earth-200 rounded-xl px-3.5 py-2 text-xs text-earth-900 placeholder-earth-400 focus:outline-none focus:border-sage/40"
                  />
                  <input
                    type="email"
                    required
                    placeholder="Email address"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    className="sm:col-span-2 bg-earth-50 border border-earth-200 rounded-xl px-3.5 py-2 text-xs text-earth-900 placeholder-earth-400 focus:outline-none focus:border-sage/40"
                  />
                  <button
                    type="submit"
                    className="sm:col-span-1 py-2 bg-earth-900 hover:bg-earth-800 text-white rounded-xl text-xs font-mono font-bold uppercase transition-all flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Add
                  </button>
                </div>
              ) : (
                <p className="text-xs text-earth-500 font-mono italic">
                  Maximum of 3 partners reached. Remove one below to add someone else.
                </p>
              )}
            </form>

            {/* List of Partners */}
            <div className="space-y-3">
              <h4 className="text-xs font-mono uppercase tracking-wider text-earth-500 font-bold">
                Active Partners
              </h4>

              {partners.length === 0 ? (
                <div className="p-6 bg-earth-50 border border-dashed border-earth-200 rounded-2xl text-center">
                  <EyeOff className="w-5 h-5 text-earth-400 mx-auto mb-1.5" />
                  <p className="text-xs text-earth-500 font-mono">
                    No accountability partners invited yet. Add up to 3 trusted peers above.
                  </p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {partners.map((partner) => (
                    <div
                      key={partner.id}
                      className="p-4 bg-earth-50 rounded-2xl border border-earth-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
                    >
                      <div>
                        <span className="font-semibold text-xs text-earth-900 block">
                          {partner.name}
                        </span>
                        <span className="text-[11px] font-mono text-earth-500">
                          {partner.email}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                        <button
                          type="button"
                          onClick={() => handleCopyLink(partner)}
                          className="px-3 py-1.5 bg-white border border-earth-200 hover:border-earth-300 text-earth-800 rounded-xl text-xs font-mono font-medium transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
                        >
                          {copiedId === partner.id ? (
                            <>
                              <Check className="w-3.5 h-3.5 text-sage" />
                              <span className="text-sage font-bold">Link Copied</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3.5 h-3.5 text-earth-500" />
                              <span>Copy Streak Link</span>
                            </>
                          )}
                        </button>

                        <button
                          type="button"
                          onClick={() => handleRemovePartner(partner.id)}
                          className="p-1.5 hover:bg-red-50 text-earth-400 hover:text-red-600 rounded-lg transition-colors cursor-pointer"
                          title="Remove partner"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Read-Only Partner Preview */}
            <div className="p-5 bg-sage/[0.04] border border-sage/20 rounded-2xl space-y-2">
              <div className="flex items-center gap-2 text-sage text-xs font-mono font-bold uppercase">
                <ShieldCheck className="w-4 h-4" />
                <span>Partner View Preview</span>
              </div>
              <div className="p-4 bg-white rounded-xl border border-earth-200 space-y-2 text-left">
                <p className="text-xs text-earth-500 font-mono uppercase">
                  {user.displayName || "User"}'s Check-in Streak
                </p>
                <p className="text-2xl font-serif text-earth-900 font-bold">
                  {streak} consecutive {streak === 1 ? "day" : "days"}
                </p>
                <p className="text-[11px] text-earth-600 italic">
                  "Content is private. You are seeing check-in consistency only, never reflection content."
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
