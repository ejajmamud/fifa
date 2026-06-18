import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const { url, timeout = 1200 } = await request.json();
    if (!url || !url.startsWith("http")) {
      return NextResponse.json({ error: "Invalid stream URL" }, { status: 400 });
    }

    const startTime = Date.now();
    try {
      const controller = new AbortController();
      const id = setTimeout(() => controller.abort(), timeout);
      
      const res = await fetch(url, {
        method: "GET",
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko)"
        },
        signal: controller.signal
      });
      
      clearTimeout(id);
      
      if (res.ok) {
        return NextResponse.json({
          working: true,
          latency: Date.now() - startTime,
          status: res.status
        });
      }
      return NextResponse.json({
        working: false,
        latency: 9999,
        status: res.status
      });
    } catch (err: any) {
      return NextResponse.json({
        working: false,
        latency: 9999,
        error: err.message || "Timeout"
      });
    }
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
