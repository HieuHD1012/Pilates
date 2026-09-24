# New design direction and experiment hypotheses

## Product jobs

Visitors ask: “Is this studio right for me, when could I come, and how do I make contact?” Students ask: “What can I book next and what will it cost my package?” Staff ask: “What requires action now, what is happening today, and where do I go to resolve it?” Trainers need their own next class and attendance roster. A single aesthetic rhythm cannot answer all four at equal density.

## Keep / modify / reject / unproven

| Status | Earlier principle or idea | Reason |
| --- | --- | --- |
| Keep | Honest studio facts, backend authority, Vietnamese typography, authentic photography, no heavy scrim, clear booking consequence | Supported by product rules or direct rendered value. |
| Modify | Rules and restraint; one primary action; measured spacing; “one winning subject” | Useful when they clarify a job, harmful when they bury facts, flatten task priority, or make every section alike. |
| Reject | “0 cards” as a quality measure; one structural device for every context; full vertical time axis as the only staff schedule view | Style or representation was treated as proof of workflow quality. |
| Unproven | One ask raises perceived price or conversion; a single frame improves trust; serif figures improve operational scan speed | Earlier reviews were small, self-selected, or aesthetic. Need user behaviour data. |

## Principles for implementation

1. Put the decision or task at the top; place supporting metrics after it unless the metric changes the decision.
2. Mark availability before asking students to choose a date. An empty initial screen must not hide available classes.
3. Keep time precise, but compress empty time when the weekly pattern has morning and evening clusters.
4. On mobile, recompose actions and navigation within the viewport; no document-level horizontal scroll.
5. Make one state visually dominant only when it truly has higher urgency; do not give every status and count equal typographic force.
6. Preserve genuine studio facts, booking consequences, and all existing mutation flows. New layouts must route to the same backend-owned actions.
7. Use one visual vocabulary across surfaces but choose density per job: public compare/decide, student browse/commit, staff triage/operate.

Anti-principles: no gradients, glass, decorative badges, extra icons, oversized KPI tiles, needless full-screen image, or blank space defended as “premium”; no hidden controls merely to preserve minimalism; no invented prices or biographies; no duplicated business rules in frontend.

## Three isolated hypotheses

### A — Execution repair

- **Suspected cause:** The foundation is broadly sound; broken responsive CSS, weak optical hierarchy, and oversized spacing account for most dissatisfaction.
- **Changes:** Keep route IA and existing calendar/booking models. Repair shared action wrapping and mobile overflow, tighten dashboard metric spacing and row composition, and reduce excessive public spacing/image height without changing section order.
- **Stays:** Navigation, same sections, week grid, student date-first browse, all business logic.
- **Expected:** Screens feel controlled, fit 390px and present more content per viewport.
- **Risk:** Calendar's blank middle and student's empty initial day may remain, proving the model itself is at fault.
- **Falsified if:** Defects disappear but primary tasks remain buried or require the same hunting.

### B — Information restructuring

- **Suspected cause:** Grouping and sequence are the main problem; style polish alone cannot establish the right hierarchy.
- **Changes:** Put operational action items before equal metrics, organize public content around choosing a format and a next step, and make student availability visible on day tabs with an available default day. Keep the week calendar but offer a compact day/agenda path so empty hours do less work.
- **Stays:** Existing routes, features, server data and transactions, the core restrained brand vocabulary.
- **Expected:** Faster first action and less search, while staff retain their familiar weekly model.
- **Risk:** More explicit grouping could increase visual noise or make orientation metrics too quiet.
- **Falsified if:** People still scan more or miss essential context relative to A.

### C — Workflow-first reconstruction

- **Suspected cause:** The earlier work was anchored to editorial page and literal-calendar models; the product needs task-specific screens built from user jobs.
- **Changes:** Staff dashboard becomes a work queue with direct routes to attendance, renewals and payments; calendar defaults to chronological agenda by day with a secondary spatial week view; student browse defaults to next available classes rather than an empty date tab; homepage leads with a compact offer/availability/contact decision unit and uses imagery as supporting evidence.
- **Stays:** Route URLs, real content gaps, API queries/mutations, booking confirmation and eligibility, brand fonts and restrained palette.
- **Expected:** Shortest path to the next useful action and strongest mobile robustness.
- **Risk:** Staff may lose the at-a-glance spatial week picture; agenda could obscure conflicts or create an extra mode choice.
- **Falsified if:** Users need the spatial view first or take more steps to compare days and trainers.

The versions test product hypotheses, not three colour schemes. Evaluation criteria are hierarchy, task path, scan effort, density, responsive width, state clarity, maintainability and code complexity. Neither screenshots nor this audit can establish conversion lift without users.
