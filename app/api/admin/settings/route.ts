import { NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import { clearPlaylistCache } from "@/lib/playlist-server";

const SETTINGS_FILE = "settings.json";

export const dynamic = "force-dynamic";

const defaultSettings = {
  cacheTtl: 300000,
  checkTimeout: 1200,
  playlistFile: "Fifa world cup.m3u",
  scoreboardUrl: "https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard?dates=20260601-20260731&limit=200",
  epgDurationMinutes: 120,
  epgBlocksCount: 12,
  priorityRules: [
    { name: "DSports", urlContains: "A008" },
    { name: "TyC Sports ARG", urlContains: "stream/84" }
  ],
  rssFeeds: [
    { url: "https://feeds.bbci.co.uk/sport/football/rss.xml", name: "BBC Sport" },
    { url: "https://www.skysports.com/rss/12040", name: "Sky Sports" },
    { url: "https://www.espn.com/espn/rss/soccer/news", name: "ESPN FC" }
  ]
};

export async function GET() {
  try {
    const settingsPath = path.join(process.cwd(), SETTINGS_FILE);
    try {
      const content = await fs.readFile(settingsPath, "utf8");
      return NextResponse.json(JSON.parse(content));
    } catch {
      // If file doesn't exist, return defaults and write it
      await fs.writeFile(settingsPath, JSON.stringify(defaultSettings, null, 2), "utf8");
      return NextResponse.json(defaultSettings);
    }
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const payload = await request.json();
    const settingsPath = path.join(process.cwd(), SETTINGS_FILE);

    const cacheTtl = typeof payload.cacheTtl === "number" ? payload.cacheTtl : defaultSettings.cacheTtl;
    const checkTimeout = typeof payload.checkTimeout === "number" ? payload.checkTimeout : defaultSettings.checkTimeout;
    const playlistFile = typeof payload.playlistFile === "string" ? payload.playlistFile : defaultSettings.playlistFile;
    const scoreboardUrl = typeof payload.scoreboardUrl === "string" ? payload.scoreboardUrl : defaultSettings.scoreboardUrl;
    const epgDurationMinutes = typeof payload.epgDurationMinutes === "number" ? payload.epgDurationMinutes : defaultSettings.epgDurationMinutes;
    const epgBlocksCount = typeof payload.epgBlocksCount === "number" ? payload.epgBlocksCount : defaultSettings.epgBlocksCount;
    const priorityRules = Array.isArray(payload.priorityRules) ? payload.priorityRules : defaultSettings.priorityRules;
    const rssFeeds = Array.isArray(payload.rssFeeds) ? payload.rssFeeds : defaultSettings.rssFeeds;

    const updated = {
      cacheTtl,
      checkTimeout,
      playlistFile,
      scoreboardUrl,
      epgDurationMinutes,
      epgBlocksCount,
      priorityRules,
      rssFeeds
    };

    await fs.writeFile(settingsPath, JSON.stringify(updated, null, 2), "utf8");
    
    // Clear in-memory playlist cache so new settings apply instantly
    clearPlaylistCache();

    return NextResponse.json({ success: true, settings: updated });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
