import { useState } from "react";
import { useTranslation } from "react-i18next";
import { InputGroup } from "@/shared/components/ui/InputGroup";
import { useCurrency } from "@/shared/hooks/useCurrency";
import { useCatalogStore } from "@/shared/stores/catalogStore";
import type { LaborCategory } from "@/shared/types";

const parseNumber = (value: string) =>
  Math.max(0, Number(value.replace(",", ".")) || 0);

/**
 * Buma Labs fork: the labor hourly rate and the labor categories
 * ("Chaveiro com 3 clickers" = 10 min) the calculator picks from.
 */
export function LaborManager() {
  const { t } = useTranslation();
  const { symbol: currencySymbol } = useCurrency();
  const store = useCatalogStore();

  const [rate, setRate] = useState(String(store.laborHourlyRate));
  const [name, setName] = useState("");
  const [minutes, setMinutes] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editMinutes, setEditMinutes] = useState("");

  const saveRate = () => {
    const next = parseNumber(rate);
    // The calculator picks the new rate up when its labor section renders.
    store.setLaborHourlyRate(next);
    setRate(String(next));
  };

  const addCategory = () => {
    if (!name.trim()) return;
    store.addLaborCategory({
      name: name.trim(),
      minutes: parseNumber(minutes),
    });
    setName("");
    setMinutes("");
  };

  const startEdit = (category: LaborCategory) => {
    setEditingId(category.id);
    setEditName(category.name);
    setEditMinutes(String(category.minutes));
  };

  const saveEdit = () => {
    if (!editingId || !editName.trim()) return;
    store.updateLaborCategory(editingId, {
      name: editName.trim(),
      minutes: parseNumber(editMinutes),
    });
    setEditingId(null);
  };

  const buttonClass =
    "w-full py-3 rounded-xl bg-[var(--accent-fill)] text-white font-semibold hover:bg-[var(--accent-fill-hover)] transition-colors focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] focus-visible:outline-none";

  return (
    <div className="grid gap-4 lg:grid-cols-[360px_1fr]">
      <div className="space-y-4">
        <div className="surface rounded-xl p-5 space-y-3">
          <div className="text-sm font-semibold text-[var(--color-text-primary)]">
            {t("labor.rateTitle")}
          </div>
          <p className="text-xs text-[var(--color-text-muted)]">
            {t("labor.rateHint")}
          </p>
          <InputGroup
            label={t("labor.hourlyRate")}
            value={rate}
            onChange={setRate}
            type="number"
            prefix={currencySymbol}
            unit="/h"
          />
          <button onClick={saveRate} className={buttonClass}>
            {t("catalog.save")}
          </button>
        </div>
        <div className="surface rounded-xl p-5 space-y-3">
          <div className="text-sm font-semibold text-[var(--color-text-primary)]">
            {t("labor.addCategory")}
          </div>
          <p className="text-xs text-[var(--color-text-muted)]">
            {t("labor.categoryHint")}
          </p>
          <InputGroup
            label={t("supplies.name")}
            value={name}
            onChange={setName}
            placeholder={t("labor.categoryPlaceholder")}
          />
          <InputGroup
            label={t("labor.time")}
            value={minutes}
            onChange={setMinutes}
            type="number"
            unit="min"
          />
          <button onClick={addCategory} className={buttonClass}>
            {t("catalog.save")}
          </button>
        </div>
      </div>
      <div className="grid gap-3 content-start md:grid-cols-2 2xl:grid-cols-3">
        {store.laborCategories.length === 0 && (
          <p className="text-sm text-[var(--color-text-muted)]">
            {t("labor.emptyCategories")}
          </p>
        )}
        {store.laborCategories.map((category) =>
          editingId === category.id ? (
            <div key={category.id} className="surface rounded-xl p-4 space-y-3">
              <InputGroup
                label={t("supplies.name")}
                value={editName}
                onChange={setEditName}
              />
              <InputGroup
                label={t("labor.time")}
                value={editMinutes}
                onChange={setEditMinutes}
                type="number"
                unit="min"
              />
              <div className="flex gap-3 text-xs">
                <button
                  onClick={saveEdit}
                  className="font-semibold text-[var(--color-accent)] focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] focus-visible:outline-none rounded"
                >
                  {t("catalog.saveChanges")}
                </button>
                <button
                  onClick={() => setEditingId(null)}
                  className="text-[var(--color-text-secondary)] focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] focus-visible:outline-none rounded"
                >
                  {t("catalog.cancel")}
                </button>
              </div>
            </div>
          ) : (
            <div key={category.id} className="surface rounded-xl p-4 space-y-2">
              <div className="flex items-start justify-between gap-3">
                <div className="font-semibold text-[var(--color-text-primary)]">
                  {category.name}
                </div>
                <div className="font-mono text-sm text-[var(--color-text-secondary)]">
                  {category.minutes} min
                </div>
              </div>
              <div className="flex gap-3 text-xs">
                <button
                  onClick={() => startEdit(category)}
                  aria-label={t("supplies.editItem", { name: category.name })}
                  className="text-[var(--color-accent)] focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] focus-visible:outline-none rounded"
                >
                  {t("supplies.edit")}
                </button>
                <button
                  onClick={() => store.removeLaborCategory(category.id)}
                  aria-label={t("supplies.removeItem", { name: category.name })}
                  className="text-[var(--color-danger)] hover:text-red-300 focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:outline-none rounded"
                >
                  {t("catalog.remove")}
                </button>
              </div>
            </div>
          ),
        )}
      </div>
    </div>
  );
}
