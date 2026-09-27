import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { InputGroup } from "@/shared/components/ui/InputGroup";
import { Select } from "@/shared/components/ui/Select";
import { useCurrency } from "@/shared/hooks/useCurrency";
import { useCalculatorStore } from "@/shared/stores/calculatorStore";
import { useCatalogStore } from "@/shared/stores/catalogStore";

/**
 * Buma Labs fork: labor is a per-piece time charged at the hourly rate set
 * in Catalog → Labor. A category fills the usual time, which stays editable.
 */
export function LaborFields() {
  const { t } = useTranslation();
  const { format } = useCurrency();
  const categories = useCatalogStore((s) => s.laborCategories);
  const catalogRate = useCatalogStore((s) => s.laborHourlyRate);
  const labor = useCalculatorStore((s) => s.fdmLabor);
  const setLabor = useCalculatorStore((s) => s.setFdmLabor);
  const categoryId = useCalculatorStore((s) => s.laborCategoryId);
  const selectCategory = useCalculatorStore((s) => s.selectLaborCategory);

  // The rate is owned by the catalog; history items or backups may carry
  // an older one.
  useEffect(() => {
    if (labor.hourlyRate !== catalogRate)
      setLabor({ ...labor, hourlyRate: catalogRate });
  }, [labor, catalogRate, setLabor]);

  const minutes = labor.postProcessingTimeMinutes;
  const selected = categories.some((c) => c.id === categoryId)
    ? (categoryId ?? "")
    : "";

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 @form:grid-cols-2 gap-3">
        <Select
          label={t("labor.category")}
          value={selected}
          onChange={(id) =>
            selectCategory(categories.find((c) => c.id === id) ?? null)
          }
          options={[
            { value: "", label: t("labor.noCategory") },
            ...categories.map((c) => ({
              value: c.id,
              label: c.name,
              subtitle: `${c.minutes} min`,
            })),
          ]}
          search={categories.length > 6}
        />
        <InputGroup
          label={t("labor.time")}
          value={minutes}
          onChange={(v) =>
            setLabor({
              ...labor,
              postProcessingTimeMinutes: Math.max(0, parseFloat(v) || 0),
            })
          }
          type="number"
          unit="min"
          tooltip={t("labor.timeTooltip")}
        />
      </div>
      <div className="flex flex-wrap justify-between gap-2 text-xs text-[var(--text-secondary)]">
        <span data-testid="labor-rate">
          {t("labor.rateInfo", { rate: format(catalogRate) })}
        </span>
        {minutes > 0 && (
          <span className="font-mono" data-testid="labor-cost">
            {format((minutes / 60) * catalogRate)}
          </span>
        )}
      </div>
      {categories.length === 0 && (
        <p className="text-xs text-[var(--text-muted)]">
          {t("labor.noCategories")}
        </p>
      )}
    </div>
  );
}
