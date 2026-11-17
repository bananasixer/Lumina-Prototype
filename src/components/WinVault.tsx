import React, { useState } from "react";
import {
  Search,
  ChevronDown,
  ChevronUp,
  Trash2,
  BookOpen,
  AlertCircle,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { WinEntry } from "../types";
import { extractCategorySegments } from "../utils/extractCategories";

interface WinVaultProps {
  entries: WinEntry[];
  onDeleteEntry: (id: string) => void;
}

export default function WinVault({ entries, onDeleteEntry }: WinVaultProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [activeFilter, setActiveFilter] = useState<"all" | "wins" | "resilience" | "slowdown">("all");
  const [expandedCardId, setExpandedCardId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString;
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const getExtractedForEntry = (entry: WinEntry) => {
    const hasStored =
      (entry.winsExtracted && entry.winsExtracted.length > 0) ||
      (entry.hardMomentsExtracted && entry.hardMomentsExtracted.length > 0) ||
      (entry.slowdownsExtracted && entry.slowdownsExtracted.length > 0);

    if (hasStored) {
      return {
        winsExtracted: entry.winsExtracted || [],
        hardMomentsExtracted: entry.hardMomentsExtracted || [],
        slowdownsExtracted: entry.slowdownsExtracted || [],
      };
    }

    return extractCategorySegments(entry.transcript || entry.win || "");
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

    const extracted = getExtractedForEntry(entry);

    if (activeFilter === "wins") {
      return (
        extracted.winsExtracted.length > 0 ||
        entry.category === "win" ||
        (entry.isWin && !entry.resiliencePoint && entry.category !== "slowdown")
      );
    }
    if (activeFilter === "resilience") {
      return (
        extracted.hardMomentsExtracted.length > 0 ||
        entry.category === "resilience" ||
        (entry.resiliencePoint && entry.category !== "slowdown")
      );
    }
    if (activeFilter === "slowdown") {
      return (
        extracted.slowdownsExtracted.length > 0 ||
        entry.category === "slowdown" ||
        !!entry.slowdownCause
      );
    }
    return true;
  });

  const winsCount = entries.filter((e) => {
    const ext = getExtractedForEntry(e);
    return (
      ext.winsExtracted.length > 0 ||
      e.category === "win" ||
      (e.isWin && !e.resiliencePoint && e.category !== "slowdown")
    );
  }).length;
  const resilienceCount = entries.filter((e) => {
    const ext = getExtractedForEntry(e);
    return (
      ext.hardMomentsExtracted.length > 0 ||
      e.category === "resilience" ||
      (e.resiliencePoint && e.category !== "slowdown")
    );
  }).length;
  const slowdownCount = entries.filter((e) => {
    const ext = getExtractedForEntry(e);
    return ext.slowdownsExtracted.length > 0 || e.category === "slowdown" || !!e.slowdownCause;
  }).length;

  return (
    <div className="space-y-6 max-w-3xl mx-auto text-left" id="win-vault-root">
      <div className="border-b border-[#0F8B8D]/15 pb-5 space-y-1">
        <div className="flex items-center gap-2 text-xs font-semibold text-[#0F8B8D]">
          <BookOpen className="w-4 h-4 text-[#0F8B8D]" />
          <span>History &amp; Record</span>
        </div>
        <h2 className="text-2xl sm:text-3xl font-display font-bold text-[#1D1D1F] tracking-[-0.025em]">
          Your Entries
        </h2>
        <p className="text-xs text-[#86868B] tabular-nums">
          {winsCount} wins · {resilienceCount} hard moments · {slowdownCount} slowdowns
        </p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-[#86868B] absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search wins, hard moments, slowdowns..."
            className="apple-input w-full min-h-[44px] rounded-[14px] pl-10 pr-4 py-2.5 text-sm"
          />
        </div>

        <div className="flex flex-wrap gap-1 bg-[#EDF7F6] p-1 rounded-[14px] self-start sm:self-auto border border-[#0F8B8D]/15">
          {(
            [
              { id: "all", label: "All", activeText: "text-[#0F8B8D]" },
              { id: "wins", label: "Wins", activeText: "text-[#0055FF]" },
              { id: "resilience", label: "Hard Moments", activeText: "text-[#0F8B8D]" },
              { id: "slowdown", label: "Slowdowns", activeText: "text-[#C86D44]" },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveFilter(tab.id)}
              className={`min-h-[36px] px-3 py-1 rounded-[10px] text-xs font-medium transition-all cursor-pointer whitespace-nowrap ${
                activeFilter === tab.id
                  ? `bg-[#FFFFFF] ${tab.activeText} font-semibold shadow-xs`
                  : "text-[#515154] hover:text-[#1D1D1F]"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {filteredEntries.length === 0 ? (
        <div className="apple-card rounded-[24px] p-10 text-center space-y-2">
          <AlertCircle className="w-7 h-7 text-[#86868B] mx-auto" />
          <h3 className="text-base font-display font-semibold text-[#1D1D1F]">No entries match</h3>
          <p className="text-xs text-[#515154] max-w-xs mx-auto">
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
              const extracted = getExtractedForEntry(entry);

              const displayedItems =
                activeFilter === "wins"
                  ? extracted.winsExtracted.length > 0
                    ? extracted.winsExtracted
                    : [entry.win]
                  : activeFilter === "resilience"
                  ? extracted.hardMomentsExtracted.length > 0
                    ? extracted.hardMomentsExtracted
                    : [entry.win]
                  : activeFilter === "slowdown"
                  ? extracted.slowdownsExtracted.length > 0
                    ? extracted.slowdownsExtracted
                    : [entry.win]
                  : [entry.win];

              const categoryLabel =
                activeFilter === "wins"
                  ? "Win"
                  : activeFilter === "resilience"
                  ? "Hard Moment"
                  : activeFilter === "slowdown"
                  ? "Slowed Down"
                  : entry.category === "slowdown" || (!entry.category && entry.slowdownCause)
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
                  transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
                  className="apple-card apple-card-hover rounded-[24px] p-5 sm:p-6 space-y-3"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-[#515154]">
                      <span className="text-[#1D1D1F] font-medium tabular-nums">
                        {formatDate(entry.date)}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span
                        className={
                          categoryLabel === "Slowed Down"
                            ? "text-[#C86D44] font-semibold"
                            : categoryLabel === "Hard Moment"
                            ? "text-[#0F8B8D] font-semibold"
                            : "text-[#0055FF] font-semibold"
                        }
                      >
                        {categoryLabel}
                      </span>
                      {entry.detectedLanguage && entry.detectedLanguage !== "Auto-detected" && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span className="text-[#86868B]">{entry.detectedLanguage}</span>
                        </>
                      )}
                    </div>

                    <div className="flex items-center gap-1">
                      {confirmDeleteId === entry.id ? (
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              onDeleteEntry(entry.id);
                              setConfirmDeleteId(null);
                            }}
                            className="min-h-[34px] px-3 py-1 rounded-full bg-[#C86D44] text-white text-xs font-medium cursor-pointer"
                          >
                            Delete
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmDeleteId(null)}
                            className="min-h-[34px] px-3 py-1 rounded-full bg-[#F4F7F6] text-xs font-medium text-[#515154] cursor-pointer"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteId(entry.id)}
                          aria-label="Delete entry"
                          className="w-9 h-9 rounded-full hover:bg-[#F4F7F6] text-[#86868B] hover:text-[#C86D44] flex items-center justify-center transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>

                  {displayedItems.length === 1 ? (
                    <p className="text-base font-display font-semibold text-[#1D1D1F] leading-snug">
                      {displayedItems[0]}
                    </p>
                  ) : (
                    <ul className="space-y-1.5">
                      {displayedItems.map((line, i) => (
                        <li
                          key={i}
                          className="text-sm sm:text-base font-display font-semibold text-[#1D1D1F] leading-snug"
                        >
                          • {line}
                        </li>
                      ))}
                    </ul>
                  )}

                  {activeFilter === "slowdown" && entry.slowdownCause && (
                    <p className="text-xs text-[#C86D44] rounded-[12px] bg-[#C86D44]/[0.06] border border-[#C86D44]/20 px-3 py-2">
                      Trigger: {entry.slowdownCause}
                    </p>
                  )}

                  {entry.transcript && (
                    <>
                      <button
                        type="button"
                        onClick={() => setExpandedCardId(isExpanded ? null : entry.id)}
                        className="min-h-[36px] inline-flex items-center gap-1.5 text-xs font-medium text-[#515154] hover:text-[#0F8B8D] cursor-pointer pt-0.5"
                      >
                        {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                        <span>{isExpanded ? "Hide full spoken text" : "Show full spoken text"}</span>
                      </button>

                      {isExpanded && (
                        <div className="pt-3 border-t border-[#0F8B8D]/15 space-y-2.5">
                          <p className="text-xs sm:text-sm text-[#1D1D1F] apple-well rounded-[14px] p-3.5 leading-relaxed whitespace-pre-wrap">
                            {entry.transcript}
                          </p>
                        </div>
                      )}
                    </>
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
