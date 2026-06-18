"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { Search, Trophy, Shield, Activity, RefreshCw } from "lucide-react";
import { Channel, Match } from "@/lib/playlist";
import { DashboardLayout } from "@/components/dashboard-layout";

type MatchesClientPageProps = {
  channels: Channel[];
};

const getTeamFlag = (teamName: string) => {
  const name = teamName.toLowerCase().trim();
  const countryCodes: Record<string, string> = {
    "argentina": "ar",
    "france": "fr",
    "brazil": "br",
    "germany": "de",
    "spain": "es",
    "cape verde": "cv",
    "england": "gb-eng",
    "italy": "it",
    "portugal": "pt",
    "morocco": "ma",
    "colombia": "co",
    "uruguay": "uy",
    "belgium": "be",
    "egypt": "eg",
    "saudi arabia": "sa",
    "new zealand": "nz",
    "iran": "ir",
    "netherlands": "nl",
    "croatia": "hr",
    "senegal": "sn",
    "japan": "jp",
    "south korea": "kr",
    "usa": "us",
    "united states": "us",
    "mexico": "mx",
    "canada": "ca",
    "australia": "au",
    "ecuador": "ec",
    "qatar": "qa",
    "wales": "gb-wls",
    "scotland": "gb-sct",
    "poland": "pl",
    "switzerland": "ch",
    "denmark": "dk",
    "tunisia": "tn",
    "costa rica": "cr",
    "ghana": "gh",
    "cameroon": "cm",
    "serbia": "rs",
    "sweden": "se",
    "ukraine": "ua",
    "turkey": "tr",
    "austria": "at",
    "hungary": "hu",
    "romania": "ro",
    "slovakia": "sk",
    "slovenia": "si",
    "czechia": "cz",
    "czech republic": "cz",
    "georgia": "ge",
    "albania": "al",
    "nigeria": "ng",
    "algeria": "dz",
    "south africa": "za",
    "ivory coast": "ci",
    "cote d'ivoire": "ci",
    "chile": "cl",
    "peru": "pe",
    "venezuela": "ve",
    "paraguay": "py",
    "bolivia": "bo"
  };

  for (const key of Object.keys(countryCodes)) {
    if (name.includes(key)) {
      return `https://flagcdn.com/w40/${countryCodes[key]}.png`;
    }
  }
  return null;
};

export function MatchesClientPage({ channels }: MatchesClientPageProps) {
  // Navigation Tabs
  const [activeTab, setActiveTab] = useState<"SCOREBOARD" | "STANDINGS" | "TEAMS">("SCOREBOARD");

  // Matches State
  const [liveMatches, setLiveMatches] = useState<Match[]>([]);
  const [filter, setFilter] = useState<"ALL" | "LIVE" | "UPCOMING" | "FINISHED">("ALL");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedMatchId, setSelectedMatchId] = useState<string>("");

  // Standings State
  const [standings, setStandings] = useState<any[]>([]);
  const [isFetchingStandings, setIsFetchingStandings] = useState(false);

  // Teams & Squads State
  const [teams, setTeams] = useState<any[]>([]);
  const [isFetchingTeams, setIsFetchingTeams] = useState(false);
  const [selectedTeamId, setSelectedTeamId] = useState<string>("");
  const [activeRoster, setActiveRoster] = useState<any>(null);
  const [isFetchingRoster, setIsFetchingRoster] = useState(false);

  // Match detail lineups rosters state
  const [matchRosters, setMatchRosters] = useState<{ home: any[]; away: any[] } | null>(null);
  const [isFetchingMatchRosters, setIsFetchingMatchRosters] = useState(false);

  const matches = liveMatches;

  const selectedMatch = useMemo(
    () => matches.find((m) => m.id === selectedMatchId) ?? matches[0],
    [matches, selectedMatchId]
  );

  useEffect(() => {
    if (matches.length > 0 && !selectedMatchId) {
      setSelectedMatchId(matches[0].id);
    }
  }, [matches, selectedMatchId]);

  // Fetch Scoreboard matches
  const fetchLiveMatches = () => {
    setIsRefreshing(true);
    fetch("/api/live-matches")
      .then((res) => res.json())
      .then((data) => {
        setIsRefreshing(false);
        if (data && data.length > 0 && !data.error) {
          setLiveMatches(data);
        }
      })
      .catch((err) => {
        setIsRefreshing(false);
        console.error("Error fetching live matches API:", err);
      });
  };

  // Fetch Standings
  const fetchStandings = () => {
    setIsFetchingStandings(true);
    fetch("/api/live-matches/standings")
      .then((res) => res.json())
      .then((data) => {
        setIsFetchingStandings(false);
        if (data && !data.error) {
          setStandings(data);
        }
      })
      .catch((err) => {
        setIsFetchingStandings(false);
        console.error("Error fetching standings:", err);
      });
  };

  // Fetch Teams
  const fetchTeams = () => {
    setIsFetchingTeams(true);
    fetch("/api/live-matches/teams")
      .then((res) => res.json())
      .then((data) => {
        setIsFetchingTeams(false);
        if (data && !data.error) {
          setTeams(data);
          if (data.length > 0 && !selectedTeamId) {
            setSelectedTeamId(data[0].id);
          }
        }
      })
      .catch((err) => {
        setIsFetchingTeams(false);
        console.error("Error fetching teams:", err);
      });
  };

  // Fetch Team Roster
  const fetchTeamRoster = (teamId: string) => {
    setIsFetchingRoster(true);
    fetch(`/api/live-matches/roster?teamId=${teamId}`)
      .then((res) => res.json())
      .then((data) => {
        setIsFetchingRoster(false);
        if (data && !data.error) {
          setActiveRoster(data);
        }
      })
      .catch((err) => {
        setIsFetchingRoster(false);
        console.error("Error fetching roster:", err);
      });
  };

  useEffect(() => {
    fetchLiveMatches();
    const interval = setInterval(fetchLiveMatches, 30000); // Poll every 30s
    return () => clearInterval(interval);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Fetch tab-specific data on tab change
  useEffect(() => {
    if (activeTab === "STANDINGS") {
      fetchStandings();
    } else if (activeTab === "TEAMS") {
      fetchTeams();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  // Fetch squad details when selected team changes
  useEffect(() => {
    if (selectedTeamId) {
      fetchTeamRoster(selectedTeamId);
    }
  }, [selectedTeamId]);

  // Fetch dynamic lineups/rosters for selected match
  useEffect(() => {
    if (!selectedMatch) {
      setMatchRosters(null);
      return;
    }
    const { homeTeamId, awayTeamId } = selectedMatch as any;
    if (!homeTeamId && !awayTeamId) {
      setMatchRosters(null);
      return;
    }

    setIsFetchingMatchRosters(true);
    Promise.all([
      homeTeamId ? fetch(`/api/live-matches/roster?teamId=${homeTeamId}`).then(r => r.json()) : Promise.resolve(null),
      awayTeamId ? fetch(`/api/live-matches/roster?teamId=${awayTeamId}`).then(r => r.json()) : Promise.resolve(null)
    ]).then(([homeData, awayData]) => {
      setIsFetchingMatchRosters(false);
      setMatchRosters({
        home: homeData?.roster || [],
        away: awayData?.roster || []
      });
    }).catch(err => {
      setIsFetchingMatchRosters(false);
      console.error("Error fetching match rosters:", err);
      setMatchRosters(null);
    });
  }, [selectedMatch]);

  // Filter matches list
  const filteredMatches = useMemo(() => {
    return matches.filter((m) => {
      if (filter === "ALL") return true;
      return m.status === filter;
    });
  }, [matches, filter]);

  // Grouped matches lists
  const liveMatchesList = useMemo(() => filteredMatches.filter(m => m.status === "LIVE"), [filteredMatches]);
  const upcomingMatchesList = useMemo(() => filteredMatches.filter(m => m.status === "UPCOMING"), [filteredMatches]);
  const finishedMatchesList = useMemo(() => filteredMatches.filter(m => m.status === "FINISHED"), [filteredMatches]);

  // 2D Soccer Pitch Match Tracker Canvas Animation Loop
  const pitchCanvasRef = useRef<HTMLCanvasElement | null>(null);
  useEffect(() => {
    const canvas = pitchCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    
    let animationId: number;
    let w = canvas.width;
    let h = canvas.height;
    
    let ballX = w / 2;
    let ballY = h / 2;
    let ballTargetX = w / 2;
    let ballTargetY = h / 2;
    let ballSpeed = 0.04;
    
    let players: Array<{ x: number, y: number, team: "home" | "away" }> = [];
    
    const initPlayers = () => {
      players = [];
      // Home
      players.push({ x: w * 0.08, y: h / 2, team: "home" }); // GK
      players.push({ x: w * 0.22, y: h * 0.25, team: "home" });
      players.push({ x: w * 0.22, y: h * 0.75, team: "home" });
      players.push({ x: w * 0.38, y: h * 0.3, team: "home" });
      players.push({ x: w * 0.38, y: h * 0.7, team: "home" });
      // Away
      players.push({ x: w * 0.92, y: h / 2, team: "away" }); // GK
      players.push({ x: w * 0.78, y: h * 0.25, team: "away" });
      players.push({ x: w * 0.78, y: h * 0.75, team: "away" });
      players.push({ x: w * 0.62, y: h * 0.3, team: "away" });
      players.push({ x: w * 0.62, y: h * 0.7, team: "away" });
    };
    
    const draw = () => {
      // Grass field
      ctx.fillStyle = "#0c1d12";
      ctx.fillRect(0, 0, w, h);
      
      // Grass stripes
      ctx.fillStyle = "#0d2114";
      for (let i = 0; i < w; i += 40) {
        if ((i / 40) % 2 === 0) {
          ctx.fillRect(i, 0, 20, h);
        }
      }
      
      // Pitch lines
      ctx.strokeStyle = "rgba(197, 168, 92, 0.4)";
      ctx.lineWidth = 1.5;
      ctx.strokeRect(10, 10, w - 20, h - 20);
      
      // Center line & circle
      ctx.beginPath();
      ctx.moveTo(w / 2, 10);
      ctx.lineTo(w / 2, h - 10);
      ctx.stroke();
      
      ctx.beginPath();
      ctx.arc(w / 2, h / 2, 30, 0, Math.PI * 2);
      ctx.stroke();
      
      // Penalty boxes
      ctx.strokeRect(10, h / 2 - 40, 35, 80);
      ctx.strokeRect(w - 45, h / 2 - 40, 35, 80);
      
      // Draw Players
      players.forEach(p => {
        ctx.beginPath();
        ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
        ctx.fillStyle = p.team === "home" ? "#c5a85c" : "#ffffff";
        ctx.fill();
      });
      
      // Ball movements
      const dx = ballTargetX - ballX;
      const dy = ballTargetY - ballY;
      ballX += dx * ballSpeed;
      ballY += dy * ballSpeed;
      
      if (Math.abs(dx) < 6 && Math.abs(dy) < 6 && selectedMatch) {
        const homePoss = selectedMatch.possession?.[0] || 50;
        const isHomeInPoss = Math.random() * 100 < homePoss;
        
        if (isHomeInPoss) {
          ballTargetX = w / 2 + Math.random() * (w / 2 - 30);
          ballTargetY = 20 + Math.random() * (h - 40);
        } else {
          ballTargetX = 30 + Math.random() * (w / 2 - 30);
          ballTargetY = 20 + Math.random() * (h - 40);
        }
      }
      
      // Draw Ball
      ctx.beginPath();
      ctx.arc(ballX, ballY, 3, 0, Math.PI * 2);
      ctx.fillStyle = "#ffffff";
      ctx.shadowColor = "#c5a85c";
      ctx.shadowBlur = 6;
      ctx.fill();
      ctx.shadowBlur = 0;
      
      // Ticker text
      ctx.fillStyle = "rgba(255, 255, 255, 0.85)";
      ctx.font = "10px Marcellus, serif";
      ctx.textAlign = "center";
      ctx.fillText("Match Tracker Active", w / 2, h - 15);
      
      animationId = requestAnimationFrame(draw);
    };
    
    initPlayers();
    draw();
    return () => cancelAnimationFrame(animationId);
  }, [selectedMatch]);

  const renderMatchSection = (sectionTitle: string, list: Match[], isLiveSection = false) => {
    if (list.length === 0) return null;
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginBottom: "15px" }}>
        <div style={{ fontSize: "0.72rem", color: isLiveSection ? "#ef4444" : "var(--accent)", fontWeight: "bold", textTransform: "uppercase", letterSpacing: "0.08em", display: "flex", alignItems: "center", gap: "6px", borderBottom: "1px solid rgba(255, 255, 255, 0.05)", paddingBottom: "6px" }}>
          {isLiveSection && <span className="live-pulse-dot" style={{ margin: 0 }} />}
          {sectionTitle}
        </div>
        {list.map((match) => {
          const isSelected = selectedMatchId === match.id;
          const isLive = match.status === "LIVE";
          const isFinished = match.status === "FINISHED";
          
          let tileBg = "rgba(10, 11, 14, 0.45)";
          let tileBorder = "1px solid var(--border-muted)";
          if (isSelected) {
            tileBg = "rgba(197, 168, 92, 0.08)";
            tileBorder = "2px solid var(--accent)";
          } else if (isLive) {
            tileBg = "rgba(239, 68, 68, 0.03)";
            tileBorder = "1px dashed rgba(239, 68, 68, 0.25)";
          } else if (isFinished) {
            tileBg = "rgba(10, 11, 14, 0.2)";
            tileBorder = "1px solid rgba(255, 255, 255, 0.03)";
          }
          
          return (
            <article
              key={match.id}
              onClick={() => setSelectedMatchId(match.id)}
              style={{
                padding: "14px 16px",
                background: tileBg,
                border: tileBorder,
                borderRadius: "6px",
                cursor: "pointer",
                display: "flex",
                flexDirection: "column",
                gap: "8px",
                transition: "all 0.25s ease",
                opacity: isFinished && !isSelected ? 0.75 : 1
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "0.65rem", color: "var(--text-muted)", textTransform: "uppercase" }}>
                <span>{match.tournament}</span>
                {isLive ? (
                  <span style={{ color: "#ef4444", display: "flex", alignItems: "center", gap: "4px", fontWeight: "bold" }}>
                    <span className="live-pulse-dot" />
                    LIVE {match.time}
                  </span>
                ) : (
                  <span>{match.status} {match.time && `· ${match.time}`}</span>
                )}
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    {getTeamFlag(match.homeTeam) && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={getTeamFlag(match.homeTeam)!} alt="" style={{ width: "18px", height: "12px", objectFit: "cover", borderRadius: "1px" }} />
                    )}
                    <span style={{ fontSize: "0.9rem", color: "#fff", fontWeight: isLive ? "500" : "normal" }}>{match.homeTeam}</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    {getTeamFlag(match.awayTeam) && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={getTeamFlag(match.awayTeam)!} alt="" style={{ width: "18px", height: "12px", objectFit: "cover", borderRadius: "1px" }} />
                    )}
                    <span style={{ fontSize: "0.9rem", color: "#fff", fontWeight: isLive ? "500" : "normal" }}>{match.awayTeam}</span>
                  </div>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "6px", textAlign: "right", fontFamily: "monospace", fontSize: "1.05rem", fontWeight: "bold" }}>
                  <span style={{ color: isLive ? "var(--accent)" : "#fff" }}>{match.homeScore}</span>
                  <span style={{ color: isLive ? "var(--accent)" : "#fff" }}>{match.awayScore}</span>
                </div>
              </div>
              
              {match.scorers && (isLive || isFinished) && (match.scorers.home || match.scorers.away) && (
                <div style={{ display: "flex", flexDirection: "column", gap: "3px", fontSize: "0.7rem", color: "var(--text-muted)", borderTop: "1px solid rgba(255, 255, 255, 0.04)", paddingTop: "6px", marginTop: "2px" }}>
                  {match.scorers.home && (
                    <div style={{ display: "flex", gap: "6px", alignItems: "baseline" }}>
                      <span style={{ fontSize: "0.6rem" }}>⚽</span>
                      <span style={{ lineHeight: "1.2" }}>{match.scorers.home}</span>
                    </div>
                  )}
                  {match.scorers.away && (
                    <div style={{ display: "flex", gap: "6px", alignItems: "baseline" }}>
                      <span style={{ fontSize: "0.6rem", color: "rgba(255,255,255,0.2)" }}>⚽</span>
                      <span style={{ lineHeight: "1.2" }}>{match.scorers.away}</span>
                    </div>
                  )}
                </div>
              )}
            </article>
          );
        })}
      </div>
    );
  };

  return (
    <DashboardLayout channels={channels}>
      <div style={{ display: "flex", flexDirection: "column", gap: "20px", width: "100%", height: "100%" }}>
        
        {/* Sub-navigation Tabs */}
        <div style={{ display: "flex", gap: "20px", borderBottom: "1px solid rgba(255, 255, 255, 0.08)", paddingBottom: "2px", margin: "0 0 10px 0" }}>
          {(["SCOREBOARD", "STANDINGS", "TEAMS"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                padding: "10px 16px",
                background: "transparent",
                border: "none",
                borderBottom: activeTab === tab ? "2px solid var(--accent)" : "2px solid transparent",
                color: activeTab === tab ? "var(--accent)" : "var(--text-muted)",
                fontSize: "0.82rem",
                fontWeight: "bold",
                cursor: "pointer",
                textTransform: "uppercase",
                letterSpacing: "0.06em",
                transition: "all 0.2s"
              }}
            >
              {tab === "SCOREBOARD" ? "Live Scoreboard" : tab === "STANDINGS" ? "Group Tables" : "Teams & Rosters"}
            </button>
          ))}
        </div>

        {/* Tab Content Rendering */}
        {activeTab === "SCOREBOARD" && (
          <div className="matches-main-grid">
            
            {/* Left Column: Matches list */}
            <section style={{ display: "flex", flexDirection: "column", gap: "20px", overflow: "hidden" }}>
              
              {/* Header filter tags */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ display: "flex", gap: "8px" }}>
                  {(["ALL", "LIVE", "UPCOMING", "FINISHED"] as const).map((tab) => (
                    <button
                      key={tab}
                      onClick={() => setFilter(tab)}
                      style={{
                        padding: "6px 12px",
                        background: filter === tab ? "rgba(197,168,92,0.15)" : "rgba(255,255,255,0.02)",
                        border: "1px solid",
                        borderColor: filter === tab ? "var(--accent)" : "var(--border-muted)",
                        color: filter === tab ? "var(--accent)" : "var(--text-muted)",
                        borderRadius: "3px",
                        fontSize: "0.75rem",
                        cursor: "pointer",
                        textTransform: "uppercase"
                      }}
                    >
                      {tab}
                    </button>
                  ))}
                </div>

                <button
                  onClick={fetchLiveMatches}
                  style={{
                    background: "transparent",
                    border: "none",
                    color: "var(--accent)",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "5px",
                    fontSize: "0.75rem"
                  }}
                  title="Refresh Scoreboard"
                >
                  <RefreshCw size={14} className={isRefreshing ? "spin-animate" : ""} />
                </button>
              </div>

              {/* Matches Scroll list */}
              <div style={{ display: "flex", flexDirection: "column", gap: "12px", overflowY: "auto", flexGrow: 1 }} className="matches-scrollable">
                {filteredMatches.length > 0 ? (
                  <>
                    {renderMatchSection("Live Matches", liveMatchesList, true)}
                    {renderMatchSection("Upcoming Matches", upcomingMatchesList, false)}
                    {renderMatchSection("Finished Matches", finishedMatchesList, false)}
                  </>
                ) : (
                  <div style={{ textAlign: "center", padding: "40px", color: "var(--text-muted)" }}>
                    No matches currently match this filter.
                  </div>
                )}
              </div>
            </section>

            {/* Right Column: Detailed Match Stats & Lineups */}
            <main style={{ display: "flex", flexDirection: "column", gap: "24px", overflowY: "auto" }} className="match-details-panel">
              {selectedMatch ? (
                <>
                  {/* Header card with big scores */}
                  <div style={{ background: "var(--bg-panel-strong)", border: "1px solid var(--border-accent)", borderRadius: "4px", padding: "30px", display: "flex", flexDirection: "column", alignItems: "center", gap: "15px" }}>
                    <div style={{ fontSize: "0.8rem", color: "var(--accent)", textTransform: "uppercase", letterSpacing: "0.15em" }}>
                      {selectedMatch.tournament}
                    </div>
                    
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%", maxWidth: "500px" }}>
                      <div style={{ textAlign: "center", flex: 1 }}>
                        {getTeamFlag(selectedMatch.homeTeam) ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={getTeamFlag(selectedMatch.homeTeam)!} alt="" style={{ width: "48px", height: "32px", objectFit: "cover", borderRadius: "3px", border: "1px solid var(--border-accent)", marginBottom: "8px", display: "inline-block" }} />
                        ) : (
                          <Shield size={36} style={{ color: "var(--accent)", marginBottom: "8px" }} />
                        )}
                        <div style={{ fontSize: "1.1rem", color: "#fff", fontWeight: "bold" }}>{selectedMatch.homeTeam}</div>
                      </div>
                      
                      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "4px" }}>
                        <div style={{ fontSize: "3rem", fontWeight: "bold", color: "var(--accent)", letterSpacing: "0.1em", textShadow: "var(--glow)", fontFamily: "monospace" }}>
                          {selectedMatch.homeScore} : {selectedMatch.awayScore}
                        </div>
                        {selectedMatch.status === "LIVE" ? (
                          <span style={{ color: "#ef4444", fontSize: "0.75rem", textTransform: "uppercase", fontWeight: "bold", display: "flex", alignItems: "center", gap: "4px" }}>
                            <span className="live-pulse-dot" /> LIVE {selectedMatch.time}
                          </span>
                        ) : (
                          <span style={{ color: "var(--text-muted)", fontSize: "0.75rem", textTransform: "uppercase" }}>
                            {selectedMatch.status}
                          </span>
                        )}
                      </div>

                      <div style={{ textAlign: "center", flex: 1 }}>
                        {getTeamFlag(selectedMatch.awayTeam) ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={getTeamFlag(selectedMatch.awayTeam)!} alt="" style={{ width: "48px", height: "32px", objectFit: "cover", borderRadius: "3px", border: "1px solid var(--border-accent)", marginBottom: "8px", display: "inline-block" }} />
                        ) : (
                          <Shield size={36} style={{ color: "#fff", marginBottom: "8px" }} />
                        )}
                        <div style={{ fontSize: "1.1rem", color: "#fff", fontWeight: "bold" }}>{selectedMatch.awayTeam}</div>
                      </div>
                    </div>

                    {selectedMatch.scorers && (selectedMatch.status === "LIVE" || selectedMatch.status === "FINISHED") && (selectedMatch.scorers.home || selectedMatch.scorers.away) && (
                      <div style={{ display: "flex", justifyContent: "space-between", width: "100%", maxWidth: "500px", fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "15px", borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: "12px" }}>
                        <div style={{ textAlign: "left", flex: 1, paddingRight: "15px", lineHeight: "1.4" }}>
                          {selectedMatch.scorers.home && (
                            <div>
                              <span style={{ marginRight: "6px" }}>⚽</span>
                              {selectedMatch.scorers.home}
                            </div>
                          )}
                        </div>
                        <div style={{ width: "40px" }} />
                        <div style={{ textAlign: "right", flex: 1, paddingLeft: "15px", lineHeight: "1.4" }}>
                          {selectedMatch.scorers.away && (
                            <div>
                              {selectedMatch.scorers.away}
                              <span style={{ marginLeft: "6px" }}>⚽</span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* 2D Canvas Match Tracker & Stats */}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px" }} className="match-pitch-stats-grid">
                    
                    {/* 2D Pitch Canvas */}
                    <section style={{ background: "rgba(10, 11, 14, 0.5)", border: "1px solid var(--border-accent)", borderRadius: "4px", padding: "16px", display: "flex", flexDirection: "column", gap: "10px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "0.75rem", color: "var(--accent)", textTransform: "uppercase" }}>
                        <Activity size={14} />
                        <span>Real-time Match Tracker</span>
                      </div>
                      <canvas ref={pitchCanvasRef} width={400} height={230} style={{ width: "100%", height: "230px", borderRadius: "3px", border: "1px solid rgba(255,255,255,0.05)" }} />
                    </section>

                    {/* Match Statistics */}
                    <section style={{ background: "var(--bg-panel-strong)", border: "1px solid var(--border-accent)", borderRadius: "4px", padding: "20px", display: "flex", flexDirection: "column", gap: "15px" }}>
                      <div style={{ fontSize: "0.75rem", color: "var(--accent)", textTransform: "uppercase", letterSpacing: "0.1em" }}>Match Statistics</div>
                      
                      {/* Possession */}
                      <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.75rem" }}>
                          <span>Possession</span>
                          <span style={{ color: "var(--accent)" }}>{selectedMatch.possession?.[0]}% vs {selectedMatch.possession?.[1]}%</span>
                        </div>
                        <div style={{ height: "6px", background: "rgba(255,255,255,0.05)", borderRadius: "3px", overflow: "hidden", display: "flex" }}>
                          <div style={{ width: `${selectedMatch.possession?.[0]}%`, background: "var(--accent)" }} />
                          <div style={{ width: `${selectedMatch.possession?.[1]}%`, background: "#fff" }} />
                        </div>
                      </div>

                      {/* Shots */}
                      <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.75rem" }}>
                          <span>Total Shots</span>
                          <span style={{ color: "var(--accent)" }}>{selectedMatch.shots?.[0]} - {selectedMatch.shots?.[1]}</span>
                        </div>
                        <div style={{ height: "6px", background: "rgba(255,255,255,0.05)", borderRadius: "3px", overflow: "hidden", display: "flex" }}>
                          <div style={{ width: `${(selectedMatch.shots?.[0] / (selectedMatch.shots?.[0] + selectedMatch.shots?.[1] || 1)) * 100}%`, background: "var(--accent)" }} />
                          <div style={{ width: `${(selectedMatch.shots?.[1] / (selectedMatch.shots?.[0] + selectedMatch.shots?.[1] || 1)) * 100}%`, background: "#fff" }} />
                        </div>
                      </div>

                      {/* Disciplinary Cards */}
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "15px", marginTop: "5px" }}>
                        <div style={{ background: "rgba(0,0,0,0.2)", padding: "10px", borderRadius: "3px", border: "1px solid var(--border-muted)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>Yellow Cards</span>
                          <span style={{ fontSize: "0.85rem", color: "#fbbf24", fontWeight: "bold" }}>
                            {selectedMatch.yellowCards?.[0]} : {selectedMatch.yellowCards?.[1]}
                          </span>
                        </div>
                        <div style={{ background: "rgba(0,0,0,0.2)", padding: "10px", borderRadius: "3px", border: "1px solid var(--border-muted)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>Red Cards</span>
                          <span style={{ fontSize: "0.85rem", color: "#ef4444", fontWeight: "bold" }}>
                            {selectedMatch.redCards?.[0]} : {selectedMatch.redCards?.[1]}
                          </span>
                        </div>
                      </div>
                    </section>

                  </div>

                  {/* Lineups */}
                  <section style={{ background: "var(--bg-panel-strong)", border: "1px solid var(--border-accent)", borderRadius: "4px", padding: "24px", display: "flex", flexDirection: "column", gap: "15px" }}>
                    <div style={{ fontSize: "0.8rem", color: "var(--accent)", textTransform: "uppercase", letterSpacing: "0.1em" }}>Starting Squad Lineups</div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "40px" }} className="match-lineups-grid">
                      
                      {/* Home Lineup */}
                      <div>
                        <div style={{ fontSize: "0.85rem", color: "var(--accent)", fontWeight: "bold", borderBottom: "1px solid var(--border-accent)", paddingBottom: "6px", marginBottom: "12px" }}>
                          {selectedMatch.homeTeam} Squad
                        </div>
                        <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: "8px" }}>
                          {isFetchingMatchRosters ? (
                            <li style={{ fontSize: "0.8rem", color: "var(--text-muted)", display: "flex", alignItems: "center", gap: "6px" }}>
                              <RefreshCw size={12} className="spin-animate" /> Loading dynamic roster...
                            </li>
                          ) : matchRosters?.home && matchRosters.home.length > 0 ? (
                            matchRosters.home.map((player: any, idx: number) => (
                              <li key={player.id || idx} style={{ fontSize: "0.8rem", color: "var(--text-primary)", display: "flex", gap: "10px", alignItems: "center" }}>
                                {player.photo && (
                                  // eslint-disable-next-line @next/next/no-img-element
                                  <img src={player.photo} alt="" style={{ width: "18px", height: "18px", borderRadius: "50%", objectFit: "cover", background: "rgba(255,255,255,0.05)" }} />
                                )}
                                <span style={{ color: "var(--accent)", fontFamily: "monospace", width: "20px" }}>{player.jersey || "-"}</span>
                                <span>{player.name}</span>
                                <span style={{ fontSize: "0.7rem", color: "var(--text-muted)", marginLeft: "auto" }}>{player.position}</span>
                              </li>
                            ))
                          ) : (
                            selectedMatch.lineups?.home?.map((player, idx) => (
                              <li key={idx} style={{ fontSize: "0.8rem", color: "var(--text-primary)", display: "flex", gap: "10px" }}>
                                <span style={{ color: "var(--accent)", fontFamily: "monospace", width: "20px" }}>{idx + 1}.</span>
                                <span>{player}</span>
                              </li>
                            ))
                          )}
                        </ul>
                      </div>

                      {/* Away Lineup */}
                      <div>
                        <div style={{ fontSize: "0.85rem", color: "#fff", fontWeight: "bold", borderBottom: "1px solid var(--border-accent)", paddingBottom: "6px", marginBottom: "12px" }}>
                          {selectedMatch.awayTeam} Squad
                        </div>
                        <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: "8px" }}>
                          {isFetchingMatchRosters ? (
                            <li style={{ fontSize: "0.8rem", color: "var(--text-muted)", display: "flex", alignItems: "center", gap: "6px" }}>
                              <RefreshCw size={12} className="spin-animate" /> Loading dynamic roster...
                            </li>
                          ) : matchRosters?.away && matchRosters.away.length > 0 ? (
                            matchRosters.away.map((player: any, idx: number) => (
                              <li key={player.id || idx} style={{ fontSize: "0.8rem", color: "var(--text-primary)", display: "flex", gap: "10px", alignItems: "center" }}>
                                {player.photo && (
                                  // eslint-disable-next-line @next/next/no-img-element
                                  <img src={player.photo} alt="" style={{ width: "18px", height: "18px", borderRadius: "50%", objectFit: "cover", background: "rgba(255,255,255,0.05)" }} />
                                )}
                                <span style={{ color: "var(--accent)", fontFamily: "monospace", width: "20px" }}>{player.jersey || "-"}</span>
                                <span>{player.name}</span>
                                <span style={{ fontSize: "0.7rem", color: "var(--text-muted)", marginLeft: "auto" }}>{player.position}</span>
                              </li>
                            ))
                          ) : (
                            selectedMatch.lineups?.away?.map((player, idx) => (
                              <li key={idx} style={{ fontSize: "0.8rem", color: "var(--text-primary)", display: "flex", gap: "10px" }}>
                                <span style={{ color: "var(--text-muted)", fontFamily: "monospace", width: "20px" }}>{idx + 1}.</span>
                                <span>{player}</span>
                              </li>
                            ))
                          )}
                        </ul>
                      </div>

                    </div>
                  </section>
                </>
              ) : (
                <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-muted)" }}>
                  Select a match to view stats and active tracker.
                </div>
              )}
            </main>
          </div>
        )}

        {activeTab === "STANDINGS" && (
          <div style={{ width: "100%" }}>
            {isFetchingStandings ? (
              <div style={{ textAlign: "center", padding: "60px", color: "var(--text-muted)" }}>
                <RefreshCw className="spin-animate" style={{ margin: "0 auto 10px" }} />
                <span>Loading real-time World Cup standings...</span>
              </div>
            ) : standings.length > 0 ? (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: "24px", overflowY: "auto", maxHeight: "calc(100vh - 200px)", paddingRight: "5px" }}>
                {standings.map((group: any, gIdx: number) => (
                  <div key={gIdx} style={{ background: "var(--bg-panel-strong)", border: "1px solid var(--border-accent)", borderRadius: "4px", padding: "16px" }}>
                    <h3 style={{ fontSize: "0.85rem", color: "var(--accent)", textTransform: "uppercase", borderBottom: "1px solid rgba(255, 255, 255, 0.08)", paddingBottom: "8px", marginBottom: "12px", letterSpacing: "0.05em" }}>
                      {group.name}
                    </h3>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.75rem", textAlign: "left" }}>
                      <thead>
                        <tr style={{ color: "var(--text-muted)", borderBottom: "1px solid rgba(255,255,255,0.05)", paddingBottom: "4px" }}>
                          <th style={{ padding: "4px 8px 4px 0" }}>Team</th>
                          <th style={{ padding: "4px 6px", textAlign: "center" }}>GP</th>
                          <th style={{ padding: "4px 6px", textAlign: "center" }}>W</th>
                          <th style={{ padding: "4px 6px", textAlign: "center" }}>D</th>
                          <th style={{ padding: "4px 6px", textAlign: "center" }}>L</th>
                          <th style={{ padding: "4px 6px", textAlign: "center" }}>GD</th>
                          <th style={{ padding: "4px 6px", textAlign: "center", color: "var(--accent)", fontWeight: "bold" }}>PTS</th>
                        </tr>
                      </thead>
                      <tbody>
                        {group.teams?.map((team: any, tIdx: number) => (
                          <tr key={tIdx} style={{ borderBottom: "1px solid rgba(255, 255, 255, 0.03)", transition: "background 0.2s" }}>
                            <td style={{ padding: "6px 8px 6px 0", display: "flex", alignItems: "center", gap: "8px" }}>
                              <span style={{ color: "var(--text-muted)", width: "12px", display: "inline-block", fontSize: "0.7rem" }}>{tIdx + 1}</span>
                              {team.logo ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={team.logo} alt="" style={{ width: "16px", height: "12px", objectFit: "contain" }} />
                              ) : getTeamFlag(team.teamName) ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={getTeamFlag(team.teamName)!} alt="" style={{ width: "16px", height: "12px", objectFit: "contain" }} />
                              ) : null}
                              <span style={{ color: "#fff", fontWeight: "500", textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap" }} title={team.teamName}>
                                {team.teamName}
                              </span>
                            </td>
                            <td style={{ padding: "6px", textAlign: "center", fontFamily: "monospace" }}>{team.gamesPlayed}</td>
                            <td style={{ padding: "6px", textAlign: "center", fontFamily: "monospace" }}>{team.wins}</td>
                            <td style={{ padding: "6px", textAlign: "center", fontFamily: "monospace" }}>{team.ties}</td>
                            <td style={{ padding: "6px", textAlign: "center", fontFamily: "monospace" }}>{team.losses}</td>
                            <td style={{ padding: "6px", textAlign: "center", fontFamily: "monospace", color: parseInt(team.pointDifference) > 0 ? "#22c55e" : parseInt(team.pointDifference) < 0 ? "#ef4444" : "inherit" }}>
                              {parseInt(team.pointDifference) > 0 ? `+${team.pointDifference}` : team.pointDifference}
                            </td>
                            <td style={{ padding: "6px", textAlign: "center", fontFamily: "monospace", color: "var(--accent)", fontWeight: "bold" }}>{team.points}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ textAlign: "center", padding: "40px", color: "var(--text-muted)" }}>
                No standings data available.
              </div>
            )}
          </div>
        )}

        {activeTab === "TEAMS" && (
          <div className="matches-main-grid" style={{ height: "calc(100vh - 200px)" }}>
            
            {/* Left Column: Teams list */}
            <section style={{ display: "flex", flexDirection: "column", gap: "15px", overflow: "hidden" }}>
              <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                FIFA 2026 Teams ({teams.length})
              </div>
              {isFetchingTeams ? (
                <div style={{ textAlign: "center", padding: "40px", color: "var(--text-muted)" }}>
                  <RefreshCw className="spin-animate" style={{ margin: "0 auto 10px" }} />
                  <span>Loading teams list...</span>
                </div>
              ) : (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(110px, 1fr))", gap: "10px", overflowY: "auto", flexGrow: 1 }} className="matches-scrollable">
                  {teams.map((t: any) => {
                    const isSelected = selectedTeamId === t.id;
                    return (
                      <div
                        key={t.id}
                        onClick={() => setSelectedTeamId(t.id)}
                        style={{
                          padding: "12px",
                          background: isSelected ? "rgba(197, 168, 92, 0.08)" : "rgba(10, 11, 14, 0.45)",
                          border: isSelected ? "2px solid var(--accent)" : "1px solid var(--border-muted)",
                          borderRadius: "6px",
                          cursor: "pointer",
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "center",
                          gap: "8px",
                          textAlign: "center",
                          transition: "all 0.2s"
                        }}
                      >
                        {t.logo ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={t.logo} alt="" style={{ width: "32px", height: "24px", objectFit: "contain", border: "1px solid rgba(255,255,255,0.05)", borderRadius: "2px" }} />
                        ) : getTeamFlag(t.name) ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={getTeamFlag(t.name)!} alt="" style={{ width: "32px", height: "24px", objectFit: "cover", border: "1px solid rgba(255,255,255,0.05)", borderRadius: "2px" }} />
                        ) : (
                          <Shield size={24} style={{ color: "var(--accent)" }} />
                        )}
                        <span style={{ fontSize: "0.75rem", color: "#fff", fontWeight: isSelected ? "bold" : "normal" }}>{t.name}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>

            {/* Right Column: Squad Roster */}
            <main style={{ display: "flex", flexDirection: "column", gap: "20px", overflowY: "auto" }} className="match-details-panel">
              {isFetchingRoster ? (
                <div style={{ height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", color: "var(--text-muted)" }}>
                  <RefreshCw className="spin-animate" style={{ marginBottom: "10px" }} />
                  <span>Loading squad roster...</span>
                </div>
              ) : activeRoster ? (
                <>
                  {/* Team Header */}
                  <div style={{ background: "var(--bg-panel-strong)", border: "1px solid var(--border-accent)", borderRadius: "4px", padding: "20px", display: "flex", alignItems: "center", gap: "20px" }}>
                    {activeRoster.logo ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={activeRoster.logo} alt="" style={{ width: "64px", height: "48px", objectFit: "contain" }} />
                    ) : getTeamFlag(activeRoster.team) ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={getTeamFlag(activeRoster.team)!} alt="" style={{ width: "64px", height: "48px", objectFit: "cover", borderRadius: "4px" }} />
                    ) : (
                      <Shield size={48} style={{ color: "var(--accent)" }} />
                    )}
                    <div>
                      <h2 style={{ fontSize: "1.3rem", color: "#fff", fontWeight: "bold", margin: 0 }}>{activeRoster.team}</h2>
                      {activeRoster.coach && (
                        <div style={{ fontSize: "0.8rem", color: "var(--accent)", marginTop: "4px" }}>Manager: {activeRoster.coach}</div>
                      )}
                    </div>
                  </div>

                  {/* Roster Grid */}
                  <section style={{ background: "var(--bg-panel-strong)", border: "1px solid var(--border-accent)", borderRadius: "4px", padding: "24px" }}>
                    <div style={{ fontSize: "0.85rem", color: "var(--accent)", textTransform: "uppercase", borderBottom: "1px solid var(--border-accent)", paddingBottom: "8px", marginBottom: "16px", fontWeight: "bold" }}>
                      Qualified Squad Roster ({activeRoster.roster?.length || 0} Players)
                    </div>
                    
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: "12px" }}>
                      {activeRoster.roster?.map((player: any, idx: number) => (
                        <div key={player.id || idx} style={{ display: "flex", alignItems: "center", gap: "12px", padding: "10px", background: "rgba(255,255,255,0.02)", borderRadius: "6px", border: "1px solid rgba(255,255,255,0.04)" }}>
                          {player.photo ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={player.photo} alt="" style={{ width: "36px", height: "36px", borderRadius: "50%", objectFit: "cover", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }} />
                          ) : (
                            <div style={{ width: "36px", height: "36px", borderRadius: "50%", background: "rgba(255,255,255,0.05)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.75rem", color: "var(--text-muted)" }}>
                              {player.jersey || idx + 1}
                            </div>
                          )}
                          <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                            <span style={{ fontSize: "0.8rem", color: "#fff", fontWeight: "bold" }}>
                              {player.name}
                            </span>
                            <span style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>
                              {player.position} {player.jersey ? `· #${player.jersey}` : ""}
                            </span>
                            {(player.age || player.height) && (
                              <span style={{ fontSize: "0.65rem", color: "var(--text-muted)" }}>
                                {player.age ? `${player.age} yrs` : ""} {player.height ? `· ${player.height}` : ""}
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </section>
                </>
              ) : (
                <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-muted)" }}>
                  Select a team to load their official squad roster.
                </div>
              )}
            </main>
          </div>
        )}

      </div>
    </DashboardLayout>
  );
}
