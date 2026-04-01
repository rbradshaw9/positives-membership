"use client";

import { useCallback, useEffect, useRef } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Link as TiptapLink } from "@tiptap/extension-link";
import { Markdown } from "tiptap-markdown";

/**
 * components/admin/BodyEditor.tsx
 * Sprint 11b: Lightweight Tiptap rich-text editor for admin body authoring.
 *
 * Renders a WYSIWYG editing surface that serializes to Markdown.
 * A hidden <input name="body"> stays synced so the enclosing server-action
 * form can read the markdown value on submit — no form changes needed.
 *
 * Toolbar: paragraph, H2, H3, bold, italic, bullet list, ordered list,
 *          blockquote, link. No more than needed for Positives prose.
 *
 * Styled via .tiptap-editor-wrapper / .tiptap-toolbar / .tiptap-content in globals.css.
 */

interface BodyEditorProps {
  defaultValue?: string | null;
  placeholder?: string;
}

export function BodyEditor({ defaultValue = "", placeholder }: BodyEditorProps) {
  const hiddenRef = useRef<HTMLInputElement>(null);
  const placeholderText = placeholder ?? "Write body content… Headings, bold, lists, and links are all supported.";

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        // Disable codeBlock — not needed for wellness prose
        codeBlock: false,
        code: false,
      }),
      TiptapLink.configure({
        openOnClick: false,
        HTMLAttributes: { rel: "noopener noreferrer", target: "_blank" },
      }),
      Markdown.configure({
        html: false,
        transformPastedText: true,
        transformCopiedText: false,
      }),
    ],
    content: defaultValue ?? "",
    editorProps: {
      attributes: {
        "data-placeholder": placeholderText,
        class: "ProseMirror",
      },
    },
    onUpdate({ editor }) {
      if (hiddenRef.current) {
        // tiptap-markdown attaches .getMarkdown() to editor.storage.markdown at runtime
        const storage = editor.storage as unknown as {
          markdown?: { getMarkdown?: () => string }
        };
        const md = storage.markdown?.getMarkdown?.() ?? editor.getText();
        hiddenRef.current.value = md;
      }
    },
  });

  // Sync hidden input initial value once editor is ready
  useEffect(() => {
    if (!editor || !hiddenRef.current) return;
    hiddenRef.current.value = defaultValue ?? "";
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editor]);

  const setLink = useCallback(() => {
    if (!editor) return;
    const prev = editor.getAttributes("link").href ?? "";
    const url = window.prompt("Link URL", prev);
    if (url === null) return; // cancelled
    if (url === "") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
    } else {
      editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
    }
  }, [editor]);

  if (!editor) return null;

  return (
    <div className="tiptap-editor-wrapper">
      {/* ── Toolbar ──────────────────────────────────────────────────────── */}
      <div className="tiptap-toolbar" role="toolbar" aria-label="Text formatting">
        {/* Paragraph */}
        <button
          type="button"
          title="Paragraph"
          onClick={() => editor.chain().focus().setParagraph().run()}
          className={editor.isActive("paragraph") ? "is-active" : ""}
          aria-pressed={editor.isActive("paragraph")}
        >
          ¶
        </button>

        {/* H2 */}
        <button
          type="button"
          title="Heading 2"
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          className={editor.isActive("heading", { level: 2 }) ? "is-active" : ""}
          aria-pressed={editor.isActive("heading", { level: 2 })}
        >
          H2
        </button>

        {/* H3 */}
        <button
          type="button"
          title="Heading 3"
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          className={editor.isActive("heading", { level: 3 }) ? "is-active" : ""}
          aria-pressed={editor.isActive("heading", { level: 3 })}
        >
          H3
        </button>

        <div className="divider" aria-hidden="true" />

        {/* Bold */}
        <button
          type="button"
          title="Bold"
          onClick={() => editor.chain().focus().toggleBold().run()}
          className={editor.isActive("bold") ? "is-active" : ""}
          aria-pressed={editor.isActive("bold")}
          style={{ fontWeight: 700 }}
        >
          B
        </button>

        {/* Italic */}
        <button
          type="button"
          title="Italic"
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className={editor.isActive("italic") ? "is-active" : ""}
          aria-pressed={editor.isActive("italic")}
          style={{ fontStyle: "italic" }}
        >
          I
        </button>

        <div className="divider" aria-hidden="true" />

        {/* Bullet list */}
        <button
          type="button"
          title="Bullet list"
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          className={editor.isActive("bulletList") ? "is-active" : ""}
          aria-pressed={editor.isActive("bulletList")}
        >
          •≡
        </button>

        {/* Ordered list */}
        <button
          type="button"
          title="Ordered list"
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          className={editor.isActive("orderedList") ? "is-active" : ""}
          aria-pressed={editor.isActive("orderedList")}
        >
          1≡
        </button>

        {/* Blockquote */}
        <button
          type="button"
          title="Blockquote"
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          className={editor.isActive("blockquote") ? "is-active" : ""}
          aria-pressed={editor.isActive("blockquote")}
        >
          ❝
        </button>

        <div className="divider" aria-hidden="true" />

        {/* Link */}
        <button
          type="button"
          title="Link"
          onClick={setLink}
          className={editor.isActive("link") ? "is-active" : ""}
          aria-pressed={editor.isActive("link")}
        >
          🔗
        </button>
      </div>

      {/* ── Editor content ────────────────────────────────────────────────── */}
      <div className="tiptap-content">
        <EditorContent editor={editor} />
      </div>

      {/* ── Hidden input for form submission ──────────────────────────────── */}
      <input
        ref={hiddenRef}
        type="hidden"
        name="body"
        defaultValue={defaultValue ?? ""}
      />
    </div>
  );
}
