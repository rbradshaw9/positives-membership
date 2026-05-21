"use client";

type ConfirmSubmitButtonProps = {
  message: string;
  label: string;
  className?: string;
  style?: React.CSSProperties;
};

/**
 * A form submit button that asks for confirmation before letting the parent
 * `<form action={serverAction}>` submit. Lives in a client component so the
 * onClick handler is allowed — server components cannot pass event handlers.
 */
export function ConfirmSubmitButton({
  message,
  label,
  className,
  style,
}: ConfirmSubmitButtonProps) {
  return (
    <button
      type="submit"
      className={className}
      style={style}
      onClick={(event) => {
        if (!window.confirm(message)) event.preventDefault();
      }}
    >
      {label}
    </button>
  );
}
