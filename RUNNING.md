# Run Guide for AI-Platform

This guide outlines how to start and run the AI-Platform project. The project is configured to use your **native Windows PostgreSQL service** (running on port `5432`) for both local development and Docker containers. This keeps all your data (users, models, etc.) synchronized in one place.

---

## Database Configuration (Shared)

Both backend modes connect to:

- **Host:** `localhost` (locally) or `host.docker.internal` (from Docker)
- **Port:** `5432`
- **Username:** `postgres`
- **Password:** `khalid`
- **Database:** `aidb`

Ensure your native Windows PostgreSQL service (`postgresql-x64-18`) is running.

---

## Option A: Run the Backend in Docker (Easiest)

All services (except the database, which is native on your host) run inside Docker. The frontend runs locally.

1. **Start all containers (including backend):**
   Open a terminal in the project root (`ai-platform/`) and run:

   ```bash
   docker compose up -d --build
   ```

2. **Start the Frontend locally:**
   Open a terminal in the `frontend/` directory and run:
   ```bash
   npm run dev
   ```
   The frontend connects to the backend at `http://localhost:3000`.

---

## Option B: Run the Backend Locally (For active backend development)

Use this if you are actively editing NestJS code and want hot-reloads.

1. **Start Docker services, but stop the dockerized backend & gateway:**
   Open a terminal in the project root (`ai-platform/`) and run:

   ```bash
   docker compose up -d
   docker compose stop backend gateway
   ```

2. **Start the Backend locally:**
   Open a terminal in the `backend/` directory and run:

   ```bash
   npm run dev
   ```

   The backend runs locally on **`http://localhost:3000`**.

3. **Start the Frontend locally:**
   Open a terminal in the `frontend/` directory and run:
   ```bash
   npm run dev
   ```
   The frontend runs locally on **`http://localhost:3001`**.

---

## Summary of Active Ports

- **Frontend Dashboard:** [http://localhost:3001](http://localhost:3001)
- **Backend API:** [http://localhost:3000](http://localhost:3000)
- **Postgres Database:** `localhost:5432` (Native Windows Service)
- **Redis Cache/Queues:** `localhost:6380` (Dockerized)
- **Minio Console (Object Storage):** [http://localhost:9001](http://localhost:9001) (Dockerized)
- **Grafana Dashboard:** [http://localhost:3005](http://localhost:3005) (Dockerized)
- **Prometheus Metrics:** [http://localhost:9090](http://localhost:9090) (Dockerized)
- **Loki Log Aggregator:** `localhost:3100` (Dockerized)

---

## Stopping the Project

- To stop local backend/frontend processes, press `Ctrl + C` in their terminals.
- To shut down all Docker containers, run:
  ```bash
  docker compose down
  ```
  _(Note: This will not affect your native Windows PostgreSQL database)._
