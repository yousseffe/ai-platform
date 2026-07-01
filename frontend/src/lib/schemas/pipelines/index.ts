import { z } from "zod";
import { PipelinePinPolicy, PipelineType } from "@/types";

/**
 * Validates the name/description/type fields used to create a new pipeline.
 */
export const createPipelineSchema = z.object({
  name: z
    .string()
    .min(3, "Pipeline name must be at least 3 characters")
    .max(80, "Pipeline name cannot exceed 80 characters"),
  description: z.string().max(500, "Description cannot exceed 500 characters").optional(),
  type: z.nativeEnum(PipelineType).optional(),
});

export type CreatePipelineInput = z.infer<typeof createPipelineSchema>;

/**
 * Validates edits to an existing pipeline's name/description/type.
 */
export const updatePipelineSchema = z.object({
  name: z.string().min(3).max(80).optional(),
  description: z.string().max(500).optional(),
  type: z.nativeEnum(PipelineType).optional(),
});

export type UpdatePipelineInput = z.infer<typeof updatePipelineSchema>;

/**
 * Validates the fields used to bind a step to an existing READY model version.
 * `role` disambiguates this step from its stage siblings when it's one of
 * several parallel branches — required only when the target stage will end
 * up with more than one step.
 */
export const createStepSchema = z.object({
  modelVersionId: z.string().uuid("Select a model version"),
  label: z.string().max(80, "Label cannot exceed 80 characters").optional(),
  role: z.string().max(64, "Role cannot exceed 64 characters").optional(),
  pinPolicy: z.nativeEnum(PipelinePinPolicy).optional(),
  maxRetries: z.number().int().min(0).max(5).optional(),
});

export type CreateStepInput = z.infer<typeof createStepSchema>;

/**
 * A single row in the visual mapper rule builder. Fields are a superset of
 * all four op types — irrelevant fields for a given op are ignored at
 * serialisation time.
 */
export interface MapperRuleRow {
  op: "copy" | "cast" | "default" | "template";
  /** Namespace prefix for the source path: "input" | "previous" | "steps.0" … */
  namespace: string;
  /** Dotted/bracketed path within the namespace, e.g. "age" or "probabilities[0][1]". */
  fromPath: string;
  /** Destination field name in the output payload. */
  to: string;
  /** For `cast` op. */
  as: "string" | "number" | "boolean";
  /** For `default` op — literal value (numbers/booleans will be JSON-parsed). */
  value: string;
  /** For `template` op — string with `{{namespace.path}}` tokens. */
  template: string;
}

/**
 * Validates the JSON input payload submitted when triggering a pipeline run.
 */
export const runPipelineSchema = z.object({
  inputJson: z
    .string()
    .trim()
    .min(1, "Input payload is required")
    .refine(
      (val) => {
        try {
          JSON.parse(val);
          return true;
        } catch {
          return false;
        }
      },
      { message: "Input payload must be valid JSON" }
    ),
});

export type RunPipelineInput = z.infer<typeof runPipelineSchema>;
