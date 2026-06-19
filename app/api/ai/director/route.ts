import { NextResponse } from "next/server";
import { loadSettings, getPlaylist } from "@/lib/playlist-server";
import { queryAi } from "@/lib/groq";
import { GET as getLiveMatches } from "../../live-matches/route";

export const dynamic = "force-dynamic";

// In-memory cache to prevent hitting OpenRouter/Groq on every short poll
interface DirectorCache {
  recommendedChannelId: string | null;
  activeMatch: string | null;
  reason: string;
  timestamp: number;
}

let directorCache: DirectorCache | null = null;
const CACHE_TTL = 30000; // 30 seconds cache

export async function GET() {
  try {
    const settings = await loadSettings();
    if (!settings.aiDirectorEnabled) {
      return NextResponse.json({ enabled: false, message: "AI Director is disabled in settings." });
    }

    const now = Date.now();
    if (directorCache && (now - directorCache.timestamp < CACHE_TTL)) {
      console.log("[AI Director] Serving recommendation from cache.");
      return NextResponse.json({ enabled: true, ...directorCache });
    }

    // Fetch live matches
    const matchesResponse = await getLiveMatches();
    const matches = await matchesResponse.json();

    if (matches.error) {
      throw new Error(matches.error);
    }

    // Filter only live matches
    const liveMatches = matches.filter((m: any) => m.status === "LIVE");

    // Get active working channels
    const channels = await getPlaylist();
    const workingChannels = channels.filter(c => c.working !== false);

    if (liveMatches.length === 0) {
      return NextResponse.json({
        enabled: true,
        recommendedChannelId: null,
        activeMatch: null,
        reason: "No live FIFA matches are currently active. AI Director is on standby.",
        timestamp: now
      });
    }

    if (workingChannels.length === 0) {
      return NextResponse.json({
        enabled: true,
        recommendedChannelId: null,
        activeMatch: liveMatches[0].homeTeam + " vs " + liveMatches[0].awayTeam,
        reason: "No active working channels are available for streaming.",
        timestamp: now
      });
    }

    // Build Llama-3 / Gemini prompt
    const matchesDesc = liveMatches.map((m: any) => 
      `- ${m.homeTeam} vs ${m.awayTeam} (${m.tournament}), Score: ${m.homeScore}-${m.awayScore}, Time: ${m.time}`
    ).join("\n");

    const channelsDesc = workingChannels.map((c: any) => 
      `- ID: "${c.id}", Name: "${c.name}", Group: "${c.group}", Country: "${c.country || "Global"}"`
    ).join("\n");

    const prompt = `You are the AI Director. Your job is to select the best streaming channel for the most popular active live FIFA match.

Active Live Matches:
${matchesDesc}

Available Working Channels:
${channelsDesc}

Task:
1. Identify the most popular/important active live match (e.g. Argentina, France, Spain, Brazil matches first).
2. Look at the names, groups, and countries of the available channels (e.g., 'TyC Sports' is likely Argentina, 'DSports' has broad FIFA matches, French channels for France, etc.).
3. Choose the single channel ID that is most likely to be broadcasting this live match.
4. Output a raw JSON object matching the exact schema below.

JSON Schema:
{
  "recommendedChannelId": "the-channel-id-or-null",
  "activeMatch": "Home Team vs Away Team",
  "reason": "1-sentence description of why this channel matches the active live match"
}

Do not include any other text, comments, or markdown wrappers in your response. Just raw JSON.`;

    const aiResponse = await queryAi(prompt, true);
    if (!aiResponse) {
      throw new Error("AI provider returned empty response");
    }

    // Clean markdown blocks if returned by any model
    const cleanedJson = aiResponse.trim().replace(/^```json\s*/i, "").replace(/```\s*$/i, "").trim();
    const parsed = JSON.parse(cleanedJson);

    const result = {
      recommendedChannelId: parsed.recommendedChannelId || null,
      activeMatch: parsed.activeMatch || null,
      reason: parsed.reason || "AI automatically selected the matching channel.",
      timestamp: now
    };

    directorCache = result;
    return NextResponse.json({ enabled: true, ...result });

  } catch (err: any) {
    console.error("[AI Director] Error generating stream alignment:", err);
    return NextResponse.json({ 
      enabled: false, 
      error: err.message, 
      reason: "Fallback to manual channel selection due to service error." 
    }, { status: 500 });
  }
}
