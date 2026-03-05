# Canon Archive Ledger — GodWorld / Bay Tribune

**Generated:** 2026-03-05 | **Files:** 378 | **Phase 19.2**
**Location:** `output/drive-files/` (local archive, synced from Google Drive)

## Structure

| Desk | Files | Key Reporters |
|------|-------|---------------|
| archive | 45 | Editions C1-83, supplementals, text mirrors |
| sports | 119 | P Slayer (38), Hal Richmond (33), Anthony (29), DJ Hartley, Luis Navarro, Mike Paulson |
| data | 111 | TrueSource cards (MLB roster, prospects, former), Bulls universe, stat templates |
| culture | 26 | Maria Keen (6), Sharon Okafor (5), Kai Marston (3), Elliot Graye (3), Mason Ortega (3), Noah Tan (3), Trevor Shimizu (3) |
| editor | 23 | Mags Corliss — editorials (16), human interest (4), profile (3) |
| general | 25 | Speculative/MintConditionOakTown (7), National/Dana Reeve (7), Wire/Reed Thompson (5), Opinion/Farrah Del Rio (3) |
| civic | 14 | Carmen Delaine (3), Dr. Lila Mezran (4), Angela Reyes (3), Sgt. Rachel Torres (2) |
| chicago | 10 | Mara Vance (5), Chicago supplementals (5) |
| business | 4 | Jordan Velez |

## Directory Layout

```
output/drive-files/
  archive/                    # 45 — editions, supplementals, text mirrors
  sports/
    anthony/                  # 29 — columns, analytics, vs-history series
    hal/                      # 33 — features, essays, origins, dynasty comparisons
    p-slayer/                 # 38 — syndicate, interviews, spotlights, hot takes
    dj-hartley/               # 5  — photo archive
    luis-navarro/             # 7  — investigations
    mike-paulson/             # 5  — pressers, transcripts
    elliot-marbury/           # 1  — profile
    arman-gutierrez/          # 1  — profile
  data/
    as-universe/
      mlb-roster/             # 41 — TrueSource DataPages, POP records, image manifests
      former-players/         # 15 — departed player profiles
      prospects/              # 14 — top prospect DataPages
      front-office/           # 5  — team timeline, rotation, coaching, transactions
      developmental/          # 3  — A/AA/AAA prospect batches
      storylines/             # 1  — origin core players
      stats-csv/              # 4  — master stat sheets
    bulls/
      front-office/           # 2  — contracts, financials
      players/                # 6  — Trepagnier, Stanley, Essengue
    templates/                # 22 — Statcast cards, Savant style, PANDAS, scouting
  civic/
    carmen-delaine/           # 3  — civic ledger columns
    angela-reyes/             # 3  — education desk
    dr-lila-mezran/           # 4  — health desk
    rachel-torres/            # 2  — public safety
  culture/
    maria-keen/               # 6  — culture desk, human interest
    kai-marston/              # 3  — arts & entertainment
    mason-ortega/             # 3  — food & hospitality
    elliot-graye/             # 3  — faith & ethics
    noah-tan/                 # 3  — weather & environment
    sharon-okafor/            # 5  — lifestyle
    trevor-shimizu/           # 3  — transportation & infrastructure
  editor/
    editorials/               # 16 — Mags Corliss columns and essays
    human-interest/           # 4  — civic culture, lantern parade
    profile/                  # 3  — chronicle, image manifests
  general/
    wire/                     # 5  — TWS Wire, Reed Thompson
    national/                 # 7  — Dana Reeve, continental network
    speculative/              # 7  — MintConditionOakTown, rumor threads
    opinion/                  # 3  — Farrah Del Rio
    internet-trends/          # 2  — Celeste Tran
    simon-leary/              # 2  — long-form culture
  chicago/
    supplementals/            # 5  — Chicago satellite editions
  business/
    jordan-velez/             # 4  — economics desk
```

## Agent Search Patterns

Agents should use these Glob/Grep patterns to find relevant archive material:

| Agent | Search Pattern | What It Finds |
|-------|---------------|---------------|
| sports-desk | `output/drive-files/sports/**/*.txt` | All sports journalism (119 files) |
| sports-desk | `output/drive-files/data/as-universe/**/*.txt` | All A's player data (83 files) |
| sports-desk | `output/drive-files/data/templates/**/*.txt` | Stat templates (22 files) |
| civic-desk | `output/drive-files/civic/**/*.txt` | All civic journalism (14 files) |
| civic-desk | `output/city-civic-database/initiatives/**/*.txt` | Filed civic documents (Phase 18) |
| culture-desk | `output/drive-files/culture/**/*.txt` | All culture journalism (26 files) |
| business-desk | `output/drive-files/business/**/*.txt` | Business desk (4 files) |
| chicago-desk | `output/drive-files/chicago/**/*.txt` | Chicago bureau (10 files) |
| chicago-desk | `output/drive-files/data/bulls/**/*.txt` | Bulls universe data (8 files) |
| letters-desk | `output/drive-files/general/**/*.txt` | Wire, opinion, speculative (25 files) |
| any agent | `Grep pattern="{name}" path="output/drive-files/"` | Find all mentions of a character |
