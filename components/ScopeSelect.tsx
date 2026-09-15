"use client";
import { LESSONS, UNITS, scopeKey, type Scope } from "@/lib/data";

export function ScopeSelect({
  id,
  value,
  onChange,
  extra,
  className = "field",
}: {
  id: string;
  value: Scope;
  onChange: (key: string) => void;
  extra: { value: string; label: string }[];
  className?: string;
}) {
  return (
    <select id={id} className={className} value={scopeKey(value)} onChange={(e) => onChange(e.target.value)} aria-label="Words">
      {extra.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
      {UNITS.map((u) => {
        const ls = LESSONS.filter((l) => l.unit === u);
        return (
          <optgroup key={u} label={`Unit ${u} · ${ls[0].unitName}`}>
            <option value={`u${u}`}>All of unit {u} (60)</option>
            {ls.map((l) => (
              <option key={l.n} value={`l${l.n}`}>
                {l.name}
              </option>
            ))}
          </optgroup>
        );
      })}
    </select>
  );
}
