# Responsive

## QA breakpoints

375 · 390 · 768 · 1024 · 1440. Capture them all with:

```bash
node scripts/shoot.mjs http://localhost:5188 ./shots "/" "/studio/lich@staff" "/hv/lop-hoc@student"
```

The `@role` suffix sets the mocked identity so role-gated screens can be
reviewed.

## Priorities per audience

| Surface | Designed for              | Must also work at                     |
| ------- | ------------------------- | ------------------------------------- |
| Public  | 390 first, then 1440      | 768, 1024                             |
| Student | 390 — this is the product | 768+                                  |
| Trainer | 390                       | 768+                                  |
| Staff   | 1440, then 1024           | 768 usable; 390 functional, not dense |

## Rules

- Mobile is a design, not a narrowing. A dense table becomes a ruled list
  (`WeekGrid` → `WeekList`), never a shrunken grid.
- The page body never scrolls horizontally. Wide content scrolls inside its own
  `overflow-x-auto` container.
- Touch targets ≥ 44px. The student tab bar is 56px and respects
  `env(safe-area-inset-bottom)`.
- Use `min-h-dvh`, not `min-h-screen`, so mobile browser chrome does not clip.
- One gutter definition — the `gutter` utility: 20 / 40 / 64px.
- Public pages: seven-day grids become a day tab strip below `md`.
- Staff pages: the rail becomes a horizontal bar below `lg`.
