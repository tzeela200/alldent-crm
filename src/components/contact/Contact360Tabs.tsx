import { useEffect, useRef, type KeyboardEvent, type ReactNode } from "react";

const BRAND_PRIMARY = "#008080";

export type Contact360TabId = "person" | "cv" | "applications" | "organization" | "crm";

export interface Contact360TabDef {
  id: Contact360TabId;
  label: string;
  icon: ReactNode;
  /** Rendered only when a real, already-loaded number is passed. */
  badge?: number | null;
}

/**
 * RTL tab bar for Contact 360. Purely a navigation surface — it owns no data
 * and no business logic; the page decides what each panel contains.
 *
 * Panels stay mounted and are hidden with `display:none` (see Contact360TabPanel),
 * so switching tabs never remounts a block: open inline edits keep their state
 * and React Query is never asked for the same data twice.
 */
export function Contact360Tabs({
  tabs,
  active,
  onChange,
}: {
  tabs: Contact360TabDef[];
  active: Contact360TabId;
  onChange: (id: Contact360TabId) => void;
}) {
  const listRef = useRef<HTMLDivElement>(null);

  // Keep the active tab visible when the bar scrolls horizontally on mobile.
  useEffect(() => {
    const node = listRef.current?.querySelector<HTMLButtonElement>(`#contact360-tab-${active}`);
    node?.scrollIntoView({ block: "nearest", inline: "nearest" });
  }, [active]);

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const index = tabs.findIndex((tab) => tab.id === active);
    if (index < 0) return;

    // RTL: ArrowLeft moves forward through the list, ArrowRight moves back.
    let next = index;
    if (event.key === "ArrowLeft") next = (index + 1) % tabs.length;
    else if (event.key === "ArrowRight") next = (index - 1 + tabs.length) % tabs.length;
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = tabs.length - 1;
    else return;

    event.preventDefault();
    onChange(tabs[next].id);
    listRef.current?.querySelector<HTMLButtonElement>(`#contact360-tab-${tabs[next].id}`)?.focus();
  }

  return (
    <div className="sticky top-0 z-30 -mx-4 bg-[#F8FAFC]/95 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6">
      <div
        ref={listRef}
        role="tablist"
        aria-label="אזורי כרטסת האדם"
        dir="rtl"
        onKeyDown={handleKeyDown}
        className="flex gap-1 overflow-x-auto rounded-2xl border border-[#E5E7EB] bg-white p-1.5 shadow-[0_1px_3px_rgba(0,0,0,.04)] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {tabs.map((tab) => {
          const isActive = tab.id === active;
          return (
            <button
              key={tab.id}
              id={`contact360-tab-${tab.id}`}
              type="button"
              role="tab"
              aria-selected={isActive}
              aria-controls={`contact360-panel-${tab.id}`}
              tabIndex={isActive ? 0 : -1}
              onClick={() => onChange(tab.id)}
              style={isActive ? { backgroundColor: BRAND_PRIMARY } : undefined}
              className={`flex shrink-0 items-center gap-2 whitespace-nowrap rounded-xl px-4 py-2.5 text-sm font-medium transition focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-300 ${
                isActive
                  ? "text-white shadow-[0_1px_3px_rgba(0,0,0,.08)]"
                  : "text-slate-600 hover:bg-teal-50 hover:text-[#006666]"
              }`}
            >
              <span aria-hidden="true" className="flex items-center">{tab.icon}</span>
              {tab.label}
              {typeof tab.badge === "number" && tab.badge > 0 && (
                <span
                  className={`inline-flex min-w-[22px] items-center justify-center rounded-full px-1.5 py-0.5 text-[13px] font-semibold ${
                    isActive ? "bg-white/25 text-white" : "bg-slate-100 text-slate-600"
                  }`}
                >
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/**
 * One tab's content. Always mounted; hidden when inactive so that an open
 * inline edit is never discarded and no query is re-issued on tab change.
 */
export function Contact360TabPanel({
  tabId,
  active,
  children,
}: {
  tabId: Contact360TabId;
  active: Contact360TabId;
  children: ReactNode;
}) {
  const isActive = tabId === active;
  return (
    <div
      id={`contact360-panel-${tabId}`}
      role="tabpanel"
      aria-labelledby={`contact360-tab-${tabId}`}
      hidden={!isActive}
      className={isActive ? "space-y-6" : "hidden"}
    >
      {children}
    </div>
  );
}
