# Viewesta Backend API Endpoints

Base URL (local dev): `http://localhost:3000/api/v1`

If the backend is shared through ngrok, prepend the tunnel domain instead (example: `https://abcd-1234.ngrok-free.app/api/v1`). Keep `/api/v1` in every path.

---
## How to Consume This API

### Required headers
- `Content-Type: application/json` for POST/PUT requests with JSON bodies.
- `Authorization: Bearer <JWT>` for any route marked **(auth)**. Obtain the token from `POST /auth/login`.

### CORS origins
Set the backend `.env` (`FRONTEND_URL`) to the frontend’s origin (e.g., `http://localhost:5173`). When using ngrok, add that ngrok URL to the allowed origins.

### Pagination & filtering
- List endpoints accept standard query params noted below (`limit`, `offset`, `page`, `status`, etc.).
- Responses wrap data in `{ "success": true, "data": { ... } }` with optional `pagination` metadata: `{ total, page, pages, limit }`.

### Error format
Errors return `{ "success": false, "error": "Message", "errors": [...] }` with appropriate HTTP status codes.

### Quick integration checklist
1. Backend running locally (`npm run dev`) or exposed via `ngrok http 3000`.
2. Frontend env var pointing to the base URL, e.g., `VITE_API_BASE=https://<host>/api/v1`.
3. Hit `GET /health` to confirm connectivity before wiring the rest of the flows.
4. Use the tables below to map UI screens to endpoints.
    
---
## Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/auth/register` | Register user |
| POST | `/auth/login` | Login user |
| GET | `/auth/me` | Current user profile (auth) |
| PUT | `/auth/profile` | Update profile (auth) |
| PUT | `/auth/change-password` | Change password (auth) |
| POST | `/auth/request-verify` | Send verification email |
| POST | `/auth/verify` | Verify email token |
| POST | `/auth/request-reset` | Request password reset |
| POST | `/auth/reset` | Reset password |

**Payloads**
- Register: `{ email, password, first_name, last_name, user_type? }`
- Login: `{ email, password }`
- Update profile: `{ first_name?, last_name?, phone?, avatar_url? }`
- Change password: `{ current_password, new_password }`
- Request reset / verify: `{ email }`, `{ token }` as applicable

---
## Movies
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/movies` | List movies (`status`, `category_id`, `search`, `limit`, `offset`, `sort_by`, `order`) |
| GET | `/movies/featured` | Featured movies |
| GET | `/movies/trending` | Trending movies |
| GET | `/movies/:id` | Movie details |
| POST | `/movies` | Create movie (filmmaker/admin) |
| PUT | `/movies/:id` | Update movie (owner/admin) |
| DELETE | `/movies/:id` | Delete movie (owner/admin) |

**Query params:** `status`, `category_id`, `filmmaker_id`, `is_featured`, `search`, `limit`, `offset`, `sort_by`, `order`

**Payloads**
- Create/Update: `{ title, description?, synopsis?, poster_url?, backdrop_url?, trailer_url?, release_date?, duration_minutes?, category_id?, language?, country?, status?, is_featured? }`
- Pricing: `{ quality, price, is_free }`
- Video files: `{ quality, file_url, file_size?, duration_seconds?, s3_key? }`
- Reviews: `{ rating (1-5), review_text? }`

### Movie Pricing
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/movies/:movieId/pricing` | Get pricing |
| POST | `/movies/:movieId/pricing` | Set pricing (owner/admin) |
| PUT | `/movies/:movieId/pricing/:quality` | Update pricing (owner/admin) |
| DELETE | `/movies/:movieId/pricing/:quality` | Delete pricing (owner/admin) |

### Movie Video Files
| Method | Endpoint |
|--------|----------|
| GET | `/movies/:movieId/video-files` |
| POST | `/movies/:movieId/video-files` (owner/admin) |
| PUT | `/movies/:movieId/video-files/:fileId` (owner/admin) |
| DELETE | `/movies/:movieId/video-files/:fileId` (owner/admin) |

### Reviews
| Method | Endpoint |
|--------|----------|
| GET | `/movies/:movieId/reviews` |
| POST | `/movies/:movieId/reviews` (auth) |
| GET | `/movies/:movieId/reviews/my-review` (auth) |
| DELETE | `/movies/:movieId/reviews/:reviewId` (auth) |

---
## Categories
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/categories` | List categories |
| GET | `/categories/:id` | Category details + movie count |
| POST | `/categories` | Create category (admin) |
| PUT | `/categories/:id` | Update category (admin) |
| DELETE | `/categories/:id` | Delete category (admin) |

**Payloads:** `{ name, description?, slug, icon_url?, is_active? }`

---
## Series
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/series` | List series (`status`, `category_id`, `is_featured`, `limit`, `page`) |
| GET | `/series/:id` | Series details with seasons and episodes |
| POST | `/series` | Create series (filmmaker/admin) |
| PUT | `/series/:id` | Update series (filmmaker/admin) |
| DELETE | `/series/:id` | Delete series (admin) |
| POST | `/series/:id/seasons` | Add season to series (filmmaker/admin) |
| POST | `/series/:id/seasons/:seasonId/episodes` | Add episode to season (filmmaker/admin) |

**Payloads**
- Series create/update: `{ title, description?, synopsis?, poster_url?, backdrop_url?, trailer_url?, release_date?, status?, filmmaker_id?, category_id?, language?, country?, is_featured? }`
- Add season: `{ season_number, title?, synopsis?, release_date? }`
- Add episode: `{ episode_number, title, description?, duration_minutes?, video_url?, release_date?, status? }`

---
## Watchlist
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/watchlist` | Get watchlist (auth) |
| POST | `/watchlist/:movieId` | Add movie (auth) |
| DELETE | `/watchlist/:movieId` | Remove movie (auth) |
| GET | `/watchlist/:movieId/check` | Check if movie is in watchlist |

## Favorites
| Method | Endpoint |
|--------|----------|
| GET | `/favorites` |
| POST | `/favorites/:movieId` |
| DELETE | `/favorites/:movieId` |
| GET | `/favorites/:movieId/check` |

## Watch History
| Method | Endpoint |
|--------|----------|
| GET | `/watch-history` |
| GET | `/watch-history/continue-watching` |
| PUT | `/watch-history/:movieId` |
| DELETE | `/watch-history/:movieId` |

---
## Wallet
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/wallet` | Get wallet balance (auth) |
| POST | `/wallet/topup` | Top up wallet (auth) |
| GET | `/wallet/transactions` | Get transaction history (auth) |
| PUT | `/wallet/currency` | Update wallet currency (auth) |

---
## Payments
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/payments/purchase` | Purchase movie (TVOD) (auth) |
| POST | `/payments/verify` | Verify payment transaction (auth) |
| GET | `/payments/purchases` | Get my purchases (auth) |

---
## Subscriptions
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/subscriptions/plans` | Get subscription plans (public) |
| POST | `/subscriptions/subscribe` | Subscribe to plan (auth) |
| GET | `/subscriptions/me` | Get my subscription (auth) |
| PUT | `/subscriptions/:subscription_id/cancel` | Cancel subscription (auth) |
| PUT | `/subscriptions/:subscription_id/auto-renew` | Update auto-renew setting (auth) |

---
## Webhooks
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/webhooks/flutterwave` | Flutterwave payment webhook |
| POST | `/webhooks/stripe` | Stripe payment webhook |

---
## Health Check
| Method | Endpoint |
|--------|----------|
| GET | `/health` | 
---

All protected routes require `Authorization: Bearer <token>`.

