import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const res = await fetch("https://www.espn.com/espn/rss/soccer/news", {
      next: { revalidate: 300 } // Cache for 5 minutes
    });
    
    if (!res.ok) {
      throw new Error(`ESPN RSS responded with status ${res.status}`);
    }
    
    const xml = await res.ok ? await res.text() : "";
    const items: any[] = [];
    
    // Simple robust regex parser to avoid heavy xml parsing dependencies in next.js bundle
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
      
      const titleMatch = itemText.match(/<title>([\s\S]*?)<\/title>/);
      const descMatch = itemText.match(/<description>([\s\S]*?)<\/description>/);
      const linkMatch = itemText.match(/<link>([\s\S]*?)<\/link>/);
      const dateMatch = itemText.match(/<pubDate>([\s\S]*?)<\/pubDate>/);
      
      const title = cleanCDATA(titleMatch?.[1] || "");
      const summary = cleanCDATA(descMatch?.[1] || "");
      const link = linkMatch?.[1]?.trim() || "";
      let publishedAt = dateMatch?.[1]?.trim() || "";
      
      // Simplify published date string
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
          // Fallback to original string
        }
      }
      
      if (title) {
        items.push({
          id: `news-${items.length + 1}`,
          title,
          summary: summary || "No description provided.",
          category: "LIVE WORLD SOCCER",
          publishedAt,
          readTime: `${Math.max(3, Math.min(8, Math.ceil(title.split(" ").length / 25)))} min read`,
          author: "ESPN FC"
        });
      }
    }
    
    return NextResponse.json(items);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
