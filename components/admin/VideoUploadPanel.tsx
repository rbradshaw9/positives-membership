"use client";

import { useCallback, useRef, useState } from "react";
import * as tus from "tus-js-client";

/**
 * components/admin/VideoUploadPanel.tsx
 *
 * Self-contained video management panel for admin content edit pages.
 * Uploads directly to Vimeo via TUS resumable upload protocol.
 *
 * States:
 *   idle       → shows Upload button (or Replace / Remove if video exists)
 *   uploading  → drag-drop zone + progress bar
 *   processing → Vimeo is transcoding
 *   ready      → success, shows Vimeo ID (page reloads)
 *   error      → error message with retry
 *
 * Workflow:
 *   1. User selects/drops a file
 *   2. POST /api/admin/video/vimeo-upload → get TUS upload link + videoId
 *   3. tus-js-client streams file to Vimeo
 *   4. Poll /api/admin/video/vimeo-status until status === "available"
 *   5. PATCH DB to save vimeo_video_id
 *   6. Reload page to reflect new state
 */

type Props = {
  contentId: string;
  currentVimeoId: string | null;
  contentTitle: string;
  contentType: string;
};

type Phase =
  | "idle"
  | "confirming_replace"
  | "confirming_remove"
  | "uploading"
  | "processing"
  | "done"
  | "error";

export function VideoUploadPanel({
  contentId,
  currentVimeoId,
  contentTitle,
  contentType,
}: Props) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [progress, setProgress] = useState(0);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [newVideoId, setNewVideoId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const uploadRef = useRef<tus.Upload | null>(null);

  const hasVideo = !!currentVimeoId;

  const typeLabel: Record<string, string> = {
    monthly_theme: "Monthly",
    weekly_principle: "Weekly",
    coaching_call: "Coaching",
    workshop: "Workshop",
    library: "Library",
  };
  const typePrefix = typeLabel[contentType] ?? contentType;

  // ── Upload flow ─────────────────────────────────────────────────────────

  async function handleFile(file: File) {
    if (!file.type.startsWith("video/")) {
      setErrorMsg("Please select a video file.");
      setPhase("error");
      return;
    }

    setPhase("uploading");
    setProgress(0);
    setErrorMsg(null);

    try {
      // Step 1: create Vimeo upload ticket
      const uploadRes = await fetch("/api/admin/video/vimeo-upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: `${typePrefix} | ${contentTitle}`,
          size: file.size,
          description: `Uploaded from Positives admin — Content ID: ${contentId}`,
        }),
      });

      if (!uploadRes.ok) {
        const body = await uploadRes.json().catch(() => ({}));
        throw new Error(body.error ?? "Failed to create Vimeo upload");
      }

      const { uploadLink, videoId } = await uploadRes.json();

      // Step 2: stream file to Vimeo via TUS
      await new Promise<void>((resolve, reject) => {
        const upload = new tus.Upload(file, {
          uploadUrl: uploadLink,
          chunkSize: 5 * 1024 * 1024, // 5 MB
          retryDelays: [0, 3000, 5000, 10000, 20000],
          onProgress(bytesUploaded, bytesTotal) {
            setProgress(Math.round((bytesUploaded / bytesTotal) * 100));
          },
          onSuccess() {
            resolve();
          },
          onError(error) {
            reject(error);
          },
        });
        uploadRef.current = upload;
        upload.start();
      });

      // Step 3: poll until Vimeo finishes transcoding
      setPhase("processing");
      await pollUntilAvailable(videoId);

      // Step 4: save videoId to DB
      const commitRes = await fetch("/api/admin/content/save-video", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contentId, vimeoVideoId: videoId }),
      });

      if (!commitRes.ok) {
        throw new Error("Failed to save video ID to database");
      }

      setNewVideoId(videoId);
      setPhase("done");
      setTimeout(() => window.location.reload(), 1500);

    } catch (err) {
      console.error("[VideoUploadPanel] Upload error:", err);
      setErrorMsg(err instanceof Error ? err.message : "Upload failed");
      setPhase("error");
    }
  }

  async function pollUntilAvailable(videoId: string) {
    const MAX_ATTEMPTS = 72; // 6 min max (5s intervals)
    const INTERVAL_MS = 5000;

    for (let i = 0; i < MAX_ATTEMPTS; i++) {
      await sleep(INTERVAL_MS);
      const res = await fetch(`/api/admin/video/vimeo-status?videoId=${videoId}`);
      const data = await res.json();

      if (data.status === "error") {
        throw new Error("Vimeo processing failed. Check your Vimeo dashboard.");
      }
      if (data.status === "available") return;
    }

    throw new Error("Processing timed out. Check your Vimeo dashboard.");
  }

  // ── Remove flow ──────────────────────────────────────────────────────────

  async function handleRemove() {
    setPhase("uploading"); // reuse loading state
    setErrorMsg(null);

    try {
      const res = await fetch("/api/admin/content/save-video", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contentId, vimeoVideoId: null }),
      });

      if (!res.ok) throw new Error("Remove failed");

      setPhase("done");
      setTimeout(() => window.location.reload(), 800);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Remove failed");
      setPhase("error");
    }
  }

  // ── Drag-and-drop ─────────────────────────────────────────────────────────

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const onDragLeave = useCallback(() => {
    setIsDragging(false);
  }, []);

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [contentId]
  );

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="border-t border-border pt-4 flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          Video
        </p>
        {currentVimeoId && phase === "idle" && (
          <span className="text-xs text-emerald-600 font-medium flex items-center gap-1">
            <span aria-hidden="true">✓</span> Vimeo
          </span>
        )}
      </div>

      {/* ── Idle ──────────────────────────────────────────────────────────── */}
      {phase === "idle" && (
        <div className="flex flex-col gap-3">
          {currentVimeoId ? (
            <div className="bg-muted/40 border border-border rounded-lg p-3 flex flex-col gap-0.5">
              <p className="text-xs text-muted-foreground">Vimeo Video ID</p>
              <p className="text-xs font-mono text-foreground break-all">{currentVimeoId}</p>
              <a
                href={`https://vimeo.com/${currentVimeoId}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-accent hover:underline mt-0.5"
              >
                View on Vimeo ↗
              </a>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No video attached. Upload one below.</p>
          )}

          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => {
                if (hasVideo) {
                  setPhase("confirming_replace");
                } else {
                  fileInputRef.current?.click();
                }
              }}
              className="px-3 py-2 rounded bg-primary text-primary-foreground text-xs font-medium hover:bg-primary-hover transition-colors"
            >
              {hasVideo ? "Replace video" : "Upload video"}
            </button>

            {hasVideo && (
              <button
                type="button"
                onClick={() => setPhase("confirming_remove")}
                className="px-3 py-2 rounded border border-destructive/40 text-destructive text-xs font-medium hover:bg-destructive/10 transition-colors"
              >
                Remove video
              </button>
            )}
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="video/*"
            className="hidden"
            onChange={onFileChange}
          />
        </div>
      )}

      {/* ── Confirm replace ───────────────────────────────────────────────── */}
      {phase === "confirming_replace" && (
        <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-4 flex flex-col gap-3">
          <p className="text-sm text-amber-800 font-medium">Replace video?</p>
          <p className="text-xs text-amber-700">
            The current video will be replaced with your new upload after Vimeo finishes processing.
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="px-3 py-2 rounded bg-amber-600 text-white text-xs font-medium hover:bg-amber-700 transition-colors"
            >
              Choose replacement file
            </button>
            <button
              type="button"
              onClick={() => setPhase("idle")}
              className="px-3 py-2 rounded border border-border text-muted-foreground text-xs font-medium hover:text-foreground transition-colors"
            >
              Cancel
            </button>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="video/*"
            className="hidden"
            onChange={onFileChange}
          />
        </div>
      )}

      {/* ── Confirm remove ────────────────────────────────────────────────── */}
      {phase === "confirming_remove" && (
        <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4 flex flex-col gap-3">
          <p className="text-sm text-destructive font-medium">Remove video?</p>
          <p className="text-xs text-destructive/80">
            This will detach the Vimeo video from this content record. The video won&apos;t be deleted from Vimeo.
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleRemove}
              className="px-3 py-2 rounded bg-destructive text-white text-xs font-medium hover:opacity-90 transition-opacity"
            >
              Yes, remove
            </button>
            <button
              type="button"
              onClick={() => setPhase("idle")}
              className="px-3 py-2 rounded border border-border text-muted-foreground text-xs font-medium hover:text-foreground transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* ── Uploading ─────────────────────────────────────────────────────── */}
      {phase === "uploading" && (
        <div className="flex flex-col gap-3">
          <div
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            onDrop={onDrop}
            className={`border-2 border-dashed rounded-lg p-8 flex flex-col items-center gap-2 transition-colors duration-200 ${
              isDragging ? "border-primary bg-primary/5" : "border-border bg-muted/20"
            }`}
          >
            <svg
              width="24" height="24" viewBox="0 0 24 24"
              fill="none" stroke="currentColor" strokeWidth="1.5"
              className="text-muted-foreground" aria-hidden="true"
            >
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
            <p className="text-sm text-muted-foreground">
              {progress > 0 ? `Uploading to Vimeo… ${progress}%` : "Uploading…"}
            </p>
          </div>
          {progress > 0 && (
            <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
              <div
                className="h-1.5 bg-primary rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          )}
        </div>
      )}

      {/* ── Processing ────────────────────────────────────────────────────── */}
      {phase === "processing" && (
        <div className="flex items-center gap-3 p-4 bg-muted/30 border border-border rounded-lg">
          <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin flex-shrink-0" />
          <div>
            <p className="text-sm font-medium text-foreground">Processing…</p>
            <p className="text-xs text-muted-foreground">
              Vimeo is encoding your video. This usually takes 1–3 minutes.
            </p>
          </div>
        </div>
      )}

      {/* ── Done ──────────────────────────────────────────────────────────── */}
      {phase === "done" && (
        <div className="flex items-center gap-3 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
          <span className="text-emerald-600 text-lg" aria-hidden="true">✓</span>
          <div>
            <p className="text-sm font-medium text-emerald-700">Video ready</p>
            {newVideoId && (
              <p className="text-xs text-emerald-600 font-mono">ID: {newVideoId}</p>
            )}
            <p className="text-xs text-emerald-600">Refreshing…</p>
          </div>
        </div>
      )}

      {/* ── Error ─────────────────────────────────────────────────────────── */}
      {phase === "error" && (
        <div className="flex flex-col gap-2 p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
          <p className="text-sm text-destructive font-medium">
            {errorMsg ?? "Something went wrong"}
          </p>
          <button
            type="button"
            onClick={() => { setPhase("idle"); setErrorMsg(null); }}
            className="self-start text-xs text-destructive underline hover:no-underline"
          >
            Try again
          </button>
        </div>
      )}

      <p className="text-xs text-muted-foreground">
        Vimeo tag: <span className="font-mono">{typePrefix} | {contentTitle}</span>
      </p>
    </div>
  );
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
