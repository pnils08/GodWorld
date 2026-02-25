---
paths:
  - "dashboard/**"
  - "server/**"
  - "public/**"
---

# Dashboard Rules

- API endpoints serve the GodWorld dashboard. All endpoints return JSON.
- Use the service account (`credentials/service-account.json`) for Google Sheets access.
- Sheet helper functions are in `lib/sheets.js` — use `getSheetData()` and `batchUpdate()`.
- Dashboard runs on Express. Static files in `public/`, API routes in `server/`.
- Citizen data comes from Simulation_Ledger. Article data from Press_Drafts. Storylines from Storyline_Tracker.
