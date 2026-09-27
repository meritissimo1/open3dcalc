import type { MaterialStateFDM } from "@/shared/types";

/**
 * Buma Labs fork locks.
 *
 * The team only prints FDM and always uses the complete calculator, without
 * multi-material, purge/waste or infill inputs. The switches are removed
 * from the UI and the calculator store starts from these values; the store
 * itself keeps supporting every mode so the upstream logic stays intact.
 */
export const LOCKED_TAB = "fdm" as const;
export const LOCKED_CALC_LEVEL = "advanced" as const;

/** Calculator fields removed from every surface, as `section.field`. */
export const REMOVED_FIELDS: readonly string[] = [
  "material.purgeWeight",
  "sales.infillPercent",
];

/** Filament types seeded into a fresh catalog. */
export const DEFAULT_FDM_MATERIAL_IDS: readonly string[] = [
  "pla",
  "pla_silk",
  "petg",
];

/**
 * Forces the locked calculator values onto a state patch. Used where state
 * comes from outside the UI: the initial load, history snapshots and data
 * imports (e.g. a backup exported from the upstream site).
 */
export function applyForkLocks<T extends { fdmMaterial: MaterialStateFDM }>(
  s: T,
): T & { activeTab: typeof LOCKED_TAB; calcLevel: typeof LOCKED_CALC_LEVEL } {
  return {
    ...s,
    activeTab: LOCKED_TAB,
    calcLevel: LOCKED_CALC_LEVEL,
    fdmMaterial: { ...s.fdmMaterial, purgeWeight: 0 },
  };
}
