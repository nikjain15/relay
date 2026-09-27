"use client";

// A panel that opens beside the page, for editing or creating something
// without leaving the screen it belongs to. Escape or the backdrop closes it.
import { useEffect, useRef, type ReactNode } from "react";
import { Icon, type IconName } from "@/components/icons";
import { iconBtn } from "@/components/ui";

export function SidePanel({ open, title, sub, icon = "agent", onClose, children, footer }: {
  open: boolean;
  title: string;
  sub?: ReactNode;
  icon?: IconName;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
}) {
  const panel = useRef<HTMLElement>(null);
  useEffect(() => {
    if (!open) return;
    panel.current?.focus();
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-30" role="presentation">
      <button type="button" aria-label="Close the panel" onClick={onClose} className="absolute inset-0 bg-ink/20" />
      <aside ref={panel} tabIndex={-1} role="dialog" aria-modal="true" aria-label={title} className="absolute inset-y-0 right-0 flex w-full max-w-lg flex-col border-l border-line bg-surface shadow-lg focus:outline-none">
        <header className="flex items-start gap-3 border-b border-line px-5 py-4">
          <Icon name={icon} size={20} className="mt-0.5 text-agent" />
          <div className="min-w-0 flex-1">
            <h2 className="text-heading font-semibold leading-snug text-ink">{title}</h2>
            {sub && <p className="mt-1 text-meta text-ink-3">{sub}</p>}
          </div>
          <button type="button" onClick={onClose} className={iconBtn} aria-label="Close"><Icon name="close" size={16} /></button>
        </header>
        <div className="flex-1 overflow-y-auto px-5 py-4">{children}</div>
        {footer && <footer className="border-t border-line px-5 py-3">{footer}</footer>}
      </aside>
    </div>
  );
}

// Fields in a panel use the product's one form system.
export { Field, input, textarea } from "@/components/ui";
