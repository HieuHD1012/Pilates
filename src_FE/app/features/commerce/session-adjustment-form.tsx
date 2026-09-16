import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useWatch } from "react-hook-form";
import { z } from "zod";

import { ApiError } from "~/lib/api/client";
import type { SessionAdjustmentInput } from "~/lib/api/types";
import { formatNumber, formatSigned } from "~/lib/format";
import { Button } from "~/ui/button";
import { Field, FormActions, Input, Select, Textarea } from "~/ui/field";
import { Figures } from "~/ui/figure";

/**
 * A manual adjustment to a session balance.
 *
 * Two rules from docs/BUSINESS_RULES.md shape this form and are not negotiable:
 * a manual adjustment requires a reason, and the balance is the sum of the ledger
 * rather than a number anyone edits. So there is no "set the balance to N" field —
 * staff state a change and why, and the balance follows.
 *
 * Direction is a separate control from magnitude. A single signed field invites
 * "-2" and "−2" and "2" meaning three different things; splitting them makes the
 * intent unambiguous before the reason is even typed.
 */

const schema = z.object({
  direction: z.enum(["add", "subtract"]),
  count: z
    .string()
    .trim()
    .min(1, "Nhập số buổi")
    .refine((value) => /^\d+$/.test(value), "Chỉ nhập số buổi, là số nguyên")
    .refine((value) => Number(value) > 0, "Số buổi phải lớn hơn 0")
    .refine((value) => Number(value) <= 100, "Số buổi vượt mức hợp lý"),
  reason: z
    .string()
    .trim()
    .min(6, "Nêu lý do đủ rõ để người khác đọc lại còn hiểu")
    .max(200, "Lý do quá dài"),
});

export type SessionAdjustmentFormValues = z.input<typeof schema>;

export function SessionAdjustmentForm({
  currentBalance,
  pending,
  error,
  onSubmit,
  onCancel,
}: {
  /** The authoritative balance, from the backend. Shown, never edited. */
  currentBalance: number;
  pending: boolean;
  error: unknown;
  onSubmit: (input: SessionAdjustmentInput) => Promise<unknown>;
  onCancel: () => void;
}) {
  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
    setError,
  } = useForm<SessionAdjustmentFormValues>({
    resolver: zodResolver(schema),
    defaultValues: { direction: "subtract", count: "", reason: "" },
  });

  const direction = useWatch({ control, name: "direction" });
  const raw = String(useWatch({ control, name: "count" }) ?? "");
  const magnitude = /^\d+$/.test(raw) ? Number(raw) : null;
  const delta = magnitude === null ? null : direction === "add" ? magnitude : -magnitude;
  // A preview, explicitly labelled as such. The authoritative balance still comes
  // from the backend after the write — this only shows what is being asked for.
  const resulting = delta === null ? null : currentBalance + delta;

  return (
    <form
      noValidate
      className="flex flex-col gap-5"
      onSubmit={handleSubmit((values) => {
        const parsed = schema.parse(values);
        const signed =
          parsed.direction === "add" ? Number(parsed.count) : -Number(parsed.count);
        return onSubmit({ delta: signed, reason: parsed.reason }).catch((cause) => {
          if (cause instanceof ApiError && cause.isValidation) {
            if (cause.fieldErrors.reason?.[0]) {
              setError("reason", { message: cause.fieldErrors.reason[0] });
            }
            if (cause.fieldErrors.delta?.[0]) {
              setError("count", { message: cause.fieldErrors.delta[0] });
            }
          }
        });
      })}
    >
      <dl className="rule-b text-ink-2 flex items-baseline gap-2 pb-3 text-xs">
        <dt>Số dư hiện tại</dt>
        <dd>
          <Figures className="text-ink">{formatNumber(currentBalance)}</Figures> buổi
        </dd>
      </dl>

      <div className="grid gap-5 sm:grid-cols-[1fr_1fr]">
        <Field label="Cộng hay trừ" required error={errors.direction?.message}>
          {({ id, describedBy, invalid }) => (
            <Select
              id={id}
              aria-describedby={describedBy}
              aria-invalid={invalid}
              {...register("direction")}
            >
              <option value="subtract">Trừ buổi</option>
              <option value="add">Cộng buổi</option>
            </Select>
          )}
        </Field>

        <Field label="Số buổi" required error={errors.count?.message}>
          {({ id, describedBy, invalid }) => (
            <Input
              id={id}
              inputMode="numeric"
              autoComplete="off"
              aria-describedby={describedBy}
              aria-invalid={invalid}
              {...register("count")}
            />
          )}
        </Field>
      </div>

      <p aria-live="polite" className="text-ink-2 text-xs">
        {resulting === null ? (
          " "
        ) : (
          <>
            Điều chỉnh <Figures className="text-ink">{formatSigned(delta ?? 0)}</Figures>{" "}
            buổi — sau khi lưu số dư sẽ là{" "}
            <Figures className="text-ink">{formatNumber(resulting)}</Figures> buổi
            {resulting < 0 ? (
              <span className="text-danger">
                {" "}
                — số dư âm. Studio chưa có quy định cho trường hợp này.
              </span>
            ) : null}
          </>
        )}
      </p>

      <Field
        label="Lý do"
        required
        hint="Bút toán này nằm trong sổ vĩnh viễn và mang tên người thực hiện."
        error={errors.reason?.message}
      >
        {({ id, describedBy, invalid }) => (
          <Textarea
            id={id}
            rows={3}
            aria-describedby={describedBy}
            aria-invalid={invalid}
            {...register("reason")}
          />
        )}
      </Field>

      {error instanceof ApiError && !error.isValidation ? (
        <p role="alert" className="text-danger text-sm">
          Chưa ghi được điều chỉnh. Vui lòng thử lại sau ít phút.
        </p>
      ) : null}

      <FormActions>
        <Button variant="secondary" size="sm" onClick={onCancel}>
          Huỷ
        </Button>
        <Button type="submit" size="sm" pending={pending}>
          Ghi bút toán
        </Button>
      </FormActions>
    </form>
  );
}
