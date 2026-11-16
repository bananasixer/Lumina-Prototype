import React, { useState } from "react";
import {
  Search,
  ChevronDown,
  ChevronUp,
  Trash2,
  BookOpen,
  AlertCircle,
  Download,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { WinEntry } from "../types";
import EntryActionBar from "./EntryActionBar";

interface WinVaultProps {
  entries: WinEntry[];
  onDeleteEntry: (id: string) => void;
}

export default function WinVault({ entries, onDeleteEntry }: WinVaultProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [activeFilter, setActiveFilter] = useState<"all" | "wins" | "resilience" | "slowdown">("all");
  const [expandedCardId, setExpandedCardId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString;
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const filteredEntries = entries.filter((entry) => {
    const searchLower = searchTerm.toLowerCase();
    const matchesSearch =
      (entry.win?.toLowerCase() || "").includes(searchLower) ||
      (entry.transcript?.toLowerCase() || "").includes(searchLower) ||
      (entry.feedback?.toLowerCase() || "").includes(searchLower) ||
      (entry.slowdownCause?.toLowerCase() || "").includes(searchLower) ||
      (entry.detectedLanguage?.toLowerCase() || "").includes(searchLower);

    if (!matchesSearch) return false;
    if (activeFilter === "wins") {
      return (
        entry.category === "win" ||
        (entry.isWin && !entry.resiliencePoint && entry.category !== "slowdown") ||
        (!entry.category && !entry.resiliencePoint)
      );
    }
    if (activeFilter === "resilience") {
      return entry.category === "resilience" || (entry.resiliencePoint && entry.category !== "slowdown");
    }
    if (activeFilter === "slowdown") {
      return entry.category === "slowdown" || !!entry.slowdownCause;
    }
    return true;
  });

  const handleDownloadSummary = () => {
    if (entries.length === 0) {
      setNotice("Record is empty. Save an entry first to export.");
      setTimeout(() => setNotice(null), 2400);
      return;
    }

    const todayStr = new Date().toLocaleDateString("en-US", {
      month: "long",
      year: "numeric",
    });

    let content = `LUMINA PRIVATE RECORD EXPORT\nPeriod: ${todayStr}\nEntries: ${entries.length}\n\n`;
    entries.forEach((entry, idx) => {
      content += `[#${idx + 1}] ${formatDate(entry.date)} · ${
        entry.category || (entry.resiliencePoint ? "resilience" : "win")
      } · ${entry.detectedLanguage || "Auto-detected"}\n`;
      content += `Takeaway: ${entry.win}\n`;
      content += `Note: ${entry.feedback}\n`;
      if (entry.transcript) content += `Transcript: ${entry.transcript}\n`;
      content += `\n---\n\n`;
    });

    const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `Lumina_Record_${todayStr.replace(/\s+/g, "_")}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const winsCount = entries.filter(
    (e) =>
      e.category === "win" ||
      (e.isWin && !e.resiliencePoint && e.category !== "slowdown") ||
      (!e.category && !e.resiliencePoint)
  ).length;
  const resilienceCount = entries.filter(
    (e) => e.category === "resilience" || (e.resiliencePoint && e.category !== "slowdown")
  ).length;
  const slowdownCount = entries.filter((e) => e.category === "slowdown" || !!e.slowdownCause).length;

  return (
    <div className="space-y-6 max-w-3xl mx-auto text-left" id="win-vault-root">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-[#233428]/10 pb-5">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-widest text-[#4B6B53]">
            <BookOpen className="w-4 h-4" />
            <span>History &amp; Record</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-display font-bold text-[#1D241F] tracking-tight">
            Your Entries
          </h2>
          <p className="text-xs font-mono text-[#546257] tabular-nums">
            {winsCount} wins · {resilienceCount} hard moments · {slowdownCount} slowdowns
          </p>
        </div>

        <button
          type="button"
          onClick={handleDownloadSummary}
          className="min-h-[38px] px-3.5 py-1.5 rounded-xl bg-white hover:bg-[#EFF2EA] border border-[#233428]/12 text-xs font-mono uppercase tracking-wider text-[#1D241F] inline-flex items-center gap-2 cursor-pointer shrink-0 self-start md:self-auto"
        >
          <Download className="w-3.5 h-3.5 text-[#4B6B53]" />
          <span>Export All</span>
        </button>
      </div>

      {notice && (
        <div className="glass-panel rounded-xl px-4 py-2.5 text-xs font-mono text-[#4B6B53]">
          {notice}
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-[#546257] absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search transcripts, takeaways, languages..."
            className="glass-input w-full rounded-xl pl-10 pr-4 py-2.5 text-sm"
          />
        </div>

        <div className="flex flex-wrap gap-1 glass-panel p-1 rounded-xl self-start sm:self-auto">
          {(
            [
              { id: "all", label: "All" },
              { id: "wins", label: "Wins" },
              { id: "resilience", label: "Hard Moments" },
              { id: "slowdown", label: "Slowdowns" },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveFilter(tab.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-colors cursor-pointer whitespace-nowrap ${
                activeFilter === tab.id
                  ? "bg-[#4B6B53] text-white font-medium"
                  : "text-[#546257] hover:text-[#1D241F]"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {filteredEntries.length === 0 ? (
        <div className="glass-panel rounded-3xl p-10 text-center space-y-2">
          <AlertCircle className="w-7 h-7 text-[#546257]/50 mx-auto" />
          <h3 className="text-base font-display font-semibold text-[#1D241F]">No entries yet</h3>
          <p className="text-xs text-[#546257] max-w-xs mx-auto">
            {searchTerm
              ? "Try another search keyword or clear your filter."
              : "Record a voice note to populate your history."}
          </p>
        </div>
      ) : (
        <div className="space-y-3.5">
          <AnimatePresence initial={false}>
            {filteredEntries.map((entry) => {
              const isExpanded = expandedCardId === entry.id;
              const categoryLabel =
                entry.category === "slowdown" || (!entry.category && entry.slowdownCause)
                  ? "Slowed Down"
                  : entry.category === "resilience" || (!entry.category && entry.resiliencePoint)
                  ? "Hard Moment"
                  : "Win";

              return (
                <motion.div
                  key={entry.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.98 }}
                  transition={{ duration: 0.2 }}
                  className="glass-panel glass-card-hover rounded-2xl p-5 space-y-3"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs font-mono text-[#546257]">
                      <span className="text-[#1D241F] font-medium">{formatDate(entry.date)}</span>
                      <span>·</span>
                      <span
                        className={
                          categoryLabel === "Slowed Down"
                            ? "text-[#C86F52]"
                            : categoryLabel === "Hard Moment"
                            ? "text-[#4B6B53]"
                            : "text-[#4B6B53] font-semibold"
                        }
                      >
                        {categoryLabel}
                      </span>
                      {entry.detectedLanguage && (
                        <>
                          <span>·</span>
                          <span>{entry.detectedLanguage}</span>
                        </>
                      )}
                    </div>

                    <div className="flex items-center gap-1">
                      {confirmDeleteId === entry.id ? (
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => {
                              onDeleteEntry(entry.id);
                              setConfirmDeleteId(null);
                            }}
                            className="min-h-[30px] px-2.5 py-1 rounded-lg bg-[#C86F52] text-white text-[11px] font-mono cursor-pointer"
                          >
                            Delete
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmDeleteId(null)}
                            className="min-h-[30px] px-2 py-1 rounded-lg bg-[#EFF2EA] text-[11px] font-mono text-[#546257] cursor-pointer"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteId(entry.id)}
                          aria-label="Delete entry"
                          className="w-8 h-8 rounded-lg hover:bg-[#EFF2EA] text-[#546257] hover:text-[#C86F52] flex items-center justify-center transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>

                  <p className="text-base font-display font-medium text-[#1D241F] leading-snug">
                    {entry.win}
                  </p>

                  {entry.slowdownCause && (
                    <p className="text-xs text-[#C86F52] border-l-2 border-[#C86F52]/50 pl-3">
                      Slowdown trigger: {entry.slowdownCause}
                    </p>
                  )}

                  {entry.transcript && (
                    <EntryActionBar
                      text={entry.transcript}
                      title={entry.win}
                      date={entry.date}
                      detectedLanguage={entry.detectedLanguage}
                      category={entry.category}
                    />
                  )}

                  <button
                    type="button"
                    onClick={() => setExpandedCardId(isExpanded ? null : entry.id)}
                    className="inline-flex items-center gap-1.5 text-xs font-mono text-[#546257] hover:text-[#1D241F] cursor-pointer pt-0.5"
                  >
                    {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                    <span>{isExpanded ? "Hide Details" : "View Transcript & Note"}</span>
                  </button>

                  {isExpanded && (
                    <div className="pt-3 border-t border-[#233428]/10 space-y-2.5">
                      {entry.feedback && (
                        <p className="text-xs sm:text-sm text-[#546257] leading-relaxed">
                          {entry.feedback}
                        </p>
                      )}
                      {entry.transcript && (
                        <p className="text-xs sm:text-sm text-[#1D241F] bg-[#F4F6F0] rounded-xl p-3 border border-[#233428]/10 leading-relaxed whitespace-pre-wrap">
                          {entry.transcript}
                        </p>
                      )}
                    </div>
                  )}
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
