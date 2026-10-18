# IMovies Cinema Management

A small cinema-management starter with an Express/Mongoose API and a React frontend served from `public/` using React and Babel CDN scripts.

## Run in this workspace

Dependencies are declared in this package. From the workspace root:

```sh
pnpm install
pnpm --filter @workspace/imovies run dev
```

The server listens on the provided `PORT` (or port `5000` when run locally). The frontend and API are served by the same Express server.

## Install the server packages

From the workspace root, the exact pnpm command is:

```sh
pnpm --filter @workspace/imovies add express mongoose bcryptjs jsonwebtoken dotenv cors
```

If copying this app into a separate folder with its own `package.json`, install the runtime dependencies there with:

```sh
npm install express mongoose bcryptjs jsonwebtoken dotenv cors
```

## MongoDB and JWT setup

The server tries `mongodb://127.0.0.1:27017/imovies` by default. To use MongoDB Atlas or another MongoDB server, set `MONGODB_URI` to that connection URI. Copy `.env.example` to `.env` and set a long, private `JWT_SECRET` before deployment. Do not commit `.env`.

The app starts in demo mode if MongoDB is unavailable: the sample movie list and local seat selector still work, while account and booking endpoints return a clear database connection error.

## API routes

- `GET /imovies-api/health` — server and MongoDB status
- `GET /imovies-api/movies` — movie list, with sample movies when MongoDB is unavailable
- `POST /imovies-api/auth/register` — create an account and return a JWT
- `POST /imovies-api/auth/login` — validate credentials and return a JWT
- `POST /imovies-api/bookings` — create a booking; requires `Authorization: Bearer <token>`
- `GET /imovies-api/bookings/mine` — list the signed-in user's bookings
