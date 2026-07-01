import React, { useMemo, useState } from "react";
import { X } from "lucide-react";

export type DictionaryOption = {
  id: number;
  name: string;
  is_active?: boolean | null;
  role_id?: number | null;
};

type DictionaryMultiSelectProps = {
  label?: string;
  options?: DictionaryOption[];
  value?: unknown;
  onChange: (value: number[]) => void;
  placeholder?: string;
  emptyText?: string;
  searchable?: boolean;
  disabled?: boolean;
  maxHeightClassName?: string;
  grid?: boolean;
};

function toNumberArray(value: unknown): number[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => Number(item))
    .filter((item) => Number.isFinite(item));
}

export function DictionaryMultiSelect({
  label,
  options = [],
  value,
  onChange,
  placeholder = "חיפוש...",
  emptyText = "אין ערכים להצגה",
  searchable = true,
  disabled = false,
  maxHeightClassName = "max-h-40",
  grid = false,
}: DictionaryMultiSelectProps) {
  const [query, setQuery] = useState("");
  const selectedIds = toNumberArray(value);

  const activeOptions = useMemo(
    () => options.filter((option) => option && option.id !== null && option.id !== undefined && option.name),
    [options],
  );

  const selectedOptions = useMemo(
    () => activeOptions.filter((option) => selectedIds.includes(Number(option.id))),
    [activeOptions, selectedIds],
  );

  const filteredOptions = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return activeOptions;
    return activeOptions.filter((option) => option.name.toLowerCase().includes(normalized));
  }, [activeOptions, query]);

  const toggle = (id: number, checked: boolean) => {
    if (disabled) return;
    const next = checked
      ? Array.from(new Set([...selectedIds, id]))
      : selectedIds.filter((item) => item !== id);
    onChange(next);
  };

  const remove = (id: number) => toggle(id, false);

  return (
    <div className="space-y-2" dir="rtl">
      {label ? <label className="text-xs text-slate-500">{label}</label> : null}

      {selectedOptions.length ? (
        <div className="flex flex-wrap gap-1.5">
          {selectedOptions.map((option) => (
            <span
              key={option.id}
              className="inline-flex items-center gap-1 rounded-full border border-teal-100 bg-teal-50 px-2.5 py-1 text-xs font-medium text-teal-800"
            >
              {option.name}
              <button
                type="button"
                disabled={disabled}
                onClick={() => remove(Number(option.id))}
                className="rounded-full p-0.5 text-teal-700 hover:bg-teal-100 disabled:cursor-not-allowed disabled:opacity-50"
                aria-label={`הסר ${option.name}`}
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      ) : null}

      <div className="rounded-xl border border-slate-200 bg-white p-3">
        {searchable ? (
          <input
            type="text"
            value={query}
            disabled={disabled}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={placeholder}
            className="mb-2 h-9 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm outline-none focus:border-teal-500 disabled:cursor-not-allowed disabled:opacity-60"
          />
        ) : null}

        <div className={`${maxHeightClassName} overflow-y-auto ${grid ? "grid grid-cols-2 gap-1" : "space-y-1"}`}>
          {filteredOptions.length ? (
            filteredOptions.map((option) => {
              const id = Number(option.id);
              const checked = selectedIds.includes(id);
              return (
                <label
                  key={id}
                  className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-slate-700 hover:bg-slate-50"
                >
                  <input
                    type="checkbox"
                    className="accent-teal-600"
                    disabled={disabled}
                    checked={checked}
                    onChange={(event) => toggle(id, event.target.checked)}
                  />
                  <span>{option.name}</span>
                </label>
              );
            })
          ) : (
            <div className="py-3 text-center text-xs text-slate-400">{emptyText}</div>
          )}
        </div>
      </div>
    </div>
  );
}

export default DictionaryMultiSelect;
