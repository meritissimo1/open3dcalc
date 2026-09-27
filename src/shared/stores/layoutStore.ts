import { create } from "zustand";
import { guardedStorage } from "@/shared/lib/manifestStorage";

/**
 * Layout mode preference — V2.0 Wave 1 (Adaptive Layouts).
 *
 * The app can present the calculator through different surfaces:
 * - "classic": section-based calculator (SectionNav + ResultsPanel) — the
 *   only surface implemented in W1; the others fall back to it until W3/W4.
 * - "guided": step-by-step wizard (W4 — not implemented yet).
 * - "bento": compact card grid (W3 — not implemented yet).
 *
 * Why a separate store instead of a calculatorStore field: `layoutMode` is an
 * ergonomic UI preference and MUST stay out of the calculator undo snapshot.
 * calculatorStore.captureSnapshot() whitelists data fields, but collocating
 * the preference there would still tempt future undo bugs (undoing a cost
 * edit would revert the layout the user chose). Keeping it in its own store
 * makes the isolation structural, not conventional.
 *
 * Persistence follows the colorPalette pattern: manual guardedStorage calls
 * against the SPEC-01 registered key, so the manifest gate owns the
 * privacy decision (class `ui_preference`, sync never, plaintext allowed).
 */
export const LAYOUT_STORAGE_KEY = "open3dcalc_layout_v1";

export type LayoutMode = "classic" | "guided" | "bento";

const DEFAULT_LAYOUT_MODE: LayoutMode = "classic";

interface LayoutState {
  layoutMode: LayoutMode;
  setLayoutMode: (mode: LayoutMode) => void;
}

export const useLayoutStore = create<LayoutState>((set) => ({
  // Buma Labs fork: the layout switcher is hidden and the team always uses
  // the classic calculator, so a previously saved mode is ignored.
  layoutMode: DEFAULT_LAYOUT_MODE,

  setLayoutMode: (mode) => {
    guardedStorage.setItem(LAYOUT_STORAGE_KEY, JSON.stringify(mode));
    set({ layoutMode: mode });
  },
}));
