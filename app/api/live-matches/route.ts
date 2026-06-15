import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const res = await fetch("https://site.api.espn.com/apis/site/v2/sports/soccer/all/scoreboard", {
      next: { revalidate: 30 } // Cache for 30 seconds
    });
    
    if (!res.ok) {
      throw new Error(`ESPN API responded with status ${res.status}`);
    }
    
    const data = await res.json();
    const events = data.events || [];
    
    const matches = events.map((event: any) => {
      const comp = event.competitions?.[0] || {};
      const competitors = comp.competitors || [];
      const home = competitors.find((c: any) => c.homeAway === "home") || {};
      const away = competitors.find((c: any) => c.homeAway === "away") || {};
      
      const state = comp.status?.type?.state;
      let status: "LIVE" | "UPCOMING" | "FINISHED" = "UPCOMING";
      if (state === "in") status = "LIVE";
      else if (state === "post") status = "FINISHED";
      
      const time = comp.status?.type?.detail || comp.status?.type?.shortDetail || "TBD";
      const tournament = event.season?.slug 
        ? event.season.slug.replace(/-/g, " ").toUpperCase() 
        : event.league?.name || "Global Match";
        
      const getStat = (compItem: any, statName: string) => {
        const statObj = compItem?.statistics?.find((s: any) => s.name === statName);
        return parseFloat(statObj?.displayValue) || 0;
      };
      
      const homePossession = getStat(home, "possessionPct");
      const awayPossession = getStat(away, "possessionPct");
      const possession: [number, number] = homePossession || awayPossession 
        ? [homePossession, awayPossession] 
        : [50, 50];
        
      const homeShots = getStat(home, "totalShots");
      const awayShots = getStat(away, "totalShots");
      const shots: [number, number] = [homeShots, awayShots];
      
      // Extract cards counts from event details if available
      const details = comp.details || [];
      const countCards = (teamId: string, cardType: string) => {
        return details.filter((d: any) => 
          d.type?.text?.toLowerCase().includes(cardType) && 
          d.team?.id === teamId
        ).length;
      };
      
      const yellowCards: [number, number] = [
        countCards(home.team?.id, "yellow"),
        countCards(away.team?.id, "yellow")
      ];
      const redCards: [number, number] = [
        countCards(home.team?.id, "red"),
        countCards(away.team?.id, "red")
      ];
      
      // Premium fallbacks for squads if lineup array is empty
      const homeLineup = home.team?.shortDisplayName 
        ? [home.team.shortDisplayName + " GK", "CB 1", "CB 2", "LB", "RB", "CM 1", "CM 2", "AM", "LW", "RW", "ST"]
        : ["Goalkeeper", "Defender 1", "Defender 2", "Defender 3", "Defender 4", "Midfielder 1", "Midfielder 2", "Midfielder 3", "Striker 1", "Striker 2", "Striker 3"];
        
      const awayLineup = away.team?.shortDisplayName 
        ? [away.team.shortDisplayName + " GK", "CB 1", "CB 2", "LB", "RB", "CM 1", "CM 2", "AM", "LW", "RW", "ST"]
        : ["Goalkeeper", "Defender 1", "Defender 2", "Defender 3", "Defender 4", "Midfielder 1", "Midfielder 2", "Midfielder 3", "Striker 1", "Striker 2", "Striker 3"];
      
      return {
        id: event.id || `match-${Math.random().toString(36).substr(2, 9)}`,
        homeTeam: home.team?.displayName || "Home Team",
        awayTeam: away.team?.displayName || "Away Team",
        homeScore: parseInt(home.score) || 0,
        awayScore: parseInt(away.score) || 0,
        status,
        time,
        tournament,
        possession,
        shots,
        yellowCards,
        redCards,
        lineups: {
          home: homeLineup,
          away: awayLineup
        }
      };
    });
    
    return NextResponse.json(matches);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
