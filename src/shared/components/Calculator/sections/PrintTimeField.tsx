import { useState } from "react";
import { InputGroup } from "@/shared/components/ui/InputGroup";
import {
  formatHoursMinutes,
  formatPrintTime,
  parsePrintTime,
} from "@/shared/lib/printTime";

/**
 * Buma Labs fork: print time typed as MakerWorld shows it ("5.3", "30 min"),
 * with the clock reading underneath to double-check ("= 5h 18min").
 */
export function PrintTimeField({
  hours,
  onChange,
  t,
}: {
  hours: number;
  onChange: (hours: number) => void;
  t: (key: string) => string;
}) {
  // While typing, keep the raw text; otherwise show the stored value.
  const [draft, setDraft] = useState<string | null>(null);
  const parsed = draft === null ? hours : parsePrintTime(draft);
  const invalid = draft !== null && draft.trim() !== "" && parsed === null;

  return (
    <div className="flex flex-col gap-1">
      <InputGroup
        label={t("calc.printTime")}
        value={draft ?? formatPrintTime(hours)}
        onFocus={() => setDraft(formatPrintTime(hours))}
        onChange={(v) => {
          setDraft(v);
          const next = parsePrintTime(v);
          if (next !== null) onChange(next);
        }}
        onBlur={() => setDraft(null)}
        type="text"
        placeholder="5.3 h · 30 min"
        tooltip={t("tooltip.printTimeHours")}
        error={invalid ? t("calc.printTimeInvalid") : null}
      />
      {!invalid && parsed !== null && (
        <span
          data-testid="print-time-reading"
          className="text-[11px] text-[var(--text-muted)]"
        >
          = {formatHoursMinutes(parsed)}
        </span>
      )}
    </div>
  );
}
