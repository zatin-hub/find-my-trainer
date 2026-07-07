# Lessons (session-craft audit, 2026-07-07)

1. **Render before shipping UI.** curl+grep is not verification — the user caught
   4 visual regressions via screenshots (transparent panel, ugly native select,
   pin-icon pileup, static scroll fade). Use a real render/screenshot check
   before calling any UI change done.
2. **Compact at task boundaries.** One mega-session (perf → admin → geocode →
   multi-city → theme → deploy) burned ~$700, mostly history replay. When the
   file-set changes shape, /compact or new session.
3. **One dev server, one owner.** Ports drifted 3000→3001→3002; two servers ran
   at once once; one .next corruption. Pick one start/stop method per session.
4. **Gate logic gets tests the day it's written.** delete_trainer cascade and
   notifyMatchingSeekers (outbound email) sat in prod untested; now covered
   (tests/moderation.test.ts, tests/match.test.ts). Don't defer to a "quality pass".
5. **Delete temp pages before deploy.** /theme-preview shipped to prod unlinked.
