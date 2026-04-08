"use client";

import { useState, useTransition, useRef } from "react";
import { saveEmailTemplate, sendTestEmail } from "./actions";

const TOKENS = [
  { token: "{{firstName}}", desc: "Member's first name" },
  { token: "{{dashboardUrl}}", desc: "Dashboard URL" },
  { token: "{{amountDue}}", desc: "Amount due (e.g. $37.00)" },
  { token: "{{nextRetryDate}}", desc: "Next payment retry date" },
  { token: "{{billingUrl}}", desc: "1-click billing portal URL" },
  { token: "{{rejoindUrl}}", desc: "Rejoin / sales page URL" },
];

type Template = {
  slug: string;
  name: string;
  sequence: string;
  day_offset: number;
  send_at_utc_hour: number | null;
  subject: string;
  heading: string;
  body: string;
  cta_label: string | null;
  cta_url: string | null;
  is_active: boolean;
};

export function EmailTemplateEditor({
  template,
  previewHtml,
}: {
  template: Template;
  previewHtml: string;
}) {
  const [isPending, startTransition] = useTransition();
  const [toast, setToast] = useState<{ type: "success" | "error"; msg: string } | null>(null);
  const [testEmail, setTestEmail] = useState("");
  const [sendingTest, setSendingTest] = useState(false);
  const [preview, setPreview] = useState(previewHtml);
  const previewTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function showToast(type: "success" | "error", msg: string) {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 4000);
  }

  async function handleSave(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      try {
        await saveEmailTemplate(template.slug, formData);
        showToast("success", "Template saved successfully.");
      } catch (err) {
        showToast("error", err instanceof Error ? err.message : "Save failed.");
      }
    });
  }

  async function handleSendTest() {
    if (!testEmail.trim()) return;
    setSendingTest(true);
    try {
      await sendTestEmail(template.slug, testEmail.trim());
      showToast("success", `Test email sent to ${testEmail}`);
    } catch (err) {
      showToast("error", err instanceof Error ? err.message : "Send failed.");
    } finally {
      setSendingTest(false);
    }
  }

  // Debounced live preview refresh — calls a client-side fetch to /api/admin/email-preview
  function handleFieldChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
    if (previewTimeoutRef.current) clearTimeout(previewTimeoutRef.current);
    const form = (e.target as HTMLElement).closest("form") as HTMLFormElement | null;
    if (!form) return;
    previewTimeoutRef.current = setTimeout(async () => {
      const fd = new FormData(form);
      const body = {
        heading: fd.get("heading"),
        body: fd.get("body"),
        cta_label: fd.get("cta_label"),
        cta_url: fd.get("cta_url"),
        subject: fd.get("subject"),
      };
      const res = await fetch("/api/admin/email-preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (res.ok) setPreview(await res.text());
    }, 600);
  }

  const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: "10px 12px",
    fontSize: "14px",
    fontFamily: "inherit",
    border: "1px solid var(--color-border)",
    borderRadius: "8px",
    background: "var(--color-background)",
    color: "var(--color-foreground)",
    outline: "none",
    boxSizing: "border-box",
    transition: "border-color 120ms ease",
  };
  const labelStyle: React.CSSProperties = {
    display: "block",
    fontSize: "12px",
    fontWeight: 700,
    color: "var(--color-foreground)",
    marginBottom: "6px",
    letterSpacing: "0.04em",
    textTransform: "uppercase",
  };
  const hintStyle: React.CSSProperties = {
    fontSize: "11px",
    color: "var(--color-muted-fg)",
    marginTop: "4px",
  };

  return (
    <div style={{ display: "flex", gap: "32px", alignItems: "flex-start" }}>
      {/* Toast */}
      {toast && (
        <div
          style={{
            position: "fixed",
            bottom: "24px",
            right: "24px",
            zIndex: 9999,
            padding: "12px 20px",
            borderRadius: "10px",
            fontSize: "14px",
            fontWeight: 600,
            color: "#fff",
            background: toast.type === "success" ? "#22C55E" : "#EF4444",
            boxShadow: "0 4px 20px rgba(0,0,0,0.15)",
            animation: "fadeInUp 200ms ease",
          }}
        >
          {toast.msg}
        </div>
      )}

      {/* ── Left panel: form ─────────────────────────────────────────── */}
      <div style={{ flex: "0 0 380px", minWidth: 0 }}>
        <form onSubmit={handleSave} style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          {/* Hidden fields */}
          <input type="hidden" name="is_active" value={template.is_active ? "true" : "false"} />

          {/* Subject */}
          <div>
            <label style={labelStyle}>Subject line</label>
            <input
              name="subject"
              defaultValue={template.subject}
              required
              style={inputStyle}
              onChange={handleFieldChange}
            />
            <p style={hintStyle}>Shown in inbox. Keep under 50 chars for best preview.</p>
          </div>

          {/* Heading */}
          <div>
            <label style={labelStyle}>Heading (H1)</label>
            <input
              name="heading"
              defaultValue={template.heading}
              required
              style={inputStyle}
              onChange={handleFieldChange}
            />
          </div>

          {/* Body */}
          <div>
            <label style={labelStyle}>Body copy</label>
            <textarea
              name="body"
              defaultValue={template.body}
              required
              rows={8}
              style={{ ...inputStyle, resize: "vertical", lineHeight: "1.6" }}
              onChange={handleFieldChange}
            />
            <p style={hintStyle}>Separate paragraphs with a blank line. Use tokens below.</p>
          </div>

          {/* CTA */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
            <div>
              <label style={labelStyle}>Button label</label>
              <input
                name="cta_label"
                defaultValue={template.cta_label ?? ""}
                placeholder="e.g. Open today's practice"
                style={inputStyle}
                onChange={handleFieldChange}
              />
            </div>
            <div>
              <label style={labelStyle}>Button URL</label>
              <input
                name="cta_url"
                defaultValue={template.cta_url ?? ""}
                placeholder="{{dashboardUrl}} or leave blank"
                style={inputStyle}
                onChange={handleFieldChange}
              />
            </div>
          </div>

          {/* Timing */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
            <div>
              <label style={labelStyle}>Send on day</label>
              <input
                name="day_offset"
                type="number"
                min={0}
                max={365}
                defaultValue={template.day_offset}
                style={inputStyle}
              />
              <p style={hintStyle}>0 = immediate. Days after trigger event.</p>
            </div>
            <div>
              <label style={labelStyle}>Send time (UTC hour)</label>
              <select
                name="send_at_utc_hour"
                defaultValue={template.send_at_utc_hour ?? "immediate"}
                style={{ ...inputStyle, cursor: "pointer" }}
              >
                <option value="immediate">Immediate</option>
                <option value="12">12:00 UTC (7 AM ET)</option>
                <option value="13">13:00 UTC (8 AM ET)</option>
                <option value="14">14:00 UTC (9 AM ET)</option>
                <option value="15">15:00 UTC (10 AM ET)</option>
                <option value="17">17:00 UTC (12 PM ET)</option>
              </select>
            </div>
          </div>

          {/* Token reference */}
          <div
            style={{
              background: "var(--color-muted)",
              borderRadius: "8px",
              padding: "14px 16px",
            }}
          >
            <p
              style={{
                margin: "0 0 8px",
                fontSize: "11px",
                fontWeight: 700,
                color: "var(--color-foreground)",
                textTransform: "uppercase",
                letterSpacing: "0.06em",
              }}
            >
              Available tokens
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
              {TOKENS.map(({ token, desc }) => (
                <div key={token} style={{ display: "flex", gap: "8px", alignItems: "baseline" }}>
                  <code
                    style={{
                      fontSize: "11px",
                      background: "rgba(46,196,182,0.1)",
                      color: "#2EC4B6",
                      padding: "1px 5px",
                      borderRadius: "4px",
                      fontFamily: "monospace",
                      flexShrink: 0,
                    }}
                  >
                    {token}
                  </code>
                  <span style={{ fontSize: "11px", color: "var(--color-muted-fg)" }}>{desc}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Save */}
          <button
            type="submit"
            disabled={isPending}
            style={{
              padding: "12px 24px",
              borderRadius: "9999px",
              border: "none",
              background: "linear-gradient(135deg, #2EC4B6, #44A8D8)",
              color: "#fff",
              fontSize: "14px",
              fontWeight: 700,
              cursor: isPending ? "not-allowed" : "pointer",
              opacity: isPending ? 0.7 : 1,
              transition: "opacity 120ms ease",
            }}
          >
            {isPending ? "Saving…" : "Save template"}
          </button>
        </form>

        {/* Send test */}
        <div
          style={{
            marginTop: "20px",
            padding: "16px",
            background: "var(--color-card)",
            border: "1px solid var(--color-border)",
            borderRadius: "10px",
          }}
        >
          <p style={{ margin: "0 0 10px", fontSize: "13px", fontWeight: 600, color: "var(--color-foreground)" }}>
            Send test email
          </p>
          <div style={{ display: "flex", gap: "8px" }}>
            <input
              type="email"
              placeholder="your@email.com"
              value={testEmail}
              onChange={(e) => setTestEmail(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSendTest()}
              style={{ ...inputStyle, flex: 1 }}
            />
            <button
              onClick={handleSendTest}
              disabled={sendingTest || !testEmail}
              style={{
                padding: "10px 16px",
                borderRadius: "8px",
                border: "1px solid var(--color-border)",
                background: "var(--color-card)",
                fontSize: "13px",
                fontWeight: 600,
                color: "var(--color-foreground)",
                cursor: sendingTest || !testEmail ? "not-allowed" : "pointer",
                opacity: sendingTest || !testEmail ? 0.5 : 1,
                whiteSpace: "nowrap",
              }}
            >
              {sendingTest ? "Sending…" : "Send →"}
            </button>
          </div>
          <p style={hintStyle}>Uses example values for all {{tokens}}.</p>
        </div>
      </div>

      {/* ── Right panel: live preview ────────────────────────────────── */}
      <div style={{ flex: 1, minWidth: 0, position: "sticky", top: "24px" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: "10px",
          }}
        >
          <p
            style={{
              margin: 0,
              fontSize: "12px",
              fontWeight: 700,
              color: "var(--color-muted-fg)",
              textTransform: "uppercase",
              letterSpacing: "0.06em",
            }}
          >
            Live preview
          </p>
          <span style={{ fontSize: "11px", color: "var(--color-muted-fg)" }}>
            Updates as you type
          </span>
        </div>
        <div
          style={{
            border: "1px solid var(--color-border)",
            borderRadius: "12px",
            overflow: "hidden",
            background: "#FAFAFA",
            boxShadow: "0 2px 12px rgba(0,0,0,0.05)",
          }}
        >
          {/* Fake browser chrome */}
          <div
            style={{
              background: "#F0F0F0",
              padding: "10px 14px",
              display: "flex",
              alignItems: "center",
              gap: "6px",
              borderBottom: "1px solid #DDD",
            }}
          >
            <div style={{ width: "10px", height: "10px", borderRadius: "50%", background: "#FF5F57" }} />
            <div style={{ width: "10px", height: "10px", borderRadius: "50%", background: "#FFBD2E" }} />
            <div style={{ width: "10px", height: "10px", borderRadius: "50%", background: "#28C840" }} />
          </div>
          <iframe
            srcDoc={preview}
            style={{
              width: "100%",
              height: "600px",
              border: "none",
              display: "block",
            }}
            title="Email preview"
          />
        </div>
      </div>

      <style>{`
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        input:focus, textarea:focus, select:focus {
          border-color: #2EC4B6 !important;
          box-shadow: 0 0 0 3px rgba(46,196,182,0.12) !important;
        }
      `}</style>
    </div>
  );
}
