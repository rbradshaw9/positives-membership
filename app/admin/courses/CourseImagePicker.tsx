"use client";

import { useEffect, useRef, useState, useTransition } from "react";

type Asset = {
  id: string;
  title: string | null;
  originalFilename: string | null;
  thumbnailUrl?: string;
  url: string;
};

export function CourseImagePicker({ defaultValue = "" }: { defaultValue?: string | null }) {
  const [value, setValue] = useState(defaultValue ?? "");
  const [assets, setAssets] = useState<Asset[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);

  async function loadAssets() {
    const response = await fetch("/api/admin/media/course-images");
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error ?? "Image library could not be loaded.");
    setAssets(payload.assets ?? []);
  }

  useEffect(() => {
    startTransition(async () => {
      try {
        await loadAssets();
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : "Image library could not be loaded.");
      }
    });
  }, []);

  async function upload(file: File) {
    setError(null);
    const form = new FormData();
    form.set("file", file);
    form.set("title", file.name.replace(/\.[^.]+$/, ""));

    const response = await fetch("/api/admin/media/course-images", {
      method: "POST",
      body: form,
    });
    const payload = await response.json();
    if (!response.ok) {
      setError(payload.error ?? "Image could not be uploaded.");
      return;
    }
    setValue(payload.asset.url);
    await loadAssets();
  }

  return (
    <div className="admin-form-field">
      <label className="admin-label">Featured image</label>
      <input type="hidden" name="cover_image_url" value={value} />
      <div className="surface-card" style={{ padding: "0.75rem", display: "grid", gap: "0.75rem" }}>
        {value ? (
          <div style={{ display: "grid", gap: "0.5rem" }}>
            <div
              style={{
                minHeight: "8rem",
                borderRadius: "0.75rem",
                background: `center / cover url(${value})`,
                border: "1px solid var(--color-border)",
              }}
            />
            <button type="button" className="admin-btn admin-btn--outline" onClick={() => setValue("")}>
              Remove image
            </button>
          </div>
        ) : (
          <p style={{ fontSize: "0.8125rem", color: "var(--color-muted-fg)" }}>
            No image selected. Courses will use the branded placeholder.
          </p>
        )}

        <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
          <button type="button" className="admin-btn admin-btn--primary" onClick={() => inputRef.current?.click()} disabled={isPending}>
            Upload image
          </button>
          <button type="button" className="admin-btn admin-btn--outline" onClick={() => void loadAssets()} disabled={isPending}>
            Refresh library
          </button>
        </div>
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          style={{ display: "none" }}
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) void upload(file);
            event.currentTarget.value = "";
          }}
        />

        {assets.length > 0 ? (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(5.5rem, 1fr))", gap: "0.5rem" }}>
            {assets.map((asset) => (
              <button
                key={asset.id}
                type="button"
                onClick={() => setValue(asset.url)}
                aria-label={`Use ${asset.title ?? asset.originalFilename ?? "course image"}`}
                style={{
                  aspectRatio: "1.25",
                  borderRadius: "0.625rem",
                  border: value === asset.url ? "2px solid var(--color-primary)" : "1px solid var(--color-border)",
                  background: `center / cover url(${asset.thumbnailUrl ?? asset.url})`,
                  cursor: "pointer",
                }}
              />
            ))}
          </div>
        ) : null}

        {error ? <p style={{ color: "#b42318", fontSize: "0.8125rem" }}>{error}</p> : null}
      </div>
    </div>
  );
}
