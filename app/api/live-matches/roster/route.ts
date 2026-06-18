import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const teamId = searchParams.get("teamId");
    
    if (!teamId) {
      return NextResponse.json({ error: "Missing teamId parameter" }, { status: 400 });
    }
    
    const res = await fetch(`https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/teams/${teamId}/roster`, {
      next: { revalidate: 3600 } // cache for 1 hour
    });
    
    if (!res.ok) {
      throw new Error(`Failed to fetch roster for team ${teamId} from ESPN`);
    }
    
    const data = await res.json();
    const athletes = data.athletes || [];
    
    const parsedRoster = athletes.map((a: any) => {
      return {
        id: a.id,
        name: a.displayName || "Unknown Player",
        jersey: a.jersey || "",
        position: a.position?.displayName || a.position?.name || "Player",
        age: a.age || null,
        height: a.displayHeight || "",
        weight: a.displayWeight || "",
        photo: a.headshot?.href || null,
        flag: a.citizenShip?.flag?.href || null
      };
    });
    
    return NextResponse.json({
      team: data.team?.displayName || "Team",
      logo: data.team?.logos?.[0]?.href || null,
      coach: data.coach?.[0] ? `${data.coach[0].firstName} ${data.coach[0].lastName}` : "",
      roster: parsedRoster
    });
  } catch (error: any) {
    console.error("Roster API error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
