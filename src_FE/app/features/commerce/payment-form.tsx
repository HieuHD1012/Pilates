import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useWatch } from "react-hook-form";
import { z } from "zod";

import { ApiError } from "~/lib/api/client";
import type { RecordPaymentRequest, StudentResponse } from "~/lib/api/schema";
import { formatDate, formatVnd } from "~/lib/format";
import { Button } from "~/ui/button";
import { Field, FormActions, Input, Select, Textarea } from "~/ui/field";
import { Figures } from "~/ui/figure";

import { useStudentPackages } from "./queries";

/**
 * Recording money the studio was handed.
 *
 * A payment belongs to a **package**, not to a person: `student_package_id` is
 * required by `POST /payments`. So the student is a way of finding the package,
 * and the package is the thing being paid for. Selling the package is a
 * separate transaction that has already added the credits — this record only
 * says the money arrived.
 *
 * There is no status choice. Everything lands as `PENDING` and is confirmed by
 * `POST /payments/{id}/confirm`, which is the step that puts it in the revenue
 * report; letting this form claim "confirmed" would skip the check the studio
 * actually performs.
 */

const schema = z.object({
  studentId: z.string().min(1, "Chọn học viên"),
  packageId: z.string().min(1, "Chọn gói tập"),
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
  method: z.enum(["CASH", "TRANSFER"]),
  note: z.string().trim().max(500, "Ghi chú quá dài"),
});

export type PaymentFormValues = z.input<typeof schema>;

const FIELD_ALIASES: Record<string, keyof PaymentFormValues> = {
  student_package_id: "packageId",
  amount: "amount",
  method: "method",
  note: "note",
};

export function PaymentForm({
  students,
  lockedStudent,
  pending,
  error,
  onSubmit,
  onCancel,
}: {
  /** The roster to choose from. Omitted when the student is already decided. */
  students?: StudentResponse[];
  /** Recording from a student's own profile — the student is not a question. */
  lockedStudent?: { id: number; fullName: string };
  pending: boolean;
  error: unknown;
  onSubmit: (input: RecordPaymentRequest) => Promise<unknown>;
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
      studentId: lockedStudent ? String(lockedStudent.id) : "",
      packageId: "",
      amount: "",
      method: "TRANSFER",
      note: "",
    },
  });

  // Echoed back in words as it is typed, because "4250000" and "42500000" look
  // alike in a box and differ by a factor of ten.
  const amountField = useWatch({ control, name: "amount" });
  const typed = Number(String(amountField ?? "").replace(/[^\d]/g, ""));
  const preview = Number.isFinite(typed) && typed > 0 ? formatVnd(typed) : null;

  // The packages to pay for load once a student is chosen; there is no
  // studio-wide list of sold packages to pick from, and there should not be.
  const studentField = useWatch({ control, name: "studentId" });
  const selectedStudentId = studentField === "" ? null : Number(studentField);
  const packages = useStudentPackages(
    { student_id: selectedStudentId ?? undefined },
    { enabled: selectedStudentId !== null },
  );

  const roster = [...(students ?? [])].sort((a, b) =>
    a.full_name.localeCompare(b.full_name, "vi"),
  );

  return (
    <form
      noValidate
      className="flex flex-col gap-5"
      onSubmit={handleSubmit((values) => {
        const parsed = schema.parse(values);
        return onSubmit({
          student_package_id: Number(parsed.packageId),
          amount: Number(parsed.amount),
          method: parsed.method,
          note: parsed.note === "" ? null : parsed.note,
        }).catch((cause) => {
          if (cause instanceof ApiError && cause.isValidation) {
            for (const [field, messages] of Object.entries(cause.fieldErrors)) {
              const target = FIELD_ALIASES[field];
              if (target !== undefined) {
                setError(target, { message: messages[0] ?? "Giá trị chưa hợp lệ" });
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
                <option key={student.id} value={String(student.id)}>
                  {student.full_name}
                </option>
              ))}
            </Select>
          )}
        </Field>
      )}

      <Field
        label="Gói tập"
        required
        hint="Khoản thu này trả cho gói nào."
        error={errors.packageId?.message}
      >
        {({ id, describedBy, invalid }) => (
          <Select
            id={id}
            disabled={selectedStudentId === null || packages.isPending}
            aria-describedby={describedBy}
            aria-invalid={invalid}
            {...register("packageId")}
          >
            <option value="">
              {selectedStudentId === null
                ? "— Chọn học viên trước —"
                : packages.isPending
                  ? "Đang tải gói…"
                  : "— Chọn gói —"}
            </option>
            {(packages.data ?? []).map((item) => (
              <option key={item.id} value={String(item.id)}>
                {item.name_snapshot} · {formatDate(`${item.start_date}T00:00:00+07:00`)}
              </option>
            ))}
          </Select>
        )}
      </Field>

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
                " "
              )}
            </p>
          </>
        )}
      </Field>

      <Field label="Phương thức" required error={errors.method?.message}>
        {({ id, describedBy, invalid }) => (
          <Select
            id={id}
            aria-describedby={describedBy}
            aria-invalid={invalid}
            {...register("method")}
          >
            <option value="TRANSFER">Chuyển khoản</option>
            <option value="CASH">Tiền mặt</option>
          </Select>
        )}
      </Field>

      <Field
        label="Ghi chú"
        hint="Bỏ trống nếu không có gì cần ghi thêm."
        error={errors.note?.message}
      >
        {({ id, describedBy, invalid }) => (
          <Textarea
            id={id}
            rows={2}
            aria-describedby={describedBy}
            aria-invalid={invalid}
            {...register("note")}
          />
        )}
      </Field>

      <p className="text-ink-2 text-xs">
        Phiếu được ghi ở trạng thái chờ xác nhận. Xác nhận ở bảng thanh toán khi đã thấy
        tiền — chỉ phiếu đã xác nhận mới vào báo cáo doanh thu.
      </p>

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
