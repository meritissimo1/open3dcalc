import { create } from "zustand";
import type {
  ExtraPart,
  LaborCategory,
  Material,
  Marketplace,
  PackagingOption,
  PrinterProfile,
} from "@/shared/types";
import { fdmMaterials } from "@/shared/lib/materials";
import { DEFAULT_FDM_MATERIAL_IDS } from "@/shared/lib/forkLocks";
import {
  DEFAULT_LABOR_HOURLY_RATE,
  DEFAULT_PACKAGINGS,
} from "@/shared/lib/supplies";
import { printers } from "@/shared/lib/printers";
import { marketplaces } from "@/shared/lib/marketplace";
import { guardedStorage } from "@/shared/lib/manifestStorage";

const STORAGE_KEY = "open3dcalc_catalog_v1";

type CatalogPrinter = PrinterProfile & { custom?: boolean };
export type { CatalogPrinter };
type CatalogMaterial = Material & { custom?: boolean };
type CatalogMarketplace = Marketplace & { custom?: boolean };

/** Free tags are case-insensitive and whitespace-collapsed so duplicates collapse to one entry. */
const normalizeTag = (raw: string): string =>
  raw.trim().toLowerCase().replace(/\s+/g, " ");

/** Backward-compat: bundles persisted before Phase 4A have no `tags` field. Coerce to `[]`. */
const withTags = (printers: CatalogPrinter[]): CatalogPrinter[] =>
  printers.map((p) => (Array.isArray(p.tags) ? p : { ...p, tags: [] }));

interface CatalogState {
  printers: CatalogPrinter[];
  materials: CatalogMaterial[];
  marketplaces: CatalogMarketplace[];
  load: () => void;
  save: () => void;
  addPrinter: (printer: CatalogPrinter) => void;
  updatePrinter: (id: string, patch: Partial<CatalogPrinter>) => void;
  removePrinter: (id: string) => void;
  addPrinterTag: (printerId: string, tag: string) => void;
  removePrinterTag: (printerId: string, tag: string) => void;
  selectedPrinterTag: string | null;
  setPrinterTagFilter: (tag: string | null) => void;
  addMaterial: (material: CatalogMaterial) => void;
  updateMaterial: (id: string, patch: Partial<CatalogMaterial>) => void;
  removeMaterial: (id: string) => void;
  addMarketplace: (marketplace: CatalogMarketplace) => void;
  updateMarketplace: (id: string, patch: Partial<CatalogMarketplace>) => void;
  removeMarketplace: (id: string) => void;
  /** Buma Labs fork: extra parts and packaging sizes. */
  extraParts: ExtraPart[];
  packagings: PackagingOption[];
  addExtraPart: (part: Omit<ExtraPart, "id" | "updatedAt">) => void;
  updateExtraPart: (id: string, patch: Partial<Omit<ExtraPart, "id">>) => void;
  removeExtraPart: (id: string) => void;
  addPackaging: (option: Omit<PackagingOption, "id" | "updatedAt">) => void;
  updatePackaging: (
    id: string,
    patch: Partial<Omit<PackagingOption, "id">>,
  ) => void;
  removePackaging: (id: string) => void;
  /** Buma Labs fork: labor hourly rate and labor categories. */
  laborHourlyRate: number;
  laborCategories: LaborCategory[];
  setLaborHourlyRate: (rate: number) => void;
  addLaborCategory: (category: Omit<LaborCategory, "id" | "updatedAt">) => void;
  updateLaborCategory: (
    id: string,
    patch: Partial<Omit<LaborCategory, "id">>,
  ) => void;
  removeLaborCategory: (id: string) => void;
}

const supplyId = (prefix: string) =>
  `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

const cloneDefaults = () => ({
  printers: withTags(printers.map((p) => ({ ...p }))),
  // Buma Labs fork: FDM only, seeded with the team's filament types.
  materials: fdmMaterials
    .filter((m) => DEFAULT_FDM_MATERIAL_IDS.includes(m.id))
    .map((m) => ({ ...m })),
  marketplaces: marketplaces.map((m) => ({ ...m })),
  extraParts: [] as ExtraPart[],
  packagings: DEFAULT_PACKAGINGS.map((p) => ({ ...p })),
  laborHourlyRate: DEFAULT_LABOR_HOURLY_RATE,
  laborCategories: [] as LaborCategory[],
});

const loadFromStorage = (): Partial<ReturnType<typeof cloneDefaults>> => {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(guardedStorage.getItem(STORAGE_KEY) || "{}");
  } catch {
    return {};
  }
};

const persist = (state: ReturnType<typeof cloneDefaults>) => {
  guardedStorage.setItem(STORAGE_KEY, JSON.stringify(state));
};

export const useCatalogStore = create<CatalogState>((set, get) => {
  const defaults = cloneDefaults();
  const saved = loadFromStorage();

  const initial = {
    printers: withTags(
      (saved.printers ?? defaults.printers) as CatalogPrinter[],
    ),
    materials: (saved.materials ?? defaults.materials) as CatalogMaterial[],
    marketplaces: (saved.marketplaces ??
      defaults.marketplaces) as CatalogMarketplace[],
    extraParts: saved.extraParts ?? defaults.extraParts,
    packagings: saved.packagings ?? defaults.packagings,
    laborHourlyRate: saved.laborHourlyRate ?? defaults.laborHourlyRate,
    laborCategories: saved.laborCategories ?? defaults.laborCategories,
  };

  return {
    ...initial,
    selectedPrinterTag: null,

    load: () => {
      const next = loadFromStorage();
      set({
        printers: withTags(
          (next.printers ?? defaults.printers) as CatalogPrinter[],
        ),
        materials: (next.materials ?? defaults.materials) as CatalogMaterial[],
        marketplaces: (next.marketplaces ??
          defaults.marketplaces) as CatalogMarketplace[],
        extraParts: next.extraParts ?? defaults.extraParts,
        packagings: next.packagings ?? defaults.packagings,
        laborHourlyRate: next.laborHourlyRate ?? defaults.laborHourlyRate,
        laborCategories: next.laborCategories ?? defaults.laborCategories,
      });
    },

    save: () => persist(get()),

    addPrinter: (printer) =>
      set((state) => {
        const next = { ...state, printers: [...state.printers, printer] };
        persist(next);
        return next;
      }),
    updatePrinter: (id, patch) =>
      set((state) => {
        const next = {
          ...state,
          printers: state.printers.map((p) =>
            p.id === id ? { ...p, ...patch } : p,
          ),
        };
        persist(next);
        return next;
      }),
    removePrinter: (id) =>
      set((state) => {
        const next = {
          ...state,
          printers: state.printers.filter((p) => p.id !== id),
        };
        persist(next);
        return next;
      }),
    addPrinterTag: (printerId, tag) => {
      const normalized = normalizeTag(tag);
      if (!normalized) return;
      set((state) => {
        const exists = state.printers.some(
          (p) => p.id === printerId && p.tags?.includes(normalized),
        );
        if (exists) return state;
        const next = {
          ...state,
          printers: state.printers.map((p) =>
            p.id === printerId
              ? { ...p, tags: [...(p.tags ?? []), normalized] }
              : p,
          ),
        };
        persist(next);
        return next;
      });
    },
    removePrinterTag: (printerId, tag) => {
      const normalized = normalizeTag(tag);
      set((state) => {
        const target = state.printers.find((p) => p.id === printerId);
        if (!target || !target.tags?.includes(normalized)) return state;
        const next = {
          ...state,
          printers: state.printers.map((p) =>
            p.id === printerId
              ? { ...p, tags: (p.tags ?? []).filter((t) => t !== normalized) }
              : p,
          ),
          selectedPrinterTag:
            state.selectedPrinterTag === normalized
              ? null
              : state.selectedPrinterTag,
        };
        persist(next);
        return next;
      });
    },
    setPrinterTagFilter: (tag) => set({ selectedPrinterTag: tag }),

    addMaterial: (material) =>
      set((state) => {
        const next = { ...state, materials: [...state.materials, material] };
        persist(next);
        return next;
      }),
    updateMaterial: (id, patch) =>
      set((state) => {
        const next = {
          ...state,
          materials: state.materials.map((m) =>
            m.id === id ? { ...m, ...patch } : m,
          ),
        };
        persist(next);
        return next;
      }),
    removeMaterial: (id) =>
      set((state) => {
        const next = {
          ...state,
          materials: state.materials.filter((m) => m.id !== id),
        };
        persist(next);
        return next;
      }),

    addMarketplace: (marketplace) =>
      set((state) => {
        const next = {
          ...state,
          marketplaces: [...state.marketplaces, marketplace],
        };
        persist(next);
        return next;
      }),
    updateMarketplace: (id, patch) =>
      set((state) => {
        const next = {
          ...state,
          marketplaces: state.marketplaces.map((m) =>
            m.id === id ? { ...m, ...patch } : m,
          ),
        };
        persist(next);
        return next;
      }),
    removeMarketplace: (id) =>
      set((state) => {
        const next = {
          ...state,
          marketplaces: state.marketplaces.filter((m) => m.id !== id),
        };
        persist(next);
        return next;
      }),

    addExtraPart: (part) =>
      set((state) => {
        const next = {
          ...state,
          extraParts: [
            ...state.extraParts,
            { ...part, id: supplyId("extra"), updatedAt: Date.now() },
          ],
        };
        persist(next);
        return next;
      }),
    updateExtraPart: (id, patch) =>
      set((state) => {
        const next = {
          ...state,
          extraParts: state.extraParts.map((p) =>
            p.id === id ? { ...p, ...patch, updatedAt: Date.now() } : p,
          ),
        };
        persist(next);
        return next;
      }),
    removeExtraPart: (id) =>
      set((state) => {
        const next = {
          ...state,
          extraParts: state.extraParts.filter((p) => p.id !== id),
        };
        persist(next);
        return next;
      }),

    addPackaging: (option) =>
      set((state) => {
        const next = {
          ...state,
          packagings: [
            ...state.packagings,
            { ...option, id: supplyId("pkg"), updatedAt: Date.now() },
          ],
        };
        persist(next);
        return next;
      }),
    updatePackaging: (id, patch) =>
      set((state) => {
        const next = {
          ...state,
          packagings: state.packagings.map((p) =>
            p.id === id ? { ...p, ...patch, updatedAt: Date.now() } : p,
          ),
        };
        persist(next);
        return next;
      }),
    removePackaging: (id) =>
      set((state) => {
        const next = {
          ...state,
          packagings: state.packagings.filter((p) => p.id !== id),
        };
        persist(next);
        return next;
      }),

    setLaborHourlyRate: (rate) =>
      set((state) => {
        const next = { ...state, laborHourlyRate: Math.max(0, rate) };
        persist(next);
        return next;
      }),
    addLaborCategory: (category) =>
      set((state) => {
        const next = {
          ...state,
          laborCategories: [
            ...state.laborCategories,
            { ...category, id: supplyId("labor"), updatedAt: Date.now() },
          ],
        };
        persist(next);
        return next;
      }),
    updateLaborCategory: (id, patch) =>
      set((state) => {
        const next = {
          ...state,
          laborCategories: state.laborCategories.map((c) =>
            c.id === id ? { ...c, ...patch, updatedAt: Date.now() } : c,
          ),
        };
        persist(next);
        return next;
      }),
    removeLaborCategory: (id) =>
      set((state) => {
        const next = {
          ...state,
          laborCategories: state.laborCategories.filter((c) => c.id !== id),
        };
        persist(next);
        return next;
      }),
  };
});
