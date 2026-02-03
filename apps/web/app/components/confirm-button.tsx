"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { Button } from "@repo/ui";

export function ConfirmButton({
  title,
  description,
  confirmText = "确认",
  cancelText = "取消",
  triggerVariant = "destructive",
  triggerSize,
  triggerClassName,
  confirmVariant = "destructive",
  disabled,
  pending,
  onConfirm,
  children,
}: {
  title: string;
  description?: string;
  confirmText?: string;
  cancelText?: string;
  triggerVariant?: any;
  triggerSize?: any;
  triggerClassName?: string;
  confirmVariant?: any;
  disabled?: boolean;
  pending?: boolean;
  onConfirm: () => void | Promise<void>;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const portalTarget = useMemo(
    () => (typeof document !== "undefined" ? document.body : null),
    [],
  );

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <>
      <Button
        variant={triggerVariant}
        size={triggerSize}
        className={triggerClassName}
        disabled={disabled || pending}
        onClick={() => setOpen(true)}
      >
        {children}
      </Button>

      {mounted && open && portalTarget
        ? createPortal(
            <div
              className="fixed inset-0 z-50 flex items-center justify-center p-4"
              role="dialog"
              aria-modal="true"
            >
              <div
                className="absolute inset-0 bg-black/50"
                onClick={() => (pending ? null : setOpen(false))}
              />
              <div className="relative w-full max-w-md rounded-2xl border bg-background p-5 shadow-2xl">
                <div className="text-base font-semibold">{title}</div>
                {description ? (
                  <div className="mt-2 text-sm text-muted-foreground">
                    {description}
                  </div>
                ) : null}
                <div className="mt-5 flex items-center justify-end gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    disabled={pending}
                    onClick={() => setOpen(false)}
                  >
                    {cancelText}
                  </Button>
                  <Button
                    type="button"
                    variant={confirmVariant}
                    disabled={pending}
                    onClick={async () => {
                      await onConfirm();
                      setOpen(false);
                    }}
                  >
                    {pending ? "处理中..." : confirmText}
                  </Button>
                </div>
              </div>
            </div>,
            portalTarget,
          )
        : null}
    </>
  );
}
