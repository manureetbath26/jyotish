import { NextRequest } from "next/server";

export async function GET(req: NextRequest) {
  const prompt = req.nextUrl.searchParams.get("prompt");
  if (!prompt) {
    return new Response("Missing prompt", { status: 400 });
  }

  const url = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=512&height=640&nologo=true`;

  try {
    const res = await fetch(url, { cache: "force-cache" });
    if (!res.ok) {
      return new Response("Image generation failed", { status: 502 });
    }
    const contentType = res.headers.get("content-type") ?? "image/jpeg";
    const buffer = await res.arrayBuffer();
    return new Response(buffer, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=86400, immutable",
      },
    });
  } catch {
    return new Response("Image generation failed", { status: 502 });
  }
}
