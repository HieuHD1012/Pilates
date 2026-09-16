# Routing

Route table: `app/routes.ts`. Pre-render list: `app/content/prerender-paths.ts`.

## URL design

Public URLs are Vietnamese, because that is what the audience searches and what
gets indexed. Authenticated areas are namespaced by audience, so any URL says at
a glance who it belongs to.

| Prefix                         | Audience                  | Served by         |
| ------------------------------ | ------------------------- | ----------------- |
| `/`                            | Public                    | Pre-rendered HTML |
| `/dang-nhap`, `/quen-mat-khau` | Auth                      | SPA fallback      |
| `/hv/*`                        | Học viên — student        | SPA fallback      |
| `/hlv/*`                       | Huấn luyện viên — trainer | SPA fallback      |
| `/studio/*`                    | Studio & staff            | SPA fallback      |

## Current routes

```
/                        home                    prerendered
/gioi-thieu              studio                  prerendered
/dich-vu                 class formats           prerendered
/goi-tap                 how packages work       prerendered
/huan-luyen-vien         trainers (roster = query) prerendered shell
/lich-tap                schedule (data = query) prerendered shell
/lien-he                 contact                 prerendered
/dat-tu-van              consultation form       prerendered

/dang-nhap  /quen-mat-khau

/hv         → /hv/lop-hoc
/hv/lop-hoc                 bookable classes
/hv/lop-hoc/:classId        class detail + booking   ← Reference C
/hv/lich-cua-toi            my schedule
/hv/goi-tap                 my packages

/hlv        → /hlv/hom-nay
/hlv/hom-nay                today's teaching

/studio     → /studio/tong-quan
/studio/tong-quan           dashboard
/studio/lich                weekly calendar          ← Reference B

*                           404
```

## Adding a route

1. Decide the audience → pick the layout.
2. Decide whether it is public and stable. If yes, add it to
   `prerender-paths.ts` and give it a `meta` export with a title and
   description. If no, it is a runtime route and must own its data with
   TanStack Query.
3. Authenticated routes export
   `meta: () => [{ name: "robots", content: "noindex" }]`.
4. Dynamic IDs stay in the URL and must survive a hard refresh — never move a
   record id into component state to make prerendering easier.
5. If it appears in navigation, add it to `app/content/nav.ts`. **A nav entry
   pointing at a route that does not exist is a shipped 404.**
6. `npm run build && npm run check:build-contract` — the new document must
   appear, or the route must correctly fall through to the SPA fallback.
