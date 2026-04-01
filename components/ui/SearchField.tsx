type SearchFieldProps = {
  id: string;
  name: string;
  defaultValue?: string;
  placeholder: string;
  ariaLabel: string;
  trailing?: React.ReactNode;
};

export function SearchField({
  id,
  name,
  defaultValue,
  placeholder,
  ariaLabel,
  trailing,
}: SearchFieldProps) {
  return (
    <div className="search-field">
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
        id={id}
        type="search"
        name={name}
        defaultValue={defaultValue}
        placeholder={placeholder}
        aria-label={ariaLabel}
        autoComplete="off"
      />
      {trailing}
    </div>
  );
}
