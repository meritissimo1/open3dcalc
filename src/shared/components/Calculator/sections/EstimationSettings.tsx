import { useId, useState } from "react";
import { ChevronDown } from "lucide-react";
import {
  SlicerProfileFields,
  type SlicerProfileFieldsProps,
} from "./SlicerProfileFields";
import { FilamentAssumptionsFields } from "./FilamentAssumptionsFields";

/**
 * Buma Labs fork: the slicer profile and filament parameters only feed the
 * 3D-file estimator (weight and print time from an STL/3MF/G-code), so they
 * stay collapsed until someone needs them.
 */
export function EstimationSettings(props: SlicerProfileFieldsProps) {
  const { t, isFieldVisible } = props;
  const [open, setOpen] = useState(false);
  const panelId = useId();

  // Same gating as the blocks inside: nothing to show, no toggle.
  if (
    !isFieldVisible("material", "wallCount") &&
    !isFieldVisible("material", "purgePercent")
  ) {
    return null;
  }

  return (
    <div className="mt-3 rounded-xl border border-[var(--border-default)]">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls={panelId}
        className="w-full min-h-[44px] flex items-center justify-between gap-3 px-4 py-2 text-left rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
      >
        <span className="flex flex-col">
          <span className="text-[12px] font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
            {t("calc.estimationSettings.title")}
          </span>
          <span className="text-[11px] text-[var(--text-muted)]">
            {t("calc.estimationSettings.hint")}
          </span>
        </span>
        <ChevronDown
          aria-hidden="true"
          className={`w-4 h-4 shrink-0 text-[var(--text-muted)] transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open && (
        <div id={panelId} className="px-3 pb-3">
          <SlicerProfileFields {...props} />
          <FilamentAssumptionsFields {...props} />
        </div>
      )}
    </div>
  );
}
