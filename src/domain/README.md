# Domain layer (planned)

Pure business logic for the Phase 1 domains, called by `src/handlers/`.
Each domain module owns its validation and DynamoDB key construction per
`specs/001-phase-1-community/data-model.md` (single table, `PK`/`SK`
patterns such as `GROUP#<slug>`, `THREAD#<uuid>`, `VOTE#<userId>`).

Planned modules (tasks T020+):

- `groups.ts` — group listing/detail, denormalized video/thread counts
- `videos.ts` — video publishing, `source` (`S3` | `EXTERNAL`) verification (FR-015/FR-016/FR-017)
- `threads.ts` — threads, replies, votes, sorting (score desc, newest tiebreak)
- `profiles.ts` — followed conditions, location; audit-logged reads (FR-013)
- `admin.ts` — group/video management, moderation

No PII in this layer's outputs beyond what the data model explicitly
allows; `contact`/`authSubject` are never returned.
