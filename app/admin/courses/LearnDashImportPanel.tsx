"use client";

import { useState, useTransition, useEffect } from "react";
import {
  fetchLearnDashCourses,
  importFromLearnDash,
  getLearnDashDefaults,
} from "./actions";
import type { LearnDashImportResult } from "./actions";

/**
 * LearnDashImportPanel — two-step import flow:
 * 1. Connect: paste WP URL + credentials → fetch available courses
 * 2. Select: pick which courses to import → run import
 */

type LDCourse = { id: number; title: string; lessons_count: number };

export function LearnDashImportPanel() {
  const [step, setStep] = useState<"connect" | "select" | "done">("connect");
  const [isPending, startTransition] = useTransition();
  const [wpUrl, setWpUrl] = useState("");
  const [wpUser, setWpUser] = useState("");
  const [wpPassword, setWpPassword] = useState("");
  const [courses, setCourses] = useState<LDCourse[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<LearnDashImportResult | null>(null);
  const [preConfigured, setPreConfigured] = useState(false);

  // Auto-connect if env vars are set
  useEffect(() => {
    startTransition(async () => {
      const defaults = await getLearnDashDefaults();
      if (defaults.configured) {
        setWpUrl(defaults.wpUrl);
        setWpUser(defaults.wpUser);
        setWpPassword(defaults.wpPassword);
        setPreConfigured(true);

        // Auto-fetch courses
        const fd = new FormData();
        fd.append("wp_url", defaults.wpUrl);
        fd.append("wp_user", defaults.wpUser);
        fd.append("wp_password", defaults.wpPassword);
        const res = await fetchLearnDashCourses(fd);
        if (!res.error && res.courses.length > 0) {
          setCourses(res.courses);
          setSelectedIds(new Set(res.courses.map((c) => c.id)));
          setStep("select");
        } else if (res.error) {
          setError(res.error);
        }
      }
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleConnect() {
    setError(null);
    startTransition(async () => {
      const fd = new FormData();
      fd.append("wp_url", wpUrl);
      fd.append("wp_user", wpUser);
      fd.append("wp_password", wpPassword);

      const res = await fetchLearnDashCourses(fd);
      if (res.error) {
        setError(res.error);
      } else if (res.courses.length === 0) {
        setError("No courses found on this LearnDash installation.");
      } else {
        setCourses(res.courses);
        setSelectedIds(new Set(res.courses.map((c) => c.id)));
        setStep("select");
      }
    });
  }

  function handleImport() {
    setError(null);
    startTransition(async () => {
      const fd = new FormData();
      fd.append("wp_url", wpUrl);
      fd.append("wp_user", wpUser);
      fd.append("wp_password", wpPassword);
      for (const id of selectedIds) {
        fd.append("course_ids", String(id));
      }

      const res = await importFromLearnDash(fd);
      setResult(res);
      setStep("done");
    });
  }

  function toggleCourse(id: number) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  return (
    <div className="admin-section">
      <div className="admin-section__header">
        <span className="admin-section__title">📥 Import from LearnDash</span>
        <span
          style={{
            fontSize: "0.6875rem",
            color: "var(--color-muted-fg)",
          }}
        >
          {isPending && step === "connect"
            ? "Connecting…"
            : preConfigured && step !== "connect"
              ? `Connected · ${new URL(wpUrl || "https://x.com").hostname}`
              : step === "connect"
                ? "Step 1: Connect"
                : step === "select"
                  ? "Step 2: Select courses"
                  : "Complete"}
        </span>
      </div>

      <div className="admin-section__body">
        {/* ── Step 1: Connect (only shown when not pre-configured) ── */}
        {step === "connect" && (
          <>
            {isPending ? (
              <p style={{ fontSize: "0.8125rem", color: "var(--color-muted-fg)" }}>Connecting to LearnDash…</p>
            ) : preConfigured ? (
              <p style={{ fontSize: "0.8125rem", color: "#22c55e" }}>✅ Connected via environment configuration.</p>
            ) : (
              <>
                <p style={{ fontSize: "0.8125rem", color: "var(--color-muted-fg)", marginBottom: "1rem", lineHeight: 1.6 }}>
                  Connect to your WordPress site running LearnDash.
                </p>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                  <div className="admin-form-field" style={{ gridColumn: "1 / -1" }}>
                    <label className="admin-label">WordPress URL <span className="admin-label__required">*</span></label>
                    <input type="url" value={wpUrl} onChange={(e) => setWpUrl(e.target.value)} placeholder="https://your-site.com" className="admin-input" />
                  </div>
                  <div className="admin-form-field">
                    <label className="admin-label">Username <span className="admin-label__required">*</span></label>
                    <input type="text" value={wpUser} onChange={(e) => setWpUser(e.target.value)} placeholder="admin" className="admin-input" />
                  </div>
                  <div className="admin-form-field">
                    <label className="admin-label">Application Password <span className="admin-label__required">*</span></label>
                    <input type="password" value={wpPassword} onChange={(e) => setWpPassword(e.target.value)} placeholder="xxxx xxxx xxxx xxxx" className="admin-input" />
                  </div>
                </div>
                {error && <div className="admin-banner admin-banner--error" style={{ marginTop: "0.75rem" }}>{error}</div>}
                <button type="button" onClick={handleConnect} disabled={isPending || !wpUrl || !wpUser || !wpPassword} className="admin-btn admin-btn--primary" style={{ marginTop: "0.75rem" }}>
                  Connect &amp; Browse Courses
                </button>
              </>
            )}
          </>
        )}

        {/* ── Step 2: Select Courses ── */}
        {step === "select" && (
          <>
            <p
              style={{
                fontSize: "0.8125rem",
                color: "var(--color-muted-fg)",
                marginBottom: "1rem",
              }}
            >
              Found {courses.length} course{courses.length !== 1 ? "s" : ""}.
              Select which to import:
            </p>

            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "0.5rem",
                marginBottom: "1rem",
              }}
            >
              {courses.map((c) => (
                <label
                  key={c.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.75rem",
                    padding: "0.75rem 1rem",
                    borderRadius: "0.5rem",
                    border: `1px solid ${
                      selectedIds.has(c.id)
                        ? "var(--color-primary)"
                        : "var(--color-border)"
                    }`,
                    background: selectedIds.has(c.id)
                      ? "rgba(46,196,182,0.03)"
                      : "transparent",
                    cursor: "pointer",
                    transition: "border-color 120ms ease, background 120ms ease",
                  }}
                >
                  <input
                    type="checkbox"
                    checked={selectedIds.has(c.id)}
                    onChange={() => toggleCourse(c.id)}
                    style={{ accentColor: "var(--color-primary)" }}
                  />
                  <div style={{ flex: 1 }}>
                    <p
                      style={{
                        fontSize: "0.8125rem",
                        fontWeight: 600,
                        color: "var(--color-foreground)",
                      }}
                    >
                      {c.title}
                    </p>
                    <p
                      style={{
                        fontSize: "0.6875rem",
                        color: "var(--color-muted-fg)",
                        marginTop: "0.125rem",
                      }}
                    >
                      {c.lessons_count} lesson
                      {c.lessons_count !== 1 ? "s" : ""}
                    </p>
                  </div>
                </label>
              ))}
            </div>

            {error && (
              <div
                className="admin-banner admin-banner--error"
                style={{ marginTop: "0.75rem" }}
              >
                {error}
              </div>
            )}

            <div style={{ display: "flex", gap: "0.5rem" }}>
              <button
                type="button"
                onClick={handleImport}
                disabled={isPending || selectedIds.size === 0}
                className="admin-btn admin-btn--primary"
                style={{ opacity: isPending ? 0.6 : 1 }}
              >
                {isPending
                  ? "Importing…"
                  : `Import ${selectedIds.size} Course${selectedIds.size !== 1 ? "s" : ""}`}
              </button>
              <button
                type="button"
                onClick={() => setStep("connect")}
                className="admin-btn"
                style={{
                  background: "var(--color-muted)",
                  color: "var(--color-foreground)",
                }}
              >
                Back
              </button>
            </div>
          </>
        )}

        {/* ── Step 3: Done ── */}
        {step === "done" && result && (
          <>
            <div
              style={{
                padding: "1.25rem",
                borderRadius: "0.625rem",
                background: result.success
                  ? "rgba(34,197,94,0.05)"
                  : "rgba(239,68,68,0.05)",
                border: `1px solid ${
                  result.success
                    ? "rgba(34,197,94,0.2)"
                    : "rgba(239,68,68,0.2)"
                }`,
                marginBottom: "1rem",
              }}
            >
              <p
                style={{
                  fontSize: "0.875rem",
                  fontWeight: 700,
                  color: result.success ? "#22c55e" : "#ef4444",
                  marginBottom: "0.5rem",
                }}
              >
                {result.success ? "✅ Import Complete" : "❌ Import Failed"}
              </p>
              <p
                style={{
                  fontSize: "0.8125rem",
                  color: "var(--color-foreground)",
                  lineHeight: 1.6,
                }}
              >
                {result.coursesImported} courses, {result.modulesImported}{" "}
                modules, {result.sessionsImported} sessions imported.
              </p>
              {result.errors.length > 0 && (
                <div style={{ marginTop: "0.5rem" }}>
                  <p
                    style={{
                      fontSize: "0.6875rem",
                      fontWeight: 600,
                      color: "#d97706",
                      marginBottom: "0.25rem",
                    }}
                  >
                    Warnings ({result.errors.length}):
                  </p>
                  <ul
                    style={{
                      fontSize: "0.6875rem",
                      color: "var(--color-muted-fg)",
                      paddingLeft: "1rem",
                      lineHeight: 1.6,
                    }}
                  >
                    {result.errors.slice(0, 10).map((e, i) => (
                      <li key={i}>{e}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={() => {
                setStep("connect");
                setResult(null);
              }}
              className="admin-btn"
              style={{
                background: "var(--color-muted)",
                color: "var(--color-foreground)",
              }}
            >
              Import More
            </button>
          </>
        )}
      </div>
    </div>
  );
}
