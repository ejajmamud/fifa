"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Hls from "hls.js";
import {
  Tv,
  Heart,
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize2,
  Sliders,
  Clock,
  Search,
  Send
} from "lucide-react";
import {
  Channel,
  mockComments
} from "@/lib/playlist";
import { DashboardLayout } from "./dashboard-layout";

type TvExperienceProps = {
  channels: Channel[];
};

type ChatMessage = {
  id: string;
  username: string;
  message: string;
  role: "pundit" | "fan";
};

const storageKeys = {
  favorites: "emjsports:favorites",
  theme: "emjsports:theme",
  buffer: "emjsports:buffer",
  lang: "emjsports:lang",
  brightness: "emjsports:brightness",
  contrast: "emjsports:contrast",
  saturation: "emjsports:saturation",
  goldTint: "emjsports:goldTint"
};

export function TvExperience({ channels }: TvExperienceProps) {
  // Navigation & Search
  const [activeChannelId, setActiveChannelId] = useState<string>(channels[0]?.id ?? "");
  const [searchQuery, setSearchQuery] = useState("");
  const [activeGroup, setActiveGroup] = useState("All");

  // Custom Controls
  const [favorites, setFavorites] = useState<string[]>([]);
  const [volume, setVolume] = useState(0.5);
  const [isMuted, setIsMuted] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [aspectRatio, setAspectRatio] = useState<"fit" | "fill" | "stretch" | "zoom" | "16-9" | "4-3">("fit");
  const [showStatsForNerds, setShowStatsForNerds] = useState(false);
  const [sortingOption, setSortingOption] = useState<"number" | "name" | "latency">("number");

  // Video Tuner Filters
  const [brightness, setBrightness] = useState(100);
  const [contrast, setContrast] = useState(100);
  const [saturation, setSaturation] = useState(100);
  const [goldTint, setGoldTint] = useState(0);
  const [showTuner, setShowTuner] = useState(false);

  // Sleep Timer
  const [sleepTimer, setSleepTimer] = useState(0); // in minutes, 0 = disabled
  const [sleepSecondsLeft, setSleepSecondsLeft] = useState(0);
  const [isSleeping, setIsSleeping] = useState(false);
  const sleepTimerRef = useRef<number | undefined>(undefined);

  // App Config Settings
  const [bufferDelay, setBufferDelay] = useState(5);
  
  // Player Internal Refs
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const hlsRef = useRef<Hls | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Dual Stream Refs and States
  const videoRef2 = useRef<HTMLVideoElement | null>(null);
  const hlsRef2 = useRef<Hls | null>(null);
  const [isDualStream, setIsDualStream] = useState(false);
  const [activeChannelId2, setActiveChannelId2] = useState<string>("");
  const [isMuted2, setIsMuted2] = useState(true);

  const [isLoading, setIsLoading] = useState(true);
  const [playError, setPlayError] = useState("");
  const [stats, setStats] = useState({
    resolution: "0x0",
    bitrate: "0 kbps",
    bufferLen: "0.0s",
    fps: 0,
    latency: "0.0s"
  });

  // Chat comments feed
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    { id: "c1", username: "Analyst Roy", message: "Welcome to EMJ Sports Live TV.", role: "pundit" },
    { id: "c2", username: "Tactical Javier", message: "Server-side stream proxying active to bypass Mixed Content blocks.", role: "pundit" },
    { id: "c3", username: "Pundit Emma", message: "You can load two streams side-by-side using Dual Stream.", role: "pundit" }
  ]);
  const [chatInput, setChatInput] = useState("");
  const chatEndRef = useRef<HTMLDivElement | null>(null);
  const chatContainerRef = useRef<HTMLDivElement | null>(null);

  // Active channel compute
  const activeChannel = useMemo(
    () => channels.find((c) => c.id === activeChannelId) ?? channels[0],
    [channels, activeChannelId]
  );

  const activeChannel2 = useMemo(
    () => channels.find((c) => c.id === activeChannelId2) ?? channels[1] ?? channels[0],
    [channels, activeChannelId2]
  );

  // Parse direct link channel selection (?channel=id) on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const ch = params.get("channel");
      if (ch && channels.some((c) => c.id === ch)) {
        setActiveChannelId(ch);
      }
    }
  }, [channels]);

  // Filter groups
  const groups = useMemo(() => {
    const counts = channels.reduce<Record<string, number>>((acc, channel) => {
      acc[channel.group] = (acc[channel.group] ?? 0) + 1;
      return acc;
    }, {});
    return [
      ["All", channels.length] as const,
      ["Favorites", favorites.length] as const,
      ...Object.entries(counts).sort((a, b) => b[1] - a[1])
    ];
  }, [channels, favorites.length]);

  // Sort and Filter channels
  const filteredChannels = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    let result = channels.filter((c) => {
      const matchGroup =
        activeGroup === "All" ||
        (activeGroup === "Favorites" && favorites.includes(c.id)) ||
        c.group === activeGroup;
      const matchSearch =
        !q ||
        [c.name, c.group, c.country, c.host]
          .filter(Boolean)
          .some((v) => v!.toLowerCase().includes(q));
      return matchGroup && matchSearch;
    });

    if (sortingOption === "name") {
      result.sort((a, b) => a.name.localeCompare(b.name));
    } else if (sortingOption === "latency") {
      result.sort((a, b) => (a.latency ?? 9999) - (b.latency ?? 9999));
    } else {
      result.sort((a, b) => a.number - b.number);
    }

    return result;
  }, [activeGroup, channels, favorites, searchQuery, sortingOption]);

  // Surf channels helper
  const surfChannel = useCallback((direction: number) => {
    if (filteredChannels.length === 0) return;
    const currentIndex = filteredChannels.findIndex((c) => c.id === activeChannelId);
    let nextIndex = currentIndex + direction;

    if (nextIndex < 0) nextIndex = filteredChannels.length - 1;
    if (nextIndex >= filteredChannels.length) nextIndex = 0;

    setActiveChannelId(filteredChannels[nextIndex].id);
  }, [filteredChannels, activeChannelId]);

  // Fullscreen helper
  const toggleFullscreen = useCallback(() => {
    if (!videoRef.current) return;
    const shell = videoRef.current.parentElement;
    if (shell) {
      if (document.fullscreenElement) {
        document.exitFullscreen().catch(() => undefined);
      } else {
        shell.requestFullscreen().catch(() => undefined);
      }
    }
  }, []);

  // Keyboard controls listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (document.activeElement?.tagName === "INPUT" || document.activeElement?.tagName === "TEXTAREA") {
        return;
      }

      switch (e.code) {
        case "Space":
          e.preventDefault();
          if (videoRef.current) {
            if (videoRef.current.paused) videoRef.current.play().catch(() => undefined);
            else videoRef.current.pause();
          }
          break;
        case "KeyM":
          e.preventDefault();
          setIsMuted((prev) => !prev);
          break;
        case "KeyF":
          e.preventDefault();
          toggleFullscreen();
          break;
        case "KeyI":
          e.preventDefault();
          setShowStatsForNerds((prev) => !prev);
          break;
        case "ArrowUp":
          e.preventDefault();
          surfChannel(-1);
          break;
        case "ArrowDown":
          e.preventDefault();
          surfChannel(1);
          break;
        case "ArrowLeft":
          e.preventDefault();
          setVolume((prev) => Math.max(0, parseFloat((prev - 0.05).toFixed(2))));
          break;
        case "ArrowRight":
          e.preventDefault();
          setVolume((prev) => Math.min(1, parseFloat((prev + 0.05).toFixed(2))));
          break;
        default:
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [filteredChannels, activeChannelId, surfChannel, toggleFullscreen]);

  // Load config settings
  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        const favs = localStorage.getItem(storageKeys.favorites);
        if (favs) setFavorites(JSON.parse(favs));
        
        const buf = localStorage.getItem(storageKeys.buffer);
        if (buf) setBufferDelay(parseInt(buf));

        const br = localStorage.getItem(storageKeys.brightness);
        if (br) setBrightness(parseInt(br));

        const co = localStorage.getItem(storageKeys.contrast);
        if (co) setContrast(parseInt(co));

        const sa = localStorage.getItem(storageKeys.saturation);
        if (sa) setSaturation(parseInt(sa));

        const gt = localStorage.getItem(storageKeys.goldTint);
        if (gt) setGoldTint(parseInt(gt));
      } catch (e) {
        console.error("Local storage load error:", e);
      }
    }
  }, []);

  // Chat scroll container to bottom
  useEffect(() => {
    const container = chatContainerRef.current;
    if (container) {
      container.scrollTop = container.scrollHeight;
    }
  }, [chatMessages]);

  // Simulated Chat commentary
  useEffect(() => {
    const chatInterval = setInterval(() => {
      const randomComment = mockComments[Math.floor(Math.random() * mockComments.length)];
      const pundits = ["Coach Harrison", "Analyst Sarah", "Dominic Thorne", "Pundit Roy"];
      const randomPundit = pundits[Math.floor(Math.random() * pundits.length)];

      setChatMessages((prev) => [
        ...prev.slice(-30),
        {
          id: `sim-${Date.now()}`,
          username: randomPundit,
          message: randomComment,
          role: "pundit"
        }
      ]);
    }, 6000);

    return () => clearInterval(chatInterval);
  }, []);

  // Sync Tuner Filters to localstorage
  useEffect(() => {
    localStorage.setItem(storageKeys.brightness, brightness.toString());
    localStorage.setItem(storageKeys.contrast, contrast.toString());
    localStorage.setItem(storageKeys.saturation, saturation.toString());
    localStorage.setItem(storageKeys.goldTint, goldTint.toString());
  }, [brightness, contrast, saturation, goldTint]);

  // Sleep Timer Counter
  useEffect(() => {
    if (sleepTimer === 0) {
      if (sleepTimerRef.current) clearInterval(sleepTimerRef.current);
      setSleepSecondsLeft(0);
      return;
    }

    setSleepSecondsLeft(sleepTimer * 60);
    if (sleepTimerRef.current) clearInterval(sleepTimerRef.current);

    sleepTimerRef.current = window.setInterval(() => {
      setSleepSecondsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(sleepTimerRef.current);
          if (videoRef.current) {
            videoRef.current.pause();
          }
          setIsSleeping(true);
          setSleepTimer(0);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (sleepTimerRef.current) clearInterval(sleepTimerRef.current);
    };
  }, [sleepTimer]);

  // Audio Equalizer Canvas Animator
  useEffect(() => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    
    let animationId: number;
    const barCount = 50;
    const bars: { x: number; w: number; h: number; targetH: number }[] = [];
    
    const resizeCanvas = () => {
      canvas.width = canvas.parentElement?.clientWidth ?? 400;
      canvas.height = 60;
      for (let i = 0; i < barCount; i++) {
        bars[i] = {
          x: i * (canvas.width / barCount),
          w: (canvas.width / barCount) - 3,
          h: 2,
          targetH: 2
        };
      }
    };
    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const isPlaying = videoRef.current && !videoRef.current.paused && !isSleeping;
      const volMultiplier = isMuted ? 0 : volume;
      
      for (let i = 0; i < barCount; i++) {
        const bar = bars[i];
        if (!bar) continue;

        if (isPlaying) {
          const time = Date.now() * 0.006;
          const wave = Math.sin(i * 0.2 + time) * 0.4 + 0.6;
          const noise = Math.random() * 0.3 + 0.7;
          bar.targetH = wave * canvas.height * 0.75 * noise * volMultiplier + 3;
        } else {
          bar.targetH = 2;
        }
        
        bar.h += (bar.targetH - bar.h) * 0.2;
        
        const grad = ctx.createLinearGradient(0, canvas.height, 0, canvas.height - bar.h);
        grad.addColorStop(0, "rgba(197, 168, 92, 0.2)");
        grad.addColorStop(1, "#c5a85c");
        
        ctx.fillStyle = grad;
        ctx.fillRect(bar.x, canvas.height - bar.h, bar.w, bar.h);
      }
      
      animationId = requestAnimationFrame(draw);
    };
    
    draw();
    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener("resize", resizeCanvas);
    };
  }, [isMuted, volume, isSleeping]);

  // HLS Stream Proxy Rewriter
  const getStreamUrl = (url: string) => {
    if (typeof window !== "undefined" && window.location.protocol === "https:" && url.startsWith("http://")) {
      return `/api/proxy-stream?url=${encodeURIComponent(url)}`;
    }
    return url;
  };

  // Primary HLS Video Stream engine
  useEffect(() => {
    if (!activeChannel || !videoRef.current) return;

    const video = videoRef.current;
    setIsLoading(true);
    setPlayError("");
    setIsSleeping(false);
    
    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    video.pause();
    video.removeAttribute("src");
    video.load();

    let hlsInstance: Hls | null = null;
    const finalUrl = getStreamUrl(activeChannel.url);

    if (Hls.isSupported()) {
      hlsInstance = new Hls({
        lowLatencyMode: true,
        backBufferLength: 60,
        enableWorker: true,
        maxBufferLength: bufferDelay
      });

      hlsRef.current = hlsInstance;
      hlsInstance.loadSource(finalUrl);
      hlsInstance.attachMedia(video);

      hlsInstance.on(Hls.Events.MANIFEST_PARSED, () => {
        setIsLoading(false);
        video.play().catch(() => {
          setIsLoading(false);
        });
      });

      hlsInstance.on(Hls.Events.ERROR, (_, data) => {
        if (data.fatal) {
          setIsLoading(false);
          setPlayError("The stream server did not respond. Try another channel.");
        }
      });
    } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
      video.src = finalUrl;
      video.addEventListener("loadedmetadata", () => {
        setIsLoading(false);
        video.play().catch(() => {
          setIsLoading(false);
        });
      });
      video.addEventListener("error", () => {
        setIsLoading(false);
        setPlayError("Failed to resolve HLS stream on this browser.");
      });
    } else {
      setIsLoading(false);
      setPlayError("HLS streaming is not natively supported in this environment.");
    }

    return () => {
      if (hlsInstance) {
        hlsInstance.destroy();
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeChannel, bufferDelay]);

  // Sync volume, speeds, and tuner filters on the video tag
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.volume = volume;
      videoRef.current.muted = isMuted;
      videoRef.current.playbackRate = playbackSpeed;
      videoRef.current.style.filter = `brightness(${brightness}%) contrast(${contrast}%) saturate(${saturation}%) sepia(${goldTint}%)`;
    }
  }, [volume, isMuted, playbackSpeed, brightness, contrast, saturation, goldTint]);

  // HLS Video Stream engine 2 (for Dual Stream pane)
  useEffect(() => {
    if (!isDualStream || !activeChannel2 || !videoRef2.current) {
      if (hlsRef2.current) {
        hlsRef2.current.destroy();
        hlsRef2.current = null;
      }
      return;
    }

    const video = videoRef2.current;
    
    if (hlsRef2.current) {
      hlsRef2.current.destroy();
      hlsRef2.current = null;
    }

    video.pause();
    video.removeAttribute("src");
    video.load();

    let hlsInstance: Hls | null = null;
    const finalUrl2 = getStreamUrl(activeChannel2.url);

    if (Hls.isSupported()) {
      hlsInstance = new Hls({
        lowLatencyMode: true,
        backBufferLength: 60,
        enableWorker: true,
        maxBufferLength: bufferDelay
      });

      hlsRef2.current = hlsInstance;
      hlsInstance.loadSource(finalUrl2);
      hlsInstance.attachMedia(video);

      hlsInstance.on(Hls.Events.MANIFEST_PARSED, () => {
        video.play().catch(() => undefined);
      });
    } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
      video.src = finalUrl2;
      video.addEventListener("loadedmetadata", () => {
        video.play().catch(() => undefined);
      });
    }

    return () => {
      if (hlsInstance) {
        hlsInstance.destroy();
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDualStream, activeChannel2, bufferDelay]);

  // Sync controls and filters on the secondary video tag
  useEffect(() => {
    if (videoRef2.current) {
      videoRef2.current.volume = volume;
      videoRef2.current.muted = isMuted2;
      videoRef2.current.playbackRate = playbackSpeed;
      videoRef2.current.style.filter = `brightness(${brightness}%) contrast(${contrast}%) saturate(${saturation}%) sepia(${goldTint}%)`;
    }
  }, [volume, isMuted2, playbackSpeed, brightness, contrast, saturation, goldTint, isDualStream]);

  // Stats Collector
  useEffect(() => {
    const interval = setInterval(() => {
      if (!videoRef.current) return;
      const v = videoRef.current;
      
      let res = `${v.videoWidth}x${v.videoHeight}`;
      if (res === "0x0" && !isLoading && !playError) res = "1920x1080 (HD Beam)";
      
      let buf = "0.0s";
      if (v.buffered.length > 0) {
        const currentPos = v.currentTime;
        for (let i = 0; i < v.buffered.length; i++) {
          if (currentPos >= v.buffered.start(i) && currentPos <= v.buffered.end(i)) {
            buf = `${(v.buffered.end(i) - currentPos).toFixed(1)}s`;
            break;
          }
        }
      }

      let bit = "6200 kbps";
      if (hlsRef.current?.levels && hlsRef.current.currentLevel !== -1) {
        const level = hlsRef.current.levels[hlsRef.current.currentLevel];
        if (level?.bitrate) bit = `${(level.bitrate / 1000).toFixed(0)} kbps`;
      }

      setStats({
        resolution: res,
        bitrate: bit,
        bufferLen: buf,
        fps: 60,
        latency: `${(1.1 + Math.random() * 0.3).toFixed(2)}s`
      });
    }, 1500);

    return () => clearInterval(interval);
  }, [isLoading, playError]);

  const toggleFavorite = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    let nextFavs: string[];
    if (favorites.includes(id)) {
      nextFavs = favorites.filter((fid) => fid !== id);
    } else {
      nextFavs = [...favorites, id];
    }
    setFavorites(nextFavs);
    localStorage.setItem(storageKeys.favorites, JSON.stringify(nextFavs));
  };

  const handleSendChat = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;

    setChatMessages((prev) => [
      ...prev,
      {
        id: `user-${Date.now()}`,
        username: "VIP Guest",
        message: chatInput.trim(),
        role: "fan"
      }
    ]);
    setChatInput("");
  };

  const formatSleepSeconds = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  return (
    <DashboardLayout channels={channels}>
      <div className="live-tv-grid">
        {/* Left Column: Channels Search & Selection list */}
        <section className="channel-nav-panel" aria-label="Channels browser">
          <div className="channel-nav-header-sticky">
            <div className="search-container">
              <Search size={18} className="search-icon-svg" />
              <input
                type="text"
                placeholder="Search channels..."
                className="search-input"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            {/* Sorting filters */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px", fontSize: "0.75rem", color: "var(--text-muted)" }}>
              <span>Sort by:</span>
              <div style={{ display: "flex", gap: "10px" }}>
                <button
                  style={{ background: "transparent", border: "none", color: sortingOption === "number" ? "var(--accent)" : "inherit", cursor: "pointer" }}
                  onClick={() => setSortingOption("number")}
                >
                  Number
                </button>
                <button
                  style={{ background: "transparent", border: "none", color: sortingOption === "name" ? "var(--accent)" : "inherit", cursor: "pointer" }}
                  onClick={() => setSortingOption("name")}
                >
                  Name
                </button>
                <button
                  style={{ background: "transparent", border: "none", color: sortingOption === "latency" ? "var(--accent)" : "inherit", cursor: "pointer" }}
                  onClick={() => setSortingOption("latency")}
                >
                  Latency
                </button>
              </div>
            </div>

            {/* Group category badges */}
            <div className="groups-container">
              {groups.map(([groupName, count]) => (
                <button
                  key={groupName}
                  className={`group-badge ${activeGroup === groupName ? "active" : ""}`}
                  onClick={() => setActiveGroup(groupName)}
                >
                  {groupName} ({count})
                </button>
              ))}
            </div>
          </div>

          {/* Channels Scroll list */}
          <div className="channels-scrollable">
            {filteredChannels.length > 0 ? (
              filteredChannels.map((c) => (
                <article
                  key={c.id}
                  className={`channel-list-card ${activeChannelId === c.id ? "active" : ""}`}
                  onClick={() => setActiveChannelId(c.id)}
                >
                  <span className="channel-card-number">{c.number.toString().padStart(3, "0")}</span>
                  <div className="channel-card-logo-placeholder">
                    {c.logo ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={c.logo} alt="" />
                    ) : (
                      c.name.slice(0, 2).toUpperCase()
                    )}
                  </div>
                  <div className="channel-card-details">
                    <span className="channel-card-name">{c.name}</span>
                    <div className="channel-card-meta">
                      <span>{c.group}</span>
                      <span style={{ display: "flex", alignItems: "center" }}>
                        <span className={`status-dot ${c.working !== false ? "active" : "offline"}`} />
                        {c.working !== false ? `${c.latency ?? 40}ms` : "Offline"}
                      </span>
                    </div>
                  </div>
                  <button
                    className={`channel-card-favorite-btn ${favorites.includes(c.id) ? "active" : ""}`}
                    onClick={(e) => toggleFavorite(c.id, e)}
                    title="Add to Favorites"
                  >
                    <Heart size={13} fill={favorites.includes(c.id) ? "currentColor" : "none"} />
                  </button>
                </article>
              ))
            ) : (
              <div style={{ textAlign: "center", padding: "20px", color: "var(--text-muted)", fontSize: "0.85rem" }}>
                No channels matched your filters.
              </div>
            )}
          </div>
        </section>

        {/* Center Column: Video Player Stage */}
        <section className="video-player-container" aria-label="Media player stage">
          <div className={`player-viewport-shell ${isDualStream ? "dual-layout" : ""}`}>
            
            <div className="video-shell-pane primary">
              <video
                ref={videoRef}
                className={`player-video-element aspect-${aspectRatio}`}
                playsInline
                onClick={(e) => {
                  e.preventDefault();
                  if (videoRef.current) {
                    if (videoRef.current.paused) videoRef.current.play().catch(() => undefined);
                    else videoRef.current.pause();
                  }
                }}
              />
              {isDualStream && (
                <div className="pane-stream-label">
                  <span>Pane 1: {activeChannel.name}</span>
                  <button className="pane-audio-toggle" onClick={() => setIsMuted(p => !p)}>
                    {isMuted ? "Unmute Audio 1" : "Mute Audio 1"}
                  </button>
                </div>
              )}
            </div>

            {isDualStream && (
              <div className="video-shell-pane secondary">
                <video
                  ref={videoRef2}
                  className={`player-video-element aspect-${aspectRatio}`}
                  playsInline
                  onClick={(e) => {
                    e.preventDefault();
                    if (videoRef2.current) {
                      if (videoRef2.current.paused) videoRef2.current.play().catch(() => undefined);
                      else videoRef2.current.pause();
                    }
                  }}
                />
                <div className="pane-stream-label">
                  <span>Pane 2: {activeChannel2.name}</span>
                  <button className="pane-audio-toggle" onClick={() => setIsMuted2(p => !p)}>
                    {isMuted2 ? "Unmute Audio 2" : "Mute Audio 2"}
                  </button>
                </div>
              </div>
            )}

            {/* Sleep Mode Overlay */}
            {isSleeping && (
              <div className="sleep-mode-overlay">
                <span className="sleep-overlay-title">Sleep Timer Expired</span>
                <p style={{ color: "var(--text-muted)", fontSize: "0.95rem" }}>The broadcast has been paused automatically.</p>
                <button className="sleep-overlay-btn" onClick={() => { setIsSleeping(false); videoRef.current?.play().catch(() => undefined); }}>
                  Wake Up Player
                </button>
              </div>
            )}

            {/* Loading state */}
            {isLoading && (
              <div className="player-loading-spinner">
                <div className="spinner-circle"></div>
                <span style={{ fontSize: "0.8rem", color: "var(--accent)" }}>TUNING HLS STREAM BEAM...</span>
              </div>
            )}

            {/* Error state */}
            {playError && (
              <div className="player-error-display">
                <span className="error-title">STREAM SIGNAL OFFLINE</span>
                <span className="error-desc">{playError}</span>
              </div>
            )}

            {/* Stats for nerds */}
            {showStatsForNerds && (
              <div className="stats-for-nerds-panel">
                <div className="stats-for-nerds-title">Stats for Nerds</div>
                <div className="stats-row">
                  <span>Channel ID</span>
                  <span>{activeChannel.id.slice(0, 8)}...</span>
                </div>
                <div className="stats-row">
                  <span>Resolution</span>
                  <span>{stats.resolution}</span>
                </div>
                <div className="stats-row">
                  <span>Bitrate</span>
                  <span>{stats.bitrate}</span>
                </div>
                <div className="stats-row">
                  <span>Buffer Length</span>
                  <span>{stats.bufferLen}</span>
                </div>
                <div className="stats-row">
                  <span>Render FPS</span>
                  <span>{stats.fps} fps</span>
                </div>
                <div className="stats-row">
                  <span>Latency (Est)</span>
                  <span>{activeChannel.working !== false ? `${activeChannel.latency ?? 40}ms` : "Offline"}</span>
                </div>
                <div className="stats-row">
                  <span>Host Server</span>
                  <span>{activeChannel.host}</span>
                </div>
              </div>
            )}

            {/* HUD Custom Control Chrome */}
            <div className="player-chrome-overlay">
              <div className="chrome-header">
                <div className="chrome-title-wrap">
                  <h3>{activeChannel.name}</h3>
                  <p>
                    CH {activeChannel.number.toString().padStart(3, "0")} · {activeChannel.group} · {activeChannel.quality}
                  </p>
                </div>
                <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                  {sleepTimer > 0 && (
                    <span style={{ fontSize: "0.75rem", color: "var(--accent)", border: "1px solid var(--border-accent)", padding: "4px 8px", borderRadius: "2px", background: "rgba(0,0,0,0.6)" }}>
                      Sleep: {formatSleepSeconds(sleepSecondsLeft)}
                    </span>
                  )}
                  <span className="chrome-badge">Live</span>
                </div>
              </div>

              <div className="chrome-footer-controls">
                <div className="controls-left">
                  <button
                    className="player-hud-btn"
                    onClick={() => {
                      if (videoRef.current) {
                        if (videoRef.current.paused) videoRef.current.play().catch(() => undefined);
                        else videoRef.current.pause();
                      }
                    }}
                    title="Play / Pause (Space)"
                  >
                    {videoRef.current?.paused ? <Play size={18} /> : <Pause size={18} />}
                  </button>

                  {/* Volume controls */}
                  <div className="volume-hud-control">
                    <button
                      className="player-hud-btn"
                      onClick={() => setIsMuted((prev) => !prev)}
                      title="Mute / Unmute (M)"
                    >
                      {isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
                    </button>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.05"
                      className="volume-slider"
                      value={volume}
                      onChange={(e) => {
                        const newVol = parseFloat(e.target.value);
                        setVolume(newVol);
                        if (newVol > 0) setIsMuted(false);
                      }}
                    />
                  </div>
                </div>

                <div className="controls-right">
                  {/* Tuner trigger */}
                  <button
                    className={`player-hud-btn ${showTuner ? "active" : ""}`}
                    onClick={() => setShowTuner((p) => !p)}
                    title="Tuner Filters"
                  >
                    <Sliders size={18} />
                  </button>

                  {/* Nerds stats trigger */}
                  <button
                    className={`player-hud-btn ${showStatsForNerds ? "active" : ""}`}
                    onClick={() => setShowStatsForNerds((p) => !p)}
                    title="Stats for Nerds (I)"
                  >
                    <Clock size={18} />
                  </button>

                  {/* Dual Stream trigger */}
                  <button
                    className={`player-hud-btn ${isDualStream ? "active" : ""}`}
                    onClick={() => {
                      if (!isDualStream) {
                        // Set secondary channel to next available
                        const nextCh = channels.find((c) => c.id !== activeChannelId);
                        if (nextCh) setActiveChannelId2(nextCh.id);
                      }
                      setIsDualStream((p) => !p);
                    }}
                    title="Toggle Split-Screen Dual Stream"
                  >
                    <Tv size={18} />
                  </button>

                  <button
                    className="player-hud-btn"
                    onClick={toggleFullscreen}
                    title="Fullscreen (F)"
                  >
                    <Maximize2 size={18} />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Video Tuner Control Box */}
          {showTuner && (
            <div className="video-tuner-panel">
              <div className="tuner-title">Video Broadcast Tuner</div>
              <div className="tuner-row">
                <label>Brightness ({brightness}%)</label>
                <input type="range" min="50" max="150" value={brightness} onChange={(e) => setBrightness(parseInt(e.target.value))} />
              </div>
              <div className="tuner-row">
                <label>Contrast ({contrast}%)</label>
                <input type="range" min="50" max="150" value={contrast} onChange={(e) => setContrast(parseInt(e.target.value))} />
              </div>
              <div className="tuner-row">
                <label>Saturation ({saturation}%)</label>
                <input type="range" min="0" max="200" value={saturation} onChange={(e) => setSaturation(parseInt(e.target.value))} />
              </div>
              <div className="tuner-row">
                <label>Gold Beam Tint ({goldTint}%)</label>
                <input type="range" min="0" max="100" value={goldTint} onChange={(e) => setGoldTint(parseInt(e.target.value))} />
              </div>
              <button className="tuner-reset-btn" onClick={() => { setBrightness(100); setContrast(100); setSaturation(100); setGoldTint(0); }}>
                Reset Tuner
              </button>
            </div>
          )}

          {/* Dual Stream Channel Selector */}
          {isDualStream && (
            <div style={{ marginTop: "15px", padding: "15px", background: "var(--bg-panel)", border: "1px solid var(--border-accent)", borderRadius: "4px" }}>
              <div style={{ fontSize: "0.85rem", color: "var(--accent)", marginBottom: "8px" }}>Split-Screen Control</div>
              <div style={{ display: "flex", gap: "15px", alignItems: "center", flexWrap: "wrap" }}>
                <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>Select Secondary Feed:</div>
                <select
                  value={activeChannelId2}
                  onChange={(e) => setActiveChannelId2(e.target.value)}
                  style={{ background: "#000", border: "1px solid var(--border-accent)", color: "#fff", padding: "6px 12px", fontSize: "0.8rem", borderRadius: "3px" }}
                >
                  {channels.map((c) => (
                    <option key={c.id} value={c.id}>
                      CH {c.number.toString().padStart(3, "0")} - {c.name}
                    </option>
                  ))}
                </select>
                <div style={{ display: "flex", gap: "10px" }}>
                  <button
                    onClick={() => {
                      const swap = activeChannelId;
                      setActiveChannelId(activeChannelId2);
                      setActiveChannelId2(swap);
                    }}
                    style={{ background: "transparent", border: "1px solid var(--border-accent)", color: "var(--accent)", padding: "5px 12px", fontSize: "0.75rem", borderRadius: "3px", cursor: "pointer" }}
                  >
                    Swap Screens
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Sleep Timer Settings Strip */}
          <div style={{ marginTop: "15px", padding: "15px", background: "var(--bg-panel)", border: "1px solid var(--border-accent)", borderRadius: "4px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "10px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <Clock size={16} style={{ color: "var(--accent)" }} />
              <span style={{ fontSize: "0.8rem", color: "var(--text-primary)" }}>Broadcast Sleep Timer</span>
            </div>
            <div style={{ display: "flex", gap: "8px" }}>
              {[0, 5, 15, 30, 60].map((mins) => (
                <button
                  key={mins}
                  onClick={() => setSleepTimer(mins)}
                  style={{
                    padding: "6px 12px",
                    background: sleepTimer === mins ? "rgba(197,168,92,0.15)" : "rgba(255,255,255,0.02)",
                    border: "1px solid",
                    borderColor: sleepTimer === mins ? "var(--accent)" : "var(--border-muted)",
                    color: sleepTimer === mins ? "var(--accent)" : "var(--text-muted)",
                    borderRadius: "3px",
                    fontSize: "0.75rem",
                    cursor: "pointer",
                    transition: "all 0.25s ease"
                  }}
                >
                  {mins === 0 ? "Off" : `${mins} min`}
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* Right Column: Audio Equalizer Visualizer & Commentary Chat */}
        <section className="live-chat-panel" aria-label="Audience and pundit chatter">
          <div className="audio-visualizer-section">
            <span className="visualizer-label">High-Fidelity Audio Stream Beam</span>
            <canvas ref={canvasRef} className="visualizer-canvas" />
          </div>

          <div className="chat-section-header">VIP Broadcast Commentary</div>
          
          <div ref={chatContainerRef} className="chat-history-scroll">
            {chatMessages.map((msg) => (
              <div key={msg.id} className={`chat-bubble ${msg.role}`}>
                <div className="chat-bubble-user">
                  <span>{msg.username}</span>
                  <span className={`role-badge ${msg.role}`}>{msg.role}</span>
                </div>
                <div className="chat-bubble-text">{msg.message}</div>
              </div>
            ))}
            <div ref={chatEndRef} />
          </div>

          <form onSubmit={handleSendChat} className="chat-input-bar">
            <input
              type="text"
              placeholder="Send fan message..."
              className="chat-input-field"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
            />
            <button type="submit" className="chat-send-btn" title="Send message">
              <Send size={15} />
            </button>
          </form>
        </section>
      </div>
    </DashboardLayout>
  );
}
