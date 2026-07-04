# MinIO in ModelOps AI

This doc explains why the platform uses MinIO, how it's wired into the codebase, how object
storage works under the hood, and where the current implementation is thin.

## 1. Why MinIO

The platform needs a place to put large binary blobs that don't belong in Postgres: model weights
(sometimes multi-GB `.pt`/`.onnx`/`.gguf` files), scaler files, user-supplied `preprocess.py` /
`postprocess.py` scripts, and organization logos. Two things drove the choice:

- **S3 API compatibility.** MinIO speaks the AWS S3 protocol, so the app is written against the
  `minio` SDK / S3 semantics (buckets, objects, presigned URLs) rather than a proprietary API. If
  the platform ever moves to AWS S3, Cloudflare R2, Backblaze B2, or any other S3-compatible
  provider, the only change needed is environment variables — no code changes, since
  [`minio.service.ts`](backend/src/shared/minio/minio.service.ts) is the single integration point.
- **Self-hosted, no cloud dependency.** ModelOps AI is explicitly a self-hosted platform (see root
  [`CLAUDE.md`](CLAUDE.md)). MinIO runs as just another `docker-compose` service, so the whole
  stack — Postgres aside — comes up with `docker compose up` and no cloud account is required.

The alternative would have been storing artifacts on the backend container's local disk. That
doesn't survive container replacement, doesn't scale past one backend instance, and doesn't give
the build pipeline (which runs in a different processor/worker context) a clean way to fetch files
that were uploaded through the API.

## 2. How MinIO works (general)

MinIO is an open-source, S3-API-compatible object store. The concepts that matter here:

- **Buckets** are top-level namespaces (like a root folder). Objects live inside a bucket under a
  **key** (e.g. `acme/fraud-detector/v3/model-weights.pt`) — there's no real directory tree, keys
  with `/` in them just *look* hierarchical in the console UI.
- **Objects** are immutable blobs plus metadata (content-type, size, etc.), addressed by their key.
- **Presigned URLs** are time-limited, signed HTTP URLs that grant temporary access (GET/PUT) to a
  specific object without exposing the access/secret key to the client. This is the standard way
  to let a browser download/upload directly to object storage instead of proxying bytes through
  your API server.
- A MinIO server exposes two ports: an **S3 API** port (object operations) and a **web console**
  port (an admin UI for browsing buckets, not used by the application itself).
- MinIO can run as a single binary/container (as in this repo) or as a distributed multi-node
  cluster with erasure coding for production durability — this repo runs the single-node form.

## 3. How it's wired into this repo

### docker-compose service

[`docker-compose.yml`](docker-compose.yml) (lines ~12–41) defines:

- `minio` — the server itself, `minio/minio:latest`, command `server /data --console-address ":9001"`.
  - Ports: `9000` (S3 API), `9001` (web console).
  - Credentials: `MINIO_ROOT_USER=minioadmin` / `MINIO_ROOT_PASSWORD=minioadmin` (dev defaults).
  - Persists to the named volume `minio_data`.
- `createbuckets` — a one-shot `minio/mc` (MinIO Client CLI) container that runs after `minio` is
  healthy, creates the `models` bucket, and sets it **public** via `mc anonymous set public
  myminio/models`.

The backend container gets `MINIO_ENDPOINT=minio`, `MINIO_PORT=9000`, `MINIO_ACCESS_KEY`,
`MINIO_SECRET_KEY`, `MINIO_BUCKET=models` injected as env vars, so it talks to MinIO over the
Docker network by service name.

### The integration point: `MinioService`

Everything goes through [`backend/src/shared/minio/minio.service.ts`](backend/src/shared/minio/minio.service.ts),
exported by a global `MinioModule`. It wraps the `minio` npm SDK client:

```ts
new Minio.Client({
  endPoint: process.env.MINIO_ENDPOINT || 'localhost',
  port: parseInt(process.env.MINIO_PORT || '9000', 10),
  useSSL: false,
  accessKey: process.env.MINIO_ACCESS_KEY || 'minioadmin',
  secretKey: process.env.MINIO_SECRET_KEY || 'minioadmin',
});
```

Public methods:

| Method | What it does |
|---|---|
| `onModuleInit()` | Ensures the configured bucket exists on startup; if MinIO is unreachable, flips the service into **local filesystem fallback mode** instead of crashing |
| `uploadFile(objectName, filePath, mimeType?)` | Streams a file from local disk up to the bucket (or copies into `./uploads/local-s3/<bucket>/` in fallback mode) |
| `downloadFile(objectName, destPath)` | Downloads an object to local disk |
| `getFileUrl(objectName)` | Returns a **24-hour presigned GET URL** (or a backend-served local URL in fallback mode) |
| `deleteFile(objectName)` | Deletes an object; swallows errors (logs only, never throws) |

This fallback design means local development works even without MinIO running, at the cost of
artifacts not being shared across multiple backend instances in that mode — fine for a single dev
box, not appropriate for production.

### Where it's used

1. **Model artifact upload** — [`models.service.ts`](backend/src/modules/models/services/models.service.ts)
   `uploadVersion()`: uploads model weights, scaler, `preprocess.py`, `postprocess.py` to keys
   shaped like `<publisher>/<modelName>/v<versionNumber>/<prefix>-<originalFilename>`, deletes the
   local temp file, and stores the resulting object paths on the `ModelVersion` entity.
2. **Artifact preview/download** — `getVersionArtifactPreview()` in the same service calls
   `getFileUrl()` to hand the frontend a presigned URL for previewing `.py`/`.json`/`.txt` files or
   downloading weights.
3. **Build pipeline** — [`build.processor.ts`](backend/src/shared/queue/processors/build.processor.ts),
   phase 1 of the `build-queue` job: downloads the model + scaler + scripts from MinIO in parallel
   into a temp build directory (`./uploads/build-<versionId>/`) before generating the Dockerfile and
   building the image. This is *why* MinIO sits in the critical path of every deployment — the
   backend API process and the build worker don't share a filesystem, so MinIO is the handoff point.
4. **GGUF LLMs (special case)** — also in `build.processor.ts`: GGUF files skip the Docker build
   entirely. The file is downloaded from MinIO once, cached on the host at
   `./uploads/gguf-models/<versionId>.gguf`, and mounted directly into the shared
   `ghcr.io/ggml-org/llama.cpp:server` container at deploy time — no per-model image is built.
5. **Artifact cleanup** — `deleteVersion()` in `models.service.ts` deletes all associated objects
   from MinIO when a model version is removed.
6. **Organization branding** — [`organizations.service.ts`](backend/src/modules/organizations/services/organizations.service.ts)
   `updateOrgLogo()`: uploads an org avatar to `organizations/<orgSlug>/branding/<timestamp>-<file>`
   and stores the presigned URL on `Organization.avatarUrl`.

## 4. Current limitations

- **Single public bucket for everything.** Model weights, scripts, and org logos all live in one
  `models` bucket, set fully public at the bucket level. There's no per-org or per-tenant isolation
  — anyone with an object key (or who can guess/enumerate one) can fetch it without auth, since
  access doesn't depend on the presigned signature being public-bucket objects are already open.
- **No lifecycle/retention policy.** Deleting a `ModelVersion` deletes its objects via
  `deleteFile()`, but that call swallows errors — a failed delete leaves an orphaned object
  forever with no retry, alert, or reconciliation job.
- **No bucket versioning.** Re-uploading to the same object key silently overwrites it; there's no
  way to recover a previous artifact.
- **No quotas or per-org storage accounting.** Nothing stops one organization from uploading
  unbounded data; storage isn't metered into the wallet/billing system at all today.
- **Local fallback isn't production-safe.** It exists purely so `npm run dev` works without MinIO
  running, but it's a foot-gun if `MINIO_ENDPOINT` is misconfigured in a real deployment — uploads
  would silently land on local disk instead of erroring loudly.
- **Hardcoded dev credentials** (`minioadmin`/`minioadmin`) ship in `docker-compose.yml`; fine for
  local dev, must be overridden via `.env`/secrets for anything beyond a laptop.
- **No CDN/edge caching** in front of MinIO — every artifact download (including multi-GB model
  weights) round-trips through the single MinIO container.

## 5. Possible improvements

- **Make the bucket private and proxy/sign all access** — keep buckets non-public, rely solely on
  short-lived presigned URLs (already the mechanism for downloads) so an object key alone is never
  enough to read data.
- **Per-organization prefixes + bucket policies**, or per-org buckets if isolation requirements
  grow, so a leaked key from one org can't be used to enumerate another org's artifacts.
- **Lifecycle rules**: auto-expire orphaned objects (e.g. tag objects with the owning
  `ModelVersion` id and run a periodic reconciliation job — the existing BullMQ infra in
  `shared/queue/` is a natural fit) and add a dead-letter/retry path for failed `deleteFile()` calls
  instead of swallowing the error.
- **Storage quotas tied to wallets/billing** — since the platform already has a wallet/Stripe
  billing system ([`modules/wallets/`](backend/src/modules/wallets)), per-org storage usage could be
  metered and capped the same way compute/inference usage presumably is.
- **Bucket versioning** for model artifacts, so accidental re-uploads/overwrites are recoverable —
  cheap to enable in MinIO and pairs naturally with the existing `ModelVersion` versioning concept.
- **Surface MinIO health in observability** — the stack already ships Prometheus/Grafana/Loki
  ([`docker/observability/`](docker/observability)); MinIO exposes Prometheus metrics natively and
  isn't currently scraped, so storage capacity/latency/error-rate has no dashboard today.
- **Direct browser-to-MinIO uploads** for large model weights via presigned PUT URLs, instead of
  uploading to the backend API first and then forwarding to MinIO — would cut backend memory/bandwidth
  pressure for multi-GB uploads.
