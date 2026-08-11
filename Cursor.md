# Cursor.md — EM School project memory

Living notes for agents and developers. **Update this file** when you add features, change APIs, or make important decisions so we can come back to it later.

API references:
- Super Admin (Module 1+): [`openapi.yaml`](./openapi.yaml)
- Full portal surface (legacy inventory): [`swagger.yaml`](./swagger.yaml)
- SRS (product): `../School-Management-System-SRS.md`
- Arabic module docs: [`doc/`](./doc/)

---

## What this project is

**em-school** — Node/Express + TypeScript school management API (PostgreSQL via `pg` / migrations).

- Multi-tenant: school-scoped data keyed by the school user’s JWT `id`.
- **A school is a `users` row with `role = 'school'`** — there is no separate `schools` table.
- Package: Express 4, Zod validation, JWT auth, Multer uploads, Pino logging.
- Entry: `src/index.ts` → `src/app.ts` → routes under `/api`.
- Default local base: `http://localhost:8000/api` (see `PORT` in `.env`).

---

## Roles

| Role | Portal prefix | Notes |
|------|---------------|--------|
| `admin` | `/api/admin` | Super Admin — schools, registration codes, dashboard |
| `school` | `/api/school` | School Admin portal (grades, students, fees, …) |
| `teacher` | `/api/teacher` | Profile + own assignments |
| `parent` | `/api/parent` | Children’s attendance |
| `student` | — | Auth exists; limited portal surface today |
| `manager` | — | Role in types; check before relying on routes |

Auth header: `Authorization: Bearer <token>`.

---

## Module 1 — Super Admin: Schools & Registration Codes

**Status: DONE** (2026-08-11)

### Model (do not invent a parallel School entity)

| Concept | Storage |
|---------|---------|
| School | `users` where `role = 'school'` |
| Profile | `name`, `description`, `email`, `logo`, **`address`**, **`contact_phone`** |
| Lifecycle status | `users.status`: `active` \| `suspended` \| `deleted` (+ legacy `inactive` for other roles) |
| Registration code | Table `school_registration_codes` — unique `code`, one **active** row per school; regenerate → revoke old |

### Endpoints

| Method | Path | Notes |
|--------|------|--------|
| `GET` | `/api/admin/dashboard` | `{ schoolsCount, usersPerSchool, statusBreakdown }` |
| `GET` | `/api/admin/schools` | List + `q` + pagination |
| `POST` | `/api/admin/schools` | Multipart; **auto-issues** registration code |
| `GET` | `/api/admin/schools/:schoolId` | Includes active `registrationCode` |
| `PUT` | `/api/admin/schools/:schoolId` | Edit profile (+ optional logo) |
| `PATCH` | `/api/admin/schools/:schoolId/status` | Body `{ action: activate\|suspend\|soft-delete }` |
| `POST` | `/api/admin/schools/:schoolId/registration-code` | Ensure code (201 create / 200 existing) |
| `POST` | `/api/admin/schools/:schoolId/registration-code/regenerate` | Revoke + new code |

### Conventions (match existing admin schools)

- Auth: `authMiddleware(['admin'])`
- Validation: Zod via `validate()` → `400 { message, errors }`
- Errors: `HttpError` → `{ status, message, name }`
- Responses: wrap entities `{ school }`, `{ registrationCode }`, list `{ schools, pagination }`
- Create/update logo: multipart field `logo` (create still **requires** logo)

### Out of scope (Module 2 — do not implement yet)

- School Admin **self-registration** using the registration code
- Changing the current school login flow (`POST /auth/login` with email/password provisioned by admin)

Migration: `migrations/1768000000000_school_registration_codes_and_profile.sql`

---

## Route map (mounted today)

Source of truth: `src/routes.ts` + `src/routes/*.routes.ts`.

| Mount | File | Auth |
|-------|------|------|
| `POST /api/login` | alias → auth login | public |
| `/api/auth` | `auth.routes.ts` | login public; me/password JWT |
| `/api/admin` | `admin.routes.ts` | `admin` |
| `/api/school` | `school.routes.ts` | `school` |
| `/api/parent` | `parent.routes.ts` | `parent` |
| `/api/teacher` | `teacher.routes.ts` | `teacher` + teacherAuthMiddleware |

Static uploads: `/uploads`.

---

## Feature inventory

### Auth
- Unified login: `username` + `password` (email / username / phone).
- Blocked statuses: `inactive`, `suspended`, `deleted`.
- `GET /auth/me`, `PATCH /auth/password`.

### Super Admin — schools (Module 1)
- Full lifecycle + registration codes + dashboard (see Module 1 table above).

### School — academic years / students / attendance / fees / grades / subjects / teachers / schedule
- Unchanged portal under `/api/school/*` (see `swagger.yaml`).

### Teacher / Parent portals
- Teacher: `GET /teacher/me`, `GET /teacher/assignments`
- Parent: `GET /parent/attendance`

---

## Architecture notes

```
src/
  app.ts, index.ts, routes.ts
  routes/          # Express routers by portal
  controllers/     # HTTP layer
  services/        # Business logic
  models/          # SQL / data access
  validators/      # Zod schemas (zod/v4)
  middleware/      # auth, validate, errors
  resources/       # Response shaping (e.g. school.resource.ts)
  db/              # pool + migrate
  modules/         # Partial modular rewrite (not all wired)
  shared/          # Shared utils / errors (overlap with root utils)
```

**Pagination:** `limit` (default 20, max 100), `skip` (default 0).

**Important:** Prefer `openapi.yaml` + code over stale `doc/` pages when they conflict. Courses/contests/social invite surfaces in docs are largely **not** mounted.

---

## Change log

Append new entries at the **top** of this section (newest first).

### 2026-08-11 — Module 1
- Registration codes table + auto-issue on school create; ensure + regenerate endpoints.
- School profile: `address`, `contact_phone`; `PUT` edit; `PATCH` status (`activate` / `suspend` / `soft-delete`).
- `GET /api/admin/dashboard`.
- Docs: Module 1 section in this file; Super Admin paths in [`openapi.yaml`](./openapi.yaml).

### 2026-08-11
- Initial [`swagger.yaml`](./swagger.yaml) inventory of mounted `/api` routes.
- Added this memory file.

---

## How to keep this useful

1. After a feature or API change → update **Change log** + relevant Module table + `openapi.yaml` / `swagger.yaml`.
2. If you invent a convention → note it under Architecture notes.
3. Do not delete old change-log entries.
