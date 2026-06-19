import { NextResponse } from "next/server";
import { queryAi } from "@/lib/groq";
import { GET as getNewsFeed } from "../../news-feed/route";

export const dynamic = "force-dynamic";

interface NewsCache {
  briefing: string;
  timestamp: number;
}

let newsCache: NewsCache | null = null;
const CACHE_TTL = 3600000; // 1 hour cache

export async function GET() {
  try {
    const now = Date.now();
    if (newsCache && (now - newsCache.timestamp < CACHE_TTL)) {
      console.log("[AI News Curator] Serving briefing from cache.");
      return NextResponse.json({ briefing: newsCache.briefing });
    }

    // Fetch news feed
    const newsResponse = await getNewsFeed();
    const articles = await newsResponse.json();

    if (articles.error) {
      throw new Error(articles.error);
    }

    const newsList = Array.isArray(articles) ? articles.slice(0, 15) : [];
    if (newsList.length === 0) {
      return NextResponse.json({ 
        briefing: "· The FIFA World Cup preparation is underway with high-intensity training camps globally.\n· Broadcast streaming networks report record-breaking digital viewership projections.\n· Medical teams monitor player fitness closely ahead of the upcoming tournament qualifiers." 
      });
    }

    // Format top headlines for prompt
    const headlines = newsList.map((a: any, idx: number) => 
      `${idx + 1}. [${a.category}] ${a.title} - ${a.summary.substring(0, 150)}...`
    ).join("\n");

    const prompt = `You are a world-class soccer news anchor. Summarize the following news headlines and summaries into a unified, high-impact "AI Daily Sports Briefing".

Headlines list:
${headlines}

Task:
- Curate a unified, high-level briefing summarizing the most important trends/happenings.
- Format the response strictly in 3 bullet points, using a clean markdown list.
- Keep each bullet point to 1-2 concise, engaging sentences.
- Do not output any headers, introduction, or conversational filler. Just the 3 bullet points in markdown format.`;

    const aiResponse = await queryAi(prompt, false);
    if (!aiResponse) {
      throw new Error("AI provider returned empty response");
    }

    const briefing = aiResponse.trim();
    newsCache = {
      briefing,
      timestamp: now
    };

    return NextResponse.json({ briefing });

  } catch (err: any) {
    console.error("[AI News Curator] Error curating feed:", err);
    return NextResponse.json({ 
      briefing: "· Severe network congestion has impacted international sports feed synchronizations.\n· FIFA Technical Committees review video telemetry systems for low-latency player tracking.\n· Global fan zones prepare for record attendance ahead of tomorrow's match schedules." 
    });
  }
}
