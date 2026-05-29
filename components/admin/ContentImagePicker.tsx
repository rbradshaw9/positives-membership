"use client";

import { useEffect, useRef, useState } from "react";
import { SafeImage } from "@/components/media/SafeImage";

type ContentImageAsset = {
  id: string;
  title: string | null;
  altText: string | null;
  originalFilename: string | null;
  contentType: string;
  sizeBytes: number;
  posterUrl?: string;
  thumbnailUrl?: string;
  url: string;
  createdAt: string;
};

type ContentImagePickerProps = {
  defaultValue?: string | null;
  description?: string;
  label: string;
  name: string;
  placeholder?: string;
  recommendation?: string;
  selectedVariant?: "poster" | "thumbnail" | "web";
};

const ACCEPTED_IMAGE_HELP = "Accepted: JPG, PNG, WebP, or GIF up to 8 MB.";
const CONTENT_IMAGE_LIBRARY_EVENT = "content-image-library-updated";

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
  recommendation,
  selectedVariant = "web",
}: ContentImagePickerProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [selectedUrl, setSelectedUrl] = useState(defaultValue ?? "");
  const [modalOpen, setModalOpen] = useState(false);
  const [tab, setTab] = useState<"generate" | "library" | "upload">("library");
  const [assets, setAssets] = useState<ContentImageAsset[]>([]);
  const [libraryLoading, setLibraryLoading] = useState(false);
  const [includeTitleText, setIncludeTitleText] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const generationPromptRef = useRef<HTMLTextAreaElement>(null);
  const imageTextRef = useRef<HTMLInputElement>(null);
  const titleInputRef = useRef<HTMLInputElement>(null);
  const altInputRef = useRef<HTMLInputElement>(null);

  function mergeAsset(asset: ContentImageAsset) {
    setAssets((current) => [asset, ...current.filter((item) => item.id !== asset.id)]);
  }

  useEffect(() => {
    function handleLibraryUpdate(event: Event) {
      const asset = (event as CustomEvent<ContentImageAsset>).detail;
      if (asset?.id) mergeAsset(asset);
    }

    window.addEventListener(CONTENT_IMAGE_LIBRARY_EVENT, handleLibraryUpdate);
    return () => window.removeEventListener(CONTENT_IMAGE_LIBRARY_EVENT, handleLibraryUpdate);
  }, []);

  function rememberAsset(asset: ContentImageAsset) {
    mergeAsset(asset);
    window.dispatchEvent(new CustomEvent(CONTENT_IMAGE_LIBRARY_EVENT, { detail: asset }));
  }

  async function loadLibrary() {
    setLibraryLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/admin/media/content-images", { cache: "no-store" });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error ?? "Image library could not be loaded.");
      setAssets(Array.isArray(payload.assets) ? payload.assets : []);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Image library could not be loaded.");
    } finally {
      setLibraryLoading(false);
    }
  }

  function openModal(nextTab: "generate" | "library" | "upload") {
    setTab(nextTab);
    setError(null);
    setModalOpen(true);
    if (nextTab === "library") {
      void loadLibrary();
    }
  }

  function switchTab(nextTab: "generate" | "library" | "upload") {
    setTab(nextTab);
    if (nextTab === "library" && !libraryLoading) {
      void loadLibrary();
    }
  }

  function selectionUrl(asset: ContentImageAsset) {
    if (selectedVariant === "poster") return asset.posterUrl ?? asset.url;
    if (selectedVariant === "thumbnail") return asset.thumbnailUrl ?? asset.url;
    return asset.url;
  }

  function generationContext() {
    const form = rootRef.current?.closest("form");
    const data = form ? new FormData(form) : null;

    return {
      body: data?.get("body")?.toString() ?? "",
      description: data?.get("description")?.toString() ?? "",
      excerpt: data?.get("excerpt")?.toString() ?? "",
      fieldLabel: label,
      overlayText: imageTextRef.current?.value ?? "",
      prompt: generationPromptRef.current?.value ?? "",
      reflectionPrompt: data?.get("reflection_prompt")?.toString() ?? "",
      target: selectedVariant === "poster" ? "poster" : selectedVariant === "thumbnail" ? "thumbnail" : "featured",
      textTreatment: includeTitleText ? "title-card" : "none",
      title: data?.get("title")?.toString() ?? "",
    };
  }

  function selectAsset(asset: ContentImageAsset) {
    setSelectedUrl(selectionUrl(asset));
    setModalOpen(false);
  }

  async function generateImage() {
    setGenerating(true);
    setError(null);

    try {
      const response = await fetch("/api/admin/media/content-images/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(generationContext()),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error ?? "Image could not be generated.");
      const asset = payload.asset as ContentImageAsset;
      rememberAsset(asset);
      setSelectedUrl(selectionUrl(asset));
      setModalOpen(false);
      if (generationPromptRef.current) generationPromptRef.current.value = "";
      if (imageTextRef.current) imageTextRef.current.value = "";
    } catch (generateError) {
      setError(generateError instanceof Error ? generateError.message : "Image could not be generated.");
    } finally {
      setGenerating(false);
    }
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
      rememberAsset(asset);
      setSelectedUrl(selectionUrl(asset));
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
    <div ref={rootRef} className="grid gap-3">
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
        <button type="button" className="admin-btn admin-btn--outline justify-center" onClick={() => openModal("generate")}>
          Generate image
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
      {recommendation ? <p className="admin-hint">{recommendation}</p> : null}
      <p className="admin-hint">{ACCEPTED_IMAGE_HELP}</p>

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
                {recommendation ? (
                  <p className="event-image-modal__subtitle">
                    {recommendation} {ACCEPTED_IMAGE_HELP}
                  </p>
                ) : (
                  <p className="event-image-modal__subtitle">{ACCEPTED_IMAGE_HELP}</p>
                )}
              </div>
              <button type="button" className="admin-btn admin-btn--outline" onClick={() => setModalOpen(false)}>
                Close
              </button>
            </div>

            <div className="event-image-modal__tabs" role="tablist" aria-label="Image options">
              <button type="button" className={tab === "generate" ? "is-active" : ""} onClick={() => switchTab("generate")}>
                Generate
              </button>
              <button type="button" className={tab === "library" ? "is-active" : ""} onClick={() => switchTab("library")}>
                Library
              </button>
              <button type="button" className={tab === "upload" ? "is-active" : ""} onClick={() => switchTab("upload")}>
                Upload
              </button>
            </div>

            {error ? <div className="admin-banner admin-banner--error">{error}</div> : null}

            {tab === "generate" ? (
              <div className="event-image-modal__body">
                <label className="admin-form-field">
                  <span className="admin-label">Creative direction</span>
                  <textarea
                    ref={generationPromptRef}
                    className="admin-textarea admin-textarea--no-resize"
                    rows={4}
                    placeholder="Optional: describe mood, subject, symbolism, or what to avoid."
                  />
                </label>
                <p className="admin-hint">
                  Uses the current title, excerpt, and description from this form, then saves the result to the image library.
                </p>
                <label className="flex items-start gap-3 rounded-lg border border-border bg-muted/20 p-3">
                  <input
                    type="checkbox"
                    checked={includeTitleText}
                    onChange={(event) => setIncludeTitleText(event.currentTarget.checked)}
                    className="mt-1 h-4 w-4"
                  />
                  <span className="grid gap-1">
                    <span className="admin-label">Add YouTube-style title text</span>
                    <span className="admin-hint">
                      Generates the background with space for typography, then adds exact text on top for a polished poster.
                    </span>
                  </span>
                </label>
                {includeTitleText ? (
                  <label className="admin-form-field">
                    <span className="admin-label">Text on image</span>
                    <input
                      ref={imageTextRef}
                      className="admin-input"
                      placeholder="Leave blank to use the content title"
                    />
                  </label>
                ) : null}
                <div className="event-image-modal__actions">
                  <button type="button" className="admin-btn admin-btn--outline" onClick={() => setModalOpen(false)}>
                    Cancel
                  </button>
                  <button type="button" className="admin-btn admin-btn--primary" onClick={() => void generateImage()} disabled={generating}>
                    {generating ? "Generating..." : "Generate and use image"}
                  </button>
                </div>
              </div>
            ) : tab === "library" ? (
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
                            src={asset.thumbnailUrl ?? asset.url}
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
