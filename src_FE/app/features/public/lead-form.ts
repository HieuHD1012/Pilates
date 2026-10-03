import { useMutation } from "@tanstack/react-query";
import { useSyncExternalStore } from "react";
import type { UseFormSetError } from "react-hook-form";
import { z } from "zod";

import { ApiError } from "~/lib/api/client";
import { publicApi } from "~/lib/api/endpoints";

/**
 * The consultation request, shared by the full form on /dat-tu-van and the
 * two-field form at the end of the homepage. Both post the same lead; keeping
 * one schema means a number accepted on one page is never rejected on the other.
 */

/**
 * Vietnamese mobile numbers: 10 digits starting 03/05/07/08/09, optionally
 * written with +84 or spaces. Kept deliberately permissive — a form that
 * rejects a real customer's number is worse than one that lets staff fix it.
 */
const phonePattern = /^(?:\+?84|0)(?:3|5|7|8|9)\d{8}$/;

export const leadSchema = z.object({
  fullName: z.string().trim().min(2, "Vui lòng nhập họ tên"),
  phone: z
    .string()
    .trim()
    .transform((value) => value.replace(/[\s.-]/g, ""))
    .refine((value) => phonePattern.test(value), "Số điện thoại chưa đúng định dạng"),
  preferredClassType: z.enum(["group", "private", ""]),
  need: z.string().trim().max(500, "Nội dung quá dài").optional(),
});

export type LeadFormValues = z.input<typeof leadSchema>;

export const EMPTY_LEAD: LeadFormValues = {
  fullName: "",
  phone: "",
  preferredClassType: "",
  need: "",
};

/**
 * Where the visitor came from, when it changes what staff should say on the
 * call. `POST /public/leads` has no field for it, so it travels in `need` —
 * the free text staff actually read — rather than being dropped.
 */
export const LEAD_CONTEXTS = {
  "goi-tap": "Bảng giá gói tập",
  "lich-tap": "Xếp lớp từ lịch tập",
  "khuyen-mai": "Ưu đãi của studio",
} as const;

export type LeadContext = keyof typeof LEAD_CONTEXTS;

export function leadContextFrom(value: string | null): LeadContext | null {
  return value !== null && value in LEAD_CONTEXTS ? (value as LeadContext) : null;
}

const noSubscription = () => () => {};

/**
 * Reads `?tu=` from the address. /dat-tu-van is pre-rendered without a query
 * string, so the server snapshot is null and hydration matches the HTML; the
 * context appears on the next render instead of causing a mismatch.
 */
export function useLeadContext(): LeadContext | null {
  const raw = useSyncExternalStore(
    noSubscription,
    () => new URLSearchParams(window.location.search).get("tu"),
    () => null,
  );
  return leadContextFrom(raw);
}

export function useLeadMutation({
  context = null,
  packageName = null,
  setError,
}: {
  context?: LeadContext | null;
  packageName?: string | null;
  setError: UseFormSetError<LeadFormValues>;
}) {
  return useMutation({
    mutationFn: (values: LeadFormValues) => {
      const parsed = leadSchema.parse(values);
      /**
       * The preferred format also has no field of its own. A select whose
       * answer goes nowhere is a question asked in bad faith, so it is
       * written into `need` with the context.
       */
      const preference =
        parsed.preferredClassType === "group"
          ? "Quan tâm lớp nhóm."
          : parsed.preferredClassType === "private"
            ? "Quan tâm lớp riêng."
            : null;
      const asked = packageName
        ? `Hỏi về gói: ${packageName}.`
        : context ? `Hỏi về: ${LEAD_CONTEXTS[context]}.` : null;
      const need = [asked, preference, parsed.need?.trim() ?? ""].filter(Boolean).join(" ");

      return publicApi.createLead({
        full_name: parsed.fullName,
        phone: parsed.phone,
        need: need === "" ? null : need,
        source: "website",
      });
    },
    onError: (error) => {
      // Field-level errors from the backend are attached to their own field so
      // the user never has to hunt for what went wrong. The backend names them
      // in snake_case; this form does not.
      if (error instanceof ApiError && error.isValidation) {
        const aliases: Record<string, keyof LeadFormValues> = {
          full_name: "fullName",
          phone: "phone",
          need: "need",
        };
        for (const [field, messages] of Object.entries(error.fieldErrors)) {
          const target = aliases[field];
          if (target !== undefined) {
            setError(target, { message: messages[0] ?? "Giá trị chưa hợp lệ" });
          }
        }
      }
    },
  });
}

export function isUnexpectedLeadError(error: unknown) {
  return !(error instanceof ApiError && error.isValidation);
}
