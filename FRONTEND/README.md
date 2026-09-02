# TynyLink frontend

A clean Vite + React (JavaScript) frontend using the existing Express backend. All integration changes are in `FRONTEND`; no backend files were changed.

## What is connected

- Anyone can create a random short link without an account.
- Sign up or sign in to unlock the optional **Custom name** field. Leaving it blank still generates a random name.
- The long URL stays in the form while the sign-up/sign-in dialog is open.
- Sessions are restored on page load and cleared using the backend's sign-out route.

`src/lib/api.js` uses `fetch` with `credentials: 'include'` for every request. The server sets the HTTP-only `accessToken` cookie; React never reads the token or stores it in local storage. Both registration and login are followed by `/api/auth/me` to confirm that the cookie actually works. Registration currently returns only a message, so its response alone is not treated as a signed-in session.

| Action | Backend request |
| --- | --- |
| Random short link | `POST /api/create` with `{ "url": "https://example.com" }` |
| Custom short link | `POST /api/create` with `{ "url": "https://example.com", "slug": "my-link" }` and the session cookie |
| Sign up | `POST /api/auth/register` with `{ "name", "email", "password" }` |
| Sign in | `POST /api/auth/login` with `{ "email", "password" }` |
| Check session | `GET /api/auth/me` |
| Sign out | `POST /api/auth/logout` |

The existing backend ignores `slug` for unauthenticated visitors. Before sending a custom-name request, the frontend rechecks `/me`; it also checks that the returned short URL really uses the requested name. An expired session prompts sign-in instead of silently showing a random link as a custom one. Frontend checks are for usability; the backend remains responsible for authorization and validation.

## Run locally

Start your backend first, once the existing backend issues listed below are resolved:

```bash
cd BACKEND
npm run dev
```

Then start the frontend in a second terminal:

```bash
cd FRONTEND
npm run dev
```

During local development, leave `VITE_API_URL` empty. Vite proxies browser requests from the frontend's `/api` to `http://localhost:3000`. This keeps requests same-origin in the browser, including the authentication cookie. The current local preview is at `http://127.0.0.1:5174/`; use the URL printed by Vite if the port changes.

## Checks

```bash
npm run test
npm run lint
npm run build
```

The API tests mock `fetch`: they check request bodies, credential handling, signup/login session confirmation, anonymous/custom flows, duplicate names, expired sessions and failure handling. They do not create real accounts or database records and do not prove the backend runs successfully.

## Existing backend blockers (left unchanged)

The frontend wiring is complete, but the current backend cannot serve these flows until its existing errors are addressed:

1. `BACKEND/src/controller/auth.controller.js`: `get_current_user` declares `(req, req)` instead of `(req, res)`. `node --check` reports a duplicate-parameter syntax error, preventing startup.
2. `BACKEND/src/routes/auth.route.js`: the logout route references `logout_user` without importing it.
3. `BACKEND/src/services/auth.service.js`: login compares a plaintext password with `user.password`, although the query excludes that field and the model hashes passwords. The backend needs to select the hash and use its password-comparison method; required credentials also need server-side validation.
4. `BACKEND/src/models/user.model.js`: the save hook uses callback-style `next()` with the installed Mongoose 9 middleware API, which prevents registration.
5. `BACKEND/src/services/auth.service.js`: registration returns the previous lookup result (`user`, which is null) rather than `newUser`.

These are documented rather than modified because the backend folder is outside the requested edit scope. Live sign-up/sign-in/custom-link success cannot be claimed while these blockers remain.

## Production connection

Vite's development proxy is not included in the static production build. Prefer a same-origin reverse proxy for `/api` to your backend when deploying. Alternatively, set `VITE_API_URL` to your backend origin in the frontend build environment. A separate origin also requires compatible backend CORS and cookie settings; `credentials: 'include'` alone does not bypass the backend's `SameSite=Lax` policy for cross-site cookies. The backend's `APP_URL` determines the returned short-link origin and must point to its reachable redirect service.
