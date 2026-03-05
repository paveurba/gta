# Track 2 - Backend Code Review

## Scope

- Authentication, player, vehicle, inventory, jobs modules
- Repository/service/database layers

## Findings

### P1 - No input validation policy for auth payloads
- Status: Open
- Details: `/register` and `/login` accept any email/password format and minimal-length values.
- Evidence:
  - `main/server/modules/authentication/index.ts`
  - `main/server/services/auth.service.ts`
- Risk: malformed data in DB, weak operational behavior under abuse.

### P2 - `JWT_SECRET` is configured but not used
- Status: Open
- Details: `authConfig.jwtSecret` exists but no token/session signing is implemented.
- Evidence:
  - `main/server/database/config.ts`
  - `main/server/services/auth.service.ts`
- Risk: config drift and confusion about expected auth model.

### P3 - MySQL repository pattern is correctly centralized
- Status: Pass
- Evidence:
  - `main/server/repositories/user.repository.ts`
  - `main/server/repositories/vehicle.repository.ts`
  - `main/server/repositories/inventory.repository.ts`
  - `main/server/repositories/job.repository.ts`

### P3 - Command routing is functional but duplicates parsing logic
- Status: Improvement suggested
- Evidence:
  - `main/server/modules/*/index.ts`
- Risk: harder to extend as command count grows.

## Recommendation

1. Add strict DTO validation for auth and command params.
2. Either implement JWT/session token flow or remove JWT settings until needed.
3. Add a shared command dispatcher to reduce duplicated command parsing.
