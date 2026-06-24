import { Metadata } from "next";
import { getModel } from "@/lib/actions/models.actions";
import { notFound } from "next/navigation";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/auth";
import PushVersionClient from "./PushVersionClient";

export const revalidate = 0;

interface PageProps {
  params: Promise<{ id: string }> | { id: string };
}

/**
 * Dynamically generates SEO metadata for the standalone version upload page.
 */
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const resolvedParams = await params;
  const model = await getModel(resolvedParams.id);

  if (!model) {
    return {
      title: "Model Not Found | MLHub",
      description: "The requested machine learning model could not be found.",
    };
  }

  return {
    title: `Push Version - ${model.name} | MLHub`,
    description: `Publish an updated checkpoint run or preprocessing script to ${model.name}.`,
  };
}

export default async function PushVersionPage({ params }: PageProps) {
  const resolvedParams = await params;
  const [model, session] = await Promise.all([
    getModel(resolvedParams.id),
    getServerSession(authOptions),
  ]);

  if (!model) {
    notFound();
  }

  const isOwner = session?.user?.id === model.user?.id || session?.user?.email === model.user?.email;
  
  // Protect version pushing from non-owners
  if (!isOwner) {
    notFound();
  }

  return <PushVersionClient model={model} />;
}
