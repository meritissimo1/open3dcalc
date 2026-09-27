import { useEffect } from "react";
import { X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Select } from "@/shared/components/ui/Select";
import { useCurrency } from "@/shared/hooks/useCurrency";
import { useCalculatorStore } from "@/shared/stores/calculatorStore";
import { useCatalogStore } from "@/shared/stores/catalogStore";
import {
  addSelection,
  extrasTotal,
  syncSelections,
} from "@/shared/lib/supplies";

/** Same look as the Select/InputGroup labels, for the empty state. */
function FieldLabel({ label }: { label: string }) {
  return (
    <div className="min-h-[2.5rem] flex items-start">
      <span className="text-[12px] font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
        {label}
      </span>
    </div>
  );
}

/**
 * Buma Labs fork: extra parts are picked from the catalog (several parts,
 * each with a quantity) instead of typing their total cost.
 */
export function ExtrasPicker() {
  const { t } = useTranslation();
  const { format } = useCurrency();
  const parts = useCatalogStore((s) => s.extraParts);
  const selections = useCalculatorStore((s) => s.extraSelections);
  const setSelections = useCalculatorStore((s) => s.setExtraSelections);
  const extrasCost = useCalculatorStore((s) => s.fdmExtras.extrasCost);

  useEffect(() => {
    const synced = syncSelections(selections, parts);
    if (synced) setSelections(synced);
  }, [parts, selections, setSelections]);

  const setQuantity = (partId: string, quantity: number) =>
    setSelections(
      selections.map((item) =>
        item.partId === partId ? { ...item, quantity } : item,
      ),
    );

  return (
    <div className="flex flex-col gap-2" data-testid="extras-picker">
      {parts.length === 0 ? (
        <>
          <FieldLabel label={t("calc.extras")} />
          <p className="text-xs text-[var(--text-muted)]">
            {t("supplies.noExtraParts")}
          </p>
        </>
      ) : (
        <Select
          label={t("calc.extras")}
          placeholder={t("supplies.addExtra")}
          value=""
          onChange={(id) => {
            const part = parts.find((p) => p.id === id);
            if (part) setSelections(addSelection(selections, part));
          }}
          options={parts.map((p) => ({
            value: p.id,
            label: p.name,
            subtitle: format(p.cost),
          }))}
          search={parts.length > 6}
        />
      )}
      {selections.length > 0 && (
        <ul className="space-y-2">
          {selections.map((item) => (
            <li
              key={item.partId}
              className="flex items-center gap-2 rounded-lg border border-[var(--border-default)] bg-[var(--surface-input)] px-2.5 py-1.5"
            >
              <span className="flex-1 min-w-0 truncate text-sm text-[var(--text-primary)]">
                {item.name}
              </span>
              <input
                type="number"
                min={1}
                step={1}
                value={item.quantity}
                onChange={(e) =>
                  setQuantity(
                    item.partId,
                    Math.max(1, Math.floor(Number(e.target.value) || 1)),
                  )
                }
                aria-label={t("supplies.quantityOf", { name: item.name })}
                className="w-16 min-h-[36px] rounded-md border border-[var(--border-default)] bg-[var(--surface-sunken)] px-2 text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
              />
              <span className="w-24 text-right text-xs font-mono text-[var(--text-secondary)]">
                {format(item.unitCost * item.quantity)}
              </span>
              <button
                type="button"
                onClick={() =>
                  setSelections(
                    selections.filter((s) => s.partId !== item.partId),
                  )
                }
                aria-label={t("supplies.removeItem", { name: item.name })}
                className="min-h-[36px] min-w-[36px] flex items-center justify-center rounded-md text-[var(--text-muted)] hover:text-[var(--critical)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
              >
                <X className="w-4 h-4" />
              </button>
            </li>
          ))}
        </ul>
      )}
      {(selections.length > 0 || extrasCost > 0) && (
        <div className="flex justify-between text-xs text-[var(--text-secondary)]">
          <span>{t("supplies.extrasTotal")}</span>
          <span className="font-mono" data-testid="extras-total">
            {format(
              selections.length > 0 ? extrasTotal(selections) : extrasCost,
            )}
          </span>
        </div>
      )}
    </div>
  );
}

const CURRENT_VALUE = "__current";

/**
 * Buma Labs fork: packaging is picked from the registered sizes (P, M, G,
 * GG…) instead of typing its cost.
 */
export function PackagingPicker() {
  const { t } = useTranslation();
  const { format } = useCurrency();
  const packagings = useCatalogStore((s) => s.packagings);
  const packagingId = useCalculatorStore((s) => s.packagingId);
  const packagingCost = useCalculatorStore((s) => s.fdmSales.packagingCost);
  const selectPackaging = useCalculatorStore((s) => s.selectPackaging);

  const selected = packagings.find((p) => p.id === packagingId);

  // Reflect price edits made in the catalog on the current calculation.
  useEffect(() => {
    if (selected && selected.cost !== packagingCost) selectPackaging(selected);
  }, [selected, packagingCost, selectPackaging]);

  // A cost that came from outside the catalog (older data, the example
  // button) stays visible instead of silently disappearing.
  const hasLooseCost = !selected && packagingCost > 0;
  const value = selected ? selected.id : hasLooseCost ? CURRENT_VALUE : "";

  return (
    <div data-testid="packaging-picker">
      <Select
        label={t("calc.packaging")}
        value={value}
        onChange={(next) => {
          if (next === CURRENT_VALUE) return;
          selectPackaging(packagings.find((p) => p.id === next) ?? null);
        }}
        options={[
          { value: "", label: t("supplies.noPackaging") },
          ...(hasLooseCost
            ? [
                {
                  value: CURRENT_VALUE,
                  label: t("supplies.currentValue"),
                  subtitle: format(packagingCost),
                },
              ]
            : []),
          ...packagings.map((p) => ({
            value: p.id,
            label: p.name,
            subtitle: format(p.cost),
          })),
        ]}
      />
    </div>
  );
}
