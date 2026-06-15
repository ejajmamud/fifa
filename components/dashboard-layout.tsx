"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Tv,
  Calendar,
  Trophy,
  Newspaper,
  Settings as SettingsIcon,
  LayoutGrid
} from "lucide-react";
import { Channel } from "@/lib/playlist";

type DashboardLayoutProps = {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
  channels?: Channel[];
};

export function DashboardLayout({
  children,
  title: customTitle,
  subtitle: customSubtitle,
  channels = []
}: DashboardLayoutProps) {
  const pathname = usePathname();
  const router = useRouter();

  const [activeTheme, setActiveTheme] = useState<"gold" | "platinum">("gold");
  const [clockTime, setClockTime] = useState("");
  const [isTvMode, setIsTvMode] = useState(false);
  const [focusedChannelIdx, setFocusedChannelIdx] = useState(0);

  // Sync theme on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      const theme = localStorage.getItem("emjsports:theme");
      if (theme === "platinum" || theme === "gold") {
        setActiveTheme(theme);
      }
      
      // Listen to theme changes in settings page
      const handleStorageChange = () => {
        const updatedTheme = localStorage.getItem("emjsports:theme");
        if (updatedTheme === "platinum" || updatedTheme === "gold") {
          setActiveTheme(updatedTheme);
        }
      };
      window.addEventListener("storage", handleStorageChange);
      return () => window.removeEventListener("storage", handleStorageChange);
    }
  }, []);

  // Clock Update
  useEffect(() => {
    const updateTime = () => {
      const d = new Date();
      setClockTime(
        d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false })
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // TV Mode Keyboard Navigation
  useEffect(() => {
    if (!isTvMode || channels.length === 0) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === "Escape") {
        e.preventDefault();
        setIsTvMode(false);
        return;
      }

      let cols = 4;
      const grid = document.querySelector(".tv-mode-grid");
      if (grid) {
        try {
          const gridStyle = window.getComputedStyle(grid);
          const gridTemplateColumns = gridStyle.getPropertyValue("grid-template-columns");
          if (gridTemplateColumns) {
            cols = gridTemplateColumns.trim().split(/\s+/).length || 4;
          }
        } catch (err) {
          console.error("TV Mode Grid columns error:", err);
        }
      }

      switch (e.code) {
        case "ArrowRight":
          e.preventDefault();
          setFocusedChannelIdx((prev) => Math.min(channels.length - 1, prev + 1));
          break;
        case "ArrowLeft":
          e.preventDefault();
          setFocusedChannelIdx((prev) => Math.max(0, prev - 1));
          break;
        case "ArrowDown":
          e.preventDefault();
          setFocusedChannelIdx((prev) => Math.min(channels.length - 1, prev + cols));
          break;
        case "ArrowUp":
          e.preventDefault();
          setFocusedChannelIdx((prev) => Math.max(0, prev - cols));
          break;
        case "Enter":
          e.preventDefault();
          if (channels[focusedChannelIdx]) {
            router.push(`/?channel=${channels[focusedChannelIdx].id}`);
          }
          setIsTvMode(false);
          break;
        default:
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isTvMode, channels, focusedChannelIdx, router]);

  // Scroll focused channel into view in TV Mode
  useEffect(() => {
    if (isTvMode) {
      const grid = document.querySelector(".tv-mode-grid");
      if (grid && grid.children[focusedChannelIdx]) {
        grid.children[focusedChannelIdx].scrollIntoView({
          behavior: "smooth",
          block: "nearest"
        });
      }
    }
  }, [focusedChannelIdx, isTvMode]);

  // Determine path titles
  const getHeaderInfo = () => {
    if (customTitle && customSubtitle) {
      return { title: customTitle, subtitle: customSubtitle };
    }
    switch (pathname) {
      case "/":
        return {
          title: "Live Broadcast Stage",
          subtitle: "Uptime-sorted active feeds prioritised automatically"
        };
      case "/epg":
        return {
          title: "Electronic TV Guide",
          subtitle: "Full 24-hour deterministic broadcasting schedules"
        };
      case "/matches":
        return {
          title: "Match Center",
          subtitle: "FIFA tournaments, real-time statistics, and team lineups"
        };
      case "/news":
        return {
          title: "Sports Newsroom",
          subtitle: "Exclusive soccer updates and expert tactical studies"
        };
      case "/settings":
        return {
          title: "Platform Settings",
          subtitle: "Tuning latency, aesthetic accents, and hotkey guidelines"
        };
      default:
        return {
          title: "EMJ Sports",
          subtitle: "Broadcast Arena"
        };
    }
  };

  const header = getHeaderInfo();

  return (
    <div className={`app-container ${activeTheme === "platinum" ? "theme-platinum" : ""}`}>
      
      {/* TV UI Mode Overlay (cinematic fullscreen grid) */}
      {isTvMode && channels.length > 0 && (
        <section className="tv-mode-shell" aria-label="TV mode navigation dashboard">
          <div className="tv-mode-header">
            <div className="view-title-wrap">
              <h2 style={{ fontSize: "2.4rem", color: "var(--accent)" }}>Cinematic TV Mode</h2>
              <p>Arrow Keys to navigate · Enter to play · Escape to exit</p>
            </div>
            <div className="header-clock">{clockTime}</div>
          </div>
          
          <div className="tv-mode-grid">
            {channels.map((c, idx) => (
              <div
                key={c.id}
                className={`tv-mode-card ${focusedChannelIdx === idx ? "focused" : ""}`}
                onClick={() => {
                  setFocusedChannelIdx(idx);
                  router.push(`/?channel=${c.id}`);
                  setIsTvMode(false);
                }}
              >
                <div className="tv-card-header">
                  <span>CH {c.number.toString().padStart(3, "0")}</span>
                  <span>{c.quality}</span>
                </div>
                <div className="tv-card-name">{c.name}</div>
                <div className="tv-card-meta">
                  <span>{c.group}</span>
                  <span style={{ display: "flex", alignItems: "center" }}>
                    <span className={`status-dot ${c.working !== false ? "active" : "offline"}`} />
                    {c.working !== false ? `${c.latency ?? 40}ms` : "Offline"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Desktop Left Sidebar */}
      <aside className="sidebar" aria-label="Left sidebar">
        <div className="brand-section">
          <h1 className="brand-title">EMJ Sports</h1>
          <p className="brand-subtitle">Broadcast Arena</p>
        </div>

        <nav className="nav-menu">
          <Link href="/" className={`nav-item ${pathname === "/" ? "active" : ""}`}>
            <Tv size={18} />
            <span>Live TV</span>
          </Link>
          <Link href="/epg" className={`nav-item ${pathname === "/epg" ? "active" : ""}`}>
            <Calendar size={18} />
            <span>TV Guide</span>
          </Link>
          <Link href="/matches" className={`nav-item ${pathname === "/matches" ? "active" : ""}`}>
            <Trophy size={18} />
            <span>Matches</span>
          </Link>
          <Link href="/news" className={`nav-item ${pathname === "/news" ? "active" : ""}`}>
            <Newspaper size={18} />
            <span>News Feed</span>
          </Link>
          <Link href="/settings" className={`nav-item ${pathname === "/settings" ? "active" : ""}`}>
            <SettingsIcon size={18} />
            <span>Settings</span>
          </Link>
        </nav>

        <div className="sidebar-footer">
          <p>EMJ Sports Premium v2.5</p>
        </div>
      </aside>

      {/* Mobile Bottom Navigation Bar */}
      <nav className="mobile-bottom-nav">
        <Link href="/" className={`mobile-nav-btn ${pathname === "/" ? "active" : ""}`}>
          <Tv size={20} />
          <span>Live TV</span>
        </Link>
        <Link href="/epg" className={`mobile-nav-btn ${pathname === "/epg" ? "active" : ""}`}>
          <Calendar size={20} />
          <span>Guide</span>
        </Link>
        <Link href="/matches" className={`mobile-nav-btn ${pathname === "/matches" ? "active" : ""}`}>
          <Trophy size={20} />
          <span>Matches</span>
        </Link>
        <Link href="/news" className={`mobile-nav-btn ${pathname === "/news" ? "active" : ""}`}>
          <Newspaper size={20} />
          <span>News</span>
        </Link>
        <Link href="/settings" className={`mobile-nav-btn ${pathname === "/settings" ? "active" : ""}`}>
          <SettingsIcon size={20} />
          <span>Settings</span>
        </Link>
      </nav>

      {/* Main Panel Content Column */}
      <main className="main-content">
        <header className="view-header">
          <div className="view-title-wrap">
            <h2>{header.title}</h2>
            <p>{header.subtitle}</p>
          </div>
          <div style={{ display: "flex", gap: "15px", alignItems: "center" }}>
            {channels.length > 0 && (
              <button
                className="player-hud-btn"
                onClick={() => setIsTvMode(true)}
                title="Cinematic TV UI Mode (T)"
                style={{
                  border: "1px solid var(--border-accent)",
                  padding: "10px 14px",
                  borderRadius: "4px",
                  background: "rgba(0,0,0,0.5)",
                  cursor: "pointer"
                }}
              >
                <LayoutGrid size={16} style={{ marginRight: "6px", display: "inline" }} />
                TV Mode
              </button>
            )}
            <div className="header-clock">{clockTime}</div>
          </div>
        </header>

        {children}
      </main>
    </div>
  );
}
