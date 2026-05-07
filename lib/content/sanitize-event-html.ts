import sanitizeHtml from "sanitize-html";

const ALLOWED_SCHEMES = ["http", "https", "mailto", "tel"];

const ALLOWED_TAGS = [
  "p",
  "br",
  "strong",
  "em",
  "b",
  "i",
  "u",
  "s",
  "blockquote",
  "ul",
  "ol",
  "li",
  "a",
  "code",
  "pre",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "hr",
  "img",
  "figure",
  "figcaption",
];

const ALLOWED_ATTRIBUTES: sanitizeHtml.IOptions["allowedAttributes"] = {
  a: ["href", "name", "target", "rel"],
  img: ["src", "alt", "title", "width", "height", "loading"],
};

function safeImageDimension(value: string | undefined) {
  const match = String(value ?? "").trim().match(/^(\d{1,4})(?:px)?$/i);
  if (!match) return null;
  const numeric = Number(match[1]);
  if (!Number.isFinite(numeric)) return null;
  return String(Math.min(Math.max(Math.round(numeric), 1), 1600));
}

function normalizeWhitespace(value: string) {
  return value.replace(/\u00a0/g, " ").replace(/\s+/g, " ").trim();
}

function addSafeRelAttribute(value: string | string[] | undefined) {
  const relValues = Array.isArray(value)
    ? value.flatMap((entry) => String(entry).split(/\s+/))
    : typeof value === "string"
      ? value.split(/\s+/)
      : [];

  const nextValues = new Set(relValues.map((entry) => entry.trim()).filter(Boolean));
  nextValues.add("noopener");
  nextValues.add("noreferrer");
  return [...nextValues].join(" ");
}

export function sanitizeEventHtml(rawHtml: string | null | undefined) {
  if (!rawHtml) return null;

  const sanitized = sanitizeHtml(rawHtml, {
    allowedTags: ALLOWED_TAGS,
    allowedAttributes: ALLOWED_ATTRIBUTES,
    allowedSchemes: ALLOWED_SCHEMES,
    allowedSchemesByTag: {
      img: ["http", "https"],
    },
    allowProtocolRelative: false,
    disallowedTagsMode: "discard",
    parseStyleAttributes: false,
    exclusiveFilter: (frame) => frame.tag === "img" && !frame.attribs.src,
    transformTags: {
      a: (tagName, attribs) => {
        const href = typeof attribs.href === "string" ? attribs.href.trim() : "";
        const target = attribs.target === "_blank" ? "_blank" : undefined;

        return {
          tagName,
          attribs: {
            ...(href ? { href } : {}),
            ...(target ? { target } : {}),
            ...(target ? { rel: addSafeRelAttribute(attribs.rel) } : {}),
          },
        };
      },
      img: (tagName, attribs) => {
        const src = typeof attribs.src === "string" ? attribs.src.trim() : "";
        const width = safeImageDimension(attribs.width);
        const height = safeImageDimension(attribs.height);
        return {
          tagName,
          attribs: {
            ...(src ? { src } : {}),
            ...(attribs.alt ? { alt: String(attribs.alt).slice(0, 200) } : {}),
            ...(attribs.title ? { title: String(attribs.title).slice(0, 200) } : {}),
            ...(width ? { width } : {}),
            ...(height ? { height } : {}),
            loading: "lazy",
          },
        };
      },
    },
  });

  const readableText = normalizeWhitespace(
    sanitized.replace(/<img\b[^>]*>/gi, " image ").replace(/<br\s*\/?>/gi, "\n").replace(/<[^>]+>/g, " ")
  );

  return readableText.length > 0 ? sanitized : null;
}
