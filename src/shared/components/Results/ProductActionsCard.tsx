import { useEffect, useId, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useShallow } from "zustand/react/shallow";
import { Check, Info, PackagePlus, Save } from "lucide-react";

import {
  isFilamentSpoolNotFoundError,
  isInsufficientFilamentStockError,
} from "@/shared/lib/filamentStock";
import { isInvalidCalculationStateError } from "@/shared/lib/calculationState";
import { useCalculatorStore } from "@/shared/stores/calculatorStore";
import { useFilamentInventory } from "@/shared/stores/filamentInventory";
import { useProductInventory } from "@/shared/stores/productInventory";
import {
  calculatorToProduct,
  isDuplicateProductName,
} from "@/shared/lib/calculatorToProduct";

export interface ProductActionsCardProps {
  /** Sell price currently displayed (honors the display-local override). */
  readonly displaySellPrice: number;
  /** Optional surface-specific label for the history action. */
  readonly historyActionLabel?: string;
}

/**
 * "Add to history" + "Register product" actions and their feedback banner.
 *
 * Hosts the calculator → product inventory bridge (issue #85 single-spool
 * decision) so the orchestrator stays free of store plumbing.
 */
export function ProductActionsCard({
  displaySellPrice,
  historyActionLabel,
}: ProductActionsCardProps) {
  const { t } = useTranslation();
  const [productMsg, setProductMsg] = useState<{
    kind: "success" | "warn" | "error";
    text: string;
  } | null>(null);
  // Buma Labs fork: the save button confirms in place ("Saved!") or says the
  // calculation was already saved, then goes back to idle.
  const [saveState, setSaveState] = useState<"idle" | "saved" | "already">(
    "idle",
  );
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const saveHintId = useId();
  useEffect(
    () => () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    },
    [],
  );

  const {
    results,
    productName,
    productLink,
    printTimeHours,
    addToHistory,
    activeTab,
    fdmType,
    partWeight,
    resinType,
    selectedSpoolId,
  } = useCalculatorStore(
    useShallow((s) => ({
      results: s.results,
      productName: s.productName,
      productLink: s.productLink,
      printTimeHours: s.fdmPrintParams.printTimeHours,
      addToHistory: s.addToHistory,
      activeTab: s.activeTab,
      fdmType: s.fdmMaterial.type,
      partWeight: s.fdmMaterial.weightUsed,
      resinType: s.resinMaterial.type,
      selectedSpoolId: s.selectedSpoolId,
    })),
  );
  const spools = useFilamentInventory((s) => s.spools);

  if (!results) return null;

  const currentMaterial = activeTab === "fdm" ? fdmType : resinType;
  const unitWeight = results.unitWeight;
  const availableSpools = spools.filter(
    (s) =>
      s.status === "in_stock" &&
      s.material.toLowerCase() === currentMaterial.toLowerCase() &&
      s.weightGrams >= unitWeight,
  );

  const flashSaveState = (state: "saved" | "already") => {
    setSaveState(state);
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => setSaveState("idle"), 2000);
  };

  const handleAddToHistory = () => {
    try {
      // addToHistory skips an identical calculation; the key only changes
      // when a new entry was actually saved.
      const before = useCalculatorStore.getState().lastHistoryKey;
      addToHistory();
      const saved = useCalculatorStore.getState().lastHistoryKey !== before;
      flashSaveState(saved ? "saved" : "already");
      setProductMsg(null);
    } catch (error) {
      if (isInsufficientFilamentStockError(error)) {
        setProductMsg({
          kind: "error",
          text: t("results.insufficientStock", {
            required:
              error.required?.toFixed(2) ?? results.unitWeight.toFixed(2),
            available: error.available?.toFixed(2) ?? "0",
          }),
        });
        return;
      }
      if (isFilamentSpoolNotFoundError(error)) {
        setProductMsg({ kind: "error", text: t("results.spoolNotFound") });
        return;
      }
      if (isInvalidCalculationStateError(error)) {
        setProductMsg({
          kind: "error",
          text: t("results.invalidCalculationState"),
        });
        return;
      }
      throw error;
    }
  };

  const handleRegisterProduct = () => {
    let name = productName.trim();
    if (!name) {
      const asked = window.prompt(t("results.productNamePrompt"));
      if (asked == null) return;
      name = asked.trim();
      if (!name) {
        setProductMsg({ kind: "error", text: t("results.productNeedsName") });
        return;
      }
    }
    // Single-spool decision (issue #85): prefer the calculator's selected
    // spool, fall back to the first available spool for the current material.
    // Multi-filament compositions are a follow-up.
    const activeSpool =
      spools.find((s) => s.id === selectedSpoolId) ??
      availableSpools[0] ??
      null;
    const filamentType = activeSpool ? activeSpool.material : currentMaterial;
    const data = calculatorToProduct({
      productName: name,
      // Buma Labs fork: the part weight typed in the calculator.
      unitWeight: partWeight,
      filamentType,
      totalCost: results.totalCost,
      displaySellPrice,
    });
    const existed = isDuplicateProductName(
      name,
      useProductInventory.getState().products,
    );
    // Buma Labs fork: same name updates the product instead of duplicating
    // it; prices stay manual in the Products tab.
    useProductInventory.getState().upsertFromCalculator({
      name: data.name,
      weightGrams: data.weightGrams,
      filamentType: data.filamentType,
      costPrice: data.costPrice,
      printTimeHours,
      link: productLink.trim(),
    });
    setProductMsg({
      kind: "success",
      text: existed
        ? t("results.productUpdated")
        : t("results.productRegistered"),
    });
  };

  const handleGoToProducts = () => {
    window.dispatchEvent(new CustomEvent("open3dcalc:go-products"));
  };

  return (
    <>
      <button
        type="button"
        onClick={handleAddToHistory}
        data-state={saveState}
        aria-label={
          saveState === "saved"
            ? t("results.saved")
            : saveState === "already"
              ? t("results.alreadySaved")
              : (historyActionLabel ?? t("calc.addHistory"))
        }
        aria-describedby={saveState === "idle" ? saveHintId : undefined}
        className={`relative w-full min-h-[44px] py-2 sm:py-3 px-3 rounded-xl text-sm sm:text-[15px] font-semibold flex items-center justify-center gap-2 border-2 transition-all duration-200 focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:outline-none ${
          saveState === "saved"
            ? "bg-[var(--positive-subtle)] border-[var(--positive)] text-[var(--positive)] motion-safe:scale-[1.03]"
            : saveState === "already"
              ? "bg-[var(--info-subtle)] border-[var(--info)] text-[var(--info)]"
              : "bg-[var(--surface-elevated)] border-[var(--accent)] text-[var(--text-primary)] hover:bg-[var(--surface-sunken)]"
        }`}
      >
        {/* The idle content always keeps its space so the button (and the
            one next to it) doesn't jump; the confirmation sits on top. */}
        <span
          className={`flex items-center gap-2 ${saveState === "idle" ? "" : "invisible"}`}
        >
          <Save className="w-5 h-5 shrink-0" aria-hidden="true" />
          <span className="flex flex-col items-start text-left">
            <span>{historyActionLabel ?? t("calc.addHistory")}</span>
            <span
              id={saveHintId}
              className="text-[11px] font-normal text-[var(--text-muted)]"
            >
              {t("results.saveCalculationHint")}
            </span>
          </span>
        </span>
        {saveState !== "idle" && (
          <span className="absolute inset-0 flex items-center justify-center gap-2">
            {saveState === "saved" ? (
              <Check className="w-5 h-5 shrink-0" aria-hidden="true" />
            ) : (
              <Info className="w-5 h-5 shrink-0" aria-hidden="true" />
            )}
            {saveState === "saved"
              ? t("results.saved")
              : t("results.alreadySaved")}
          </span>
        )}
      </button>

      <button
        type="button"
        onClick={handleRegisterProduct}
        className="w-full min-h-[44px] py-2 sm:py-3 rounded-xl text-sm sm:text-[15px] font-semibold transition-all flex items-center justify-center gap-2 focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:outline-none bg-[var(--accent)] text-[var(--text-inverse)] hover:bg-[var(--accent-hover)]"
      >
        <PackagePlus className="w-4 h-4" />
        {t("results.registerProduct")}
      </button>

      {productMsg && (
        <div
          role="status"
          aria-live="polite"
          className={`rounded-xl p-3 sm:p-4 text-center text-xs sm:text-sm font-medium border ${
            productMsg.kind === "error"
              ? "bg-[var(--critical)]/10 border-[var(--critical)]/30 text-[var(--critical)]"
              : productMsg.kind === "warn"
                ? "bg-[var(--warning-subtle)] border-[var(--warning)]/30 text-[var(--warning)]"
                : "bg-[var(--positive-subtle)] border-[var(--positive)]/30 text-[var(--positive)]"
          }`}
        >
          <p>{productMsg.text}</p>
          {productMsg.kind !== "error" && (
            <button
              type="button"
              onClick={handleGoToProducts}
              className="mt-1.5 underline underline-offset-2 font-semibold hover:opacity-80 transition-opacity focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:outline-none rounded"
            >
              {t("results.viewProducts")}
            </button>
          )}
        </div>
      )}
    </>
  );
}
