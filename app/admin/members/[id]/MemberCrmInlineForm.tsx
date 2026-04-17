"use client";

import { useActionState, useEffect, useRef, type CSSProperties, type ReactNode } from "react";

type ActionResult = { error?: string; success?: string };

type Props = {
  id?: string;
  action: (previousState: ActionResult, formData: FormData) => Promise<ActionResult>;
  children: ReactNode;
  submitLabel: string;
  pendingLabel?: string;
  className?: string;
  style?: CSSProperties;
  buttonClassName?: string;
  buttonStyle?: CSSProperties;
  resetOnSuccess?: boolean;
};

export function MemberCrmInlineAlert({ state }: { state: ActionResult }) {
  if (!state.error && !state.success) return null;

  return (
    <div
      role={state.error ? "alert" : "status"}
      className={`member-crm-inline-alert ${
        state.error ? "member-crm-inline-alert--error" : "member-crm-inline-alert--success"
      }`}
    >
      {state.error ?? state.success}
    </div>
  );
}

export function MemberCrmInlineForm({
  id,
  action,
  children,
  submitLabel,
  pendingLabel = "Saving...",
  className,
  style,
  buttonClassName = "admin-btn admin-btn--primary",
  buttonStyle,
  resetOnSuccess = true,
}: Props) {
  const formRef = useRef<HTMLFormElement>(null);
  const [state, formAction, isPending] = useActionState(action, {});

  useEffect(() => {
    if (state.success && resetOnSuccess) {
      formRef.current?.reset();
    }
  }, [resetOnSuccess, state.success]);

  return (
    <form id={id} ref={formRef} action={formAction} className={className} style={style}>
      {children}
      <MemberCrmInlineAlert state={state} />
      <button type="submit" className={buttonClassName} style={buttonStyle} disabled={isPending}>
        {isPending ? pendingLabel : submitLabel}
      </button>
    </form>
  );
}
