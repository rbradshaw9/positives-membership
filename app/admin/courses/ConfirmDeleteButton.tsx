"use client";
import { useState, useTransition } from "react";

interface DeleteButtonProps {
  action: (formData: FormData) => Promise<void>;
  fields: Record<string, string>;
  confirmName: string;
  label?: string;
  style?: React.CSSProperties;
}

/**
 * Delete button that requires the user to type a confirmation name before proceeding.
 */
export function ConfirmDeleteButton({
  action,
  fields,
  confirmName,
  label = "Delete",
  style,
}: DeleteButtonProps) {
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState("");
  const [isPending, startTransition] = useTransition();

  function handleSubmit() {
    if (typed.trim().toLowerCase() !== confirmName.trim().toLowerCase()) return;
    const fd = new FormData();
    for (const [k, v] of Object.entries(fields)) fd.append(k, v);
    startTransition(() => action(fd));
  }

  return (
    <>
      <button
        type="button"
        onClick={() => { setOpen(true); setTyped(""); }}
        style={style}
      >
        {label}
      </button>

      {open && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.6)",
            zIndex: 9999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "1rem",
          }}
          onClick={(e) => { if (e.target === e.currentTarget) setOpen(false); }}
        >
          <div
            style={{
              background: "var(--color-surface)",
              border: "1px solid var(--color-border)",
              borderRadius: "0.75rem",
              padding: "1.5rem",
              width: "100%",
              maxWidth: "26rem",
              boxShadow: "0 20px 60px rgba(0,0,0,0.5)",
            }}
          >
            <p style={{ fontSize: "1rem", fontWeight: 700, color: "var(--color-foreground)", marginBottom: "0.5rem" }}>
              Confirm deletion
            </p>
            <p style={{ fontSize: "0.8125rem", color: "var(--color-muted-fg)", marginBottom: "1rem", lineHeight: 1.5 }}>
              This cannot be undone. Type{" "}
              <strong style={{ color: "var(--color-foreground)", fontFamily: "monospace" }}>
                {confirmName}
              </strong>{" "}
              to confirm.
            </p>
            <input
              autoFocus
              type="text"
              className="admin-input"
              placeholder={confirmName}
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") handleSubmit(); }}
              style={{ marginBottom: "1rem" }}
            />
            <div style={{ display: "flex", gap: "0.5rem", justifyContent: "flex-end" }}>
              <button
                type="button"
                className="admin-btn"
                style={{ background: "var(--color-muted)", color: "var(--color-foreground)" }}
                onClick={() => setOpen(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="admin-btn"
                disabled={typed.trim().toLowerCase() !== confirmName.trim().toLowerCase() || isPending}
                style={{
                  background: "rgba(239,68,68,0.1)",
                  color: "#ef4444",
                  border: "1px solid rgba(239,68,68,0.3)",
                  opacity: typed.trim().toLowerCase() !== confirmName.trim().toLowerCase() ? 0.4 : 1,
                }}
                onClick={handleSubmit}
              >
                {isPending ? "Deleting…" : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
