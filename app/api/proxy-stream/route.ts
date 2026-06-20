import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const targetUrl = searchParams.get("url");

  if (!targetUrl) {
    return new NextResponse("Missing url parameter", { status: 400 });
  }

  try {
    // Forward headers like user-agent to match browser identity
    const headers: HeadersInit = {
      "User-Agent": req.headers.get("user-agent") || "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
    };

    const res = await fetch(targetUrl, { 
      headers,
      cache: "no-store" 
    });
    if (!res.ok) {
      return new NextResponse(`Upstream server returned status ${res.status}`, { status: res.status });
    }

    const contentType = res.headers.get("content-type") || "";
    
    // Determine if it's an HLS playlist (m3u8) based on extension or content-type
    const isPlaylist =
      targetUrl.includes(".m3u8") ||
      contentType.includes("mpegurl") ||
      contentType.includes("mpegURL") ||
      contentType.includes("apple.mpegurl") ||
      contentType.includes("application/x-mpegurl");

    if (isPlaylist) {
      const text = await res.text();
      const lines = text.split("\n");
      const rewrittenLines = lines.map((line) => {
        const trimmed = line.trim();
        if (!trimmed) return line;

        // If it's a URL (not a comment line starting with #)
        if (!trimmed.startsWith("#")) {
          try {
            const resolved = new URL(trimmed, targetUrl).toString();
            // Optimize: Bypass proxy if segment URL resolves to HTTPS
            if (resolved.startsWith("https://")) {
              return resolved;
            }
            return `/api/proxy-stream?url=${encodeURIComponent(resolved)}`;
          } catch {
            return line;
          }
        }

        // Handle tags containing URIs like #EXT-X-KEY or #EXT-X-MAP
        if (trimmed.startsWith("#") && trimmed.includes('URI="')) {
          return trimmed.replace(/URI="([^"]+)"/g, (match, p1) => {
            try {
              const resolved = new URL(p1, targetUrl).toString();
              if (resolved.startsWith("https://")) {
                return `URI="${resolved}"`;
              }
              return `URI="/api/proxy-stream?url=${encodeURIComponent(resolved)}"`;
            } catch {
              return match;
            }
          });
        }

        return line;
      });

      return new NextResponse(rewrittenLines.join("\n"), {
        headers: {
          "Content-Type": "application/vnd.apple.mpegurl",
          "Access-Control-Allow-Origin": "*",
          "Cache-Control": "no-cache, no-store, must-revalidate",
          "Pragma": "no-cache",
        },
      });
    } else {
      // It's a media segment file (e.g. .ts chunk) or key. Proxy the binary content directly.
      const body = res.body;
      return new NextResponse(body, {
        headers: {
          "Content-Type": contentType || "video/MP2T",
          "Access-Control-Allow-Origin": "*",
          "Cache-Control": "public, max-age=3600",
        },
      });
    }
  } catch (err: any) {
    console.error("HLS Proxy Stream Error:", err);
    return new NextResponse(`Proxy stream error: ${err.message}`, { status: 500 });
  }
}
