import { beforeEach, describe, expect, it } from "vitest";
import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import i18n from "@/shared/i18n/i18n";
import { useCalculatorStore } from "@/shared/stores/calculatorStore";
import { useCatalogStore } from "@/shared/stores/catalogStore";
import { LaborFields } from "../LaborFields";

beforeEach(async () => {
  localStorage.clear();
  await i18n.changeLanguage("en-US");
  useCatalogStore.getState().load();
  useCalculatorStore.getState().resetCalculator();
});

describe("LaborFields", () => {
  it("picks a category and shows the labor cost at the catalog rate", async () => {
    const user = userEvent.setup();
    useCatalogStore.getState().addLaborCategory({ name: "Keychain", minutes: 12 });
    render(<LaborFields />);

    await user.click(screen.getByRole("combobox", { name: "Category" }));
    await user.click(screen.getByRole("option", { name: /Keychain/ }));

    expect(screen.getByRole("spinbutton", { name: "Labor time" })).toHaveValue(12);
    expect(screen.getByTestId("labor-rate")).toHaveTextContent("50");
    // 12 min at 50/h = 10
    expect(screen.getByTestId("labor-cost")).toHaveTextContent("10");
  });

  it("follows the hourly rate set in the catalog", () => {
    render(<LaborFields />);
    act(() => useCatalogStore.getState().setLaborHourlyRate(80));
    expect(useCalculatorStore.getState().fdmLabor.hourlyRate).toBe(80);
  });
});
