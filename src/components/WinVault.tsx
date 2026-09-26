import React, { useState, useEffect } from "react";
import { Search, Calendar, ChevronDown, ChevronUp, Trash2, BookOpen, AlertCircle, FileText, Sparkles, Download, Share2, CheckCircle2 } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { WinEntry } from "../types";

interface WinVaultProps {
  entries: WinEntry[];
  onDeleteEntry: (id: string) => void;
}

export default function WinVault({ entries, onDeleteEntry }: WinVaultProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState<"all" | "wins" | "resilience" | "slowdown">("all");
  const [expandedCardId, setExpandedCardId] = useState<string | null>(null);
  const [verificationsMap, setVerificationsMap] = useState<Record<string, any>>({});

  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem("lumina_verifications_map") || "{}");
      setVerificationsMap(stored);
    } catch (e) {
      console.error("Error reading verifications map", e);
    }
  }, []);

  const handleShareVerification = (entry: WinEntry) => {
    try {
      const existing = JSON.parse(localStorage.getItem("lumina_shared_entries") || "{}");
      existing[entry.id] = entry;
      localStorage.setItem("lumina_shared_entries", JSON.stringify(existing));
    } catch (e) {
      console.error("Error saving shared entry cache", e);
    }

    const shareUrl = `${window.location.origin}?sharedEntryId=${entry.id}`;
    navigator.clipboard.writeText(shareUrl);
    alert(
      `Private verification link copied:\n${shareUrl}\n\nShare message:\n"I logged something from ${formatDate(entry.date)} I'm proud of — want to see it?"`
    );
  };

  // Filter & Search logic
  const filteredEntries = entries.filter(entry => {
    const searchLower = searchTerm.toLowerCase();
    const matchesSearch = 
      (entry.win?.toLowerCase() || "").includes(searchLower) ||
      (entry.transcript?.toLowerCase() || "").includes(searchLower) ||
      (entry.feedback?.toLowerCase() || "").includes(searchLower) ||
      (entry.slowdownCause?.toLowerCase() || "").includes(searchLower);
    
    if (!matchesSearch) return false;
    if (activeTab === "wins") {
      return entry.category === "win" || (entry.isWin && !entry.resiliencePoint && entry.category !== "slowdown") || (!entry.category && !entry.resiliencePoint);
    }
    if (activeTab === "resilience") {
      return entry.category === "resilience" || (entry.resiliencePoint && entry.category !== "slowdown");
    }
    if (activeTab === "slowdown") {
      return entry.category === "slowdown" || !!entry.slowdownCause;
    }
    return true;
  });

  // Toggle card expansion
  const toggleExpand = (id: string) => {
    setExpandedCardId(expandedCardId === id ? null : id);
  };

  // Helper to format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString;
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric"
    });
  };

  // Compile and Download Monthly Reflection Summary
  const handleDownloadSummary = () => {
    if (entries.length === 0) {
      alert("There are no entries in your record to compile into a summary.");
      return;
    }

    const todayStr = new Date().toLocaleDateString("en-US", {
      month: "long",
      year: "numeric"
    });

    let content = `========================================================================\n`;
    content += ` LUMINA PRIVATE REFLECTION ARCHIVE & GENERAL GROWTH SUMMARY\n`;
    content += ` Period: ${todayStr}\n`;
    content += ` Export Date: ${new Date().toLocaleDateString()}\n`;
    content += ` Total Saved Entries: ${entries.length} (${entries.filter(e => !e.resiliencePoint).length} Wins, ${entries.filter(e => e.resiliencePoint).length} Resilience Points)\n`;
    content += `========================================================================\n\n`;

    content += `--- OVERVIEW ---\n`;
    content += `This document catalogs your daily micro-achievements, key alignments,\n`;
    content += `and operational challenges, serving as your personal\n`;
    content += `ledger for self-reflection, milestone tracking, and personal growth.\n\n`;

    entries.forEach((entry, idx) => {
      const type = entry.resiliencePoint ? "RESILIENCE POINT (CHALLENGE)" : "WIN (IMPACT STATEMENT)";
      content += `[Entry #${idx + 1}] - ${formatDate(entry.date)} - [${type}]\n`;
      content += `------------------------------------------------------------------------\n`;
      content += `MAIN OUTCOME:\n  "${entry.win}"\n\n`;
      content += `LUMINA FEEDBACK:\n  "${entry.feedback}"\n\n`;
      if (entry.transcript) {
        content += `TRANSCRIPT:\n  "${entry.transcript}"\n\n`;
      }
      content += `\n`;
    });

    content += `========================================================================\n`;
    content += ` Lumina - Private Record\n`;
    content += ` Protected in your private personal archive.\n`;
    content += `========================================================================\n`;

    const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    const sanitizedMonth = todayStr.replace(/\s+/g, "_");
    link.download = `Lumina_Summary_${sanitizedMonth}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6 max-w-3xl mx-auto px-4 py-4" id="win-vault-root">
      
      {/* Header with organic counters */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-earth-200 pb-5">
        <div className="space-y-1 text-left flex-1">
          <h2 className="text-xl md:text-2xl font-serif text-earth-900 tracking-tight flex items-center gap-2.5">
            <BookOpen className="w-5 h-5 text-sage" />
            Private Record Archive
            {/* Voice wave indicator */}
            <div className="flex items-center gap-0.5 h-3 ml-1.5">
              {[0.5, 0.3, 0.7, 0.4].map((v, i) => (
                <motion.span
                  key={i}
                  className="w-[1.5px] bg-sage/60 rounded-full"
                  animate={{ height: ["30%", "90%", "30%"] }}
                  transition={{ duration: 1.2 + i * 0.15, repeat: Infinity, ease: "easeInOut" }}
                  style={{ height: `${v * 100}%` }}
                />
              ))}
            </div>
          </h2>
          <p className="text-xs text-earth-600">
            A secure digital ledger cataloging your daily breakthroughs, defused fires, and persistent resilience.
          </p>
        </div>

        {/* Live Counters & Download Option */}
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          {/* Download Button */}
          <button
            onClick={handleDownloadSummary}
            className="px-3.5 py-2 bg-white hover:bg-sage-light text-earth-800 hover:text-sage border border-earth-200 hover:border-sage/30 rounded-xl text-xs font-mono font-bold tracking-wider uppercase transition-all duration-300 flex items-center gap-2 shadow-sm cursor-pointer active:scale-98"
            title="Download formatted text archive"
          >
            <Download className="w-3.5 h-3.5 text-sage" />
            Download Summary
          </button>

          <div className="bg-white border border-earth-200 px-3 py-1.5 rounded-xl text-center earth-shadow">
            <div className="text-[9px] font-mono uppercase tracking-widest text-sage-900 font-bold">🏆 Wins</div>
            <div className="text-sm font-bold text-earth-900">
              {entries.filter(e => e.category === "win" || (e.isWin && !e.resiliencePoint && e.category !== "slowdown") || (!e.category && !e.resiliencePoint)).length}
            </div>
          </div>
          <div className="bg-white border border-earth-200 px-3 py-1.5 rounded-xl text-center earth-shadow">
            <div className="text-[9px] font-mono uppercase tracking-widest text-blue-900 font-bold">💪 Resilience</div>
            <div className="text-sm font-bold text-earth-900">
              {entries.filter(e => e.category === "resilience" || (e.resiliencePoint && e.category !== "slowdown")).length}
            </div>
          </div>
          <div className="bg-white border border-earth-200 px-3 py-1.5 rounded-xl text-center earth-shadow">
            <div className="text-[9px] font-mono uppercase tracking-widest text-amber-900 font-bold">⏳ Slowdowns</div>
            <div className="text-sm font-bold text-earth-900">
              {entries.filter(e => e.category === "slowdown" || !!e.slowdownCause).length}
            </div>
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Search Input */}
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-3.5 w-4 h-4 text-earth-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search saved wins, hard moments, slowdowns..."
            className="w-full bg-white border border-earth-200 rounded-xl pl-10 pr-4 py-2.5 text-sm text-earth-900 placeholder-earth-400 focus:outline-none focus:border-sage/40 focus:ring-1 focus:ring-sage/10 shadow-sm transition-all"
          />
        </div>

        {/* Quick Filter Tabs */}
        <div className="flex flex-wrap bg-earth-100 p-1 rounded-xl border border-earth-200/60 h-fit self-start sm:self-auto gap-1">
          <button
            type="button"
            onClick={() => setActiveTab("all")}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono uppercase tracking-wider transition-all cursor-pointer ${
              activeTab === "all" 
                ? "bg-white text-earth-900 border border-earth-200 shadow-sm font-semibold" 
                : "text-earth-600 hover:text-earth-900"
            }`}
          >
            All
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("wins")}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono uppercase tracking-wider transition-all cursor-pointer ${
              activeTab === "wins" 
                ? "bg-white text-sage-900 border border-earth-200 shadow-sm font-semibold" 
                : "text-earth-600 hover:text-sage"
            }`}
          >
            🏆 Wins
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("resilience")}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono uppercase tracking-wider transition-all cursor-pointer ${
              activeTab === "resilience" 
                ? "bg-white text-blue-900 border border-earth-200 shadow-sm font-semibold" 
                : "text-earth-600 hover:text-blue-900"
            }`}
          >
            💪 Resilience
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("slowdown")}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono uppercase tracking-wider transition-all cursor-pointer ${
              activeTab === "slowdown" 
                ? "bg-white text-amber-900 border border-earth-200 shadow-sm font-semibold" 
                : "text-earth-600 hover:text-amber-900"
            }`}
          >
            ⏳ Slowdowns
          </button>
        </div>
      </div>

      {/* Timeline entries list */}
      {filteredEntries.length === 0 ? (
        <div className="text-center py-16 bg-white border border-dashed border-earth-200 rounded-2xl p-6 shadow-sm">
          <AlertCircle className="w-10 h-10 text-earth-300 mx-auto mb-3 animate-pulse" />
          <h3 className="text-earth-900 font-semibold text-base font-serif">No entries found in record</h3>
          <p className="text-earth-600 text-xs max-w-xs mx-auto mt-1">
            {searchTerm ? "No entries matched your search query. Try typing another keyword." : "Your archive is currently empty. Head over to the Command tab to express your first daily win!"}
          </p>
        </div>
      ) : (
        <div className="relative border-l border-earth-200 pl-4 sm:pl-6 ml-2.5 space-y-6 text-left">
          <AnimatePresence initial={false}>
            {filteredEntries.map((entry, index) => {
              const isExpanded = expandedCardId === entry.id;
              return (
                <motion.div
                  key={entry.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ 
                    duration: 0.5,
                    delay: Math.min(index * 0.08, 0.6), // Stagger delay based on index
                    ease: [0.16, 1, 0.3, 1] // High-end fluid cubic-bezier easing
                  }}
                  className="relative group"
                >
                  {/* Timeline bullet dot */}
                  <div className={`absolute -left-[21px] sm:-left-[29px] top-4 w-3.5 h-3.5 rounded-full border-2 ${
                    entry.resiliencePoint 
                      ? "bg-sage border-white shadow-sm" 
                      : "bg-sage/70 border-white shadow-sm"
                  }`} />

                  {/* Card Container with tactile scale-up and shadow-lifting hover effect */}
                  <motion.div
                    whileHover={{ 
                      y: -4,
                      scale: 1.008,
                      boxShadow: "0 15px 30px -5px rgba(35, 28, 22, 0.06), 0 8px 15px -3px rgba(35, 28, 22, 0.04)"
                    }}
                    transition={{ 
                      type: "spring", 
                      stiffness: 350, 
                      damping: 22 
                    }}
                    className={`p-6 bg-white rounded-2xl border transition-colors duration-300 ${
                      isExpanded 
                        ? "border-sage/30 bg-sage-light/10 shadow-sm" 
                        : "border-earth-200 shadow-sm"
                    }`}
                  >
                    
                    {/* Header Row */}
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-earth-400" />
                        <span className="text-xs font-mono text-earth-500 font-semibold">
                          {formatDate(entry.date)}
                        </span>
                      </div>

                      {/* Right side actions and badges */}
                      <div className="flex items-center gap-2">
                        {entry.category === "slowdown" || (!entry.category && entry.slowdownCause) ? (
                          <span className="text-[9px] font-mono uppercase tracking-wider px-2 py-0.5 rounded border font-semibold bg-amber-50 text-amber-900 border-amber-300">
                            ⏳ Slowed Down
                          </span>
                        ) : entry.category === "resilience" || (!entry.category && entry.resiliencePoint) ? (
                          <span className="text-[9px] font-mono uppercase tracking-wider px-2 py-0.5 rounded border font-semibold bg-blue-50 text-blue-900 border-blue-300">
                            💪 Resilience
                          </span>
                        ) : (
                          <span className="text-[9px] font-mono uppercase tracking-wider px-2 py-0.5 rounded border font-semibold bg-sage/15 text-sage-900 border-sage/30">
                            🏆 Win
                          </span>
                        )}

                        {/* Share link */}
                        <button
                          type="button"
                          onClick={() => handleShareVerification(entry)}
                          className="p-1 hover:bg-earth-100 rounded text-earth-400 hover:text-sage transition-colors cursor-pointer flex items-center gap-1"
                          title="Generate verification link"
                        >
                          <Share2 className="w-3 h-3 text-sage" />
                          <span className="text-[9px] font-mono uppercase tracking-wider font-semibold text-sage hidden sm:inline">Verify Link</span>
                        </button>
                        
                        {/* Delete trigger */}
                        <button
                          type="button"
                          onClick={() => {
                            if (window.confirm("Are you sure you want to permanently delete this entry?")) {
                              onDeleteEntry(entry.id);
                            }
                          }}
                          className="p-1 hover:bg-earth-100 rounded text-earth-400 hover:text-red-600 transition-colors cursor-pointer"
                          title="Delete achievement"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Main Extracted text */}
                    <p className="text-sm sm:text-base font-serif text-earth-900 leading-relaxed group-hover:text-sage transition-colors duration-200">
                      "{entry.win}"
                    </p>

                    {/* Procrastination / Slowdown Cause Callout */}
                    {entry.slowdownCause && (
                      <div className="mt-2.5 p-3 bg-amber-50/90 border border-amber-200/90 rounded-xl text-left space-y-1">
                        <span className="text-[10px] font-mono uppercase tracking-wider font-bold text-amber-900 flex items-center gap-1.5">
                          <span>⏳</span>
                          <span>What caused slowdown:</span>
                        </span>
                        <p className="text-xs text-earth-800 leading-relaxed font-sans">
                          "{entry.slowdownCause}"
                        </p>
                      </div>
                    )}

                    {/* Attributable Verification Badge if present */}
                    {(entry.verification || verificationsMap[entry.id]) && (
                      <div className="mt-2.5 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-sage/10 border border-sage/25 text-sage text-[10px] font-mono font-semibold">
                        <CheckCircle2 className="w-3 h-3 text-sage" />
                        <span>
                          Confirmed by {(entry.verification || verificationsMap[entry.id]).verifierName} ({(entry.verification || verificationsMap[entry.id]).verifierContact})
                        </span>
                      </div>
                    )}

                    {/* Dynamic Tags & Resolution Badges */}
                    <div className="flex flex-wrap items-center gap-1.5 mt-2.5">
                      {entry.status && (
                        <span className={`text-[9px] font-mono uppercase tracking-wider px-2.5 py-0.5 rounded-full border font-bold ${
                          entry.status === "resolved"
                            ? "bg-sage/10 text-sage border-sage/20"
                            : "bg-amber-50 text-amber-700 border-amber-200"
                        }`}>
                          {entry.status === "resolved" ? "✓ Resolved Story" : "⋯ Still Ongoing"}
                        </span>
                      )}

                      {entry.tags && entry.tags.length > 0 && entry.tags.map((tag, idx) => (
                        <span key={idx} className="inline-flex items-center text-[10px] font-mono px-2 py-0.5 rounded-full bg-earth-50 text-earth-600 border border-earth-200">
                          #{tag}
                        </span>
                      ))}
                    </div>

                    {/* Expandable Disclosure Toggle */}
                    <button
                      type="button"
                      onClick={() => toggleExpand(entry.id)}
                      className="mt-3.5 inline-flex items-center gap-1 text-[11px] font-mono text-earth-500 hover:text-sage transition-colors cursor-pointer uppercase tracking-wider font-semibold"
                    >
                      {isExpanded ? (
                        <>
                          <ChevronUp className="w-3.5 h-3.5" />
                          Collapse Transcript
                        </>
                      ) : (
                        <>
                          <ChevronDown className="w-3.5 h-3.5" />
                          Read Full Decryption & Assessments
                        </>
                      )}
                    </button>

                    {/* Expanded content area */}
                    <AnimatePresence initial={false}>
                      {isExpanded && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.25 }}
                          className="overflow-hidden mt-4 space-y-4 pt-4 border-t border-earth-200"
                        >
                          {/* Feedback */}
                          <div className="space-y-1">
                            <h5 className="text-[10px] font-mono text-earth-400 uppercase tracking-widest flex items-center gap-1.5 font-bold">
                              <Sparkles className="w-3 h-3 text-sage" />
                              Lumina Feedback
                            </h5>
                            <p className="text-xs text-earth-600 italic pl-3.5 border-l-2 border-sage/30 py-0.5 leading-relaxed font-normal">
                              "{entry.feedback}"
                            </p>
                          </div>

                          {/* Dynamic Pattern Observation if present */}
                          {entry.patternObservation && (
                            <div className="p-3 bg-sage/[0.03] border border-sage/15 rounded-xl text-left space-y-1">
                              <h5 className="text-[10px] font-mono text-sage uppercase tracking-widest flex items-center gap-1.5 font-bold">
                                <Sparkles className="w-3 h-3 text-sage animate-pulse" />
                                Gentle Pattern Observation
                              </h5>
                              <p className="text-xs text-earth-700 leading-relaxed italic">
                                "{entry.patternObservation}"
                              </p>
                            </div>
                          )}

                          {/* Bad Habits & Roadblocks Display */}
                          {entry.badHabits && entry.badHabits.length > 0 && (
                            <div className="space-y-2 p-3 bg-terracotta/[0.02] border border-terracotta/10 rounded-xl text-left">
                              <h5 className="text-[10px] font-mono text-terracotta uppercase tracking-widest flex items-center gap-1.5 font-bold">
                                <AlertCircle className="w-3.5 h-3.5 text-terracotta" />
                                Momentum Blockers & Habits
                              </h5>
                              {entry.badHabitInsight && (
                                <p className="text-xs text-earth-700 italic leading-relaxed pl-3 border-l border-terracotta/20 mb-2">
                                  "{entry.badHabitInsight}"
                                </p>
                              )}
                              <div className="flex flex-wrap gap-1.5">
                                {entry.badHabits.map((habit, idx) => (
                                  <span 
                                    key={idx} 
                                    className="inline-flex items-center text-[10px] font-mono px-2 py-0.5 rounded-lg bg-terracotta/[0.05] text-terracotta border border-terracotta/15"
                                  >
                                    • {habit}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Decoded Full Transcript */}
                          {entry.transcript && (
                            <div className="space-y-1">
                              <h5 className="text-[10px] font-mono text-earth-400 uppercase tracking-widest flex items-center gap-1.5 font-bold">
                                <FileText className="w-3 h-3 text-sage" />
                                Audio Decoded Transcript
                              </h5>
                              <p className="text-xs text-earth-600 bg-earth-50 p-3 rounded-xl border border-earth-200 leading-relaxed max-h-32 overflow-y-auto">
                                {entry.transcript}
                              </p>
                            </div>
                          )}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
