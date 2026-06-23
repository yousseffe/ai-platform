import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/auth";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.accessToken) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  // Next.js params is an async object in Next 15/16, so we must await it or destructure it.
  // Wait, let's retrieve ID from params. Since Next.js 15+ params are async, we should await params.
  const resolvedParams = await params;
  const id = resolvedParams.id;

  try {
    const formData = await req.formData();
    const backendUrl = process.env.BACKEND_URL || "http://localhost:3000";

    const res = await fetch(`${backendUrl}/api/v1/models/${id}/versions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${session.accessToken}`,
      },
      body: formData,
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      return NextResponse.json(
        { message: errorData.message || "Failed to upload artifacts to backend" },
        { status: res.status }
      );
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Upload proxy error:", error);
    const errorMessage = error instanceof Error ? error.message : "Internal server error during upload";
    return NextResponse.json(
      { message: errorMessage },
      { status: 500 }
    );
  }
}
