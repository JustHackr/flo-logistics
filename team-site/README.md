# Quasarian team site

Public journey site for **Quasarian Radr-Lyon Dynasty** — AI Open Innovation Challenge 2026 (Blibli).

Base path: `/flo-logistics`

## Routes

| Path | Content |
|------|---------|
| `/` | Landing + journey timeline |
| `/about` | Team bios |
| `/pre-selection` | Proposal link |
| `/semifinal` | Vercel demo + YouTube |
| `/final` | Live demo, presentation, download zip |
| `/presentation` | 11-slide Bahasa Indonesia deck (← →, Print → PDF) |

## Local

```bash
npm install
npm run dev
```

Open http://localhost:3000/flo-logistics (Next applies basePath).

## Production

See `../deploy/README.md`. Docker image exposes port **3001**.
