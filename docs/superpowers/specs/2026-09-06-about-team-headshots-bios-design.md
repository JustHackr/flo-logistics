# About page — team headshots + short bios

**Status:** awaiting user review  
**Scope:** `/flo-logistics/about` member cards only (marketing site).  
**Out of scope:** presentation deck, homepage, partner rail, demo app.

## Goal

Replace letter-initial avatars with cropped FabLab headshots and expand each card with a short bilingual bio that includes role, venture, and publicly verifiable academic/competition highlights where available.

## Headshots

- Source: `team-site/public/images/team-fablab.png`
- Crop left → right as:
  1. Nabiil Zhafran Alrilo Tarigan → `team/nabiil.jpg`
  2. Arsene Matthew E. Naftali → `team/matthew.jpg`
  3. Justin Raditya Rizki → `team/justin.jpg`
- Output: square crops (~512×512), stored under `team-site/public/images/team/`
- UI: square image (~96–112px), sharp corners matching Blueprint Hybrid cards; initials remain fallback if image fails

## Card layout (unchanged order of fields)

1. Headshot  
2. Name  
3. Role (blue)  
4. Bio (muted, ~2–3 short sentences)  
5. Existing venture link line (`detail` / `detailHref`)

## Implementation approach

1. Crop three static headshot assets from the group photo.  
2. Extend `Avatar` to accept optional `src` (+ `alt`); keep initials fallback.  
3. Add `photo`, `bio` (and keep `detail` / `detailHref`) on each member in EN/ID dictionaries.  
4. Wire About page to pass photo + bio; no new dependencies; no global CSS redesign.

## Copy — English (proposed)

### Justin Raditya Rizki — Project Lead

Leads FLO’s product direction for Blibli’s AI Open Innovation Challenge 2026 case. Founder of StetoRadr. Competition track includes SASMO bronze, CTPS perfect score (SIMCC/NUS), IJCO CTF silver with top individual score, FIRST Tech Challenge Nusantara finalist (2nd) + Innovation award (3rd), and 1st place Indonesian Scratch Competition 2024 (JustToraja).

### Arsene Matthew E. Naftali — AI Engineer

Builds FLO’s computer-vision and model pipelines for the Blibli logistics case. Founder of OptiVox (local-first vision for attendance and operational awareness). Student at SMAS Pilar Indonesia; public competition records beyond the AI Open Innovation Challenge team entry were not found online.

### Nabiil Zhafran Alrilo Tarigan — Designer & Interface

Shapes FLO’s interface so operators can act on AI signals quickly. Co-founder of Foodloop AI. Student at SMAS Pilar Indonesia; public individual competition records were not found online — bio stays venture + current challenge focused unless the team supplies more.

## Copy — Indonesian (proposed)

### Justin Raditya Rizki — Project Lead

Memimpin arah produk FLO untuk kasus Blibli di AI Open Innovation Challenge 2026. Pendiri StetoRadr. Rekam jejak kompetisi: perunggu SASMO, skor sempurna CTPS (SIMCC/NUS), perak IJCO CTF dengan skor individu tertinggi, finalis FIRST Tech Challenge Nusantara (juara 2) + Innovation award (juara 3), dan juara 1 Indonesian Scratch Competition 2024 (JustToraja).

### Arsene Matthew E. Naftali — AI Engineer

Membangun pipeline computer vision dan model FLO untuk kasus logistik Blibli. Pendiri OptiVox (visi lokal untuk absensi dan kesadaran operasional). Siswa SMAS Pilar Indonesia; catatan kompetisi publik di luar tim AI Open Innovation Challenge belum ditemukan secara daring.

### Nabiil Zhafran Alrilo Tarigan — Designer & Interface

Merancang antarmuka FLO agar operator cepat menindaklanjuti sinyal AI. Co-founder Foodloop AI. Siswa SMAS Pilar Indonesia; catatan kompetisi individu publik belum ditemukan secara daring — bio tetap fokus venture + kompetisi saat ini kecuali tim menambahkan data.

## Sources used (Justin)

- Own Medium (JustRadr): [JustRADR Rewind 2023](https://medium.com/@justradrgaming/justradr-rewind-2023-5d1220f376e1) — SASMO bronze, CTPS, IJCO CTF, FTC Nusantara  
- Medium profile: JustToraja — 1st place Indonesian Scratch Competition 2024  
- BNPCHS 2024 registrants list — Capture The Flag / RadrRadr / Sekolah Pilar Indonesia  
- Existing site dictionaries — roles, ventures, SMAS Pilar / Blibli challenge framing  

## Open items for user

1. Confirm Justin competition lines are accurate enough to publish (condensed from his Medium).  
2. Optionally supply Matthew/Nabiil academic or competition lines to replace the “not found online” placeholders with concrete achievements.  
3. Optional: Youth Coding Club LinkedIn mentions “Justin Raditya Riski” as first winner — **omit** from live copy unless confirmed (spelling/attribution uncertain).

## Success criteria

- About cards show three headshots (L→R mapping correct).  
- EN/ID bios render via locale switcher.  
- Venture links still work.  
- Lint/build pass; deploy to live About page.
