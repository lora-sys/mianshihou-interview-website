"use client";

import { ConfirmButton } from "@/components/confirm-button";

export function ConfirmSubmit({
  formId,
  title,
  description,
  confirmText,
  triggerVariant,
  triggerSize,
  triggerClassName,
  confirmVariant,
  disabled,
  children,
}: {
  formId: string;
  title: string;
  description?: string;
  confirmText?: string;
  triggerVariant?: any;
  triggerSize?: any;
  triggerClassName?: string;
  confirmVariant?: any;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <ConfirmButton
      title={title}
      description={description}
      confirmText={confirmText}
      triggerVariant={triggerVariant}
      triggerSize={triggerSize}
      triggerClassName={triggerClassName}
      confirmVariant={confirmVariant}
      disabled={disabled}
      onConfirm={() => {
        const el = document.getElementById(formId) as HTMLFormElement | null;
        el?.requestSubmit();
      }}
    >
      {children}
    </ConfirmButton>
  );
}
