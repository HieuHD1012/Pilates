# Forms

React Hook Form + Zod via `@hookform/resolvers`. Primitives in `app/ui/field.tsx`.

## Shape

```tsx
<Field label="Số điện thoại" required hint="…" error={errors.phone?.message}>
  {({ id, describedBy, invalid }) => (
    <Input
      id={id}
      type="tel"
      inputMode="tel"
      autoComplete="tel"
      aria-describedby={describedBy}
      aria-invalid={invalid}
      {...register("phone")}
    />
  )}
</Field>
```

`Field` owns the id, the label association, the hint and error ids, and the
`aria-describedby` wiring, so no screen can forget them.

## Rules

- **Visible labels above the control. No floating labels** — they collide with
  Vietnamese diacritics against the field border and they hide the question the
  moment someone starts answering.
- Errors sit directly under their own field. Backend `fieldErrors` are mapped
  onto the matching field, never dumped at the top.
- Required is marked with a `*` plus a screen-reader-only "(bắt buộc)".
- Correct mobile input types and `autoComplete` on every field.
- `noValidate` on the form; Zod is the single validation authority.
- Values survive a recoverable error. Only a successful submit resets.
- Destructive actions are confirmed in a `Dialog`.
- Prefer the native `<select>`. It is keyboard- and screen-reader-correct
  everywhere and opens the platform picker on a phone. Reach for Radix Select
  only when options need rich content.

## Validation copy

Vietnamese, specific, and about what to do. Phone numbers use a deliberately
permissive pattern (`+84`/`0`, 10 digits, `03|05|07|08|09`) — a form that
rejects a real customer's number is worse than one staff can correct later.

## Submission

```tsx
onSubmit={handleSubmit((values) => mutation.mutateAsync(values).catch(() => {}))}
```

The `catch` is intentional: the mutation's `onError` renders the failure, and an
unhandled rejection would otherwise surface as a console error.

Success replaces the form with a result state that says what happens next — see
`app/routes/public/consultation.tsx`.
