import { NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import { clearPlaylistCache, loadSettings } from "@/lib/playlist-server";

const PLAYLIST_FILE = "Fifa world cup.m3u";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const settings = await loadSettings();
    const playlistPath = path.join(process.cwd(), settings.playlistFile || PLAYLIST_FILE);
    const playlist = await fs.readFile(playlistPath, "utf8");
    const lines = playlist.split(/\r?\n/).map(l => l.trim()).filter(Boolean);

    const channels: any[] = [];
    let currentInfo: string | undefined;

    for (const line of lines) {
      if (line.startsWith("#EXTINF")) {
        currentInfo = line;
        continue;
      }
      if (line.startsWith("#")) {
        continue;
      }
      if (!currentInfo || !/^https?:\/\//i.test(line)) {
        continue;
      }

      const metadata = currentInfo.replace(/^#EXTINF:-?\d+\s*/i, "");
      const attrMatch = (key: string) => {
        const match = metadata.match(new RegExp(`${key}="([^"]*)"`));
        return match ? match[1] : "";
      };
      const [, fallbackName = "Untitled channel"] = metadata.match(/,(.*)$/) ?? [];

      const name = attrMatch("tvg-name") || fallbackName;
      const logo = attrMatch("tvg-logo");
      const group = attrMatch("group-title");

      channels.push({
        name: name.trim(),
        url: line.trim(),
        group: group.trim() || "Live Sports",
        logo: logo.trim()
      });

      currentInfo = undefined;
    }

    return NextResponse.json(channels);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const channels = await request.json();
    if (!Array.isArray(channels)) {
      return NextResponse.json({ error: "Invalid channels payload" }, { status: 400 });
    }

    let m3uContent = "#EXTM3U\n";
    for (const ch of channels) {
      if (!ch.name || !ch.url) continue;
      m3uContent += `#EXTINF:-1 tvg-logo="${ch.logo || ""}" group-title="${ch.group || "Live Sports"}",${ch.name}\n${ch.url}\n`;
    }

    const settings = await loadSettings();
    const playlistPath = path.join(process.cwd(), settings.playlistFile || PLAYLIST_FILE);
    await fs.writeFile(playlistPath, m3uContent, "utf8");
    
    // Clear in-memory cache to reload immediately
    clearPlaylistCache();

    return NextResponse.json({ success: true, count: channels.length });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
