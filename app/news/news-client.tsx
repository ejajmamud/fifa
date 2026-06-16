"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Search, Clock, User, RefreshCw, ChevronRight } from "lucide-react";
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

  return (
    <DashboardLayout channels={channels}>
      <div className="news-main-grid">
        
        {/* Single Column: News Feed list */}
        <section style={{ display: "flex", flexDirection: "column", gap: "20px", overflow: "hidden", width: "100%" }}>
          
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

          {/* Articles list as Accordion */}
          <div style={{ display: "flex", flexDirection: "column", gap: "14px", overflowY: "auto", flexGrow: 1 }} className="news-scrollable">
            {filteredNews.length > 0 ? (
              filteredNews.map((article) => {
                const isSelected = selectedArticleId === article.id;
                return (
                  <article
                    key={article.id}
                    onClick={() => setSelectedArticleId(isSelected ? "" : article.id)}
                    style={{
                      padding: "20px",
                      background: isSelected ? "rgba(197,168,92,0.08)" : "rgba(10, 11, 14, 0.45)",
                      border: isSelected ? "2px solid var(--accent)" : "1px solid var(--border-muted)",
                      borderRadius: "6px",
                      cursor: "pointer",
                      display: "flex",
                      flexDirection: "column",
                      gap: "10px",
                      transition: "all 0.25s cubic-bezier(0.16, 1, 0.3, 1)"
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.72rem", color: "var(--accent)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                      <span>{article.category}</span>
                      <span style={{ color: "var(--text-muted)" }}>{article.publishedAt}</span>
                    </div>

                    <h3 style={{ fontSize: "1.1rem", color: "#fff", fontWeight: "normal", lineHeight: "1.35" }}>
                      {article.title}
                    </h3>

                    {/* Show summary preview only if not expanded */}
                    {!isSelected && (
                      <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", lineBreak: "anywhere", overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", lineHeight: "1.45" }}>
                        {article.summary}
                      </p>
                    )}

                    {/* Accordion Body: Full text expansion */}
                    {isSelected && (
                      <div 
                        style={{ 
                          marginTop: "8px", 
                          paddingTop: "16px", 
                          borderTop: "1px solid var(--border-accent)", 
                          display: "flex", 
                          flexDirection: "column", 
                          gap: "16px",
                          cursor: "default" 
                        }}
                        onClick={(e) => e.stopPropagation()} // Prevent close when interacting
                      >
                        {/* Meta badges */}
                        <div style={{ display: "flex", gap: "20px", fontSize: "0.78rem", color: "var(--text-muted)" }}>
                          <span style={{ display: "flex", alignItems: "center", gap: "5px" }}>
                            <Clock size={13} style={{ color: "var(--accent)" }} />
                            {article.readTime}
                          </span>
                          <span style={{ display: "flex", alignItems: "center", gap: "5px" }}>
                            <User size={13} />
                            {article.author || "ESPN FC Editor"}
                          </span>
                        </div>

                        {/* Text paragraphs */}
                        <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                          {[
                            article.summary,
                            `This story has generated significant interest among sports divisions globally. Team management is currently evaluating tactical impacts, while tournament organizers anticipate strong viewership as matches kick off.`,
                            `Historical data indicates that these updates are vital for competitive balancing. Technical staff members are leveraging advanced telemetry systems to analyze gameplay shapes and provide data-driven insights to the squads.`,
                            `Further reports are expected to emerge as the season continues. You can return to this news feed for dynamic hourly updates and live match commentary sync.`
                          ].map((paragraph, idx) => (
                            <p
                              key={idx}
                              style={{
                                fontSize: "0.92rem",
                                color: idx === 0 ? "#fff" : "var(--text-muted)",
                                lineHeight: "1.65",
                                fontWeight: idx === 0 ? "bold" : "normal",
                                borderLeft: idx === 0 ? "3px solid var(--accent)" : "none",
                                paddingLeft: idx === 0 ? "12px" : "0"
                              }}
                            >
                              {paragraph}
                            </p>
                          ))}
                        </div>

                        {/* Visit Site Button */}
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "rgba(0,0,0,0.15)", padding: "12px 16px", borderRadius: "4px", border: "1px solid rgba(255,255,255,0.03)", flexWrap: "wrap", gap: "10px", marginTop: "5px" }}>
                          <div style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>
                            Live editorial feed from official soccer networks.
                          </div>
                          <a
                            href={article.link || "https://www.espn.com/soccer/"}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "4px",
                              color: "var(--accent)",
                              textDecoration: "none",
                              fontSize: "0.78rem",
                              fontWeight: "bold",
                              border: "1px solid var(--border-accent)",
                              padding: "6px 14px",
                              borderRadius: "3px",
                              transition: "all 0.25s ease"
                            }}
                            className="read-more-link"
                          >
                            Visit ESPN FC
                            <ChevronRight size={14} />
                          </a>
                        </div>
                      </div>
                    )}
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

      </div>
    </DashboardLayout>
  );
}
