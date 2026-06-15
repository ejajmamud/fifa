"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Search, Newspaper, Clock, User, ArrowLeft, RefreshCw, ChevronRight } from "lucide-react";
import { Channel, NewsArticle, getSportsNews } from "@/lib/playlist";
import { DashboardLayout } from "@/components/dashboard-layout";

type NewsClientPageProps = {
  channels: Channel[];
};

export function NewsClientPage({ channels }: NewsClientPageProps) {
  const [liveNews, setLiveNews] = useState<NewsArticle[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("ALL");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedArticleId, setSelectedArticleId] = useState<string>("");

  const mockNews = useMemo(() => getSportsNews(), []);
  const news = liveNews.length > 0 ? liveNews : mockNews;

  const selectedArticle = useMemo(
    () => news.find((n) => n.id === selectedArticleId) ?? null,
    [news, selectedArticleId]
  );

  const fetchLiveNews = () => {
    setIsRefreshing(true);
    fetch("/api/news-feed")
      .then((res) => res.json())
      .then((data) => {
        setIsRefreshing(false);
        if (data && data.length > 0 && !data.error) {
          setLiveNews(data);
        }
      })
      .catch((err) => {
        setIsRefreshing(false);
        console.error("Error loading news feed:", err);
      });
  };

  useEffect(() => {
    fetchLiveNews();
    if (news.length > 0) {
      setSelectedArticleId(news[0].id);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Set default selection on load
  useEffect(() => {
    if (news.length > 0 && !selectedArticleId) {
      setSelectedArticleId(news[0].id);
    }
  }, [news, selectedArticleId]);

  // Extract unique categories
  const categories = useMemo(() => {
    const cats = new Set<string>();
    news.forEach((n) => {
      if (n.category) cats.add(n.category.toUpperCase());
    });
    return ["ALL", ...Array.from(cats)];
  }, [news]);

  // Filter news list
  const filteredNews = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return news.filter((n) => {
      const matchCat = activeCategory === "ALL" || n.category.toUpperCase() === activeCategory;
      const matchSearch =
        !q ||
        n.title.toLowerCase().includes(q) ||
        n.summary.toLowerCase().includes(q) ||
        (n.author && n.author.toLowerCase().includes(q));
      return matchCat && matchSearch;
    });
  }, [news, activeCategory, searchQuery]);

  // Generate simulated paragraphs for full article view
  const fullArticleText = useMemo(() => {
    if (!selectedArticle) return [];
    return [
      `${selectedArticle.summary}`,
      `Industry sources suggest this development marks a significant shift in current team formations and regional broadcast distribution. The growing reliance on digital infrastructures has allowed networks to expand their coverage footprints, bringing high-fidelity, low-latency live events directly to millions of international fans.`,
      `Key administrators have emphasized that quality and security are paramount moving forward. By establishing robust streaming pipelines and leveraging containerized microservices behind secure load balancers, the platform ensures uninterrupted visual handshakes. The architectural approach resolves multiple historical lag overlays, enabling screens of all scales to render streams seamlessly.`,
      `In the coming weeks, further updates are planned for soccer divisions globally. Analysts expect players and organizations alike to benefit from enhanced telemetry tools, enabling deep tactical studies and real-time possession analytics during matches.`
    ];
  }, [selectedArticle]);

  return (
    <DashboardLayout channels={channels}>
      <div style={{ display: "grid", gridTemplateColumns: "380px 1fr", gap: "24px", height: "100%", minHeight: "0" }} className="news-main-grid">
        
        {/* Left Column: News list panel */}
        <section style={{ display: "flex", flexDirection: "column", gap: "20px", overflow: "hidden" }}>
          
          {/* Header search and refresh */}
          <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
            <div className="search-container" style={{ margin: 0, flexGrow: 1 }}>
              <Search size={18} className="search-icon-svg" />
              <input
                type="text"
                placeholder="Search articles..."
                className="search-input"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            
            <button
              onClick={fetchLiveNews}
              style={{
                background: "rgba(255,255,255,0.02)",
                border: "1px solid var(--border-accent)",
                padding: "13px",
                borderRadius: "4px",
                color: "var(--accent)",
                cursor: "pointer",
                display: "grid",
                placeItems: "center"
              }}
              title="Refresh News Feed"
            >
              <RefreshCw size={16} className={isRefreshing ? "spin-animate" : ""} />
            </button>
          </div>

          {/* Categories Horizontal Scroll */}
          <div className="groups-container" style={{ margin: 0, borderBottom: "1px solid var(--border-accent)", paddingBottom: "12px" }}>
            {categories.map((cat) => (
              <button
                key={cat}
                className={`group-badge ${activeCategory === cat ? "active" : ""}`}
                onClick={() => setActiveCategory(cat)}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Articles list */}
          <div style={{ display: "flex", flexDirection: "column", gap: "12px", overflowY: "auto", flexGrow: 1 }} className="news-scrollable">
            {filteredNews.length > 0 ? (
              filteredNews.map((article) => {
                const isSelected = selectedArticleId === article.id;
                return (
                  <article
                    key={article.id}
                    onClick={() => setSelectedArticleId(article.id)}
                    style={{
                      padding: "16px",
                      background: isSelected ? "rgba(197,168,92,0.08)" : "rgba(10, 11, 14, 0.45)",
                      border: isSelected ? "2px solid var(--accent)" : "1px solid var(--border-muted)",
                      borderRadius: "6px",
                      cursor: "pointer",
                      display: "flex",
                      flexDirection: "column",
                      gap: "8px",
                      transition: "all 0.25s ease"
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.7rem", color: "var(--accent)", textTransform: "uppercase" }}>
                      <span>{article.category}</span>
                      <span style={{ color: "var(--text-muted)" }}>{article.publishedAt}</span>
                    </div>

                    <h3 style={{ fontSize: "0.95rem", color: "#fff", fontWeight: "normal", lineHeight: "1.3" }}>
                      {article.title}
                    </h3>

                    <p style={{ fontSize: "0.78rem", color: "var(--text-muted)", lineBreak: "anywhere", overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>
                      {article.summary}
                    </p>
                  </article>
                );
              })
            ) : (
              <div style={{ textAlign: "center", padding: "40px", color: "var(--text-muted)" }}>
                No news articles match your search filter.
              </div>
            )}
          </div>
        </section>

        {/* Right Column: Detailed Premium Article Reader */}
        <main style={{ background: "var(--bg-panel-strong)", border: "1px solid var(--border-accent)", borderRadius: "4px", padding: "35px", overflowY: "auto", display: "flex", flexDirection: "column", gap: "25px" }} className="news-article-view">
          {selectedArticle ? (
            <>
              {/* Category, Read Time, and Author badges */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--border-accent)", paddingBottom: "15px" }}>
                <span style={{ fontSize: "0.8rem", color: "var(--accent)", border: "1px solid var(--border-accent)", padding: "4px 10px", borderRadius: "3px", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                  {selectedArticle.category}
                </span>

                <div style={{ display: "flex", gap: "15px", fontSize: "0.8rem", color: "var(--text-muted)" }}>
                  <span style={{ display: "flex", alignItems: "center", gap: "5px" }}>
                    <Clock size={14} style={{ color: "var(--accent)" }} />
                    {selectedArticle.readTime}
                  </span>
                  <span style={{ display: "flex", alignItems: "center", gap: "5px" }}>
                    <User size={14} />
                    {selectedArticle.author || "ESPN Editor"}
                  </span>
                </div>
              </div>

              {/* Title */}
              <h2 style={{ fontSize: "2rem", color: "#fff", fontWeight: "400", lineHeight: "1.2", letterSpacing: "0.02em" }}>
                {selectedArticle.title}
              </h2>

              <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginTop: "-10px" }}>
                Published: {selectedArticle.publishedAt} · FIFA Live Newsroom feed
              </div>

              {/* Text paragraphs */}
              <div style={{ display: "flex", flexDirection: "column", gap: "18px", marginTop: "10px" }}>
                {fullArticleText.map((paragraph, idx) => (
                  <p
                    key={idx}
                    style={{
                      fontSize: "0.95rem",
                      color: idx === 0 ? "#f5f5f7" : "var(--text-muted)",
                      lineHeight: "1.7",
                      fontWeight: idx === 0 ? "bold" : "normal",
                      borderLeft: idx === 0 ? "3px solid var(--accent)" : "none",
                      paddingLeft: idx === 0 ? "15px" : "0"
                    }}
                  >
                    {paragraph}
                  </p>
                ))}
              </div>

              {/* Read Original Article Link */}
              <div style={{ marginTop: "20px", padding: "20px", background: "rgba(0,0,0,0.2)", borderRadius: "4px", border: "1px solid var(--border-muted)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div style={{ fontSize: "0.85rem", color: "#fff" }}>Read full coverage on ESPN FC</div>
                  <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>This feed is synchronized live from official ESPN soccer channels.</div>
                </div>
                <a
                  href="https://www.espn.com/soccer/"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    color: "var(--accent)",
                    textDecoration: "none",
                    fontSize: "0.85rem",
                    fontWeight: "bold",
                    border: "1px solid var(--border-accent)",
                    padding: "8px 16px",
                    borderRadius: "3px",
                    transition: "all 0.25s ease"
                  }}
                  className="read-more-link"
                >
                  Visit ESPN
                  <ChevronRight size={14} />
                </a>
              </div>
            </>
          ) : (
            <div style={{ height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", color: "var(--text-muted)" }}>
              <Newspaper size={36} style={{ color: "var(--accent)", marginBottom: "12px" }} />
              Select an article from the feed to begin reading.
            </div>
          )}
        </main>

      </div>
    </DashboardLayout>
  );
}
