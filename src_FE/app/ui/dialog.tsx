import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "~/lib/cn";

/**
 * The only genuinely floating layer in this system, so one of the three
 * permitted shadows applies. Focus trapping, escape handling and the labelled
 * title come from Radix; everything visible is ours.
 */

export const Dialog = DialogPrimitive.Root;
export const DialogTrigger = DialogPrimitive.Trigger;
export const DialogClose = DialogPrimitive.Close;

export function DialogContent({
  title,
  description,
  children,
  footer,
  className,
}: {
  title: string;
  description?: string;
  children?: ReactNode;
  footer?: ReactNode;
  className?: string;
}) {
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay
        className={cn(
          "bg-ink-deep/45 fixed inset-0 z-(--z-dialog)",
          "data-[state=open]:animate-[fade-rise_200ms_var(--ease-measure)]",
        )}
      />
      <DialogPrimitive.Content
        className={cn(
          "fixed top-1/2 left-1/2 z-(--z-dialog) w-[calc(100vw-2rem)] max-w-md",
          "bg-paper shadow-dialog -translate-x-1/2 -translate-y-1/2 rounded-md",
          // A four-field form on a short phone was taller than the viewport, which
          // put the submit button somewhere the thumb could not reach. The title
          // and the actions stay put; only the fields scroll.
          "flex max-h-[calc(100dvh-2rem)] flex-col overflow-hidden",
          "data-[state=open]:animate-[fade-rise_240ms_var(--ease-measure)]",
          className,
        )}
      >
        <div className="rule-b flex shrink-0 items-start justify-between gap-4 px-5 py-4">
          <div>
            <DialogPrimitive.Title className="text-ink text-base font-medium">
              {title}
            </DialogPrimitive.Title>
            {description ? (
              <DialogPrimitive.Description className="text-ink-2 mt-1 text-sm">
                {description}
              </DialogPrimitive.Description>
            ) : null}
          </div>
          <DialogPrimitive.Close
            className="text-ink-2 hover:text-ink -m-1.5 rounded-xs p-1.5"
            aria-label="Đóng"
          >
            <X aria-hidden="true" className="size-4" />
          </DialogPrimitive.Close>
        </div>
        {children ? (
          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">{children}</div>
        ) : null}
        {footer ? (
          <div className="rule-t flex shrink-0 items-center justify-end gap-2 px-5 py-3">
            {footer}
          </div>
        ) : null}
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  );
}
