"use client";

import { useCallback, useRef, useState } from "react";
import { useRouter } from "next/navigation";

/**
 * components/admin/BulkAudioUploader.tsx
 *
 * Two-step bulk audio flow on the month admin page:
 *
 *   1. Drop MP3s → they upload to S3 in the background and appear in a queue
 *   2. Drag to reorder, preview each, edit titles → "Add to calendar"
 *
 * Files land on open days in queue order. Filename order is the default
 * (alphabetical) but the admin can drag any row to any position.
 */

type Props = {
  monthId: string;
  monthYear: string;
  openDates: string[]; // sorted ISO dates of empty days
};

type UploadState =
  | { phase: "uploading"; progress: number }
  | { phase: "uploaded"; s3Key: string }
  | { phase: "error"; message: string };

type QueueItem = {
  id: string;
  file: File;
  title: string;
  size: number;
  durationSeconds: number | null;
  objectUrl: string;
  upload: UploadState;
};

type Stage = "empty" | "queue" | "assigning" | "done";

const ACCEPTED = new Set([
  "audio/mpeg", "audio/mp3", "audio/mp4",
  "audio/m4a", "audio/x-m4a", "audio/wav",
  "audio/aac", "audio/ogg",
]);

function isAudio(f: File): boolean {
  return ACCEPTED.has(f.type) || /\.(mp3|m4a|aac|wav|ogg)$/i.test(f.name);
}

function cleanTitle(filename: string): string {
  const base = filename.replace(/\.[^.]+$/, "");
  const stripped = base
    .replace(/^[\d\s._-]+/, "")
    .replace(/[-_]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return (
    stripped
      .split(" ")
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
      .join(" ") || base
  );
}

function formatBytes(b: number): string {
  return b < 1024 * 1024
    ? `${(b / 1024).toFixed(0)} KB`
    : `${(b / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDuration(s: number | null): string {
  if (!s) return "";
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${String(sec).padStart(2, "0")}`;
}

function formatDay(iso: string): string {
  const d = new Date(`${iso}T12:00:00`);
  return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}

function getAudioDuration(file: File): Promise<number | null> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const audio = new Audio(url);
    audio.onloadedmetadata = () => {
      URL.revokeObjectURL(url);
      resolve(isFinite(audio.duration) ? Math.round(audio.duration) : null);
    };
    audio.onerror = () => { URL.revokeObjectURL(url); resolve(null); };
    setTimeout(() => resolve(null), 5000);
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
    xhr.onload = () => (xhr.status < 300 ? resolve() : reject(new Error(`S3 error ${xhr.status}`)));
    xhr.onerror = () => reject(new Error("Network error"));
    xhr.send(file);
  });
}

export function BulkAudioUploader({ monthId, monthYear, openDates }: Props) {
  const router = useRouter();
  const [stage, setStage] = useState<Stage>("empty");
  const [items, setItems] = useState<QueueItem[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [overIndex, setOverIndex] = useState<number | null>(null);
  const [assignProgress, setAssignProgress] = useState(0);
  const [assignError, setAssignError] = useState<string | null>(null);
  const [lastSkippedCount, setLastSkippedCount] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  function patchItem(id: string, patch: Partial<QueueItem>) {
    setItems((prev) => prev.map((it) => (it.id === id ? { ...it, ...patch } : it)));
  }

  // ── Add files ───────────────────────────────────────────────────────────────
  function addFiles(fileList: FileList) {
    const files = Array.from(fileList);
    const audioFiles = files
      .filter(isAudio)
      .sort((a, b) => a.name.localeCompare(b.name));
    setLastSkippedCount(files.length - audioFiles.length);
    if (audioFiles.length === 0) return;

    const newItems: QueueItem[] = audioFiles.map((file, i) => ({
      id: `${Date.now()}-${i}-${file.name}`,
      file,
      title: cleanTitle(file.name),
      size: file.size,
      durationSeconds: null,
      objectUrl: URL.createObjectURL(file),
      upload: { phase: "uploading", progress: 0 },
    }));

    setItems((prev) => [...prev, ...newItems]);
    setStage("queue");

    // Kick off uploads + duration reads in parallel
    newItems.forEach((item) => {
      void startUpload(item);
    });
  }

  async function startUpload(item: QueueItem) {
    try {
      getAudioDuration(item.file).then((d) => patchItem(item.id, { durationSeconds: d }));

      const urlRes = await fetch("/api/admin/audio/upload-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contentId: "bulk",
          filename: item.file.name,
          contentType: item.file.type || "audio/mpeg",
        }),
      });
      if (!urlRes.ok) throw new Error("Couldn't start upload");
      const { uploadUrl, s3Key } = (await urlRes.json()) as { uploadUrl: string; s3Key: string };

      await uploadToS3(item.file, uploadUrl, (p) =>
        patchItem(item.id, { upload: { phase: "uploading", progress: p } })
      );

      patchItem(item.id, { upload: { phase: "uploaded", s3Key } });
    } catch (err) {
      patchItem(item.id, {
        upload: {
          phase: "error",
          message: err instanceof Error ? err.message : "Upload failed",
        },
      });
    }
  }

  // ── Reorder ─────────────────────────────────────────────────────────────────
  function handleDrop(targetIndex: number) {
    if (dragIndex === null || dragIndex === targetIndex) {
      setDragIndex(null);
      setOverIndex(null);
      return;
    }
    setItems((prev) => {
      const next = [...prev];
      const [moved] = next.splice(dragIndex, 1);
      next.splice(targetIndex, 0, moved);
      return next;
    });
    setDragIndex(null);
    setOverIndex(null);
  }

  function removeItem(id: string) {
    setItems((prev) => {
      const item = prev.find((i) => i.id === id);
      if (item) URL.revokeObjectURL(item.objectUrl);
      return prev.filter((i) => i.id !== id);
    });
    if (playingId === id) {
      audioRef.current?.pause();
      setPlayingId(null);
    }
  }

  // ── Audio preview ───────────────────────────────────────────────────────────
  function togglePlay(item: QueueItem) {
    if (playingId === item.id) {
      audioRef.current?.pause();
      setPlayingId(null);
      return;
    }
    if (audioRef.current) {
      audioRef.current.pause();
    }
    const audio = new Audio(item.objectUrl);
    audio.onended = () => setPlayingId(null);
    audioRef.current = audio;
    void audio.play();
    setPlayingId(item.id);
  }

  // ── Assign ──────────────────────────────────────────────────────────────────
  async function handleAssign() {
    const uploaded = items.filter(
      (i): i is QueueItem & { upload: { phase: "uploaded"; s3Key: string } } =>
        i.upload.phase === "uploaded"
    );
    if (uploaded.length === 0) return;

    setStage("assigning");
    setAssignError(null);
    setAssignProgress(0);

    for (let i = 0; i < uploaded.length; i++) {
      const item = uploaded[i];
      const targetDate = openDates[i]; // queue order → open days in order
      try {
        const res = await fetch("/api/admin/audio/create-for-date", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            monthId,
            monthYear,
            title: item.title.trim() || cleanTitle(item.file.name),
            s3Key: item.upload.s3Key,
            durationSeconds: item.durationSeconds,
            publishDate: targetDate,
          }),
        });
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error((body as { error?: string }).error ?? "Assignment failed");
        }
        setAssignProgress(Math.round(((i + 1) / uploaded.length) * 100));
      } catch (err) {
        setAssignError(
          `Stopped at "${item.title}": ${err instanceof Error ? err.message : "error"}. ` +
            `${i} file(s) were added.`
        );
        setStage("queue");
        return;
      }
    }

    setStage("done");
    items.forEach((i) => URL.revokeObjectURL(i.objectUrl));
    setTimeout(() => router.refresh(), 900);
  }

  // ── Drag handlers for drop zone ─────────────────────────────────────────────
  const onZoneDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);
  const onZoneDragLeave = useCallback(() => setIsDragging(false), []);
  const onZoneDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files?.length) addFiles(e.dataTransfer.files);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const uploadedCount = items.filter((i) => i.upload.phase === "uploaded").length;
  const uploadingCount = items.filter((i) => i.upload.phase === "uploading").length;
  const errorCount = items.filter((i) => i.upload.phase === "error").length;
  const canAssign = uploadingCount === 0 && uploadedCount > 0 && uploadedCount <= openDates.length;
  const overCapacity = uploadedCount > openDates.length;

  // ── Render: done ────────────────────────────────────────────────────────────
  if (stage === "done") {
    return (
      <div className="admin-upload-summary admin-upload-summary--success">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#16a34a"
          strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <polyline points="20 6 9 17 4 12" />
        </svg>
        <div>
          <p className="admin-upload-summary__title">
            {uploadedCount} audio file{uploadedCount !== 1 ? "s" : ""} added to the calendar.
          </p>
          <p className="admin-upload-summary__copy">
            They were assigned to the next open day{uploadedCount === 1 ? "" : "s"} in order. Refreshing...
          </p>
        </div>
      </div>
    );
  }

  // ── Render: empty drop zone ─────────────────────────────────────────────────
  if (stage === "empty") {
    return (
      <div className="mb-6">
        {lastSkippedCount > 0 ? (
          <div className="admin-upload-summary admin-upload-summary--warning">
            <p className="admin-upload-summary__title">
              {lastSkippedCount} file{lastSkippedCount === 1 ? "" : "s"} skipped.
            </p>
            <p className="admin-upload-summary__copy">
              Only MP3, M4A, AAC, WAV, and OGG audio files can be uploaded here.
            </p>
          </div>
        ) : null}
        <div
          onDragOver={onZoneDragOver}
          onDragLeave={onZoneDragLeave}
          onDrop={onZoneDrop}
          onClick={() => fileInputRef.current?.click()}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === "Enter" && fileInputRef.current?.click()}
          className={`rounded-2xl border-2 border-dashed cursor-pointer transition-colors select-none
            flex flex-col items-center justify-center gap-2 py-9 px-6 text-center
            ${isDragging ? "border-primary bg-primary/5" : "border-border hover:border-primary/40 hover:bg-muted/20"}`}
        >
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor"
            strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
            className="text-muted-foreground" aria-hidden="true">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="17 8 12 3 7 8" />
            <line x1="12" y1="3" x2="12" y2="15" />
          </svg>
          <p className="text-sm font-semibold text-foreground">Drop audio files here</p>
          <p className="text-xs text-muted-foreground">
            Upload as many as you like — you&apos;ll arrange the order next
          </p>
          <p className="text-[11px] text-muted-foreground/60 mt-1">MP3, M4A, WAV</p>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept=".mp3,.m4a,.aac,.wav,.ogg"
          multiple
          className="hidden"
          onChange={(e) => { if (e.target.files?.length) addFiles(e.target.files); }}
        />
      </div>
    );
  }

  // ── Render: queue (uploading + reorderable) ─────────────────────────────────
  return (
    <div className="mb-6 rounded-2xl border border-border bg-card overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-border flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-foreground">
            {items.length} file{items.length !== 1 ? "s" : ""} ready to arrange
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Drag the handle to reorder. The order here is the order they&apos;ll appear on the calendar.
          </p>
        </div>
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={stage === "assigning"}
          className="flex-shrink-0 text-xs font-medium text-primary hover:underline disabled:opacity-50"
        >
          + Add more
        </button>
      </div>

      {/* Rows */}
      <ul className="divide-y divide-border/60">
        {items.map((item, index) => {
          const targetDate =
            item.upload.phase === "uploaded" && index < openDates.length
              ? openDates[index]
              : null;
          const isOver = overIndex === index && dragIndex !== null && dragIndex !== index;

          return (
            <li
              key={item.id}
              draggable={stage !== "assigning"}
              onDragStart={() => setDragIndex(index)}
              onDragEnter={() => setOverIndex(index)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => handleDrop(index)}
              onDragEnd={() => { setDragIndex(null); setOverIndex(null); }}
              className={`flex items-center gap-3 px-4 py-3 bg-card transition-colors
                ${isOver ? "border-t-2 border-t-primary" : ""}
                ${dragIndex === index ? "opacity-40" : ""}`}
            >
              {/* Drag handle */}
              <div
                className="flex-shrink-0 cursor-grab active:cursor-grabbing text-muted-foreground/50 hover:text-muted-foreground"
                aria-label="Drag to reorder"
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
                  <circle cx="5" cy="3" r="1.4" /><circle cx="11" cy="3" r="1.4" />
                  <circle cx="5" cy="8" r="1.4" /><circle cx="11" cy="8" r="1.4" />
                  <circle cx="5" cy="13" r="1.4" /><circle cx="11" cy="13" r="1.4" />
                </svg>
              </div>

              {/* Position number */}
              <div className="flex-shrink-0 w-6 h-6 rounded-full bg-muted flex items-center justify-center text-xs font-semibold text-muted-foreground">
                {index + 1}
              </div>

              {/* Play button */}
              <button
                type="button"
                onClick={() => togglePlay(item)}
                className="flex-shrink-0 w-8 h-8 rounded-full border border-border flex items-center justify-center text-foreground hover:bg-muted transition-colors"
                aria-label={playingId === item.id ? "Pause" : "Play preview"}
              >
                {playingId === item.id ? (
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor" aria-hidden="true">
                    <rect x="2" y="1.5" width="3" height="9" rx="0.5" />
                    <rect x="7" y="1.5" width="3" height="9" rx="0.5" />
                  </svg>
                ) : (
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor" aria-hidden="true">
                    <path d="M3 1.8v8.4a.6.6 0 0 0 .92.5l6.5-4.2a.6.6 0 0 0 0-1L3.92 1.3A.6.6 0 0 0 3 1.8Z" />
                  </svg>
                )}
              </button>

              {/* Title (editable) + meta */}
              <div className="flex-1 min-w-0">
                <input
                  type="text"
                  value={item.title}
                  onChange={(e) => patchItem(item.id, { title: e.target.value })}
                  disabled={stage === "assigning"}
                  className="w-full bg-transparent text-sm font-medium text-foreground border-0 border-b border-transparent hover:border-border focus:border-primary focus:outline-none px-0 py-0.5 transition-colors"
                  aria-label="Episode title"
                />
                <div className="flex items-center gap-2 mt-0.5 text-xs text-muted-foreground">
                  {item.upload.phase === "uploading" && (
                    <span className="text-primary">Uploading {item.upload.progress}%</span>
                  )}
                  {item.upload.phase === "uploaded" && targetDate && (
                    <span className="text-emerald-600 font-medium">→ {formatDay(targetDate)}</span>
                  )}
                  {item.upload.phase === "uploaded" && !targetDate && (
                    <span className="text-amber-600">No open day</span>
                  )}
                  {item.upload.phase === "error" && (
                    <span className="text-destructive">{item.upload.message}</span>
                  )}
                  <span>·</span>
                  <span>{formatBytes(item.size)}</span>
                  {item.durationSeconds != null && (
                    <>
                      <span>·</span>
                      <span>{formatDuration(item.durationSeconds)}</span>
                    </>
                  )}
                </div>
                {item.upload.phase === "uploading" && (
                  <div className="mt-1.5 w-full bg-muted rounded-full h-1 overflow-hidden">
                    <div
                      className="h-1 rounded-full transition-all duration-200"
                      style={{
                        width: `${item.upload.progress}%`,
                        background: "linear-gradient(90deg, #2EC4B6, #44A8D8)",
                      }}
                    />
                  </div>
                )}
              </div>

              {/* Remove */}
              <button
                type="button"
                onClick={() => removeItem(item.id)}
                disabled={stage === "assigning"}
                className="flex-shrink-0 text-muted-foreground/50 hover:text-destructive transition-colors disabled:opacity-30"
                aria-label="Remove file"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                  strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </li>
          );
        })}
      </ul>

      {/* Footer / assign */}
      <div className="px-4 py-3 border-t border-border flex flex-col gap-2">
        <div className="admin-upload-summary admin-upload-summary--compact">
          <p className="admin-upload-summary__title">
            Upload summary: {uploadedCount} ready, {uploadingCount} uploading, {errorCount} failed.
          </p>
          <p className="admin-upload-summary__copy">
            {openDates.length} open day{openDates.length === 1 ? "" : "s"} available this month.
          </p>
        </div>
        {assignError && (
          <div className="admin-upload-summary admin-upload-summary--error">
            <p className="admin-upload-summary__title">Import stopped</p>
            <p className="admin-upload-summary__copy">{assignError}</p>
          </div>
        )}
        {overCapacity && (
          <p className="text-xs text-amber-600">
            Only {openDates.length} open day{openDates.length !== 1 ? "s" : ""} left this month —
            remove {uploadedCount - openDates.length} file(s) or they won&apos;t fit.
          </p>
        )}
        {errorCount > 0 && (
          <p className="text-xs text-destructive">
            {errorCount} file(s) failed to upload — remove them before continuing.
          </p>
        )}

        {stage === "assigning" ? (
          <div className="flex items-center gap-3">
            <div className="flex-1 bg-muted rounded-full h-2 overflow-hidden">
              <div
                className="h-2 rounded-full transition-all"
                style={{
                  width: `${assignProgress}%`,
                  background: "linear-gradient(90deg, #2EC4B6, #44A8D8)",
                }}
              />
            </div>
            <span className="text-xs text-muted-foreground">Adding… {assignProgress}%</span>
          </div>
        ) : (
          <button
            type="button"
            onClick={handleAssign}
            disabled={!canAssign || errorCount > 0}
            className="w-full py-2.5 rounded-full text-sm font-semibold text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            style={{
              background:
                canAssign && errorCount === 0
                  ? "linear-gradient(135deg, #2F6FED 0%, #245DD0 100%)"
                  : "#9AA0A8",
            }}
          >
            {uploadingCount > 0
              ? `Uploading… ${uploadedCount} of ${items.length} ready`
              : `Add ${uploadedCount} file${uploadedCount !== 1 ? "s" : ""} to calendar`}
          </button>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept=".mp3,.m4a,.aac,.wav,.ogg"
        multiple
        className="hidden"
        onChange={(e) => { if (e.target.files?.length) addFiles(e.target.files); }}
      />
    </div>
  );
}
