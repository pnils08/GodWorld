---
name: clockmode-media-guard
enabled: true
event: file
pattern: ClockMode.*(desk|edition|article|media|coverage|story|filter|packet|workspace)
action: warn
---

BUG ALERT: ClockMode is strictly an engine guard (ENGINE/GAME/CIVIC/MEDIA). It must NEVER be used to filter citizens for media, desk, or edition purposes. All 700+ citizens are Oakland citizens. Using ClockMode as a media filter erased 170 citizens from the world in a previous session. Check CLAUDE.md Gotchas.
