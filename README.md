# shenvigo-api

Shenvigo Phase 1 **API Lambda** — all business logic (groups, threads,
votes, profiles, admin). TypeScript, Node 20.

**No public ingress.** There is no API Gateway and no Function URL. The
only caller is the `shenvigo-bff-web` Lambda, which invokes this function
directly via the AWS SDK (`LambdaClient` / `InvokeCommand`). The
function's resource policy grants `lambda:InvokeFunction` to the BFF
role only.

## Direct-invoke convention

The BFF sends a JSON payload:

```json
{ "operation": "groups.list", "correlationId": "uuid", "payload": { ... } }
```

- `operation`: `"<domain>.<action>"` (required) — dispatched by the
  router in `src/index.ts`.
- `correlationId`: optional; generated if absent, propagated through
  logs and DynamoDB calls.
- `payload`: operation-specific input.

Responses are either the operation result or the standard error shape:

```json
{ "error": { "code": "UNKNOWN_OPERATION", "message": "..." } }
```

## Layout

```text
src/
├── index.ts                 # Lambda entry: operation router
├── handlers/                # Domain operations (health, groups, ...)
├── domain/                  # Pure business logic + key construction
├── lib/
│   ├── dynamo.ts            # DocumentClient; TABLE_NAME from env (never hardcoded)
│   ├── audit.ts             # ID-only audit logging (spec FR-013)
│   └── logger.ts            # Structured JSON logging, no PII
└── middleware/
    └── correlation.ts       # Correlation-ID propagation
cdk/                          # CDK stack: Lambda only, VPC private subnets
tests/                        # Vitest suites
```

Data model (single DynamoDB table, `PK`/`SK` patterns) is defined in
`shenvigo-meta/specs/001-phase-1-community/data-model.md`.

## Local dev

```bash
npm install
npm test        # vitest
npm run build   # tsc -> dist/
npm run lint
```

`TABLE_NAME` must be set to run handlers that touch DynamoDB.

## Deploy

Foundations first (`shenvigo-infra`, `shenvigo-data`), then this repo.
Cross-stack values come from SSM `/shenvigo/*`; pass them as CDK
context (see `cdk/app.ts`):

```bash
cd cdk
npm install
npx cdk deploy -c tableName=... -c vpcId=... \
  -c privateSubnetIds=subnet-a,subnet-b -c bffRoleArn=...
```

CI (`.github/workflows/`, added by the owner — the GitHub App cannot
write workflow files) runs tests → `cdk synth` → `cdk deploy` on PR
merge to `main` via OIDC.

## Conventions

- TypeScript `strict`, no `any` (enforced by ESLint).
- No secrets in code; no PII in logs or audit entries (constitution III).
- Reference implementation for the old web stack lives in
  `devchatmateapp/x-shenvigo-web` (do not copy its Python patterns —
  this repo is TypeScript/Node 20).
