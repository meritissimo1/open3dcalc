import { beforeEach, describe, expect, it } from "vitest";
import { applySyncData, collectSyncData } from "@/shared/lib/dataSync";
import { useCalculatorStore } from "@/shared/stores/calculatorStore";
import { useCatalogStore } from "@/shared/stores/catalogStore";

const keychain = { id: "cat_kc3", name: "Keychain 3 clickers", minutes: 12, updatedAt: 1 };

beforeEach(() => {
  localStorage.clear();
  useCatalogStore.getState().load();
  useCalculatorStore.getState().resetCalculator();
});

describe("labor (Buma Labs fork)", () => {
  it("starts on, without time, at the catalog rate", () => {
    const { fdmLabor } = useCalculatorStore.getState();
    expect(fdmLabor).toMatchObject({
      enabled: true,
      setupTimeMinutes: 0,
      postProcessingTimeMinutes: 0,
      hourlyRate: 50,
    });
  });

  it("fills the labor time from a category and keeps it editable", () => {
    const store = useCalculatorStore.getState();
    store.selectLaborCategory(keychain);
    expect(useCalculatorStore.getState().laborCategoryId).toBe("cat_kc3");
    expect(useCalculatorStore.getState().fdmLabor.postProcessingTimeMinutes).toBe(12);

    const { fdmLabor } = useCalculatorStore.getState();
    store.setFdmLabor({ ...fdmLabor, postProcessingTimeMinutes: 15 });
    expect(useCalculatorStore.getState().laborCategoryId).toBe("cat_kc3");
    expect(useCalculatorStore.getState().fdmLabor.postProcessingTimeMinutes).toBe(15);
  });

  it("charges time × hourly rate", () => {
    const store = useCalculatorStore.getState();
    store.setFdmLabor({ ...store.fdmLabor, postProcessingTimeMinutes: 30 });
    // 30 min at R$ 50/h
    expect(useCalculatorStore.getState().results?.laborCost).toBeCloseTo(25, 5);
  });

  it("charges the labor time on every piece of a batch", () => {
    const store = useCalculatorStore.getState();
    store.setFdmSales({ ...store.fdmSales, volumeDiscounts: [] });
    store.setFdmLabor({
      ...useCalculatorStore.getState().fdmLabor,
      postProcessingTimeMinutes: 60,
    });
    const single = useCalculatorStore.getState().results!.totalCost;

    store.setQuantity(4);
    expect(useCalculatorStore.getState().results!.totalCost).toBeCloseTo(single, 5);
  });

  it("round-trips the rate and categories through a backup", () => {
    useCatalogStore.getState().setLaborHourlyRate(60);
    useCatalogStore.getState().addLaborCategory({ name: "Vase", minutes: 5 });
    const exported = collectSyncData();
    expect(exported.catalog.laborHourlyRate).toBe(60);

    localStorage.clear();
    useCatalogStore.getState().load();
    applySyncData(exported, "replace");

    const catalog = useCatalogStore.getState();
    expect(catalog.laborHourlyRate).toBe(60);
    expect(catalog.laborCategories.map((c) => c.name)).toEqual(["Vase"]);
    expect(useCalculatorStore.getState().fdmLabor.hourlyRate).toBe(60);
  });
});
