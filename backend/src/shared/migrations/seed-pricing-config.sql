-- MLHub pricing seed (from Summary.docx strategy)
-- Run once against the aidb database.
-- All credit prices are in the CREDITS unit (consumers spend from their credit wallet).
-- The credit/EGP exchange rate is controlled by the existing 'credits_per_egp' system config.

-- ─── LLM (token-based, input/output billed separately) ──────────────────────
INSERT INTO system_configs (key, value, created_at, updated_at)
VALUES ('price_llm_gguf_input',  '2.0',  NOW(), NOW())   -- credits per 1M input tokens
ON CONFLICT (key) DO NOTHING;

INSERT INTO system_configs (key, value, created_at, updated_at)
VALUES ('price_llm_gguf_output', '8.0',  NOW(), NOW())   -- credits per 1M output tokens
ON CONFLICT (key) DO NOTHING;

-- ─── Embeddings / NLP (per prediction) ──────────────────────────────────────
INSERT INTO system_configs (key, value, created_at, updated_at)
VALUES ('price_nlp', '0.2', NOW(), NOW())                -- credits per request
ON CONFLICT (key) DO NOTHING;

-- ─── Computer Vision (per image) ─────────────────────────────────────────────
INSERT INTO system_configs (key, value, created_at, updated_at)
VALUES ('price_vision', '0.01', NOW(), NOW())            -- credits per image
ON CONFLICT (key) DO NOTHING;

-- ─── Diffusion / Image generation (per image) ────────────────────────────────
INSERT INTO system_configs (key, value, created_at, updated_at)
VALUES ('price_diffusion', '0.04', NOW(), NOW())         -- credits per image
ON CONFLICT (key) DO NOTHING;

-- ─── Tabular (scikit-learn, XGBoost, time-series) ────────────────────────────
INSERT INTO system_configs (key, value, created_at, updated_at)
VALUES ('price_tabular', '0.00005', NOW(), NOW())        -- credits per prediction
ON CONFLICT (key) DO NOTHING;

-- ─── Provider share defaults ─────────────────────────────────────────────────
-- Free tier  (20% commission → provider keeps 80%)
INSERT INTO system_configs (key, value, created_at, updated_at)
VALUES ('default_provider_share_percent', '80', NOW(), NOW())
ON CONFLICT (key) DO NOTHING;

-- Named tier constants that can be applied per-model by admins
INSERT INTO system_configs (key, value, created_at, updated_at)
VALUES ('commission_tier_free',         '20', NOW(), NOW())   -- 20% platform cut
ON CONFLICT (key) DO NOTHING;

INSERT INTO system_configs (key, value, created_at, updated_at)
VALUES ('commission_tier_professional', '15', NOW(), NOW())   -- 15% platform cut
ON CONFLICT (key) DO NOTHING;

INSERT INTO system_configs (key, value, created_at, updated_at)
VALUES ('commission_tier_enterprise',   '10', NOW(), NOW())   -- 10% platform cut
ON CONFLICT (key) DO NOTHING;

-- ─── Playground trial key limit ──────────────────────────────────────────────
INSERT INTO system_configs (key, value, created_at, updated_at)
VALUES ('playground_trial_limit', '50', NOW(), NOW())
ON CONFLICT (key) DO NOTHING;
