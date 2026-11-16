import React from "react";
import { Menu, Plus, ArrowRight } from "lucide-react";
import LuminaLogo from "./LuminaLogo";

interface HeaderProps {
  mode: "landing" | "workspace";
  onLogoClick?: () => void;
  onPrimaryAction: () => void;
  onOpenMenu: () => void;
}

export default function Header({
  mode,
  onLogoClick,
  onPrimaryAction,
  onOpenMenu,
}: HeaderProps) {
  return (
    <header
      className="sticky top-0 z-40 border-b border-[#233428]/10 bg-[#F8F9F5]/80 backdrop-blur-xl"
      id="lumina-global-header"
    >
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-15 flex items-center justify-between gap-4">
        <button
          type="button"
          onClick={onLogoClick}
          className="cursor-pointer focus:outline-none rounded-lg"
          aria-label="Lumina home"
        >
          <LuminaLogo size={30} />
        </button>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={onPrimaryAction}
            className="btn-sage min-h-[38px] px-4 py-1.5 rounded-xl text-xs sm:text-sm font-medium inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0"
          >
            {mode === "workspace" ? (
              <>
                <Plus className="w-4 h-4" />
                <span>New Session</span>
              </>
            ) : (
              <>
                <span>Open App</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>

          <button
            type="button"
            onClick={onOpenMenu}
            aria-label="Open menu drawer"
            id="lumina-user-menu-btn"
            className="w-9 h-9 rounded-xl border border-[#233428]/12 bg-white/80 hover:bg-white text-[#1D241F] flex items-center justify-center transition-colors cursor-pointer shrink-0"
          >
            <Menu className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
}
