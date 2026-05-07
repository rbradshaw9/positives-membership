"use client";

/* Protected media routes need same-origin browser requests, so native images are intentional here. */
/* eslint-disable @next/next/no-img-element */

import { Node, mergeAttributes } from "@tiptap/core";
import { Link as TiptapLink } from "@tiptap/extension-link";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { useEffect, useRef, useState } from "react";

type EventImageAsset = {
  id: string;
  title: string | null;
  altText: string | null;
  originalFilename: string | null;
  contentType: string;
  sizeBytes: number;
  url: string;
  createdAt: string;
};

const EventImage = Node.create({
  name: "eventImage",
  group: "block",
  atom: true,
  draggable: true,

  addAttributes() {
    return {
      src: { default: null },
      alt: { default: null },
      title: { default: null },
    };
  },

  parseHTML() {
    return [{ tag: "img[src]" }];
  },

  renderHTML({ HTMLAttributes }) {
    return ["img", mergeAttributes(HTMLAttributes, { loading: "lazy" })];
  },
});

function editorHtml(editor: NonNullable<ReturnType<typeof useEditor>>) {
  const html = editor.getHTML();
  return html === "<p></p>" ? "" : html;
}

function escapeAttribute(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function imageTag(asset: EventImageAsset) {
  const alt = escapeAttribute(asset.altText ?? asset.title ?? "");
  const title = asset.title ? ` title="${escapeAttribute(asset.title)}"` : "";
  return `<img src="${asset.url}" alt="${alt}"${title} loading="lazy">`;
}

function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function EventDetailsEditor({
  defaultValue = "",
  name = "body",
}: {
  defaultValue?: string | null;
  name?: string;
}) {
  const hiddenRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const titleInputRef = useRef<HTMLInputElement>(null);
  const altInputRef = useRef<HTMLInputElement>(null);
  const [mode, setMode] = useState<"visual" | "html">("visual");
  const [html, setHtml] = useState(defaultValue ?? "");
  const [imageModalOpen, setImageModalOpen] = useState(false);
  const [imageTab, setImageTab] = useState<"library" | "upload">("library");
  const [assets, setAssets] = useState<EventImageAsset[]>([]);
  const [libraryLoaded, setLibraryLoaded] = useState(false);
  const [libraryLoading, setLibraryLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [imageError, setImageError] = useState<string | null>(null);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        codeBlock: false,
        code: false,
        link: false,
      }),
      TiptapLink.configure({
        openOnClick: false,
        HTMLAttributes: { rel: "noopener noreferrer", target: "_blank" },
      }),
      EventImage,
    ],
    content: defaultValue ?? "",
    editorProps: {
      attributes: {
        "data-placeholder": "Add event details, images, links, or supporting notes.",
        class: "ProseMirror",
      },
    },
    onUpdate({ editor }) {
      const nextHtml = editorHtml(editor);
      setHtml(nextHtml);
      if (hiddenRef.current) hiddenRef.current.value = nextHtml;
    },
  });

  useEffect(() => {
    if (!hiddenRef.current) return;
    hiddenRef.current.value = defaultValue ?? "";
  }, [defaultValue]);

  function applyHtmlMode(nextMode: "visual" | "html") {
    if (!editor) return;
    if (nextMode === "visual") {
      editor.commands.setContent(html || "", { emitUpdate: false });
      const nextHtml = editorHtml(editor);
      setHtml(nextHtml);
      if (hiddenRef.current) hiddenRef.current.value = nextHtml;
    } else {
      const nextHtml = editorHtml(editor);
      setHtml(nextHtml);
      if (hiddenRef.current) hiddenRef.current.value = nextHtml;
    }
    setMode(nextMode);
  }

  function setLink() {
    if (!editor) return;
    const prev = editor.getAttributes("link").href ?? "";
    const url = window.prompt("Link URL", prev);
    if (url === null) return;
    if (!url) {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
  }

  async function loadImageLibrary() {
    setLibraryLoading(true);
    setImageError(null);

    try {
      const response = await fetch("/api/admin/media/event-images", {
        method: "GET",
        headers: { Accept: "application/json" },
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error ?? "Image library could not be loaded.");
      setAssets(Array.isArray(payload.assets) ? payload.assets : []);
      setLibraryLoaded(true);
    } catch (error) {
      setImageError(error instanceof Error ? error.message : "Image library could not be loaded.");
    } finally {
      setLibraryLoading(false);
    }
  }

  function openImageModal(tab: "library" | "upload" = "library") {
    setImageTab(tab);
    setImageModalOpen(true);
    if (!libraryLoaded && !libraryLoading) {
      void loadImageLibrary();
    }
  }

  function insertImage(asset: EventImageAsset) {
    if (!editor) return;

    if (mode === "html") {
      const nextHtml = [html, imageTag(asset)].filter(Boolean).join("\n");
      updateHtml(nextHtml);
    } else {
      editor
        .chain()
        .focus()
        .insertContent({
          type: "eventImage",
          attrs: {
            src: asset.url,
            alt: asset.altText ?? asset.title ?? "",
            title: asset.title ?? null,
          },
        })
        .run();
    }

    setImageModalOpen(false);
  }

  async function uploadImage() {
    const file = fileInputRef.current?.files?.[0];
    if (!file) {
      setImageError("Choose an image to upload.");
      return;
    }

    setUploading(true);
    setImageError(null);

    const form = new FormData();
    form.set("file", file);
    form.set("title", titleInputRef.current?.value ?? "");
    form.set("alt_text", altInputRef.current?.value ?? "");

    try {
      const response = await fetch("/api/admin/media/event-images", {
        method: "POST",
        body: form,
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error ?? "Image could not be uploaded.");

      const asset = payload.asset as EventImageAsset;
      setAssets((current) => [asset, ...current.filter((item) => item.id !== asset.id)]);
      setLibraryLoaded(true);
      insertImage(asset);
      if (fileInputRef.current) fileInputRef.current.value = "";
      if (titleInputRef.current) titleInputRef.current.value = "";
      if (altInputRef.current) altInputRef.current.value = "";
    } catch (error) {
      setImageError(error instanceof Error ? error.message : "Image could not be uploaded.");
    } finally {
      setUploading(false);
    }
  }

  function updateHtml(value: string) {
    setHtml(value);
    if (hiddenRef.current) hiddenRef.current.value = value;
  }

  if (!editor) {
    return <input type="hidden" name={name} defaultValue={defaultValue ?? ""} />;
  }

  return (
    <div className="tiptap-editor-wrapper">
      <div className="tiptap-toolbar" role="toolbar" aria-label="Event details formatting">
        <button type="button" onClick={() => applyHtmlMode("visual")} className={mode === "visual" ? "is-active" : ""}>
          Visual
        </button>
        <button type="button" onClick={() => applyHtmlMode("html")} className={mode === "html" ? "is-active" : ""}>
          HTML
        </button>
        <div className="divider" aria-hidden="true" />
        <button type="button" title="Paragraph" onClick={() => editor.chain().focus().setParagraph().run()} className={editor.isActive("paragraph") ? "is-active" : ""}>
          ¶
        </button>
        <button type="button" title="Heading 2" onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} className={editor.isActive("heading", { level: 2 }) ? "is-active" : ""}>
          H2
        </button>
        <button type="button" title="Heading 3" onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} className={editor.isActive("heading", { level: 3 }) ? "is-active" : ""}>
          H3
        </button>
        <div className="divider" aria-hidden="true" />
        <button type="button" title="Bold" onClick={() => editor.chain().focus().toggleBold().run()} className={editor.isActive("bold") ? "is-active" : ""} style={{ fontWeight: 700 }}>
          B
        </button>
        <button type="button" title="Italic" onClick={() => editor.chain().focus().toggleItalic().run()} className={editor.isActive("italic") ? "is-active" : ""} style={{ fontStyle: "italic" }}>
          I
        </button>
        <button type="button" title="Bullet list" onClick={() => editor.chain().focus().toggleBulletList().run()} className={editor.isActive("bulletList") ? "is-active" : ""}>
          •≡
        </button>
        <button type="button" title="Ordered list" onClick={() => editor.chain().focus().toggleOrderedList().run()} className={editor.isActive("orderedList") ? "is-active" : ""}>
          1≡
        </button>
        <button type="button" title="Blockquote" onClick={() => editor.chain().focus().toggleBlockquote().run()} className={editor.isActive("blockquote") ? "is-active" : ""}>
          ❝
        </button>
        <div className="divider" aria-hidden="true" />
        <button type="button" title="Link" onClick={setLink} className={editor.isActive("link") ? "is-active" : ""}>
          Link
        </button>
        <button type="button" title="Choose or upload image" onClick={() => openImageModal()} className="tiptap-toolbar__text-button">
          Images
        </button>
      </div>

      {mode === "visual" ? (
        <div className="tiptap-content">
          <EditorContent editor={editor} />
        </div>
      ) : (
        <textarea
          className="admin-textarea"
          value={html}
          onChange={(event) => updateHtml(event.target.value)}
          rows={12}
          aria-label="Event details HTML"
          placeholder="<p>Add custom event details here.</p>"
        />
      )}

      <input ref={hiddenRef} type="hidden" name={name} defaultValue={defaultValue ?? ""} />

      {imageModalOpen ? (
        <div className="event-image-modal" role="dialog" aria-modal="true" aria-labelledby="event-image-modal-title">
          <div className="event-image-modal__panel">
            <div className="event-image-modal__header">
              <div>
                <h2 id="event-image-modal-title" className="event-image-modal__title">
                  Event Images
                </h2>
                <p className="event-image-modal__subtitle">
                  Choose from the event image library or upload a new image.
                </p>
              </div>
              <button type="button" className="admin-btn admin-btn--outline" onClick={() => setImageModalOpen(false)}>
                Close
              </button>
            </div>

            <div className="event-image-modal__tabs" role="tablist" aria-label="Image options">
              <button type="button" className={imageTab === "library" ? "is-active" : ""} onClick={() => setImageTab("library")}>
                Library
              </button>
              <button type="button" className={imageTab === "upload" ? "is-active" : ""} onClick={() => setImageTab("upload")}>
                Upload
              </button>
            </div>

            {imageError ? <div className="admin-banner admin-banner--error">{imageError}</div> : null}

            {imageTab === "library" ? (
              <div className="event-image-modal__body">
                <div className="event-image-modal__toolbar">
                  <p className="admin-hint">Reusable images uploaded for events.</p>
                  <button type="button" className="admin-btn admin-btn--outline" onClick={() => void loadImageLibrary()} disabled={libraryLoading}>
                    {libraryLoading ? "Refreshing..." : "Refresh"}
                  </button>
                </div>

                {libraryLoading && assets.length === 0 ? (
                  <p className="event-image-modal__empty">Loading images...</p>
                ) : assets.length === 0 ? (
                  <div className="event-image-modal__empty">
                    <p>No event images yet.</p>
                    <button type="button" className="admin-btn admin-btn--primary" onClick={() => setImageTab("upload")}>
                      Upload first image
                    </button>
                  </div>
                ) : (
                  <div className="event-image-grid">
                    {assets.map((asset) => (
                      <button key={asset.id} type="button" className="event-image-card" onClick={() => insertImage(asset)}>
                        <span className="event-image-card__thumb">
                          <img src={asset.url} alt={asset.altText ?? asset.title ?? ""} loading="lazy" />
                        </span>
                        <span className="event-image-card__title">{asset.title || asset.originalFilename || "Event image"}</span>
                        <span className="event-image-card__meta">{formatFileSize(asset.sizeBytes)}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="event-image-modal__body">
                <div className="admin-form-field">
                  <label htmlFor="event_image_file" className="admin-label">
                    Image file
                  </label>
                  <input
                    ref={fileInputRef}
                    id="event_image_file"
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    className="admin-input"
                    required
                  />
                  <p className="admin-hint">JPG, PNG, WebP, or GIF. Max 8 MB.</p>
                </div>
                <div className="admin-form-grid-2">
                  <div className="admin-form-field">
                    <label htmlFor="event_image_title" className="admin-label">
                      Library title
                    </label>
                    <input ref={titleInputRef} id="event_image_title" className="admin-input" placeholder="Breathwork workshop" />
                  </div>
                  <div className="admin-form-field">
                    <label htmlFor="event_image_alt" className="admin-label">
                      Alt text
                    </label>
                    <input ref={altInputRef} id="event_image_alt" className="admin-input" placeholder="People seated in a calm workshop" />
                  </div>
                </div>
                <div className="event-image-modal__actions">
                  <button type="button" className="admin-btn admin-btn--outline" onClick={() => setImageTab("library")}>
                    Back to library
                  </button>
                  <button type="button" className="admin-btn admin-btn--primary" onClick={() => void uploadImage()} disabled={uploading}>
                    {uploading ? "Uploading..." : "Upload and insert"}
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
