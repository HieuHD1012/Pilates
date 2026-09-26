# Photograph composition from `main`

The public site is a studio service website. A photograph earns its place by answering a visitor's question; it does not fill a reserved aspect-ratio box. This decision starts from the unfilled `main` branch and the 21 source files in `thiet-ke/anh-studio/`, not from the previous image experiments. The research in `src_FE/docs/REFERENCE_LOCK.md` informs type, authenticity and restraint, but its five placeholder slots are not instructions to publish five pictures.

## Page structure before choosing files

```text
Home: studio proposition + consultation | evidence of a reformer session
      group/private choice → method → live timetable → first visit → consultation
Studio: claim about the small room | evidence of the room and reformers
        explanation of the layout → operating principles
Services: compare group/private, cancellation rules and next action
Other public pages: prices, people, schedule, notices and contact data; no decorative photos
Auth: short sign-in task | a quiet photograph that marks entry into the studio
```

## Selection

| Source | Published role | Why this frame | Placement |
| --- | --- | --- | --- |
| `studio-15.jpg` | Service evidence | A person is visibly working on a reformer; the apparatus is legible. | In the same home opening as the proposition and CTA, with a specific caption. |
| `studio-17.jpg` | Room evidence | This is the only clean, countable view of several reformers in the supplied room. | Beside the Studio opening and the explanation of a small room. |
| `studio-11.jpg` | Atmosphere | A quiet real exercise frame, in a portrait ratio that suits the sign-in threshold. | Auth layout on large screens only, outside the form's task flow. |

The other 18 files are not automatically rejected as photographs, but they have no role in this release. `01–09` carry a burned-in foreign wordmark and address and many show storage clutter. `10`, `16`, `18`, `19`, `20`, `21` are branded collateral or have baked text. `12–14` show chair/Cadillac exercises; they do not explain the reformer formats sold here. We do not repeat the same student image on multiple public pages, add a city strip, or borrow a student as a trainer portrait.

The source folder labels this set **J Pilates**, while the application says **Soul**. The selected frames avoid prominent source logos and captions, and the UI captions describe what is visibly present without naming the pictured business or person. Confirming that these files represent the intended studio remains a content decision for the owner before public release. The source files remain untouched; the preview copies are direct copies at their original ratios and resolution.

## Acceptance

- The photo and its relevant text must be one composition at 1440 and 768px and adjacent in reading order at 390px.
- Each image must show its subject without an accidental cut through the body or apparatus; no text sits on photographic detail.
- No empty image placeholder remains on a public or auth route. A trainer record without a portrait has a text-only layout.
- Capture the full public routes and sign-in route at 1440, 768 and 390px. Reject any photo that looks detached from the question answered by its section.

## Review result

Captured the nine pre-rendered public routes plus sign-in at 1440, 768 and 390px
(30 full-page PNGs in `docs/photo-review/`). The selected photos remain legible
beside the relevant copy at desktop and tablet widths and follow that copy in
mobile reading order. Automated checks across those 30 route/viewport pairs
found no horizontal overflow or broken visible images. No unused photo
placeholder remains. Representative
captures: `home-1440.png`, `home-390.png`, `gioi-thieu-1440.png`,
`gioi-thieu-390.png`, `dang-nhap-1440.png`.

`npm run verify` passed: typecheck, lint, 66 unit tests, production build, build
contract and code content gate. The content gate still reports the existing
unconfirmed contact facts. The source-photo identity question is recorded in
`src_FE/docs/OPEN_QUESTIONS.md` and requires owner confirmation.
