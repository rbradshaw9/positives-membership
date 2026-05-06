"use client";

import { Node, mergeAttributes } from "@tiptap/core";
import { Link as TiptapLink } from "@tiptap/extension-link";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { useEffect, useRef, useState } from "react";

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

export function EventDetailsEditor({
  defaultValue = "",
  name = "body",
}: {
  defaultValue?: string | null;
  name?: string;
}) {
  const hiddenRef = useRef<HTMLInputElement>(null);
  const [mode, setMode] = useState<"visual" | "html">("visual");
  const [html, setHtml] = useState(defaultValue ?? "");

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

  function addImage() {
    if (!editor) return;
    const src = window.prompt("Image URL");
    if (!src) return;
    const alt = window.prompt("Alt text", "") ?? "";
    editor.chain().focus().insertContent({ type: "eventImage", attrs: { src, alt } }).run();
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
        <button type="button" title="Image" onClick={addImage}>
          Image
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
    </div>
  );
}
