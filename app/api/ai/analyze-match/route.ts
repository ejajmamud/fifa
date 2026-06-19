import { NextResponse } from "next/server";
import { queryAi } from "@/lib/groq";
import { GET as getLiveMatches } from "../../live-matches/route";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const { matchId } = await request.json();
    if (!matchId) {
      return NextResponse.json({ error: "Missing matchId parameter" }, { status: 400 });
    }

    // Get all matches
    const matchesResponse = await getLiveMatches();
    const matches = await matchesResponse.json();

    if (matches.error) {
      throw new Error(matches.error);
    }

    // Find our match
    const match = matches.find((m: any) => m.id === matchId);
    if (!match) {
      return NextResponse.json({ error: `Match with ID ${matchId} not found.` }, { status: 404 });
    }

    // Fetch lineups rosters if available
    let homeRoster = [];
    let awayRoster = [];
    try {
      const homeRosterRes = await fetch(`http://localhost:${process.env.PORT || 3000}/api/live-matches/roster?teamId=${match.homeTeamId || ""}`).catch(() => null);
      if (homeRosterRes?.ok) {
        const homeData = await homeRosterRes.json();
        homeRoster = homeData?.roster || [];
      }
      const awayRosterRes = await fetch(`http://localhost:${process.env.PORT || 3000}/api/live-matches/roster?teamId=${match.awayTeamId || ""}`).catch(() => null);
      if (awayRosterRes?.ok) {
        const awayData = await awayRosterRes.json();
        awayRoster = awayData?.roster || [];
      }
    } catch {
      // ignore, fall back to mock lineups
    }

    const homeLineup = homeRoster.length > 0 
      ? homeRoster.map((p: any) => `${p.name} (${p.position})`).join(", ") 
      : (match.lineups?.home?.join(", ") || "No lineup info");

    const awayLineup = awayRoster.length > 0 
      ? awayRoster.map((p: any) => `${p.name} (${p.position})`).join(", ") 
      : (match.lineups?.away?.join(", ") || "No lineup info");

    const statsInfo = `Possession: ${match.possession?.[0]}% vs ${match.possession?.[1]}%, Shots: ${match.shots?.[0]} - ${match.shots?.[1]}, Cards: Yellow ${match.yellowCards?.[0]}:${match.yellowCards?.[1]} / Red ${match.redCards?.[0]}:${match.redCards?.[1]}`;

    const prompt = `You are a legendary football tactical analyst. Analyze the following FIFA match and generate a tactical preview.

Match Details:
- Tournament: ${match.tournament}
- Home Team: ${match.homeTeam} (Score: ${match.homeScore})
- Away Team: ${match.awayTeam} (Score: ${match.awayScore})
- Status: ${match.status} (Current Time: ${match.time})
- Stats: ${statsInfo}
- Home Squad Lineups: ${homeLineup}
- Away Squad Lineups: ${awayLineup}

Tasks:
1. Provide a "tactics" section describing the likely tactical systems (e.g. 4-3-3 counter-pressing vs 5-4-1 low-block) and key player roles (2-3 sentences).
2. Provide an "outlook" section predicting how this match will unfold or analyzing the final result if finished (3-4 sentences).
3. Provide a "score" section showing your AI predicted final score (e.g., '2 - 1 for ${match.homeTeam}').

Output a raw JSON object matching the exact schema:
{
  "tactics": "Tactical shape and playstyle analysis...",
  "outlook": "Tactical outcome prediction or post-match summary...",
  "score": "Predicted scoreline"
}

Do not include any other text, comments, markdown tags, or headers in your response. Just raw JSON.`;

    const aiResponse = await queryAi(prompt, true);
    if (!aiResponse) {
      throw new Error("AI provider returned empty response");
    }

    const cleanedJson = aiResponse.trim().replace(/^```json\s*/i, "").replace(/```\s*$/i, "").trim();
    const parsed = JSON.parse(cleanedJson);

    return NextResponse.json({
      tactics: parsed.tactics || "Dynamic build-up play and mid-block structures.",
      outlook: parsed.outlook || "A highly contested match of transitional phases and key individual duels.",
      score: parsed.score || `${match.homeScore} - ${match.awayScore}`
    });

  } catch (err: any) {
    console.error("[AI Match Predictor] Error:", err);
    return NextResponse.json({ 
      tactics: "Standard tactical formations with a focus on wing play.",
      outlook: "Expect a balanced performance between both sides with compact defensive setups.",
      score: "Prediction unavailable"
    });
  }
}
