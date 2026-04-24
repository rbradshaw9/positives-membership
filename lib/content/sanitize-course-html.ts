import sanitizeHtml from "sanitize-html";

const ALLOWED_SCHEMES = ["http", "https", "mailto", "tel"];

const BASE_ALLOWED_TAGS = [
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
];

const ALLOWED_ATTRIBUTES: sanitizeHtml.IOptions["allowedAttributes"] = {
  a: ["href", "name", "target", "rel"],
};

function normalizeWhitespace(value: string) {
  return value.replace(/\u00a0/g, " ").replace(/\s+/g, " ").trim();
}

function addSafeRelAttribute(value: string | string[] | undefined) {
  const relValues = Array.isArray(value)
    ? value.flatMap((entry) => String(entry).split(/\s+/))
    : typeof value === "string"
      ? value.split(/\s+/)
      : [];

  const nextValues = new Set(
    relValues.map((entry) => entry.trim()).filter(Boolean)
  );
  nextValues.add("noopener");
  nextValues.add("noreferrer");
  return [...nextValues].join(" ");
}

export function sanitizeCourseHtml(rawHtml: string | null | undefined) {
  if (!rawHtml) return null;

  const sanitized = sanitizeHtml(rawHtml, {
    allowedTags: BASE_ALLOWED_TAGS,
    allowedAttributes: ALLOWED_ATTRIBUTES,
    allowedSchemes: ALLOWED_SCHEMES,
    allowProtocolRelative: false,
    disallowedTagsMode: "discard",
    parseStyleAttributes: false,
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
    },
  });

  return normalizeWhitespace(
    sanitized.replace(/<br\s*\/?>/gi, "\n").replace(/<[^>]+>/g, " ")
  ).length > 0
    ? sanitized
    : null;
}
