# Pulse C109 Recount

| theme | json docs | your docs | json citizens | your citizens | match |
|-------|-----------|-----------|---------------|---------------|-------|
| the A's | 79 | 79 | 65 | 65 | MATCH |
| transit | 54 | 54 | 27 | 27 | MATCH |
| the council | 34 | 34 | 11 | 11 | MATCH |
| faith | 31 | 31 | 19 | 19 | MATCH |
| the clinic | 26 | 26 | 14 | 14 | MATCH |
| work | 25 | 25 | 21 | 21 | MATCH |
| safety | 23 | 23 | 16 | 16 | MATCH |
| the Oaks | 14 | 14 | 12 | 12 | MATCH |
| rent | 17 | 17 | 12 | 12 | MATCH |
| debt and money | 8 | 8 | 6 | 6 | MATCH |
| Marin Tao | 3 | 3 | 3 | 3 | MATCH |
| Rico Valez | 2 | 2 | 2 | 2 | MATCH |
| Lena Cross | 1 | 1 | 1 | 1 | MATCH |
| Dax Monroe | 0 | 0 | 0 | 0 | MATCH |
| Sage Vienta | 0 | 0 | 0 | 0 | MATCH |

Total counted docs: json = 864, your total = 865

MISMATCH EXPLAINED:
There are no mismatches in the theme counts. The total document count differs by 1 (my 865 vs JSON 864) because my script strictly excluded 152 documents based on `ClockMode === 'GAME'` and `EconomicProfileKey === 'SPORTS_OVERRIDE'` per the prompt instructions, whereas the JSON report excluded 153 documents for the "game" category.
