import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useWatch } from "react-hook-form";
import { z } from "zod";

import { ApiError } from "~/lib/api/client";
import type { PaymentInput, StudentSummary } from "~/lib/api/types";
import { formatVnd } from "~/lib/format";
import { Button } from "~/ui/button";
import { Field, FormActions, Input, Select, Textarea } from "~/ui/field";
import { Figures } from "~/ui/figure";

/**
 * Recording money the studio was handed.
 *
 * What it deliberately does not do is pick a package. The studio has not
 * confirmed its packages or its prices, so a dropdown of fixture prices would put
 * invented numbers into a write path — `reference` is what staff write on the
 * receipt and `amount` is what they counted. When prices are confirmed, selling a
 * package becomes a separate transaction that produces one of these records.
 *
 * The status is a real choice, not a default: cash in hand is confirmed on the
 * spot, a claimed transfer is pending until someone sees the bank.
 */

const schema = z.object({
  studentId: z.string().min(1, "Chọn học viên"),
  /** Typed with separators the way people write money; parsed to whole đồng. */
  amount: z
    .string()
    .trim()
    .min(1, "Nhập số tiền")
    .transform((value) => value.replace(/[^\d]/g, ""))
    .refine((digits) => digits.length > 0 && Number(digits) > 0, "Nhập số tiền lớn hơn 0")
    // 500 triệu is far above any plausible single package; a longer number is a
    // typo, and a typo in a money record is the expensive kind.
    .refine((digits) => Number(digits) <= 500_000_000, "Số tiền vượt mức hợp lý"),
  method: z.enum(["cash", "transfer"]),
  status: z.enum(["confirmed", "pending"]),
  reference: z
    .string()
    .trim()
    .min(3, "Ghi nội dung khoản thu")
    .max(160, "Nội dung quá dài"),
});

export type PaymentFormValues = z.input<typeof schema>;

const FIELD_NAMES = new Set(["studentId", "amount", "method", "status", "reference"]);

export function PaymentForm({
  students,
  lockedStudent,
  pending,
  error,
  onSubmit,
  onCancel,
}: {
  /** The roster to choose from. Omitted when the student is already decided. */
  students?: StudentSummary[];
  /** Recording from a student's own profile — the student is not a question. */
  lockedStudent?: { id: string; fullName: string };
  pending: boolean;
  error: unknown;
  onSubmit: (input: PaymentInput) => Promise<unknown>;
  onCancel: () => void;
}) {
  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
    setError,
  } = useForm<PaymentFormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      studentId: lockedStudent?.id ?? "",
      amount: "",
      method: "transfer",
      status: "confirmed",
      reference: "",
    },
  });

  // Echoed back in words as it is typed, because "4250000" and "42500000" look
  // alike in a box and differ by a factor of ten.
  const amountField = useWatch({ control, name: "amount" });
  const typed = Number(String(amountField ?? "").replace(/[^\d]/g, ""));
  const preview = Number.isFinite(typed) && typed > 0 ? formatVnd(typed) : null;

  const roster = [...(students ?? [])].sort((a, b) =>
    a.fullName.localeCompare(b.fullName, "vi"),
  );

  return (
    <form
      noValidate
      className="flex flex-col gap-5"
      onSubmit={handleSubmit((values) => {
        const parsed = schema.parse(values);
        return onSubmit({
          studentId: parsed.studentId,
          amount: Number(parsed.amount),
          method: parsed.method,
          status: parsed.status,
          reference: parsed.reference,
        }).catch((cause) => {
          if (cause instanceof ApiError && cause.isValidation) {
            for (const [field, messages] of Object.entries(cause.fieldErrors)) {
              if (FIELD_NAMES.has(field)) {
                setError(field as keyof PaymentFormValues, {
                  message: messages[0] ?? "Giá trị chưa hợp lệ",
                });
              }
            }
          }
        });
      })}
    >
      {lockedStudent ? (
        <>
          <input type="hidden" {...register("studentId")} />
          <p className="text-ink-2 text-xs">
            Ghi cho <span className="text-ink">{lockedStudent.fullName}</span>.
          </p>
        </>
      ) : (
        <Field
          label="Học viên"
          required
          hint="Danh sách học viên của studio, xếp theo tên."
          error={errors.studentId?.message}
        >
          {({ id, describedBy, invalid }) => (
            <Select
              id={id}
              aria-describedby={describedBy}
              aria-invalid={invalid}
              {...register("studentId")}
            >
              <option value="">— Chọn học viên —</option>
              {roster.map((student) => (
                <option key={student.id} value={student.id}>
                  {student.fullName}
                </option>
              ))}
            </Select>
          )}
        </Field>
      )}

      <Field
        label="Số tiền"
        required
        hint="Đồng Việt Nam. Dấu chấm, phẩy hay khoảng trắng đều được."
        error={errors.amount?.message}
      >
        {({ id, describedBy, invalid }) => (
          <>
            <Input
              id={id}
              inputMode="numeric"
              autoComplete="off"
              aria-describedby={describedBy}
              aria-invalid={invalid}
              {...register("amount")}
            />
            {/* aria-live so the reading is announced, not only shown. */}
            <p aria-live="polite" className="text-ink-2 mt-1.5 text-xs">
              {preview ? (
                <>
                  Đang ghi <Figures className="text-ink">{preview}</Figures>
                </>
              ) : (
                " "
              )}
            </p>
          </>
        )}
      </Field>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Phương thức" required error={errors.method?.message}>
          {({ id, describedBy, invalid }) => (
            <Select
              id={id}
              aria-describedby={describedBy}
              aria-invalid={invalid}
              {...register("method")}
            >
              <option value="transfer">Chuyển khoản</option>
              <option value="cash">Tiền mặt</option>
            </Select>
          )}
        </Field>

        <Field
          label="Trạng thái"
          required
          hint="Chờ xác nhận nếu chưa thấy tiền vào."
          error={errors.status?.message}
        >
          {({ id, describedBy, invalid }) => (
            <Select
              id={id}
              aria-describedby={describedBy}
              aria-invalid={invalid}
              {...register("status")}
            >
              <option value="confirmed">Đã xác nhận</option>
              <option value="pending">Chờ xác nhận</option>
            </Select>
          )}
        </Field>
      </div>

      <Field
        label="Nội dung"
        required
        hint="Khoản thu này cho việc gì — ghi như trên phiếu."
        error={errors.reference?.message}
      >
        {({ id, describedBy, invalid }) => (
          <Textarea
            id={id}
            rows={2}
            aria-describedby={describedBy}
            aria-invalid={invalid}
            {...register("reference")}
          />
        )}
      </Field>

      {error instanceof ApiError && !error.isValidation ? (
        <p role="alert" className="text-danger text-sm">
          Chưa ghi được khoản thu. Vui lòng thử lại sau ít phút.
        </p>
      ) : null}

      <FormActions>
        <Button variant="secondary" size="sm" onClick={onCancel}>
          Huỷ
        </Button>
        <Button type="submit" size="sm" pending={pending}>
          Ghi nhận
        </Button>
      </FormActions>
    </form>
  );
}
