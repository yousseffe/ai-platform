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
  
  // Artifacts & Files configuration
  modelFile: z
    .any()
    .refine(
      (val) => typeof window === "undefined" || val instanceof File,
      { message: "Model bundle file (model.pkl) is required" }
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
    .optional()
    .refine(
      (val) => {
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
  expectedResult: z
    .string()
    .optional()
    .refine(
      (val) => {
        if (!val || val.trim() === "") return true;
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

