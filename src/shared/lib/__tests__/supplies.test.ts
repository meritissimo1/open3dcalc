import { beforeEach, describe, expect, it } from "vitest";
import {
  addSelection,
  DEFAULT_PACKAGINGS,
  extrasTotal,
  syncSelections,
} from "@/shared/lib/supplies";
import {
  applySyncData,
  collectSyncData,
  type SyncData,
} from "@/shared/lib/dataSync";
import { useCalculatorStore } from "@/shared/stores/calculatorStore";
import { useCatalogStore } from "@/shared/stores/catalogStore";
import type { ExtraPart } from "@/shared/types";

const chain: ExtraPart = {
  id: "chain",
  name: "Corrente",
  cost: 0.6,
  updatedAt: 1,
};
const clicker: ExtraPart = {
  id: "sw",
  name: "Switch",
  cost: 1.25,
  updatedAt: 1,
};

function emptySyncData(): SyncData {
  return {
    settings: {},
    history: [],
    customers: [],
    quotes: [],
    catalog: { printers: [], materials: [], marketplaces: [] },
    filaments: [],
    products: [],
    colorPalette: [],
    modelComparison: [],
    theme: "",
    dashboard: {},
    sections: {},
  };
}

describe("supplies helpers", () => {
  it("sums picked parts by quantity, rounded to cents", () => {
    // 4 switches + 1 chain = 5.60
    let items = addSelection([], clicker);
    items = items.map((i) => ({ ...i, quantity: 4 }));
    items = addSelection(items, chain);
    expect(extrasTotal(items)).toBe(5.6);
  });

  it("bumps the quantity when the same part is added again", () => {
    const items = addSelection(addSelection([], chain), chain);
    expect(items).toEqual([
      { partId: "chain", name: "Corrente", unitCost: 0.6, quantity: 2 },
    ]);
  });

  it("reflects catalog price and name edits, and reports no-ops as null", () => {
    const items = addSelection([], chain);
    expect(syncSelections(items, [chain])).toBeNull();
    expect(
      syncSelections(items, [{ ...chain, cost: 0.8, name: "Corrente inox" }]),
    ).toEqual([
      { partId: "chain", name: "Corrente inox", unitCost: 0.8, quantity: 1 },
    ]);
    // Part removed from the catalog keeps its last known values.
    expect(syncSelections(items, [])).toBeNull();
  });

  it("seeds P, M, G and GG packaging sizes", () => {
    expect(DEFAULT_PACKAGINGS.map((p) => p.name)).toEqual([
      "P",
      "M",
      "G",
      "GG",
    ]);
  });
});

describe("calculator store picks", () => {
  beforeEach(() => useCalculatorStore.getState().resetCalculator());

  it("starts without packaging until a size is picked", () => {
    const state = useCalculatorStore.getState();
    expect(state.packagingId).toBeNull();
    expect(state.fdmSales.packagingCost).toBe(0);
  });

  it("derives extrasCost from the picked parts", () => {
    useCalculatorStore.getState().setExtraSelections([
      { partId: "sw", name: "Switch", unitCost: 1.25, quantity: 4 },
      { partId: "chain", name: "Corrente", unitCost: 0.6, quantity: 1 },
    ]);
    expect(useCalculatorStore.getState().fdmExtras.extrasCost).toBe(5.6);
  });

  it("sets packagingCost from the picked size and clears it", () => {
    const store = useCalculatorStore.getState();
    store.selectPackaging({ id: "pkg_m", name: "M", cost: 2.5, updatedAt: 0 });
    expect(useCalculatorStore.getState().packagingId).toBe("pkg_m");
    expect(useCalculatorStore.getState().fdmSales.packagingCost).toBe(2.5);

    store.selectPackaging(null);
    expect(useCalculatorStore.getState().packagingId).toBeNull();
    expect(useCalculatorStore.getState().fdmSales.packagingCost).toBe(0);
  });

  it("restores picks when a history item is loaded", () => {
    const store = useCalculatorStore.getState();
    store.setExtraSelections([
      { partId: "chain", name: "Corrente", unitCost: 0.6, quantity: 2 },
    ]);
    store.selectPackaging({ id: "pkg_p", name: "P", cost: 1, updatedAt: 0 });
    const snapshot = JSON.parse(JSON.stringify(useCalculatorStore.getState()));

    store.resetCalculator();
    expect(useCalculatorStore.getState().extraSelections).toEqual([]);

    store.loadHistoryItem({ ...snapshot, type: "fdm" });
    const after = useCalculatorStore.getState();
    expect(after.extraSelections).toHaveLength(1);
    expect(after.packagingId).toBe("pkg_p");
    expect(after.fdmExtras.extrasCost).toBe(1.2);
  });
});

describe("catalog supplies", () => {
  beforeEach(() => {
    localStorage.clear();
    useCatalogStore.getState().load();
  });

  it("adds, edits and removes extra parts", () => {
    const catalog = useCatalogStore.getState();
    catalog.addExtraPart({ name: "Corrente", cost: 0.6 });
    const [part] = useCatalogStore.getState().extraParts;
    expect(part).toMatchObject({ name: "Corrente", cost: 0.6 });

    useCatalogStore.getState().updateExtraPart(part.id, { cost: 0.75 });
    expect(useCatalogStore.getState().extraParts[0].cost).toBe(0.75);

    useCatalogStore.getState().removeExtraPart(part.id);
    expect(useCatalogStore.getState().extraParts).toEqual([]);
  });

  it("round-trips extra parts and packaging through a backup", () => {
    useCatalogStore.getState().addExtraPart({ name: "Corrente", cost: 0.6 });
    const pkg = useCatalogStore.getState().packagings[0];
    useCatalogStore.getState().updatePackaging(pkg.id, { cost: 1.5 });

    const exported = collectSyncData();
    expect(exported.catalog.extraParts).toHaveLength(1);
    expect(exported.catalog.packagings).toHaveLength(4);

    localStorage.clear();
    useCatalogStore.getState().load();
    applySyncData(exported, "replace");

    const catalog = useCatalogStore.getState();
    expect(catalog.extraParts.map((p) => p.name)).toEqual(["Corrente"]);
    expect(catalog.packagings.find((p) => p.id === pkg.id)?.cost).toBe(1.5);
  });

  it("keeps local supplies when importing a backup without them", () => {
    useCatalogStore.getState().addExtraPart({ name: "Corrente", cost: 0.6 });

    applySyncData(emptySyncData(), "replace");

    expect(useCatalogStore.getState().extraParts.map((p) => p.name)).toEqual([
      "Corrente",
    ]);
  });
});

describe("importing a backup into a fresh browser", () => {
  it.each(["merge", "replace"] as const)(
    "keeps the built-in printers, filaments and marketplaces (%s)",
    (mode) => {
      localStorage.clear();
      useCatalogStore.getState().load();
      const data = emptySyncData();
      data.catalog.materials = [
        {
          id: "c1",
          name: "PLA Rosa",
          type: "fdm",
          density: 1.24,
          avgPrice: 100,
          custom: true,
        },
      ];

      applySyncData(data, mode);

      const catalog = useCatalogStore.getState();
      expect(catalog.materials.map((m) => m.name)).toEqual([
        "PLA",
        "PLA Silk",
        "PETG",
        "PLA Rosa",
      ]);
      expect(catalog.printers.length).toBeGreaterThan(0);
      expect(catalog.marketplaces.length).toBeGreaterThan(0);
    },
  );
});
