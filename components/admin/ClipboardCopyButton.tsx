"use client";

import { useEffect, useState } from "react";

type ClipboardCopyButtonProps = {
  text: string;
  label?: string;
  copiedLabel?: string;
  title?: string;
  className?: string;
};

export function ClipboardCopyButton({
  text,
  label = "Copy",
  copiedLabel = "Copied",
  title,
  className,
}: ClipboardCopyButtonProps) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const timeout = window.setTimeout(() => setCopied(false), 1600);
    return () => window.clearTimeout(timeout);
  }, [copied]);

  async function handleClick() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
    } catch (error) {
      console.error("[ClipboardCopyButton] copy failed", error);
      setCopied(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className={className}
      title={title ?? `${label} to clipboard`}
      aria-live="polite"
    >
      {copied ? copiedLabel : label}
    </button>
  );
}
