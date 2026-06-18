import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const res = await fetch("https://site.api.espn.com/apis/v2/sports/soccer/fifa.world/standings", {
      next: { revalidate: 60 } // cache for 1 minute
    });
    if (!res.ok) {
      throw new Error("Failed to fetch standings from ESPN");
    }
    const data = await res.json();
    const groups = data.children || [];
    
    const parsedGroups = groups.map((g: any) => {
      const entries = g.standings?.entries || [];
      const teams = entries.map((e: any) => {
        const stats = e.stats || [];
        const findStat = (name: string) => stats.find((s: any) => s.name === name)?.displayValue || "0";
        return {
          teamName: e.team?.displayName || "Unknown Team",
          teamAbbr: e.team?.abbreviation || "",
          logo: e.team?.logos?.[0]?.href || null,
          gamesPlayed: findStat("gamesPlayed"),
          wins: findStat("wins"),
          losses: findStat("losses"),
          ties: findStat("ties"),
          pointsFor: findStat("pointsFor"),
          pointsAgainst: findStat("pointsAgainst"),
          pointDifference: findStat("pointDifferential"),
          points: findStat("points")
        };
      });
      return {
        name: g.name || "Group",
        teams
      };
    });
    
    return NextResponse.json(parsedGroups);
  } catch (error: any) {
    console.error("Standings API error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
