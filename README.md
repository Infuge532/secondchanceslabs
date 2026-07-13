# Second Chance Slabs — Website

Round-one demo site for client review. Heirloom walnut + epoxy river tables, Kansas City.

## Run locally
```
python3 -m http.server 8080
# open http://localhost:8080
```
(Use a server, not file:// — the lead-time module loads from content/site-config.json.)

## Update availability / lead time (no code)
Edit `content/site-config.json` — status, booking window, open slots, timelines, contact info. Save and redeploy that file.

## Continue development
Open this folder in Claude Code. Full project context, decisions, and roadmap are in `CLAUDE.md`.
