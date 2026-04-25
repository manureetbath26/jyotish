import { NextRequest } from "next/server";

/**
 * Proxy to the FastAPI backend's /api/chart/transit-ingresses endpoint.
 * Returns opening_snapshot + events_by_area for the requested window.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
    const response = await fetch(`${backendUrl}/api/chart/transit-ingresses`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return Response.json(
        { detail: errorData.detail || "Backend error" },
        { status: response.status },
      );
    }

    const data = await response.json();
    return Response.json(data);
  } catch (error) {
    console.error("Transit ingresses API error:", error);
    return Response.json(
      { detail: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 },
    );
  }
}
