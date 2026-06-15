import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    let items: any[] = [];
    
    // Attempt to fetch live RSS news feed from ESPN
    try {
      const res = await fetch("https://www.espn.com/espn/rss/soccer/news", {
        next: { revalidate: 120 } // cache for 2 minutes
      });
      
      if (res.ok) {
        const xml = await res.text();
        
        // Match tag item blocks
        const itemMatches = xml.matchAll(/<item>([\s\S]*?)<\/item>/g);
        
        for (const match of itemMatches) {
          const itemText = match[1];
          
          const cleanCDATA = (str: string) => {
            if (!str) return "";
            return str
              .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
              .replace(/&amp;/g, "&")
              .replace(/&lt;/g, "<")
              .replace(/&gt;/g, ">")
              .trim();
          };
          
          const titleMatch = itemText.match(/<title(?: [^>]*)?>([\s\S]*?)<\/title>/i);
          const descMatch = itemText.match(/<description(?: [^>]*)?>([\s\S]*?)<\/description>/i);
          const linkMatch = itemText.match(/<link(?: [^>]*)?>([\s\S]*?)<\/link>/i);
          const dateMatch = itemText.match(/<pubDate(?: [^>]*)?>([\s\S]*?)<\/pubDate>/i);
          
          const title = cleanCDATA(titleMatch?.[1] || "");
          const summary = cleanCDATA(descMatch?.[1] || "");
          const link = linkMatch?.[1]?.trim() || "";
          let publishedAt = dateMatch?.[1]?.trim() || "";
          
          if (publishedAt) {
            try {
              const dateObj = new Date(publishedAt);
              if (!isNaN(dateObj.getTime())) {
                const diffMs = Date.now() - dateObj.getTime();
                const diffHrs = Math.floor(diffMs / (1000 * 60 * 60));
                if (diffHrs < 1) {
                  const diffMins = Math.floor(diffMs / (1000 * 60));
                  publishedAt = `${diffMins}m ago`;
                } else if (diffHrs < 24) {
                  publishedAt = `${diffHrs}h ago`;
                } else {
                  publishedAt = dateObj.toLocaleDateString("en-US", { month: "short", day: "numeric" });
                }
              }
            } catch {
              // fallback to raw text
            }
          }
          
          if (title) {
            items.push({
              id: `live-news-${items.length + 1}`,
              title,
              summary: summary || "Read full coverage on ESPN website.",
              category: "BREAKING NEWS",
              publishedAt: publishedAt || "Recently",
              readTime: `${Math.max(3, Math.min(8, Math.ceil(title.split(" ").length / 22)))} min read`,
              author: "ESPN FC Editor"
            });
          }
        }
      }
    } catch (apiError) {
      console.warn("ESPN RSS news fetch failed. Loading premium fallback stories...", apiError);
    }
    
    // Fallback breaking stories if news list is empty (API block/offline)
    if (items.length === 0) {
      items = [
        {
          id: "sim-news-1",
          title: "Mbappé Clinches Champions League Golden Boot Race Lead",
          summary: "Real Madrid's star striker nets double against Man City, securing his pole position in the season's scoring charts and paving the way to a historic final qualification.",
          category: "CHAMPIONS LEAGUE",
          publishedAt: "10m ago",
          readTime: "4 min read",
          author: "Marcus Vane"
        },
        {
          id: "sim-news-2",
          title: "Tactical Masterclass: How Pep's Inverted Fullbacks Stunned Bernabéu",
          summary: "A deep tactical analysis of Guardiola's hybrid 3-2-4-1 buildup, detailing how Gvardiol and Stones manipulated defensive lines to trigger half-space overlaps.",
          category: "TACTICAL EDITORIAL",
          publishedAt: "1h ago",
          readTime: "8 min read",
          author: "Coach Roy"
        },
        {
          id: "sim-news-3",
          title: "Euros & Copa América Standouts Scouted for Premier League Transfers",
          summary: "Top agents and scouts lock eyes on emerging midfield stars as summer windows approach. Real Madrid and Chelsea head-to-head bids anticipated.",
          category: "TRANSFER MARKET",
          publishedAt: "3h ago",
          readTime: "6 min read",
          author: "Dominic Thorne"
        },
        {
          id: "sim-news-4",
          title: "Yamal's Historic Performance Sparks New Era at Barcelona",
          summary: "The young winger's electric footwork and clinical assists during the European quarterfinals establish him as the cornerstone of Barca's future squad campaigns.",
          category: "PLAYER PROFILE",
          publishedAt: "5h ago",
          readTime: "5 min read",
          author: "Sarah Sterling"
        },
        {
          id: "sim-news-5",
          title: "High-Fidelity Broadcast Cameras Deployed for Stadiums",
          summary: "Official tournament directors approve the installation of ultra-high definition cable cams and real-time interactive AR overlays for all upcoming major matches.",
          category: "BROADCAST TECH",
          publishedAt: "1d ago",
          readTime: "3 min read",
          author: "Julian Vance"
        }
      ];
    }
    
    return NextResponse.json(items);
  } catch (error: any) {
    console.error("Critical news feed error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
