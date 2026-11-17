import React from "react";
import { Menu, Plus } from "lucide-react";
import LuminaLogo from "./LuminaLogo";

export interface HeaderNavItem {
  label: string;
  onClick: () => void;
  active?: boolean;
}

interface HeaderProps {
  mode: "landing" | "workspace";
  onLogoClick?: () => void;
  onPrimaryAction: () => void;
  onOpenMenu: () => void;
  navItems?: HeaderNavItem[];
}

export default function Header({
  mode,
  onLogoClick,
  onPrimaryAction,
  onOpenMenu,
  navItems = [],
}: HeaderProps) {
  return (
    <header
      className="sticky top-0 z-40 h-[62px] liquid-glass border-x-0 border-t-0 border-b border-[#0F8B8D]/12"
      id="lumina-global-header"
    >
      <div className="max-w-6xl h-full mx-auto px-4 sm:px-6 flex items-center justify-between gap-6">
        <button
          type="button"
          onClick={onLogoClick}
          className="min-h-[44px] flex items-center cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F8B8D] rounded-lg px-1 -ml-1 whitespace-nowrap shrink-0"
          aria-label="Lumina home"
        >
          <LuminaLogo size={22} />
        </button>

        {navItems.length > 0 && (
          <nav
            aria-label="Primary navigation"
            className="hidden md:flex items-center gap-7 text-[13px] font-medium"
          >
            {navItems.map((item) => (
              <button
                key={item.label}
                type="button"
                onClick={item.onClick}
                className={`min-h-[36px] cursor-pointer whitespace-nowrap shrink-0 transition-colors ${
                  item.active
                    ? "text-[#0F8B8D] font-semibold"
                    : "text-[#515154] hover:text-[#1D1D1F]"
                }`}
              >
                {item.label}
              </button>
            ))}
          </nav>
        )}

        <div className="flex items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={onPrimaryAction}
            className="min-h-[40px] px-4 rounded-xl bg-[#1D1D1F] hover:bg-[#0F8B8D] text-white text-[13px] font-medium inline-flex items-center gap-1.5 transition-colors duration-200 cursor-pointer whitespace-nowrap shrink-0 active:scale-[0.98]"
          >
            {mode === "workspace" ? (
              <>
                <Plus className="w-3.5 h-3.5" />
                <span>New Entry</span>
              </>
            ) : (
              <span>Sign In</span>
            )}
          </button>

          <button
            type="button"
            onClick={onOpenMenu}
            aria-label="Open menu drawer"
            id="lumina-user-menu-btn"
            className="w-10 h-10 rounded-xl bg-white/80 hover:bg-[#EDF7F6] border border-[#0F8B8D]/20 text-[#1D1D1F] hover:text-[#0F8B8D] flex items-center justify-center transition-colors duration-200 cursor-pointer shrink-0 active:scale-[0.97]"
          >
            <Menu className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
}
