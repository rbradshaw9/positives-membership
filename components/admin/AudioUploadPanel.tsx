"use client";

import { useCallback, useRef, useState } from "react";

/**
 * components/admin/AudioUploadPanel.tsx
 *
 * Self-contained audio upload panel for admin content edit pages.
 * Uploads MP3/M4A directly to S3 via presigned URL (no server memory usage).
 *
 * States: idle → uploading (with progress) → done | error
 *
 * Workflow:
 *   1. Admin drops or selects an audio file
 *   2. POST /api/admin/audio/upload-url → get presigned S3 PUT URL + s3Key
 *   3. PUT file directly to S3 (XMLHttpRequest for progress tracking)
 *   4. POST /api/admin/audio/save-key → persists s3Key on the content row
 *   5. Page reloads to reflect new state
 */

type Props = {
  contentId: string;
  currentS3Key: string | null;
  currentCastosUrl: string | null;
  publishDate?: string | null; // YYYY-MM-DD — used to organise S3 keys
};

type Phase = "idle" | "uploading" | "done" | "error";

const ACCEPTED_TYPES = ".mp3,.m4a,.aac,.wav,.ogg";
const ACCEPTED_MIME = new Set([
  "audio/mpeg", "audio/mp3", "audio/mp4",
  "audio/m4a", "audio/x-m4a", "audio/wav",
  "audio/aac", "audio/ogg",
]);

export function AudioUploadPanel({
  contentId,
  currentS3Key,
  currentCastosUrl,
  publishDate,
}: Props) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [progress, setProgress] = useState(0);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadedKey, setUploadedKey] = useState<string | null>(null);
  const [confirmReplace, setConfirmReplace] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const hasAudio = !!(currentS3Key || currentCastosUrl);
  const audioLabel = currentS3Key
    ? currentS3Key.split("/").pop()
    : currentCastosUrl
      ? "Castos URL"
      : null;

  async function handleFile(file: File) {
    if (!ACCEPTED_MIME.has(file.type) && !file.name.match(/\.(mp3|m4a|aac|wav|ogg)$/i)) {
      setErrorMsg("Please select an audio file (MP3, M4A, AAC, or WAV).");
      setPhase("error");
      return;
    }

    setPhase("uploading");
    setProgress(0);
    setErrorMsg(null);
    setConfirmReplace(false);

    try {
      // Step 1: get presigned S3 upload URL
      const urlRes = await fetch("/api/admin/audio/upload-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contentId,
          filename: file.name,
          contentType: file.type || "audio/mpeg",
          publishDate: publishDate ?? undefined,
        }),
      });

      if (!urlRes.ok) {
        const body = await urlRes.json().catch(() => ({}));
        throw new Error((body as { error?: string }).error ?? "Failed to get upload URL");
      }

      const { uploadUrl, s3Key } = await urlRes.json() as { uploadUrl: string; s3Key: string };

      // Step 2: upload directly to S3 via XHR for progress tracking
      await uploadToS3(file, uploadUrl, (pct) => setProgress(pct));

      // Step 3: save key to content row
      const saveRes = await fetch("/api/admin/audio/save-key", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contentId, s3Key }),
      });

      if (!saveRes.ok) throw new Error("Upload succeeded but failed to save. Refresh and try again.");

      setUploadedKey(s3Key);
      setPhase("done");
      setTimeout(() => window.location.reload(), 1200);

    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Upload failed. Please try again.");
      setPhase("error");
    }
  }

  async function handleRemove() {
    setPhase("uploading");
    const res = await fetch("/api/admin/audio/save-key", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contentId, s3Key: null }),
    });
    if (!res.ok) { setErrorMsg("Remove failed."); setPhase("error"); return; }
    setPhase("done");
    setTimeout(() => window.location.reload(), 800);
  }

  const onDragOver = useCallback((e: React.DragEvent) => { e.preventDefault(); setIsDragging(true); }, []);
  const onDragLeave = useCallback(() => setIsDragging(false), []);
  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contentId, publishDate]);

  return (
    <div className="border-t border-border pt-4 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          Audio
        </p>
        {hasAudio && phase === "idle" && (
          <span className="text-xs text-emerald-600 font-medium flex items-center gap-1">
            <span aria-hidden="true">✓</span> Ready
          </span>
        )}
      </div>

      {/* Current state */}
      {phase === "idle" && (
        <>
          {hasAudio && (
            <div className="bg-muted/40 border border-border rounded-lg p-3 flex flex-col gap-1">
              <p className="text-[11px] text-muted-foreground uppercase tracking-wide font-semibold">
                {currentS3Key ? "S3 Audio" : "Castos URL"}
              </p>
              <p className="text-xs font-mono text-foreground break-all">{audioLabel}</p>
              {currentS3Key && (
                <audio
                  controls
                  className="w-full mt-2 h-8"
                  src={`https://${process.env.NEXT_PUBLIC_S3_BUCKET ?? ""}${process.env.NEXT_PUBLIC_S3_BUCKET ? ".s3." + process.env.NEXT_PUBLIC_AWS_REGION + ".amazonaws.com/" : ""}${currentS3Key}`}
                  preload="metadata"
                />
              )}
            </div>
          )}

          {!hasAudio && (
            <p className="text-sm text-muted-foreground">No audio attached. Upload an MP3 below.</p>
          )}

          <div
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            onDrop={onDrop}
            className={`border-2 border-dashed rounded-lg p-6 flex flex-col items-center gap-2 cursor-pointer transition-colors ${
              isDragging ? "border-primary bg-primary/5" : "border-border hover:border-primary/40"
            }`}
            onClick={() => !confirmReplace && fileInputRef.current?.click()}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === "Enter" && fileInputRef.current?.click()}
            aria-label="Upload audio file"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor"
              strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
              className="text-muted-foreground" aria-hidden="true">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="17 8 12 3 7 8"/>
              <line x1="12" y1="3" x2="12" y2="15"/>
            </svg>
            <p className="text-sm text-muted-foreground text-center">
              {hasAudio ? "Drop to replace audio" : "Drop MP3 here or click to browse"}
            </p>
            <p className="text-xs text-muted-foreground/60">MP3, M4A, AAC, WAV</p>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept={ACCEPTED_TYPES}
            className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
          />

          {hasAudio && currentS3Key && (
            <button type="button" onClick={handleRemove}
              className="self-start text-xs text-destructive hover:underline">
              Remove audio
            </button>
          )}
        </>
      )}

      {/* Uploading */}
      {phase === "uploading" && (
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">
              {progress < 100 ? `Uploading… ${progress}%` : "Saving…"}
            </span>
            <span className="text-xs text-muted-foreground">{progress}%</span>
          </div>
          <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
            <div
              className="h-2 rounded-full transition-all duration-200"
              style={{
                width: `${progress}%`,
                background: "linear-gradient(90deg, #2EC4B6, #44A8D8)",
              }}
            />
          </div>
        </div>
      )}

      {/* Done */}
      {phase === "done" && (
        <div className="flex items-center gap-3 p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
          <span className="text-emerald-600 text-base" aria-hidden="true">✓</span>
          <div>
            <p className="text-sm font-medium text-emerald-700">Audio uploaded</p>
            {uploadedKey && <p className="text-xs text-emerald-600 font-mono truncate">{uploadedKey.split("/").pop()}</p>}
            <p className="text-xs text-emerald-600">Refreshing page…</p>
          </div>
        </div>
      )}

      {/* Error */}
      {phase === "error" && (
        <div className="flex flex-col gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
          <p className="text-sm text-destructive">{errorMsg}</p>
          <button type="button" onClick={() => { setPhase("idle"); setErrorMsg(null); }}
            className="self-start text-xs text-destructive underline">
            Try again
          </button>
        </div>
      )}
    </div>
  );
}

// XHR upload for real progress tracking (fetch API doesn't support upload progress)
function uploadToS3(file: File, presignedUrl: string, onProgress: (pct: number) => void): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", presignedUrl);
    xhr.setRequestHeader("Content-Type", file.type || "audio/mpeg");
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100));
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) resolve();
      else reject(new Error(`S3 upload failed with status ${xhr.status}`));
    };
    xhr.onerror = () => reject(new Error("Network error during upload"));
    xhr.send(file);
  });
}
