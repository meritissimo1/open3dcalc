import type {
  FDMFinishing,
  FDMHardware,
  LaborCosts,
  MaterialStateFDM,
  OperationalCosts,
  SoftwareCosts,
} from "@/shared/types";

/**
 * Buma Labs fork locks.
 *
 * The team only prints FDM and always uses the complete calculator, without
 * multi-material, purge/waste or infill inputs. Labor is always charged as
 * a per-piece time (no separate setup). The switches are removed
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

/**
 * Calculator sections removed at the team's request (hardware wear,
 * operational & software). Their costs are locked off in `applyForkLocks`
 * so nothing hidden is charged.
 */
export const REMOVED_SECTIONS: readonly string[] = ["hardware", "ops"];

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
export function applyForkLocks<
  T extends {
    fdmMaterial: MaterialStateFDM;
    fdmLabor: LaborCosts;
    fdmHardware?: FDMHardware;
    fdmFinishing?: FDMFinishing;
    fdmOps?: OperationalCosts;
    fdmSoft?: SoftwareCosts;
  },
>(
  s: T,
): T & { activeTab: typeof LOCKED_TAB; calcLevel: typeof LOCKED_CALC_LEVEL } {
  return {
    ...s,
    activeTab: LOCKED_TAB,
    calcLevel: LOCKED_CALC_LEVEL,
    fdmMaterial: { ...s.fdmMaterial, purgeWeight: 0 },
    fdmLabor: lockLabor(s.fdmLabor),
    // Removed sections (REMOVED_SECTIONS): never charge their costs.
    ...(s.fdmHardware
      ? { fdmHardware: { ...s.fdmHardware, enabled: false } }
      : {}),
    ...(s.fdmFinishing
      ? { fdmFinishing: { ...s.fdmFinishing, enabled: false } }
      : {}),
    ...(s.fdmOps ? { fdmOps: { ...s.fdmOps, enabled: false } } : {}),
    ...(s.fdmSoft ? { fdmSoft: { ...s.fdmSoft, enabled: false } } : {}),
  };
}

/** Labor always counts, as a per-piece time without a separate setup. */
export function lockLabor(labor: LaborCosts): LaborCosts {
  return { ...labor, enabled: true, setupTimeMinutes: 0 };
}
