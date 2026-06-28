import { z } from "zod";

// Model Creation Schema
export const createModelSchema = z.object({
  name: z
    .string()
    .min(3, "Model name must be at least 3 characters")
    .max(50, "Model name cannot exceed 50 characters")
    .regex(/^[a-zA-Z0-9_-]+$/, "Model name can only contain letters, numbers, hyphens, and underscores"),
  description: z.string().max(500, "Description cannot exceed 500 characters").optional(),
});

export type CreateModelInput = z.infer<typeof createModelSchema>;

// Model Version Upload Schema
export const uploadVersionSchema = z.object({
  examplePayload: z
    .string()
    .optional()
    .refine(
      (val: string | undefined) => {
        if (!val || val.trim() === "") return true;
        try {
          JSON.parse(val);
          return true;
        } catch {
          return false;
        }
      },
      { message: "Example payload must be a valid JSON string" }
    ),
  expectedResult: z.string().optional(),
});

export type UploadVersionInput = z.infer<typeof uploadVersionSchema>;

// Combined Upload Page Schema
export const uploadModelFormSchema = z.object({
  name: z
    .string()
    .min(3, "Model name must be at least 3 characters")
    .max(50, "Model name cannot exceed 50 characters")
    .regex(/^[a-zA-Z0-9_-]+$/, "Model name can only contain letters, numbers, hyphens, and underscores"),
  description: z.string().max(500, "Description cannot exceed 500 characters").optional(),
  type: z.string(),
  framework: z.string(),
  taskType: z.string(),
  isPublic: z.any().transform((val) => {
    if (val === undefined) return undefined;
    return val === "true" || val === true;
  }).optional(),

  // Artifacts & Files configuration
  // Using z.any() + a custom refine that only errors when value is explicitly not a File.
  // This avoids the SSR window-check issue and allows null as the initial default value,
  // while still blocking submission when no file has been selected.
  modelFile: z
    .any()
    .refine(
      (val) => val instanceof File,
      { message: "Model bundle file (.pkl / .onnx / .h5) is required" }
    ),
  scalerFile: z.any().nullable().optional(),

  preprocessMode: z.enum(["file", "code"]),
  preprocessFile: z.any().nullable().optional(),
  preprocessCode: z.string().optional(),

  postprocessMode: z.enum(["file", "code"]),
  postprocessFile: z.any().nullable().optional(),

  postprocessCode: z.string().optional(),

  examplePayload: z
    .string()
    .trim()
    .min(1, "Example payload is required")
    .refine(
      (val) => {
        try {
          JSON.parse(val);
          return true;
        } catch {
          return false;
        }
      },
      { message: "Example payload must be a valid JSON string" }
    ),
  expectedResult: z
    .string()
    .trim()
    .min(1, "Expected prediction result is required")
    .refine(
      (val) => {
        try {
          JSON.parse(val);
          return true;
        } catch {
          return false;
        }
      },
      { message: "Expected result must be a valid JSON string" }
    ),
});

export type UploadModelFormInput = z.infer<typeof uploadModelFormSchema>;


