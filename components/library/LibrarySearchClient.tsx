"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";

/**
 * components/library/LibrarySearchClient.tsx
 *
 * Debounced real-time search for the Library page.
 * Pushes URL params as the user types (300ms debounce) so the server
 * component re-renders with updated results — no Enter key required.
 *
 * Falls back to instant navigation on Enter for power users.
 */

interface LibrarySearchClientProps {
  /** Current search query from searchParams (server-rendered) */
  initialQuery: string;
  /** Current tab filter value to preserve in URL */
  activeTab: string;
}

export function LibrarySearchClient({
  initialQuery,
  activeTab,
}: LibrarySearchClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [query, setQuery] = useState(initialQuery);
  const [isPending, startTransition] = useTransition();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Sync from URL → input when searchParams change externally (e.g. back button)
  useEffect(() => {
    const urlQ = searchParams.get("q") ?? "";
    if (urlQ !== query) {
      setQuery(urlQ);
    }
    // Only sync on external searchParams changes, not our own typed changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const pushSearch = useCallback(
    (value: string) => {
      const trimmed = value.trim();
      const params = new URLSearchParams();
      if (activeTab !== "all") params.set("tab", activeTab);
      if (trimmed) params.set("q", trimmed);

      const href = `/library${params.toString() ? `?${params.toString()}` : ""}`;

      startTransition(() => {
        router.push(href, { scroll: false });
      });
    },
    [activeTab, router],
  );

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const value = e.target.value;
    setQuery(value);

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      pushSearch(value);
    }, 300);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      if (debounceRef.current) clearTimeout(debounceRef.current);
      pushSearch(query);
    }
  }

  // Clean up debounce on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  const isSearchMode = query.trim().length > 0;

  return (
    <div className="mb-6">
      <div className="search-field">
        {/* Search icon */}
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="text-muted-foreground"
          aria-hidden="true"
        >
          <circle cx="11" cy="11" r="8" />
          <path d="M21 21l-4.35-4.35" />
        </svg>

        <input
          ref={inputRef}
          id="library-search"
          type="search"
          name="q"
          value={query}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder="Search practices, principles, themes…"
          aria-label="Search library content"
          autoComplete="off"
        />

        {/* Loading spinner during navigation */}
        {isPending && (
          <div
            className="shrink-0 w-4 h-4 rounded-full border-2 border-transparent animate-spin"
            style={{
              borderTopColor: "var(--color-accent)",
              borderRightColor: "color-mix(in srgb, var(--color-accent) 30%, transparent)",
            }}
            aria-label="Searching…"
          />
        )}

        {/* Clear button */}
        {isSearchMode && !isPending && (
          <button
            type="button"
            onClick={() => {
              setQuery("");
              if (debounceRef.current) clearTimeout(debounceRef.current);
              pushSearch("");
              inputRef.current?.focus();
            }}
            className="text-muted-foreground transition-colors hover:text-foreground"
            aria-label="Clear search"
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}
