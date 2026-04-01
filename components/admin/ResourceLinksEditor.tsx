"use client";

import { useState } from "react";

/**
 * components/admin/ResourceLinksEditor.tsx
 * Sprint 8: Admin UI for editing resource_links (JSONB array).
 *
 * Schema: resource_links is JSONB, each element is { label: string, url: string }
 *
 * Renders repeatable label+url rows with add/remove controls.
 * Serializes to a hidden input as JSON for form submission.
 *
 * Design: simple, functional, no drag-and-drop.
 */

interface ResourceLink {
  label: string;
  url: string;
}

interface ResourceLinksEditorProps {
  /** Initial value from the content row */
  initialValue?: ResourceLink[] | null;
}

export function ResourceLinksEditor({ initialValue }: ResourceLinksEditorProps) {
  const [links, setLinks] = useState<ResourceLink[]>(
    Array.isArray(initialValue) && initialValue.length > 0
      ? initialValue
      : []
  );

  function addRow() {
    setLinks((prev) => [...prev, { label: "", url: "" }]);
  }

  function removeRow(index: number) {
    setLinks((prev) => prev.filter((_, i) => i !== index));
  }

  function updateField(index: number, field: keyof ResourceLink, value: string) {
    setLinks((prev) =>
      prev.map((link, i) => (i === index ? { ...link, [field]: value } : link))
    );
  }

  // Filter out blank rows before serializing
  const serialized = JSON.stringify(
    links.filter((l) => l.label.trim() || l.url.trim())
  );

  const inputBase =
    "w-full px-3 py-2 text-sm border border-input rounded-lg bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/60 transition-colors";

  return (
    <div className="flex flex-col gap-3">
      {/* Hidden input serializes the final value for form submission */}
      <input type="hidden" name="resource_links" value={serialized} />

      {links.length === 0 ? (
        <p className="text-xs text-muted-foreground">
          No resource links yet. Add one below.
        </p>
      ) : (
        <div className="flex flex-col gap-2">
          {links.map((link, i) => (
            <div key={i} className="flex items-center gap-2">
              <input
                type="text"
                aria-label={`Resource link ${i + 1} label`}
                value={link.label}
                onChange={(e) => updateField(i, "label", e.target.value)}
                placeholder="Label (e.g. Download worksheet)"
                className={`${inputBase} flex-[1]`}
              />
              <input
                type="url"
                aria-label={`Resource link ${i + 1} URL`}
                value={link.url}
                onChange={(e) => updateField(i, "url", e.target.value)}
                placeholder="https://…"
                className={`${inputBase} flex-[2]`}
              />
              <button
                type="button"
                onClick={() => removeRow(i)}
                aria-label={`Remove resource link ${i + 1}`}
                className="flex-shrink-0 text-muted-foreground hover:text-destructive transition-colors p-1"
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}

      <button
        type="button"
        onClick={addRow}
        className="flex items-center gap-1.5 text-xs text-primary hover:text-primary-hover transition-colors self-start"
      >
        <svg
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <line x1="12" y1="5" x2="12" y2="19" />
          <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
        Add resource link
      </button>
    </div>
  );
}
