# On-Premise / Air-Gapped Deployment

This platform can run entirely inside a customer's own network with no
dependency on Anthropic-, Hugging Face-, or cloud-hosted infrastructure —
unlike managed API wrappers (OpenRouter, LiteLLM) or cloud-only offerings
(AWS Bedrock, Azure AI Foundry), the whole stack (API, model build/serve
pipeline, database, object storage, observability) is a set of containers
you run yourself.

## Two deployment profiles

| Profile | Database | Use case |
| --- | --- | --- |
| **Default** (no profile flag) | Native Postgres on the host, reachable via `host.docker.internal` | Local development (matches `RUNNING.md`) |
| **`onprem`** (`docker compose --profile onprem up -d`) | Bundled `postgres` container, managed by Compose | Fully self-contained on-prem/air-gapped install — no separate DB install required |

Both profiles use the same images and the same application code — only the
database wiring differs, via the root `.env` file.

## Steps for a fully self-contained on-prem install

1. Copy the environment templates and adjust as needed:

   ```bash
   cp .env.example .env
   cp backend/.env.example backend/.env
   ```

2. In the root `.env`, point the backend at the bundled Postgres container
   instead of a native install:

   ```bash
   DB_HOST=postgres
   ```

3. (Air-gapped only) Set `OFFLINE_MODE=true` in the root `.env`. This skips
   the default Qwen2.5 GGUF model download from Hugging Face that normally
   happens on first boot of the `llm-init` service. Before starting the
   stack, place your own GGUF file at `model.gguf` inside the
   `ai-platform_llm_models` Docker volume (or pre-populate it during image
   build if you're distributing a sealed appliance image). The LLM sidecar is
   only used for `LLM_GGUF`-type model playground/testing; the core
   model-upload, build, deploy, and prediction pipeline for
   sklearn/PyTorch/TensorFlow/ONNX/diffusion models does not depend on it.

4. Build and start everything, including the bundled Postgres:

   ```bash
   docker compose --profile onprem up -d --build
   ```

5. From a separate terminal, run the frontend:

   ```bash
   cd frontend && npm run dev
   ```

## Pre-pulling images for a network-isolated install

All base images used by the model build pipeline
(`docker/base-images/*.Dockerfile`) are built locally on first use via
`build-base-images.bat` / `build-base-images.sh`, or warmed automatically by
`BaseImageWarmerService` on backend startup. For a target machine with no
internet access at all, run these on a machine with internet access first,
`docker save`/`docker load` the resulting images (plus every image named in
`docker-compose.yml`) onto the target machine, then start the stack there —
Docker will use the locally-cached images instead of attempting to pull.

## Security hardening defaults (see also: container sandboxing, model firewall)

- Model containers run with dropped Linux capabilities, `no-new-privileges`,
  a read-only root filesystem, and a process limit by default
  (`MODEL_SANDBOX_HARDENING_ENABLED=true`). Disable only if a specific
  framework's runtime needs a capability or writable path this doesn't
  anticipate.
- Models default to **no outbound internet access** (`allowEgress = false`
  on the `models` table) — containers run on an isolated, internal-only
  Docker network unless a model owner explicitly opts in per-model.
- Per-model/per-organization firewall policies (IP allow/deny lists,
  prompt-injection blocking, and a fraud-engine risk-score auto-block
  threshold) are available via the `/api/v1/firewall` endpoints and the
  model settings UI.

## What still requires the internet, even on-prem

- Stripe billing webhooks (credit top-ups, org creation fees) — only
  exercised if billing is enabled; the rest of the platform functions
  without it.
- SMTP for verification/password-reset/security-alert emails — point
  `SMTP_HOST` at an internal mail relay if the customer has one.
- The default GGUF model download, unless `OFFLINE_MODE=true` is set per the
  steps above.
