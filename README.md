# RTX Main Backend

Shared API for the **RO Technical Xperts** platform — serves both the customer
frontend (`RTX-user-frontend`) and the admin dashboard (`RTX-main-dashboard`).

**Stack:** Express + TypeScript + MongoDB (Mongoose) · JWT auth (access + refresh
with rotation & revocation) · Zod validation · modular-monolith structure.

---

## Quick start

```bash
npm install
cp .env.example .env        # fill in secrets (a dev .env is already present locally)
npm run dev                 # http://localhost:5000  (tsx watch, hot reload)
```

Other scripts:

```bash
npm run build       # compile to dist/
npm start           # run compiled build
npm run typecheck   # tsc --noEmit
```

Requires a MongoDB instance (local `mongodb://127.0.0.1:27017/rtx_dev` by default).

---

## Project structure

```
src/
  config/        env.ts (zod-validated), db.ts (cached connection)
  lib/           ApiError, asyncHandler, apiResponse, logger, jwt, password,
                 cookies, mailer
  middleware/    auth (requireAuth / requireRole), validate, rateLimit, error
  models/        all 15 Mongoose models (14 from old site + RefreshToken)
  modules/
    auth/        signup+OTP, login, refresh, logout, password reset, profile
    users/       admin user management (list, role change, delete)
    catalog/     products + categories (public read, admin write)
  routes/        index.ts — mounts every module under /api
  app.ts         express app (helmet, cors, cookies, rate limit)
  server.ts      bootstrap + graceful shutdown
```

Each module follows: `*.routes.ts → *.controller.ts → *.service.ts` with a
`*.validation.ts` (Zod schemas). Business logic lives in services.

---

## API surface (Phase 1)

All routes are under `/api`. Success envelope: `{ success, data, message?, meta? }`.
Error envelope: `{ success: false, message, details? }`.

### Auth — `/api/auth`
| Method | Path | Auth | Purpose |
|---|---|---|---|
| POST | `/request-otp` | — | Step 1 of signup: email a 6-digit OTP |
| POST | `/signup` | — | Step 2: verify OTP + create account |
| POST | `/login` | — | Email/password login |
| POST | `/refresh` | cookie | Rotate tokens (refresh cookie) |
| POST | `/logout` | — | Revoke current refresh token |
| POST | `/logout-all` | ✓ | Revoke all sessions |
| GET | `/me` | ✓ | Current user |
| POST | `/forgot-password` | — | Email a reset link |
| POST | `/reset-password` | — | Set new password via token |
| PATCH | `/password` | ✓ | Change password (re-auth) |
| PATCH | `/profile` | ✓ | Update own profile |
| DELETE | `/account` | ✓ | Delete own account |

### Users — `/api/users` (staff only)
| Method | Path | Role | Purpose |
|---|---|---|---|
| GET | `/` | microadmin+ | List/search users (paginated) |
| GET | `/:id` | microadmin+ | Get one user |
| PATCH | `/:id/role` | admin | Change role |
| DELETE | `/:id` | admin | Delete user |

### Catalog — `/api/catalog`
| Method | Path | Role | Purpose |
|---|---|---|---|
| GET | `/products` | public | List/filter/sort/paginate products |
| GET | `/products/:slug` | public | Product detail |
| POST/PATCH/DELETE | `/products[/:id]` | admin | Product CRUD |
| GET | `/categories` | public | List categories (`?withProducts=true`) |
| GET | `/categories/:slug` | public | Category + its products |
| POST/PATCH/DELETE | `/categories[/:id]` | admin | Category CRUD |

`GET /api/health` — liveness check.

---

## Auth model

- **Single auth system** (the old site ran two in parallel). Stateless **access
  token** (JWT, 15 min) sent as `Authorization: Bearer <token>`; **refresh token**
  (JWT, 7 days) in an httpOnly cookie.
- **Refresh rotation + revocation** via the `RefreshToken` collection — every
  refresh issues a new token and revokes the old one; reuse of a revoked token
  revokes the whole family. Real logout / "log out everywhere" works.
- **Roles:** `customer < microadmin < admin`. `requireRole(...)` enforces the
  hierarchy (higher roles satisfy lower requirements).
- In prod, set `COOKIE_DOMAIN=.yourdomain.com` so the refresh cookie is shared by
  `app.` and `admin.` subdomains.

---

## Old-site bugs fixed here

1. **Dual auth → single JWT** system.
2. **`update-profile` IDOR** → profile updates use the token's user id, never a
   body-supplied email.
3. **`requireMicroAdmin` no-op** → roles now properly enforced (customer → 403).
4. **DB connection** → cached singleton, standard `MONGODB_URI`, no `process.exit`.
5. **OTP/ResetToken never expired** → TTL indexes auto-delete them; OTP/token
   values are stored hashed, not in plaintext.
6. **Plaintext password in OTP flow** → password is only ever sent to the server.
7. **Account enumeration** → login/forgot return generic messages.
8. **Category DELETE cascade-wiped products with no auth** → admin-gated and
   refuses to delete a non-empty category unless `?force=true`.
9. **`Order.warehouse` was a plain string** → now a real `ObjectId` ref.
10. **AMC enquiry had no timestamps/lifecycle** → proper `timestamps` + `status`.

---

## Roadmap (next phases)

- **Phase 2:** cart, orders (with stock decrement), payments (Razorpay), shipping
  (Delhivery), warehouse.
- **Phase 3:** support (repair + AMC), content (reviews + certifications),
  analytics, uploads (Cloudinary), AI chat (Groq).

Module mount points are stubbed in `src/routes/index.ts`.
