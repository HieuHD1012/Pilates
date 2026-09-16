import * as LabelPrimitive from "@radix-ui/react-label";
import {
  useId,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from "react";

import { cn } from "~/lib/cn";

/**
 * Forms in this system are quiet: a visible label above the control, a hairline
 * box, an error that sits directly under the field it belongs to. No floating
 * labels — they break Vietnamese diacritics against the field border and they
 * hide the question the moment someone starts answering it.
 */

const CONTROL = cn(
  "w-full rounded-sm border border-rule-2 bg-paper px-3 text-sm text-ink",
  // Placeholders are real text and must meet contrast; ink-3 does not.
  "placeholder:text-ink-2",
  "transition-colors duration-200 ease-measure",
  "hover:border-ink-3 focus:border-ink focus:outline-none",
  "disabled:cursor-not-allowed disabled:bg-sand-deep disabled:text-ink-3",
  "aria-[invalid=true]:border-danger",
);

export interface FieldProps {
  label: string;
  /** Rendered under the label, before the control. */
  hint?: string;
  error?: string;
  required?: boolean;
  children: (ids: {
    id: string;
    describedBy: string | undefined;
    invalid: boolean;
  }) => ReactNode;
  className?: string;
}

export function Field({ label, hint, error, required, children, className }: FieldProps) {
  const id = useId();
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;
  const describedBy =
    [hint ? hintId : null, error ? errorId : null].filter(Boolean).join(" ") || undefined;

  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <LabelPrimitive.Root htmlFor={id} className="text-ink text-xs font-medium">
        {label}
        {required ? (
          <>
            {/* Deliberately not chromatic. Red in a form should mean exactly one
                thing — something is wrong — and spending the one chromatic mark
                on a required marker made "fill this in" and "this is invalid"
                read as the same signal at 12px. */}
            <span aria-hidden="true" className="text-ink-2 ml-1">
              *
            </span>
            <span className="sr-only"> (bắt buộc)</span>
          </>
        ) : null}
      </LabelPrimitive.Root>

      {hint ? (
        <p id={hintId} className="measure text-ink-2 text-xs">
          {hint}
        </p>
      ) : null}

      {children({ id, describedBy, invalid: Boolean(error) })}

      {error ? (
        <p id={errorId} className="text-danger text-xs">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn(CONTROL, "h-10", className)} {...props} />;
}

export function Textarea({
  className,
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(CONTROL, "min-h-24 resize-y py-2.5 leading-relaxed", className)}
      {...props}
    />
  );
}

/**
 * A native <select> styled to the system. Native is the correct default: it is
 * keyboard- and screen-reader-correct everywhere, and on mobile it opens the
 * platform picker, which beats any custom listbox for a studio phone.
 * Reach for the Radix Select only when options need rich content.
 */
export function Select({
  className,
  children,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <div className="relative">
      <select className={cn(CONTROL, "h-10 appearance-none pr-9", className)} {...props}>
        {children}
      </select>
      <svg
        aria-hidden="true"
        viewBox="0 0 12 8"
        className="text-ink-2 pointer-events-none absolute top-1/2 right-3 h-2 w-3 -translate-y-1/2"
      >
        <path
          d="M1 1.5 6 6.5 11 1.5"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.25"
        />
      </svg>
    </div>
  );
}

/**
 * The action row at the foot of a form.
 *
 * Sticky, because a dialog body scrolls and a twelve-field form pushed its own
 * submit button below the fold on a 900px laptop — the control the whole form
 * exists to reach was the one part of it you could not see. It bleeds to the
 * dialog's padding edges so nothing shows through underneath.
 *
 * Five forms had written this row by hand; the sticky trick is subtle enough that
 * five copies of it would have drifted.
 */
export function FormActions({ children }: { children: ReactNode }) {
  return (
    <div className="bg-paper sticky bottom-0 -mx-5 -mb-4 px-5 pb-4">
      <div className="rule-t flex items-center justify-end gap-2 pt-4">{children}</div>
    </div>
  );
}
