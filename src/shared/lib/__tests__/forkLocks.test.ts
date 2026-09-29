import { describe, it, expect } from "vitest";
import { applyForkLocks } from "@/shared/lib/forkLocks";
import {
  isFieldVisibleForLevel,
  isSectionShown,
} from "@/shared/components/Calculator/Calculator.constants";
import { useCalculatorStore } from "@/shared/stores/calculatorStore";
import { useCatalogStore } from "@/shared/stores/catalogStore";
import {
  DEFAULT_FDM_MATERIAL,
  DEFAULT_LABOR,
} from "@/shared/stores/calculatorStore.defaults";

describe("Buma Labs fork locks", () => {
  it("forces FDM, the complete level, zero purge and per-piece labor", () => {
    const locked = applyForkLocks({
      activeTab: "resin",
      calcLevel: "basic",
      fdmMaterial: { ...DEFAULT_FDM_MATERIAL, purgeWeight: 25 },
      fdmLabor: { ...DEFAULT_LABOR, enabled: false, setupTimeMinutes: 15 },
      productName: "Chaveiro",
    });

    expect(locked.activeTab).toBe("fdm");
    expect(locked.calcLevel).toBe("advanced");
    expect(locked.fdmMaterial.purgeWeight).toBe(0);
    expect(locked.fdmMaterial.costPerKg).toBe(DEFAULT_FDM_MATERIAL.costPerKg);
    expect(locked.fdmLabor.enabled).toBe(true);
    expect(locked.fdmLabor.setupTimeMinutes).toBe(0);
    expect(locked.productName).toBe("Chaveiro");
  });

  it("starts the calculator store locked", () => {
    const state = useCalculatorStore.getState();
    expect(state.activeTab).toBe("fdm");
    expect(state.calcLevel).toBe("advanced");
    expect(state.fdmMaterial.purgeWeight).toBe(0);
  });

  it("stays locked when a resin history item is loaded", () => {
    const store = useCalculatorStore.getState();
    const snapshot = {
      ...JSON.parse(JSON.stringify(store)),
      type: "resin" as const,
      fdmMaterial: { ...store.fdmMaterial, purgeWeight: 30 },
    };
    store.loadHistoryItem(snapshot);

    const after = useCalculatorStore.getState();
    expect(after.activeTab).toBe("fdm");
    expect(after.fdmMaterial.purgeWeight).toBe(0);
  });

  it("hides the hardware and ops sections", () => {
    expect(isSectionShown("advanced", "hardware")).toBe(false);
    expect(isSectionShown("advanced", "ops")).toBe(false);
    expect(isSectionShown("advanced", "machine")).toBe(true);
  });

  it("keeps the removed sections' costs off, even from a history item", () => {
    const store = useCalculatorStore.getState();
    const snapshot = {
      ...JSON.parse(JSON.stringify(store)),
      type: "fdm" as const,
      fdmHardware: { ...store.fdmHardware, enabled: true },
      fdmFinishing: { enabled: true, suppliesCost: 5 },
      fdmOps: { ...store.fdmOps, enabled: true, ppeCostPerPrint: 3 },
      fdmSoft: { ...store.fdmSoft, enabled: true, modelFileCost: 4 },
    };
    store.loadHistoryItem(snapshot);

    const after = useCalculatorStore.getState();
    expect(after.fdmHardware.enabled).toBe(false);
    expect(after.fdmFinishing.enabled).toBe(false);
    expect(after.fdmOps.enabled).toBe(false);
    expect(after.fdmSoft.enabled).toBe(false);
    expect(after.results!.hardwareCost).toBe(0);
    expect(after.results!.softwareCost).toBe(0);
  });

  it("hides purge and infill even at the complete level", () => {
    expect(isFieldVisibleForLevel("advanced", [], "material", "purgeWeight")).toBe(false);
    expect(isFieldVisibleForLevel("advanced", [], "sales", "infillPercent")).toBe(false);
    expect(isFieldVisibleForLevel("advanced", [], "material", "density")).toBe(true);
  });

  it("seeds a fresh catalog with PLA, PLA Silk and PETG only", () => {
    expect(useCatalogStore.getState().materials.map((m) => m.name)).toEqual([
      "PLA",
      "PLA Silk",
      "PETG",
    ]);
  });
});
