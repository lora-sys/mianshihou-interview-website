"use client";

import { useRef } from "react";
import { ConfirmButton } from "@/components/confirm-button";

export function ConfirmFormAction({
  title,
  description,
  confirmText,
  triggerVariant,
  triggerSize,
  triggerClassName,
  confirmVariant,
  formAction,
  formMethod,
  disabled,
  pending,
  children,
}: {
  title: string;
  description?: string;
  confirmText?: string;
  triggerVariant?: any;
  triggerSize?: any;
  triggerClassName?: string;
  confirmVariant?: any;
  formAction: string;
  formMethod?: string;
  disabled?: boolean;
  pending?: boolean;
  children: React.ReactNode;
}) {
  const submitterRef = useRef<HTMLButtonElement | null>(null);

  return (
    <>
      <button
        ref={submitterRef}
        type="submit"
        formAction={formAction}
        formMethod={formMethod as any}
        className="hidden"
        tabIndex={-1}
      />
      <ConfirmButton
        title={title}
        description={description}
        confirmText={confirmText}
        triggerVariant={triggerVariant}
        triggerSize={triggerSize}
        triggerClassName={triggerClassName}
        confirmVariant={confirmVariant}
        disabled={disabled}
        pending={pending}
        onConfirm={() => {
          const submitter = submitterRef.current;
          const form = submitter?.form;
          if (!form || !submitter) return;
          form.requestSubmit(submitter);
        }}
      >
        {children}
      </ConfirmButton>
    </>
  );
}
