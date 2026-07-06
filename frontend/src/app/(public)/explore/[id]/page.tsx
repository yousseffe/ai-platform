import { notFound } from "next/navigation";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/auth";
import { Metadata } from "next";

import {
  getModelIntegrationSpec,
  getPublicModelById,
} from "@/lib/actions/models.actions";
import PublicModelDetailClient from "./PublicModelDetailClient";

interface PageProps {
  params: Promise<{ id: string }>;
}

/**
 * Generates dynamic SEO metadata for the public model detail page.
 *
 * @param props - Page props containing the model ID route param.
 * @returns Metadata object for Next.js head injection.
 */
export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { id } = await params;
  const model = await getPublicModelById(id);
  if (!model) {
    return { title: "Model Not Found — Qantara" };
  }
  return {
    title: `${model.name} — Qantara Model Registry`,
    description:
      model.description ||
      `Explore ${model.name} on Qantara. Deploy and run this model via the serverless inference API.`,
    openGraph: {
      title: `${model.name} on Qantara`,
      description:
        model.description || `Run ${model.name} via serverless ML API`,
      type: "website",
    },
  };
}

/**
 * Public model detail page — accessible without authentication.
 * Displays full model information, version history, example payload, and a live Try it CTA.
 *
 * @param props - Page props with the model ID from the URL.
 * @returns The rendered model detail page.
 */
export default async function PublicModelDetailPage({ params }: PageProps) {
  const { id } = await params;
  const [model, session, integrationSpec] = await Promise.all([
    getPublicModelById(id),
    getServerSession(authOptions),
    getModelIntegrationSpec(id),
  ]);

  if (!model) {
    notFound();
  }

  return (
    <PublicModelDetailClient
      model={model}
      isAuthenticated={!!session}
      integrationSpec={integrationSpec}
    />
  );
}
