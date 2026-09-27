# Remedy Place — reservable experience experiment

Branch `codex/ref-remedy-place`, independently from `main` `9d64fb3`.

Official [Remedy Place home](https://www.remedyplace.com/) and [classes](https://www.remedyplace.com/classes) (reviewed 2026-09-27) make the physical club legible, then expose each reservable experience with a clear action. The useful pattern is **a premium place that quickly becomes a practical choice**. Soul is one reformer studio with Group and Private, not a multi-club wellness chain. No ice bath, sauna, medical benefit, exclusive membership or external price is borrowed.

## Structure before implementation

```text
PLACE: real room image plus a short orientation and one enquiry path
CHOOSE: two reservable-format rows, each with a concrete description and action
VISIT: how the first visit actually works
SCHEDULE: live availability states, then consultation
```

This differs from Surrenne's destination-only reveal: the choice and action should appear immediately after the room, with less theatrical empty space. Studio and Services routes must continue the same place-to-choice journey.

Image roles: real same-owner room image is place evidence, not proof of the new branch address; real reformer action shows one person practicing, not a private coach or group; chair portrait can express control but must not be described as reformer. Do not use captions or generated amenities. On mobile, the room and opening sentence share a bounded first stage, then each choice has its own action. Reject if visitors must scroll past a decorative image to find formats or if missing location facts are concealed.

## Review after implementation

Home, Services, Studio and Consultation were captured at 1440/1024/768/390, with first-fold captures at 1440/390 (24 images). The first Home capture failed visually: the intrinsic room image grew taller than the intended opening and caused text and the following format rows to collide. A fixed desktop stage and a bounded mobile image corrected the composition; the captures were repeated. The first browser sweep then found horizontal overflow because percentage grid columns plus a gap exceeded the container. Fractional columns fixed it. A separate interactive failure exposed a pre-existing mobile menu issue: `backdrop-filter` on the sticky header became a containing block for the fixed menu, making its height zero. Removing that filter restored menu interaction. These were visual/interaction defects that `npm run verify` could not detect.

The real room image now acts as one half of the opening rather than as an isolated insert; Group and Private follow immediately with distinct links. The real reformer action is paired with a statement about coached movement, not a claim that a specific trainer or group is pictured. The room and action derivatives come from the same owner's studio archive; the tiny former marks were removed from `studio-17.jpg` and `studio-15.jpg` in the earlier Othership experiment, with original files preserved. No imagined room, amenity, customer or coach is used.

**Fit decision:** The place-to-choice journey is usable and more direct than Surrenne, but the visible room has functional fluorescent fittings and equipment storage. This honest photograph limits the luxury impression. Missing verified address, hours, phone, map and Zalo also weaken a destination-led page. Keep the reservation pattern for comparison, not as a launch recommendation.
