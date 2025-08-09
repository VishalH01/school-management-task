## School Management API

Express + MySQL API to manage schools and list them by proximity to a user location. Ready for local development and deployment on Vercel (Serverless Functions).

### Features
- POST `/addSchool`: Add a school (name, address, latitude, longitude)
- GET `/listSchools`: Fetch all schools, sorted by distance to a provided latitude/longitude
- GET `/listSchool`: Legacy endpoint that returns all schools without sorting

### Tech Stack
- Node.js, Express
- MySQL (`mysql2`)
- Serverless-ready app export for Vercel

---

### Requirements
- Node.js 18+ (recommended: 20+)
- MySQL 8+ (or managed MySQL compatible with MySQL 8 protocol)

### Environment Variables
Create a `.env` file at the project root with the following values:

```
PORT=3000
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=yourpassword
DB_DATABASE=school
```

Notes:
- For Vercel, set the same variables in the Vercel Project → Settings → Environment Variables.
- Ensure your MySQL instance is reachable from Vercel (public host or managed DB like PlanetScale/AWS RDS). If you use a private DB, allowlist Vercel egress or use the provider's integration.

### Local Development
1) Install dependencies
```
npm install
```

2) Start the server (development)
```
npm run dev
```

3) Or start in production mode locally
```
npm start
```

The server listens on `PORT` from `.env`. Visit `http://localhost:3000/`.

Schema bootstrapping:
- On startup, the app ensures the `school_db` table exists and that `id` is `AUTO_INCREMENT PRIMARY KEY`. No manual migration needed for the base schema.

### API Reference

Base URL (local): `http://localhost:3000`

1) Add School
- Method: POST
- Path: `/addSchool`
- Body (JSON):
```
{
  "name": "ABCD ACADEMY",
  "address": "XYZ Lane, ABC City",
  "latitude": 19.076,
  "longitude": 72.8777
}
```
- Response: `201 Created`
```
{
  "message": "School added successfully",
  "id": 1,
  "name": "ABCD ACADEMY",
  "address": "XYZ Lane, ABC City",
  "latitude": 19.076,
  "longitude": 72.8777
}
```

Example curl:
```
curl -X POST http://localhost:3000/addSchool \
  -H "Content-Type: application/json" \
  -d '{"name":"ABCD ACADEMY","address":"XYZ Lane, ABC City","latitude":19.076,"longitude":72.8777}'
```

2) List Schools (sorted by distance)
- Method: GET
- Path: `/listSchools`
- Query Params: `latitude`, `longitude` (numbers)
- Example: `GET /listSchools?latitude=19.076&longitude=72.8777`
- Response: `200 OK` (array sorted ascending by `distanceKm`)
```
[
  {
    "id": 1,
    "name": "ABCD ACADEMY",
    "address": "XYZ Lane, ABC City",
    "latitude": 19.076,
    "longitude": 72.8777,
    "distanceKm": 0
  }
]
```

Example curl:
```
curl "http://localhost:3000/listSchools?latitude=19.076&longitude=72.8777"
```

3) List Schools (legacy unsorted)
- Method: GET
- Path: `/listSchool`
- Response: All rows as stored.

### Deployment on Vercel
This repository is preconfigured for Vercel Serverless Functions using `vercel.json` and `api/index.js`.

File roles:
- `app.js`: Builds and exports the Express app (used by Vercel and local server)
- `api/index.js`: Vercel Serverless Function entry, exports the Express app
- `index.js`: Local server entry (`npm start`)
- `vercel.json`: Routes all traffic to the serverless function

Steps:
1) Push this repository to GitHub/GitLab/Bitbucket
2) In Vercel, create a New Project and import the repo
3) Framework Preset: Other; Build Command: leave empty (no build step)
4) Set Environment Variables (same as `.env` above)
5) Deploy

After deploy, test:
- `POST https://<your-vercel-domain>/addSchool`
- `GET  https://<your-vercel-domain>/listSchools?latitude=19.076&longitude=72.8777`

Troubleshooting Vercel:
- If you see DB connection errors, verify host/port/user/password/DB name and that the database is reachable from Vercel.
- Long cold starts are uncommon, but the app creates the table on the first request if needed.

### Notes
- Inputs are validated and coordinates are parsed as floats.
- All DB queries are parameterized.


