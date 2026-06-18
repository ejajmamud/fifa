import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const res = await fetch("https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/teams?limit=100", {
      next: { revalidate: 3600 } // cache for 1 hour
    });
    if (!res.ok) {
      throw new Error("Failed to fetch teams from ESPN");
    }
    const data = await res.json();
    const sport = data.sports?.[0];
    const league = sport?.leagues?.[0];
    const teams = league?.teams || [];
    
    const parsedTeams = teams.map((t: any) => {
      const team = t.team || {};
      return {
        id: team.id,
        name: team.displayName || "Unknown Team",
        abbreviation: team.abbreviation || "",
        logo: team.logos?.[0]?.href || null,
        color: team.color || null,
        alternateColor: team.alternateColor || null,
        slug: team.slug || ""
      };
    });
    
    // Sort teams alphabetically by name
    parsedTeams.sort((a: any, b: any) => a.name.localeCompare(b.name));
    
    return NextResponse.json(parsedTeams);
  } catch (error: any) {
    console.error("Teams API error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
