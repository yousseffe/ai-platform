import { z } from "zod";
import { OrgRole } from "@/types";

/**
 * Validation schema for workspace creation.
 * Checks for a valid name (3-50 chars), a URL slug (lowercase alphanumeric & hyphens, 3-50 chars),
 * and an optional list of invited collaborators.
 */
export const workspaceCreateSchema = z.object({
  name: z
    .string()
    .min(3, "Workspace name must be at least 3 characters")
    .max(50, "Workspace name must be at most 50 characters")
    .trim(),
  slug: z
    .string()
    .min(3, "URL slug must be at least 3 characters")
    .max(50, "URL slug must be at most 50 characters")
    .regex(
      /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
      "Slug must only contain lowercase alphanumeric characters and single hyphens, and cannot start or end with a hyphen"
    )
    .trim(),
  collaborators: z
    .array(
      z.object({
        email: z.string().email("Invalid email address"),
        role: z.nativeEnum(OrgRole),
      })
    ),
});

export type WorkspaceCreateInput = z.infer<typeof workspaceCreateSchema>;
