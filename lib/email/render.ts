/**
 * lib/email/render.ts
 *
 * Renders a branded email from a structured EmailTemplate DB row.
 * Used by cron jobs instead of the hardcoded TypeScript template files.
 *
 * Variable tokens (case-sensitive) replaced at send time:
 *   {{firstName}}     — member's first name
 *   {{dashboardUrl}}  — https://positives.life/today
 *   {{amountDue}}     — pre-formatted amount e.g. "$37.00"
 *   {{nextRetryDate}} — human date e.g. "April 15, 2026"
 *   {{billingUrl}}    — signed billing portal URL
 *   {{rejoindUrl}}    — rejoin / sales page URL
 */

import { B, emailWrapper, emailHeader, memberEmailFooter, ctaButton } from "./brand";

export type TemplateVars = {
  firstName?: string;
  dashboardUrl?: string;
  amountDue?: string;
  nextRetryDate?: string;
  billingUrl?: string;
  rejoindUrl?: string;
  unsubscribeUrl?: string;
};

/** Replace all known {{token}} placeholders in a string. */
function interpolate(str: string, vars: TemplateVars): string {
  return str
    .replaceAll("{{firstName}}", vars.firstName ?? "there")
    .replaceAll("{{dashboardUrl}}", vars.dashboardUrl ?? "https://positives.life/today")
    .replaceAll("{{amountDue}}", vars.amountDue ?? "your membership fee")
    .replaceAll("{{nextRetryDate}}", vars.nextRetryDate ?? "")
    .replaceAll("{{billingUrl}}", vars.billingUrl ?? "https://positives.life/account/billing")
    .replaceAll("{{rejoindUrl}}", vars.rejoindUrl ?? "https://positives.life/join")
    .replaceAll("{{unsubscribeUrl}}", vars.unsubscribeUrl ?? "https://positives.life/support");
}

/** Convert body text (paragraph-separated by blank lines) to HTML <p> tags. */
function bodyToHtml(body: string, vars: TemplateVars): string {
  return interpolate(body, vars)
    .split(/\n\n+/)
    .map((para) => {
      const trimmed = para.trim();
      if (!trimmed) return "";
      return `<p style="margin:0 0 16px;font-family:${B.fontBody};font-size:15px;color:${B.mutedFg};line-height:1.65;">${trimmed.replace(/\n/g, "<br />")}</p>`;
    })
    .filter(Boolean)
    .join("\n");
}

export type EmailTemplateRow = {
  subject: string;
  heading: string;
  body: string;
  cta_label: string | null;
  cta_url: string | null;
};

/** Render a complete branded HTML email from a DB template row + runtime vars. */
export function renderTemplateHtml(template: EmailTemplateRow, vars: TemplateVars): string {
  const heading = interpolate(template.heading, vars);
  const bodyHtml = bodyToHtml(template.body, vars);
  const ctaUrl = template.cta_url ? interpolate(template.cta_url, vars) : null;

  const content = `
    ${emailHeader()}

    <tr>
      <td style="background:${B.card};padding:36px 40px 32px;">
        <h1 style="margin:0 0 20px;font-family:${B.fontHeading};font-size:24px;font-weight:700;color:${B.foreground};line-height:1.25;letter-spacing:-0.02em;">
          ${heading}
        </h1>
        ${bodyHtml}
        ${template.cta_label && ctaUrl ? `<div style="margin-top:28px;">${ctaButton(template.cta_label, ctaUrl)}</div>` : ""}
      </td>
    </tr>

    ${memberEmailFooter("https://positives.life/account", vars.unsubscribeUrl)}`;

  return emailWrapper(content);
}

/** Render plain-text version from a DB template row + runtime vars. */
export function renderTemplateText(template: EmailTemplateRow, vars: TemplateVars): string {
  const heading = interpolate(template.heading, vars);
  const body = interpolate(template.body, vars);
  const ctaUrl = template.cta_url ? interpolate(template.cta_url, vars) : null;
  const ctaLine =
    template.cta_label && ctaUrl ? `\n${template.cta_label}:\n${ctaUrl}\n` : "";

  return `${heading}\n\n${body}${ctaLine}\n\n— The Positives Team\npositives.life`;
}
