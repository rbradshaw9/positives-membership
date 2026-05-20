"use client";

import { useCallback, useRef, useState } from "react";
import { useRouter } from "next/navigation";

/**
 * components/admin/BulkAudioUploader.tsx
 *
 * Drop zone for bulk audio uploads on the month admin page.
 * Files upload to S3 in parallel, then land on the next open day
 * in filename-alphabetical order. Calendar refreshes when all done.
 *
 * No decisions required — drop files, watch them land.
 */

type Props = {
  monthId: string;
  monthYear: string;
  openDaysRemaining: number;
};

type FileStatus =
  | { phase: "uploading"; progress: number }
  | { phase: "done"; date: string }
  | { phase: "error"; message: string };

type FileItem = {
  id: string; // filename used as stable key
  name: string;
  cleanTitle: string;
  size: number;
  file: File;
  status: FileStatus;
};

const ACCEPTED_TYPES = new Set([
  "audio/mpeg", "audio/mp3", "audio/mp4",
  "audio/m4a", "audio/x-m4a", "audio/wav",
  "audio/aac", "audio/ogg",
]);

/** "01-finding-your-center.mp3" → "Finding Your Center" */
function cleanTitle(filename: string): string {
  const base = filename.replace(/\.[^.]+$/, ""); // remove extension
  const stripped = base
    .replace(/^[\d\s._-]+/, "") // remove leading numbers/separators
    .replace(/[-_]/g, " ")       // dashes/underscores → spaces
    .replace(/\s+/g, " ")
    .trim();
  return stripped
    .split(" ")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ") || base;
}

function formatBytes(bytes: number) {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(iso: string) {
  const [, , d] = iso.split("-");
  return `Day ${parseInt(d, 10)}`;
}

async function getAudioDuration(file: File): Promise<number | null> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const audio = new Audio(url);
    audio.onloadedmetadata = () => {
      URL.revokeObjectURL(url);
      resolve(isFinite(audio.duration) ? Math.round(audio.duration) : null);
    };
    audio.onerror = () => { URL.revokeObjectURL(url); resolve(null); };
    setTimeout(() => resolve(null), 5000); // bail after 5s
  });
}

function uploadToS3(file: File, url: string, onProgress: (p: number) => void): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", url);
    xhr.setRequestHeader("Content-Type", file.type || "audio/mpeg");
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100));
    };
    xhr.onload = () => xhr.status < 300 ? resolve() : reject(new Error(`S3 error ${xhr.status}`));
    xhr.onerror = () => reject(new Error("Network error"));
    xhr.send(file);
  });
}

export function BulkAudioUploader({ monthId, monthYear, openDaysRemaining }: Props) {
  const router = useRouter();
  const [items, setItems] = useState<FileItem[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [allDone, setAllDone] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const activeUploads = useRef(0);

  function updateStatus(name: string, status: FileStatus) {
    setItems((prev) =>
      prev.map((item) => (item.name === name ? { ...item, status } : item))
    );
  }

  async function processFile(file: File, publishDate: string | null) {
    const name = file.name;

    if (!ACCEPTED_TYPES.has(file.type) && !name.match(/\.(mp3|m4a|aac|wav|ogg)$/i)) {
      updateStatus(name, { phase: "error", message: "Not a supported audio file" });
      return;
    }

    try {
      // 1. Get presigned S3 URL
      const urlRes = await fetch("/api/admin/audio/upload-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contentId: "bulk", // placeholder, not used for path
          filename: name,
          contentType: file.type || "audio/mpeg",
          publishDate,
        }),
      });
      if (!urlRes.ok) throw new Error("Could not get upload URL");
      const { uploadUrl, s3Key } = await urlRes.json() as { uploadUrl: string; s3Key: string };

      // 2. Read duration client-side while S3 upload starts
      const [, durationSeconds] = await Promise.all([
        uploadToS3(file, uploadUrl, (p) =>
          updateStatus(name, { phase: "uploading", progress: p })
        ),
        getAudioDuration(file),
      ]);

      // 3. Create content row on the next open day
      const createRes = await fetch("/api/admin/audio/create-for-date", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          monthId,
          monthYear,
          title: cleanTitle(name),
          s3Key,
          durationSeconds,
        }),
      });

      if (!createRes.ok) {
        const body = await createRes.json().catch(() => ({}));
        throw new Error((body as { error?: string }).error ?? "Failed to assign to day");
      }

      const { publishDate: assignedDate } = await createRes.json() as { publishDate: string };
      updateStatus(name, { phase: "done", date: assignedDate });

    } catch (err) {
      updateStatus(name, {
        phase: "error",
        message: err instanceof Error ? err.message : "Upload failed",
      });
    } finally {
      activeUploads.current -= 1;
      if (activeUploads.current === 0) {
        setAllDone(true);
        setTimeout(() => router.refresh(), 800);
      }
    }
  }

  function handleFiles(fileList: FileList) {
    // Sort alphabetically so 01-, 02- naming controls the sequence
    const sorted = Array.from(fileList)
      .filter((f) => ACCEPTED_TYPES.has(f.type) || f.name.match(/\.(mp3|m4a|aac|wav|ogg)$/i))
      .sort((a, b) => a.name.localeCompare(b.name));

    if (sorted.length === 0) return;

    setAllDone(false);
    const newItems: FileItem[] = sorted.map((f) => ({
      id: f.name,
      name: f.name,
      cleanTitle: cleanTitle(f.name),
      size: f.size,
      file: f,
      status: { phase: "uploading", progress: 0 },
    }));

    setItems(newItems);
    activeUploads.current = sorted.length;

    // Start all uploads in parallel
    sorted.forEach((f) => processFile(f, null));
  }

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleFiles(e.dataTransfer.files);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [monthId, monthYear]);

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const onDragLeave = useCallback(() => setIsDragging(false), []);

  const isUploading = items.length > 0 && !allDone;
  const doneCount = items.filter((i) => i.status.phase === "done").length;
  const errorCount = items.filter((i) => i.status.phase === "error").length;

  return (
    <div className="flex flex-col gap-3 mb-6">
      {/* Drop zone */}
      {items.length === 0 && (
        <div
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          onDrop={onDrop}
          onClick={() => fileInputRef.current?.click()}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === "Enter" && fileInputRef.current?.click()}
          className={`rounded-2xl border-2 border-dashed cursor-pointer transition-colors select-none
            flex flex-col items-center justify-center gap-2 py-8 px-6 text-center
            ${isDragging
              ? "border-primary bg-primary/5"
              : "border-border hover:border-primary/40 hover:bg-muted/20"
            }`}
        >
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"
            strokeLinejoin="round" className="text-muted-foreground" aria-hidden="true">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
            <polyline points="17 8 12 3 7 8"/>
            <line x1="12" y1="3" x2="12" y2="15"/>
          </svg>
          <div>
            <p className="text-sm font-semibold text-foreground">
              Drop audio files here
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              They'll fill the next {openDaysRemaining} open day{openDaysRemaining !== 1 ? "s" : ""} in order
            </p>
          </div>
          <p className="text-[11px] text-muted-foreground/60 mt-1">
            Name files 01-, 02-, 03- to control the sequence · MP3, M4A, WAV
          </p>
        </div>
      )}

      {/* Upload progress list */}
      {items.length > 0 && (
        <div className="rounded-2xl border border-border bg-card overflow-hidden">
          {/* Header */}
          <div className="px-4 py-3 border-b border-border flex items-center justify-between">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              {allDone
                ? errorCount > 0
                  ? `${doneCount} uploaded · ${errorCount} failed`
                  : `${doneCount} file${doneCount !== 1 ? "s" : ""} added to calendar`
                : `Uploading ${items.length} file${items.length !== 1 ? "s" : ""}…`}
            </p>
            {allDone && (
              <button
                type="button"
                onClick={() => setItems([])}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                Upload more
              </button>
            )}
          </div>

          {/* File rows */}
          <div className="divide-y divide-border/60">
            {items.map((item) => (
              <div key={item.id} className="flex items-center gap-3 px-4 py-3">
                {/* Status icon */}
                <div className="flex-shrink-0 w-6 flex items-center justify-center">
                  {item.status.phase === "uploading" ? (
                    <div className="w-4 h-4 rounded-full border-2 border-primary/30 border-t-primary animate-spin" />
                  ) : item.status.phase === "done" ? (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                      stroke="#16a34a" strokeWidth="2.5" strokeLinecap="round"
                      strokeLinejoin="round" aria-hidden="true">
                      <polyline points="20 6 9 17 4 12"/>
                    </svg>
                  ) : (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                      stroke="#dc2626" strokeWidth="2" strokeLinecap="round"
                      strokeLinejoin="round" aria-hidden="true">
                      <circle cx="12" cy="12" r="10"/>
                      <line x1="12" y1="8" x2="12" y2="12"/>
                      <line x1="12" y1="16" x2="12.01" y2="16"/>
                    </svg>
                  )}
                </div>

                {/* File info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-2">
                    <p className="text-sm font-medium text-foreground truncate">
                      {item.cleanTitle}
                    </p>
                    <span className="text-xs text-muted-foreground flex-shrink-0">
                      {formatBytes(item.size)}
                    </span>
                  </div>

                  {item.status.phase === "uploading" && (
                    <div className="mt-1.5 w-full bg-muted rounded-full h-1 overflow-hidden">
                      <div
                        className="h-1 rounded-full transition-all duration-200"
                        style={{
                          width: `${item.status.progress}%`,
                          background: "linear-gradient(90deg, #2EC4B6, #44A8D8)",
                        }}
                      />
                    </div>
                  )}

                  {item.status.phase === "done" && (
                    <p className="text-xs text-emerald-600 mt-0.5">
                      Added to {formatDate(item.status.date)} ·{" "}
                      <span className="font-mono text-[11px]">{item.status.date}</span>
                    </p>
                  )}

                  {item.status.phase === "error" && (
                    <p className="text-xs text-destructive mt-0.5">{item.status.message}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept=".mp3,.m4a,.aac,.wav,.ogg"
        multiple
        className="hidden"
        onChange={(e) => { if (e.target.files?.length) handleFiles(e.target.files); }}
      />
    </div>
  );
}
