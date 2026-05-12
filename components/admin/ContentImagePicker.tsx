"use client";

import { useRef, useState } from "react";
import { SafeImage } from "@/components/media/SafeImage";

type ContentImageAsset = {
  id: string;
  title: string | null;
  altText: string | null;
  originalFilename: string | null;
  contentType: string;
  sizeBytes: number;
  url: string;
  createdAt: string;
};

type ContentImagePickerProps = {
  defaultValue?: string | null;
  description?: string;
  label: string;
  name: string;
  placeholder?: string;
};

function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function ContentImagePicker({
  defaultValue,
  description,
  label,
  name,
  placeholder = "Upload or choose optional artwork.",
}: ContentImagePickerProps) {
  const [selectedUrl, setSelectedUrl] = useState(defaultValue ?? "");
  const [modalOpen, setModalOpen] = useState(false);
  const [tab, setTab] = useState<"library" | "upload">("library");
  const [assets, setAssets] = useState<ContentImageAsset[]>([]);
  const [libraryLoaded, setLibraryLoaded] = useState(false);
  const [libraryLoading, setLibraryLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const titleInputRef = useRef<HTMLInputElement>(null);
  const altInputRef = useRef<HTMLInputElement>(null);

  async function loadLibrary() {
    setLibraryLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/admin/media/content-images");
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error ?? "Image library could not be loaded.");
      setAssets(Array.isArray(payload.assets) ? payload.assets : []);
      setLibraryLoaded(true);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Image library could not be loaded.");
    } finally {
      setLibraryLoading(false);
    }
  }

  function openModal(nextTab: "library" | "upload") {
    setTab(nextTab);
    setError(null);
    setModalOpen(true);
    if (nextTab === "library" && !libraryLoaded) {
      void loadLibrary();
    }
  }

  function selectAsset(asset: ContentImageAsset) {
    setSelectedUrl(asset.url);
    setModalOpen(false);
  }

  async function uploadImage() {
    const file = fileInputRef.current?.files?.[0];
    if (!file) {
      setError("Choose an image to upload.");
      return;
    }

    setUploading(true);
    setError(null);
    const form = new FormData();
    form.set("file", file);
    form.set("title", titleInputRef.current?.value ?? "");
    form.set("alt_text", altInputRef.current?.value ?? "");

    try {
      const response = await fetch("/api/admin/media/content-images", {
        method: "POST",
        body: form,
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error ?? "Image could not be uploaded.");
      const asset = payload.asset as ContentImageAsset;
      setAssets((current) => [asset, ...current.filter((item) => item.id !== asset.id)]);
      setLibraryLoaded(true);
      setSelectedUrl(asset.url);
      setModalOpen(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
      if (titleInputRef.current) titleInputRef.current.value = "";
      if (altInputRef.current) altInputRef.current.value = "";
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Image could not be uploaded.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="grid gap-3">
      <input type="hidden" name={name} value={selectedUrl} readOnly />
      <div className="overflow-hidden rounded-xl border border-border bg-muted/20">
        {selectedUrl ? (
          <div className="relative aspect-video bg-muted">
            <SafeImage
              src={selectedUrl}
              alt=""
              fill
              sizes="(max-width: 768px) 100vw, 40vw"
              className="h-full w-full object-cover"
            />
          </div>
        ) : (
          <div className="grid aspect-video place-items-center bg-[linear-gradient(135deg,rgba(255,255,255,0.96),rgba(232,246,243,0.88))] p-5 text-center">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-primary">{label}</p>
              <p className="mt-2 text-sm text-muted-foreground">{placeholder}</p>
            </div>
          </div>
        )}
      </div>
      <div className="flex flex-col gap-2 sm:flex-row">
        <button type="button" className="admin-btn admin-btn--primary justify-center" onClick={() => openModal("upload")}>
          Upload image
        </button>
        <button type="button" className="admin-btn admin-btn--outline justify-center" onClick={() => openModal("library")}>
          Choose from library
        </button>
        {selectedUrl ? (
          <button type="button" className="admin-btn admin-btn--outline justify-center" onClick={() => setSelectedUrl("")}>
            Remove image
          </button>
        ) : null}
      </div>
      {description ? <p className="admin-hint">{description}</p> : null}

      {modalOpen ? (
        <div className="event-image-modal" role="dialog" aria-modal="true" aria-labelledby={`${name}-content-image-title`}>
          <div className="event-image-modal__panel">
            <div className="event-image-modal__header">
              <div>
                <h2 id={`${name}-content-image-title`} className="event-image-modal__title">
                  {label}
                </h2>
                <p className="event-image-modal__subtitle">
                  Upload a new S3 image or choose one from the content image library.
                </p>
              </div>
              <button type="button" className="admin-btn admin-btn--outline" onClick={() => setModalOpen(false)}>
                Close
              </button>
            </div>

            <div className="event-image-modal__tabs" role="tablist" aria-label="Image options">
              <button type="button" className={tab === "library" ? "is-active" : ""} onClick={() => setTab("library")}>
                Library
              </button>
              <button type="button" className={tab === "upload" ? "is-active" : ""} onClick={() => setTab("upload")}>
                Upload
              </button>
            </div>

            {error ? <div className="admin-banner admin-banner--error">{error}</div> : null}

            {tab === "library" ? (
              <div className="event-image-modal__body">
                <div className="event-image-modal__toolbar">
                  <p className="event-image-modal__subtitle">
                    {libraryLoading ? "Loading images..." : `${assets.length} image${assets.length === 1 ? "" : "s"} available`}
                  </p>
                  <button type="button" className="admin-btn admin-btn--outline" onClick={() => void loadLibrary()} disabled={libraryLoading}>
                    Refresh
                  </button>
                </div>
                {assets.length > 0 ? (
                  <div className="event-image-grid">
                    {assets.map((asset) => (
                      <button key={asset.id} type="button" className="event-image-card" onClick={() => selectAsset(asset)}>
                        <span className="event-image-card__thumb">
                          <SafeImage
                            src={asset.url}
                            alt=""
                            width={320}
                            height={240}
                            sizes="10rem"
                            className="h-full w-full object-cover"
                          />
                        </span>
                        <span className="event-image-card__title">{asset.title ?? asset.originalFilename ?? "Content image"}</span>
                        <span className="event-image-card__meta">{formatFileSize(asset.sizeBytes)}</span>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="event-image-modal__empty">
                    {libraryLoading ? "Loading images..." : "No content images are in the library yet."}
                  </div>
                )}
              </div>
            ) : (
              <div className="event-image-modal__body">
                <label className="admin-form-field">
                  <span className="admin-label">Image file</span>
                  <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="admin-input" />
                </label>
                <label className="admin-form-field">
                  <span className="admin-label">Title</span>
                  <input ref={titleInputRef} className="admin-input" placeholder="Optional display title" />
                </label>
                <label className="admin-form-field">
                  <span className="admin-label">Alt text</span>
                  <input ref={altInputRef} className="admin-input" placeholder="Optional accessibility description" />
                </label>
                <div className="event-image-modal__actions">
                  <button type="button" className="admin-btn admin-btn--outline" onClick={() => setModalOpen(false)}>
                    Cancel
                  </button>
                  <button type="button" className="admin-btn admin-btn--primary" onClick={() => void uploadImage()} disabled={uploading}>
                    {uploading ? "Uploading..." : "Upload and use image"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
