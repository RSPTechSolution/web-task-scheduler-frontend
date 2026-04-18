# Web Task Scheduler Frontend

React dashboard for the attendance automation backend. This project is intentionally separate from the Python backend so you can deploy:

- Frontend on Netlify
- Backend/API on Oracle VM or Docker

## Features

- Password-protected dashboard login
- Live scheduler status
- Manual attendance trigger
- Pause and resume scheduler
- Block specific dates from the calendar flow
- Readable live logs in Indian timezone
- Cookie-based session support with backend API

## Tech Stack

- React
- Vite
- Framer Motion

## Project Structure

```text
web-task-scheduler-frontend/
├── index.html
├── package.json
├── vite.config.js
└── src/
    ├── App.jsx
    ├── main.jsx
    └── styles.css
```

## Environment Variables

Create a `.env` file from `.env.example`.

```bash
cp .env.example .env
```

Frontend env:

```env
VITE_API_BASE_URL=http://localhost:5000
```

## Local Development

1. Install dependencies:

```bash
npm install
```

2. Start the frontend:

```bash
npm run dev
```

3. Open:

```text
http://localhost:5173
```

## Backend Requirements For Local Dev

The frontend talks to the Flask backend using cookies, so the backend must allow the frontend origin.

Backend `.env` should contain:

```env
FRONTEND_ORIGIN=http://localhost:5173,http://127.0.0.1:5173
SESSION_COOKIE_SECURE=false
```

Backend API base URL should match:

```env
VITE_API_BASE_URL=http://localhost:5000
```

If you change the frontend port, update `FRONTEND_ORIGIN` in the backend too.

## Available Scripts

```bash
npm run dev
```

Runs the app in development mode.

```bash
npm run build
```

Builds the production app.

```bash
npm run preview
```

Previews the production build locally.

## Production Deployment

### Netlify

Recommended settings:

- Build command: `npm run build`
- Publish directory: `dist`

Set Netlify environment variable:

```env
VITE_API_BASE_URL=https://your-backend-domain.com
```

### Backend Production Settings

On the backend, update:

```env
FRONTEND_ORIGIN=https://your-netlify-site.netlify.app
SESSION_COOKIE_SECURE=true
```

If you use a custom frontend domain, set that exact domain in `FRONTEND_ORIGIN`.

## API Used By This Frontend

The frontend expects these backend endpoints:

- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET /api/auth/session`
- `GET /api/dashboard`
- `GET /api/logs`
- `POST /api/run`
- `POST /api/pause`
- `POST /api/blocked-dates`
- `DELETE /api/blocked-dates/<date>`

## Notes

- The dashboard uses cookie-based auth with `credentials: include`
- For production, frontend and backend must both use HTTPS if secure cookies are enabled
- If you see a CORS or login/session issue, first verify `VITE_API_BASE_URL`, `FRONTEND_ORIGIN`, and `SESSION_COOKIE_SECURE`
