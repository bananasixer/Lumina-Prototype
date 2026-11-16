import React, { useState } from "react";
import {
  Copy,
  Check,
  Languages,
  FileText,
  ListChecks,
  Download,
  Loader2,
  X,
} from "lucide-react";
import { safeApiPost } from "../utils/safeApi";

const QUICK_TARGET_LANGUAGES = [
  "English",
  "Urdu",
  "Arabic",
  "Spanish",
  "French",
  "Mandarin Chinese",
  "Hindi",
  "German",
  "Japanese",
  "Portuguese",
];

interface EntryActionBarProps {
  text: string;
  title?: string;
  date?: string;
  detectedLanguage?: string;
  category?: string;
  onOutputGenerated?: (output: { label: string; content: string }) => void;
}

export default function EntryActionBar({
  text,
  title,
  date,
  detectedLanguage,
  category,
  onOutputGenerated,
}: EntryActionBarProps) {
  const [copied, setCopied] = useState(false);
  const [activePopover, setActivePopover] = useState<"translate" | "format" | "export" | null>(null);
  const [customLanguage, setCustomLanguage] = useState("");
  const [loadingAction, setLoadingAction] = useState<string | null>(null);
  const [localOutput, setLocalOutput] = useState<{ label: string; content: string } | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const handleCopy = async () => {
    const contentToCopy = localOutput ? localOutput.content : text;
    try {
      await navigator.clipboard.writeText(contentToCopy);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      setActionError("Clipboard copy unavailable.");
    }
  };

  const runTransform = async (
    action: "translate" | "summarize" | "format",
    options?: { targetLanguage?: string; formatStyle?: string }
  ) => {
    if (!text.trim()) return;
    setLoadingAction(action);
    setActionError(null);
    setActivePopover(null);
    try {
      const res = await safeApiPost<{ result: string; label: string }>("/api/transform-entry", {
        text,
        action,
        targetLanguage: options?.targetLanguage,
        formatStyle: options?.formatStyle,
      });
      setLocalOutput({ label: res.label, content: res.result });
      onOutputGenerated?.({ label: res.label, content: res.result });
    } catch (err: any) {
      setActionError(err.message || "Could not transform text.");
    } finally {
      setLoadingAction(null);
    }
  };

  const handleExport = (ext: "txt" | "md" | "json") => {
    const baseName = `lumina-entry-${date || new Date().toISOString().split("T")[0]}`;
    let fileContent = "";
    let mime = "text/plain;charset=utf-8";

    if (ext === "json") {
      mime = "application/json;charset=utf-8";
      fileContent = JSON.stringify(
        {
          date: date || new Date().toISOString().split("T")[0],
          category: category || "win",
          detectedLanguage: detectedLanguage || "Auto-detected",
          takeaway: title || "",
          transcript: text,
          transformedOutput: localOutput || undefined,
        },
        null,
        2
      );
    } else if (ext === "md") {
      fileContent = `# ${title || "Lumina Entry"}\n\n- Date: ${date || "Today"}\n- Language: ${
        detectedLanguage || "Auto-detected"
      }\n\n## Transcript\n\n${text}\n${
        localOutput ? `\n## ${localOutput.label}\n\n${localOutput.content}\n` : ""
      }`;
    } else {
      fileContent = `${title ? `${title}\n` : ""}Date: ${date || "Today"} | Language: ${
        detectedLanguage || "Auto-detected"
      }\n\n${text}${localOutput ? `\n\n--- ${localOutput.label} ---\n${localOutput.content}` : ""}`;
    }

    const blob = new Blob([fileContent], { type: mime });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${baseName}.${ext}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    setActivePopover(null);
  };

  return (
    <div className="space-y-2.5">
      <div className="flex flex-wrap items-center gap-1.5 relative">
        <button
          type="button"
          onClick={handleCopy}
          className="min-h-[34px] px-2.5 py-1 rounded-lg bg-[#EFF2EA] hover:bg-[#E2E8DA] border border-[#233428]/10 text-xs font-medium text-[#1D241F] inline-flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap"
        >
          {copied ? <Check className="w-3.5 h-3.5 text-[#4B6B53]" /> : <Copy className="w-3.5 h-3.5 text-[#546257]" />}
          <span>{copied ? "Copied" : "Copy"}</span>
        </button>

        <button
          type="button"
          onClick={() => setActivePopover(activePopover === "translate" ? null : "translate")}
          disabled={loadingAction === "translate"}
          className="min-h-[34px] px-2.5 py-1 rounded-lg bg-[#EFF2EA] hover:bg-[#E2E8DA] border border-[#233428]/10 text-xs font-medium text-[#1D241F] inline-flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap disabled:opacity-50"
        >
          {loadingAction === "translate" ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin text-[#4B6B53]" />
          ) : (
            <Languages className="w-3.5 h-3.5 text-[#4B6B53]" />
          )}
          <span>Translate</span>
        </button>

        <button
          type="button"
          onClick={() => runTransform("summarize")}
          disabled={loadingAction === "summarize"}
          className="min-h-[34px] px-2.5 py-1 rounded-lg bg-[#EFF2EA] hover:bg-[#E2E8DA] border border-[#233428]/10 text-xs font-medium text-[#1D241F] inline-flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap disabled:opacity-50"
        >
          {loadingAction === "summarize" ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin text-[#4B6B53]" />
          ) : (
            <FileText className="w-3.5 h-3.5 text-[#C86F52]" />
          )}
          <span>Summarize</span>
        </button>

        <button
          type="button"
          onClick={() => setActivePopover(activePopover === "format" ? null : "format")}
          disabled={loadingAction === "format"}
          className="min-h-[34px] px-2.5 py-1 rounded-lg bg-[#EFF2EA] hover:bg-[#E2E8DA] border border-[#233428]/10 text-xs font-medium text-[#1D241F] inline-flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap disabled:opacity-50"
        >
          {loadingAction === "format" ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin text-[#4B6B53]" />
          ) : (
            <ListChecks className="w-3.5 h-3.5 text-[#4B6B53]" />
          )}
          <span>Format</span>
        </button>

        <button
          type="button"
          onClick={() => setActivePopover(activePopover === "export" ? null : "export")}
          className="min-h-[34px] px-2.5 py-1 rounded-lg bg-[#EFF2EA] hover:bg-[#E2E8DA] border border-[#233428]/10 text-xs font-medium text-[#1D241F] inline-flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap"
        >
          <Download className="w-3.5 h-3.5 text-[#546257]" />
          <span>Export</span>
        </button>
      </div>

      {activePopover === "translate" && (
        <div className="glass-panel-strong rounded-xl p-3.5 space-y-2.5 text-left">
          <div className="flex items-center justify-between text-xs text-[#546257]">
            <span className="font-mono uppercase tracking-wider text-[10px]">Target Language (95+)</span>
            <button
              type="button"
              onClick={() => setActivePopover(null)}
              className="text-[#546257] hover:text-[#1D241F] cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {QUICK_TARGET_LANGUAGES.map((lang) => (
              <button
                key={lang}
                type="button"
                onClick={() => runTransform("translate", { targetLanguage: lang })}
                className="px-2.5 py-1 rounded-lg bg-[#EFF2EA] hover:bg-[#4B6B53] hover:text-white border border-[#233428]/10 text-xs text-[#1D241F] transition-colors cursor-pointer"
              >
                {lang}
              </button>
            ))}
          </div>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (customLanguage.trim()) {
                runTransform("translate", { targetLanguage: customLanguage.trim() });
                setCustomLanguage("");
              }
            }}
            className="flex gap-2 pt-1"
          >
            <input
              type="text"
              value={customLanguage}
              onChange={(e) => setCustomLanguage(e.target.value)}
              placeholder="Or type any language..."
              className="glass-input flex-1 rounded-lg px-3 py-1.5 text-xs"
            />
            <button
              type="submit"
              className="btn-sage px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer shrink-0"
            >
              Go
            </button>
          </form>
        </div>
      )}

      {activePopover === "format" && (
        <div className="glass-panel-strong rounded-xl p-3 flex flex-wrap items-center gap-2">
          {["Structured Notes", "Action Items", "Clean Prose"].map((style) => (
            <button
              key={style}
              type="button"
              onClick={() => runTransform("format", { formatStyle: style })}
              className="px-3 py-1.5 rounded-lg bg-[#EFF2EA] hover:bg-[#4B6B53] hover:text-white border border-[#233428]/10 text-xs text-[#1D241F] cursor-pointer transition-colors"
            >
              {style}
            </button>
          ))}
        </div>
      )}

      {activePopover === "export" && (
        <div className="glass-panel-strong rounded-xl p-3 flex flex-wrap items-center gap-2">
          {(["txt", "md", "json"] as const).map((ext) => (
            <button
              key={ext}
              type="button"
              onClick={() => handleExport(ext)}
              className="px-3 py-1.5 rounded-lg bg-[#EFF2EA] hover:bg-[#4B6B53] hover:text-white border border-[#233428]/10 text-xs font-mono uppercase text-[#1D241F] cursor-pointer transition-colors"
            >
              .{ext}
            </button>
          ))}
        </div>
      )}

      {actionError && <p className="text-xs text-[#C86F52] font-mono">{actionError}</p>}

      {localOutput && (
        <div className="rounded-xl bg-[#F4F6F0] border border-[#4B6B53]/25 p-3.5 space-y-1.5 text-left">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono uppercase tracking-wider text-[#4B6B53] font-semibold">
              {localOutput.label}
            </span>
            <button
              type="button"
              onClick={() => setLocalOutput(null)}
              className="text-[#546257] hover:text-[#1D241F] cursor-pointer"
              aria-label="Dismiss transformed output"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          <p className="text-xs sm:text-sm text-[#1D241F] leading-relaxed whitespace-pre-wrap">
            {localOutput.content}
          </p>
        </div>
      )}
    </div>
  );
}
