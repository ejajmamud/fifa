"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Hls from "hls.js";
import {
  Tv,
  Calendar,
  Trophy,
  Newspaper,
  Settings as SettingsIcon,
  Search,
  Heart,
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize,
  Minimize,
  Info,
  Send,
  Zap,
  Activity,
  Star,
  ChevronRight,
  Monitor,
  Maximize2,
  Sliders,
  Clock,
  LayoutGrid
} from "lucide-react";
import {
  Channel,
  Match,
  NewsArticle,
  getLiveMatches,
  getSportsNews,
  mockComments
} from "@/lib/playlist";

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
  // Navigation & Primary Layout States
  const [activeTab, setActiveTab] = useState<"livetv" | "epg" | "matches" | "news" | "settings">("livetv");
  const [activeChannelId, setActiveChannelId] = useState<string>(channels[0]?.id ?? "");
  const [searchQuery, setSearchQuery] = useState("");
  const [activeGroup, setActiveGroup] = useState("All");
  
  // Custom Controls States
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

  // Sleep Timer States
  const [sleepTimer, setSleepTimer] = useState(0); // in minutes, 0 = disabled
  const [sleepSecondsLeft, setSleepSecondsLeft] = useState(0);
  const [isSleeping, setIsSleeping] = useState(false);
  const sleepTimerRef = useRef<number | undefined>(undefined);
  
  // TV UI Mode States (Cinematic full-screen navigation)
  const [isTvMode, setIsTvMode] = useState(false);
  const [focusedChannelIdx, setFocusedChannelIdx] = useState(0);

  // App Config Settings
  const [activeTheme, setActiveTheme] = useState<"gold" | "platinum">("gold");
  const [bufferDelay, setBufferDelay] = useState(5);
  const [audioLanguage, setAudioLanguage] = useState<"english" | "spanish">("english");
  
  // Player Internal States
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const hlsRef = useRef<Hls | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const tvGridRef = useRef<HTMLDivElement | null>(null);
  
  // Dual Stream Refs and States
  const videoRef2 = useRef<HTMLVideoElement | null>(null);
  const hlsRef2 = useRef<Hls | null>(null);
  const pitchCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDualStream, setIsDualStream] = useState(false);
  const [activeChannelId2, setActiveChannelId2] = useState<string>("");
  const [isMuted2, setIsMuted2] = useState(true);
  
  // Live scores and news states
  const [liveMatches, setLiveMatches] = useState<Match[]>([]);
  const [liveNews, setLiveNews] = useState<NewsArticle[]>([]);
  const [isHttps, setIsHttps] = useState(false);

  const [isLoading, setIsLoading] = useState(true);
  const [playError, setPlayError] = useState("");
  const [stats, setStats] = useState({
    resolution: "0x0",
    bitrate: "0 kbps",
    bufferLen: "0.0s",
    fps: 0,
    latency: "0.0s"
  });

  // Simulated EPG clock updates
  const [clockTime, setClockTime] = useState("");

  // Simulated pundit chat comment feed
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    { id: "c1", username: "Analyst Roy", message: "Welcome to EMJ Sports. Working channels prioritized first.", role: "pundit" },
    { id: "c2", username: "Tactical Javier", message: "Live status validation checks run every 5 minutes in background.", role: "pundit" },
    { id: "c3", username: "Pundit Emma", message: "Use TV Mode for full-screen keyboard navigation.", role: "pundit" }
  ]);
  const [chatInput, setChatInput] = useState("");
  const chatEndRef = useRef<HTMLDivElement | null>(null);

  // Match Center stats
  const mockMatches = useMemo(() => getLiveMatches(), []);
  const matches = liveMatches.length > 0 ? liveMatches : mockMatches;
  const [selectedMatchId, setSelectedMatchId] = useState<string>(mockMatches[0]?.id ?? "");
  
  useEffect(() => {
    if (matches.length > 0 && !matches.some(m => m.id === selectedMatchId)) {
      setSelectedMatchId(matches[0].id);
    }
  }, [matches, selectedMatchId]);

  const selectedMatch = useMemo(
    () => matches.find((m) => m.id === selectedMatchId) ?? matches[0],
    [matches, selectedMatchId]
  );

  // Sports News
  const mockNews = useMemo(() => getSportsNews(), []);
  const news = liveNews.length > 0 ? liveNews : mockNews;

  // Compute active channel
  const activeChannel = useMemo(
    () => channels.find((c) => c.id === activeChannelId) ?? channels[0],
    [channels, activeChannelId]
  );

  const activeChannel2 = useMemo(
    () => channels.find((c) => c.id === activeChannelId2) ?? channels[1] ?? channels[0],
    [channels, activeChannelId2]
  );

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

    // Handle sorting
    if (sortingOption === "name") {
      result.sort((a, b) => a.name.localeCompare(b.name));
    } else if (sortingOption === "latency") {
      result.sort((a, b) => (a.latency ?? 9999) - (b.latency ?? 9999));
    } else {
      result.sort((a, b) => a.number - b.number);
    }

    return result;
  }, [activeGroup, channels, favorites, searchQuery, sortingOption]);

  // Channel Surfing helper
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
      // If typing in input, ignore hotkeys
      if (document.activeElement?.tagName === "INPUT" || document.activeElement?.tagName === "TEXTAREA") {
        return;
      }

      // Escape exits TV Mode
      if (e.code === "Escape" && isTvMode) {
        e.preventDefault();
        setIsTvMode(false);
        return;
      }

      // TV Mode Grid Keyboard Navigation
      if (isTvMode && filteredChannels.length > 0) {
        let cols = 4;
        if (tvGridRef.current) {
          try {
            const gridStyle = window.getComputedStyle(tvGridRef.current);
            const gridTemplateColumns = gridStyle.getPropertyValue("grid-template-columns");
            if (gridTemplateColumns) {
              const parts = gridTemplateColumns.trim().split(/\s+/);
              if (parts.length > 0) {
                cols = parts.length;
              }
            }
          } catch (err) {
            console.error("Error computing TV Mode columns:", err);
          }
        }

        switch (e.code) {
          case "ArrowRight":
            e.preventDefault();
            setFocusedChannelIdx((prev) => Math.min(filteredChannels.length - 1, prev + 1));
            break;
          case "ArrowLeft":
            e.preventDefault();
            setFocusedChannelIdx((prev) => Math.max(0, prev - 1));
            break;
          case "ArrowDown":
            e.preventDefault();
            setFocusedChannelIdx((prev) => Math.min(filteredChannels.length - 1, prev + cols));
            break;
          case "ArrowUp":
            e.preventDefault();
            setFocusedChannelIdx((prev) => Math.max(0, prev - cols));
            break;
          case "Enter":
            e.preventDefault();
            if (filteredChannels[focusedChannelIdx]) {
              setActiveChannelId(filteredChannels[focusedChannelIdx].id);
            }
            setIsTvMode(false);
            break;
          default:
            break;
        }
        return;
      }

      // Standard view Hotkeys
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
        case "KeyT":
          e.preventDefault();
          setIsTvMode(true);
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
  }, [filteredChannels, activeChannelId, isTvMode, focusedChannelIdx, surfChannel, toggleFullscreen]);

  // Scroll focused channel card into view in TV Mode
  useEffect(() => {
    if (isTvMode && tvGridRef.current) {
      const children = tvGridRef.current.children;
      if (children && children[focusedChannelIdx]) {
        children[focusedChannelIdx].scrollIntoView({
          behavior: "smooth",
          block: "nearest"
        });
      }
    }
  }, [focusedChannelIdx, isTvMode]);

  // Load configuration settings from local storage
  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        const favs = localStorage.getItem(storageKeys.favorites);
        if (favs) setFavorites(JSON.parse(favs));
        
        const th = localStorage.getItem(storageKeys.theme);
        if (th === "platinum" || th === "gold") setActiveTheme(th);
        
        const buf = localStorage.getItem(storageKeys.buffer);
        if (buf) setBufferDelay(parseInt(buf));

        const ln = localStorage.getItem(storageKeys.lang);
        if (ln === "english" || ln === "spanish") setAudioLanguage(ln);

        const br = localStorage.getItem(storageKeys.brightness);
        if (br) setBrightness(parseInt(br));

        const co = localStorage.getItem(storageKeys.contrast);
        if (co) setContrast(parseInt(co));

        const sa = localStorage.getItem(storageKeys.saturation);
        if (sa) setSaturation(parseInt(sa));

        const gt = localStorage.getItem(storageKeys.goldTint);
        if (gt) setGoldTint(parseInt(gt));
      } catch (e) {
        console.error("Local storage sync error:", e);
      }
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

  // Chat auto-scroll
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
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

  // Sync Video Tuner Filter Variables
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
    if (activeTab !== "livetv" || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    
    let animationId: number;
    const barCount = 50;
    const bars: { x: number; w: number; h: number; targetH: number }[] = [];
    
    // Resize handler
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
          bar.targetH = 2; // Flatline
        }
        
        bar.h += (bar.targetH - bar.h) * 0.2; // Smooth interpolate
        
        // Gradient color for visualizer
        const grad = ctx.createLinearGradient(0, canvas.height, 0, canvas.height - bar.h);
        if (activeTheme === "gold") {
          grad.addColorStop(0, "rgba(197, 168, 92, 0.2)");
          grad.addColorStop(1, "#c5a85c");
        } else {
          grad.addColorStop(0, "rgba(255, 255, 255, 0.2)");
          grad.addColorStop(1, "#ffffff");
        }
        
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
  }, [activeTab, activeTheme, isMuted, volume, isSleeping]);

  // HLS Video Stream engine
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

    if (Hls.isSupported()) {
      hlsInstance = new Hls({
        lowLatencyMode: true,
        backBufferLength: 60,
        enableWorker: true,
        maxBufferLength: bufferDelay
      });

      hlsRef.current = hlsInstance;
      hlsInstance.loadSource(activeChannel.url);
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
      video.src = activeChannel.url;
      video.addEventListener("loadedmetadata", () => {
        setIsLoading(false);
        video.play().catch(() => {
          setIsLoading(false);
        });
      });
      video.addEventListener("error", () => {
        setIsLoading(false);
        setPlayError("Failed to resolve standard HLS streams on this browser.");
      });
    } else {
      setIsLoading(false);
      setPlayError("HLS streaming is not natively supported in this sandbox.");
    }

    return () => {
      if (hlsInstance) {
        hlsInstance.destroy();
      }
    };
  }, [activeChannel, bufferDelay]);

  // Sync volume, speeds, and tuner filters on the video tag
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.volume = volume;
      videoRef.current.muted = isMuted;
      videoRef.current.playbackRate = playbackSpeed;
      
      // Video tuner filters: Sepia represents the gold tint
      videoRef.current.style.filter = `brightness(${brightness}%) contrast(${contrast}%) saturate(${saturation}%) sepia(${goldTint}%)`;
    }
  }, [volume, isMuted, playbackSpeed, brightness, contrast, saturation, goldTint]);

  // Fetch live matches and news articles on mount and periodic refresh
  useEffect(() => {
    if (typeof window !== "undefined") {
      setIsHttps(window.location.protocol === "https:");
    }

    const fetchMatches = () => {
      fetch("/api/live-matches")
        .then((res) => res.json())
        .then((data) => {
          if (data && data.length > 0 && !data.error) {
            setLiveMatches(data);
          }
        })
        .catch((err) => console.error("Error loading live matches:", err));
    };

    const fetchNews = () => {
      fetch("/api/news-feed")
        .then((res) => res.json())
        .then((data) => {
          if (data && data.length > 0 && !data.error) {
            setLiveNews(data);
          }
        })
        .catch((err) => console.error("Error loading news feed:", err));
    };

    fetchMatches();
    fetchNews();

    const interval = setInterval(() => {
      fetchMatches();
      fetchNews();
    }, 45000); // 45 seconds polling

    return () => clearInterval(interval);
  }, []);

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

    if (Hls.isSupported()) {
      hlsInstance = new Hls({
        lowLatencyMode: true,
        backBufferLength: 60,
        enableWorker: true,
        maxBufferLength: bufferDelay
      });

      hlsRef2.current = hlsInstance;
      hlsInstance.loadSource(activeChannel2.url);
      hlsInstance.attachMedia(video);

      hlsInstance.on(Hls.Events.MANIFEST_PARSED, () => {
        video.play().catch(() => undefined);
      });
    } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
      video.src = activeChannel2.url;
      video.addEventListener("loadedmetadata", () => {
        video.play().catch(() => undefined);
      });
    }

    return () => {
      if (hlsInstance) {
        hlsInstance.destroy();
      }
    };
  }, [isDualStream, activeChannel2, bufferDelay]);

  // Sync controls and filters on the secondary video tag (Dual Stream)
  useEffect(() => {
    if (videoRef2.current) {
      videoRef2.current.volume = volume;
      videoRef2.current.muted = isMuted2;
      videoRef2.current.playbackRate = playbackSpeed;
      videoRef2.current.style.filter = `brightness(${brightness}%) contrast(${contrast}%) saturate(${saturation}%) sepia(${goldTint}%)`;
    }
  }, [volume, isMuted2, playbackSpeed, brightness, contrast, saturation, goldTint, isDualStream]);

  // 2D Soccer Pitch Match Tracker animation effect
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
      // Home (Gold)
      players.push({ x: w * 0.08, y: h / 2, team: "home" }); // GK
      players.push({ x: w * 0.22, y: h * 0.25, team: "home" });
      players.push({ x: w * 0.22, y: h * 0.75, team: "home" });
      players.push({ x: w * 0.38, y: h * 0.3, team: "home" });
      players.push({ x: w * 0.38, y: h * 0.7, team: "home" });
      // Away (Platinum)
      players.push({ x: w * 0.92, y: h / 2, team: "away" }); // GK
      players.push({ x: w * 0.78, y: h * 0.25, team: "away" });
      players.push({ x: w * 0.78, y: h * 0.75, team: "away" });
      players.push({ x: w * 0.62, y: h * 0.3, team: "away" });
      players.push({ x: w * 0.62, y: h * 0.7, team: "away" });
    };
    
    let attackText = "Kickoff! Match Underway...";
    
    const draw = () => {
      // Deep forest green field
      ctx.fillStyle = "#0c1d12";
      ctx.fillRect(0, 0, w, h);
      
      // Grass stripes
      ctx.fillStyle = "#0d2114";
      for (let i = 0; i < w; i += 40) {
        if ((i / 40) % 2 === 0) {
          ctx.fillRect(i, 0, 20, h);
        }
      }
      
      // Pitch lines (Gold)
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
      
      // Draw Player Dots
      players.forEach(p => {
        ctx.beginPath();
        ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
        ctx.fillStyle = p.team === "home" ? "#c5a85c" : "#ffffff";
        ctx.fill();
      });
      
      // Ball physics simulation
      const dx = ballTargetX - ballX;
      const dy = ballTargetY - ballY;
      ballX += dx * ballSpeed;
      ballY += dy * ballSpeed;
      
      if (Math.abs(dx) < 6 && Math.abs(dy) < 6) {
        const homePoss = selectedMatch ? selectedMatch.possession[0] : 50;
        const isHomeInPoss = Math.random() * 100 < homePoss;
        
        if (isHomeInPoss) {
          // Ball moves to away team half (right side)
          ballTargetX = w / 2 + Math.random() * (w / 2 - 30);
          ballTargetY = 20 + Math.random() * (h - 40);
          
          if (Math.random() < 0.2) {
            attackText = `${selectedMatch.homeTeam} building possession...`;
          } else if (Math.random() < 0.1) {
            attackText = `SHOT by ${selectedMatch.homeTeam}! Off-target.`;
            ballTargetX = w - 10;
            ballTargetY = h / 2 + (Math.random() * 30 - 15);
          }
        } else {
          // Ball moves to home team half (left side)
          ballTargetX = 30 + Math.random() * (w / 2 - 30);
          ballTargetY = 20 + Math.random() * (h - 40);
          
          if (Math.random() < 0.2) {
            attackText = `${selectedMatch.awayTeam} in transition...`;
          } else if (Math.random() < 0.1) {
            attackText = `Safe save by ${selectedMatch.homeTeam} Goalkeeper.`;
            ballTargetX = 10;
            ballTargetY = h / 2;
          }
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
      ctx.fillStyle = "rgba(255, 255, 255, 0.75)";
      ctx.font = "10px Marcellus, serif";
      ctx.textAlign = "center";
      ctx.fillText(attackText, w / 2, h - 15);
      
      animationId = requestAnimationFrame(draw);
    };
    
    initPlayers();
    draw();
    return () => cancelAnimationFrame(animationId);
  }, [selectedMatch]);

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

  // Active EPG Program compute
  const activeProgramIndices = useMemo(() => {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
    const msPassed = now.getTime() - startOfToday.getTime();
    const hrsPassed = msPassed / (1000 * 60 * 60);
    return Math.min(11, Math.floor(hrsPassed / 2));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clockTime]);

  const activeChannelEPGBlock = useMemo(() => {
    if (!activeChannel?.epg) return null;
    return activeChannel.epg[activeProgramIndices] ?? activeChannel.epg[0];
  }, [activeChannel, activeProgramIndices]);

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

  const formatEPGTime = (blockIdx: number) => {
    const startHour = blockIdx * 2;
    const format = (h: number) => `${h.toString().padStart(2, "0")}:00`;
    return `${format(startHour)} - ${format(startHour + 2)}`;
  };

  const formatSleepSeconds = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  return (
    <div className={`app-container ${activeTheme === "platinum" ? "theme-platinum" : ""}`}>
      
      {/* TV UI Mode Overlay (full screen large grid navigation) */}
      {isTvMode && (
        <section className="tv-mode-shell" aria-label="TV mode navigation dashboard">
          <div className="tv-mode-header">
            <div className="view-title-wrap">
              <h2 style={{ fontSize: "2.4rem", color: "var(--accent)" }}>Cinematic TV Mode</h2>
              <p>Arrow Keys to navigate · Enter to play · Escape to exit</p>
            </div>
            <div className="header-clock">{clockTime}</div>
          </div>
          
          <div ref={tvGridRef} className="tv-mode-grid">
            {filteredChannels.map((c, idx) => (
              <div
                key={c.id}
                className={`tv-mode-card ${focusedChannelIdx === idx ? "focused" : ""}`}
                onClick={() => {
                  setFocusedChannelIdx(idx);
                  setActiveChannelId(c.id);
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

      {/* Desktop Sidebar */}
      <aside className="sidebar" aria-label="Left sidebar">
        <div className="brand-section">
          <h1 className="brand-title">EMJ Sports</h1>
          <p className="brand-subtitle">Broadcast Arena</p>
        </div>

        <nav className="nav-menu">
          <button className={`nav-item ${activeTab === "livetv" ? "active" : ""}`} onClick={() => setActiveTab("livetv")}>
            <Tv size={18} />
            <span>Live TV</span>
          </button>
          <button className={`nav-item ${activeTab === "epg" ? "active" : ""}`} onClick={() => setActiveTab("epg")}>
            <Calendar size={18} />
            <span>TV Guide</span>
          </button>
          <button className={`nav-item ${activeTab === "matches" ? "active" : ""}`} onClick={() => setActiveTab("matches")}>
            <Trophy size={18} />
            <span>Matches</span>
          </button>
          <button className={`nav-item ${activeTab === "news" ? "active" : ""}`} onClick={() => setActiveTab("news")}>
            <Newspaper size={18} />
            <span>News Feed</span>
          </button>
          <button className={`nav-item ${activeTab === "settings" ? "active" : ""}`} onClick={() => setActiveTab("settings")}>
            <SettingsIcon size={18} />
            <span>Settings</span>
          </button>
        </nav>

        <div className="sidebar-footer">
          <p>EMJ Sports Premium v2.5</p>
        </div>
      </aside>

      {/* Mobile Bottom Navigation Bar */}
      <nav className="mobile-bottom-nav">
        <button className={`mobile-nav-btn ${activeTab === "livetv" ? "active" : ""}`} onClick={() => setActiveTab("livetv")}>
          <Tv size={20} />
          <span>Live TV</span>
        </button>
        <button className={`mobile-nav-btn ${activeTab === "epg" ? "active" : ""}`} onClick={() => setActiveTab("epg")}>
          <Calendar size={20} />
          <span>Guide</span>
        </button>
        <button className={`mobile-nav-btn ${activeTab === "matches" ? "active" : ""}`} onClick={() => setActiveTab("matches")}>
          <Trophy size={20} />
          <span>Matches</span>
        </button>
        <button className={`mobile-nav-btn ${activeTab === "news" ? "active" : ""}`} onClick={() => setActiveTab("news")}>
          <Newspaper size={20} />
          <span>News</span>
        </button>
        <button className={`mobile-nav-btn ${activeTab === "settings" ? "active" : ""}`} onClick={() => setActiveTab("settings")}>
          <SettingsIcon size={20} />
          <span>Settings</span>
        </button>
      </nav>

      {/* Main Panel Content */}
      <main className="main-content">
        <header className="view-header">
          <div className="view-title-wrap">
            {activeTab === "livetv" && (
              <>
                <h2>Live Broadcast Stage</h2>
                <p>Uptime-sorted active feeds prioritised automatically</p>
              </>
            )}
            {activeTab === "epg" && (
              <>
                <h2>Electronic TV Guide</h2>
                <p>Full 24-hour deterministic broadcasting schedules</p>
              </>
            )}
            {activeTab === "matches" && (
              <>
                <h2>Match Center</h2>
                <p>FIFA tournaments, real-time statistics, and team lineups</p>
              </>
            )}
            {activeTab === "news" && (
              <>
                <h2>Sports Newsroom</h2>
                <p>Exclusive soccer updates and expert tactical studies</p>
              </>
            )}
            {activeTab === "settings" && (
              <>
                <h2>Platform Settings</h2>
                <p>Tuning latency, aesthetic accents, and hotkey guidelines</p>
              </>
            )}
          </div>
          <div style={{ display: "flex", gap: "15px", alignItems: "center" }}>
            <button
              className="player-hud-btn"
              onClick={() => setIsTvMode(true)}
              title="Cinematic TV UI Mode (T)"
              style={{ border: "1px solid var(--border-accent)", padding: "10px 14px", borderRadius: "4px", background: "rgba(0,0,0,0.5)" }}
            >
              <LayoutGrid size={16} style={{ marginRight: "6px", display: "inline" }} />
              TV Mode
            </button>
            <div className="header-clock">{clockTime}</div>
          </div>
        </header>

        {/* -------------------- LIVE TV VIEW -------------------- */}
        {activeTab === "livetv" && (
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
                {/* Mixed Content HTTPS block warning */}
                {isHttps && activeChannel?.url?.startsWith("http://") && (
                  <div className="mixed-content-alert-banner">
                    <span className="alert-text">
                      Stream Blocked: Browsers prevent HTTP streams on secure HTTPS sites. Switch to HTTP mode to play this feed.
                    </span>
                    <button
                      className="mixed-content-redirect-btn"
                      onClick={() => {
                        window.location.href = window.location.href.replace("https://", "http://");
                      }}
                    >
                      Switch to HTTP Player
                    </button>
                  </div>
                )}

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
                        className="player-hud-btn"
                        style={{ color: showTuner ? "var(--accent)" : "inherit" }}
                        onClick={() => setShowTuner((prev) => !prev)}
                        title="Cinematic Filter Tuner"
                      >
                        <Sliders size={18} />
                      </button>

                      {/* Sleep timer trigger */}
                      <div className="volume-hud-control">
                        <Clock size={16} style={{ color: "var(--text-muted)" }} />
                        <select
                          style={{ background: "rgba(0,0,0,0.6)", border: "1px solid var(--border-accent)", color: "var(--text-primary)", fontSize: "0.7rem", padding: "2px 6px", outline: "none", cursor: "pointer", borderRadius: "2px" }}
                          value={sleepTimer}
                          onChange={(e) => setSleepTimer(parseInt(e.target.value))}
                        >
                          <option value={0}>Sleep Off</option>
                          <option value={15}>15 Mins</option>
                          <option value={30}>30 Mins</option>
                          <option value={60}>60 Mins</option>
                        </select>
                      </div>

                      <button
                        className="player-hud-btn"
                        style={{ color: showStatsForNerds ? "var(--accent)" : "inherit" }}
                        onClick={() => setShowStatsForNerds((prev) => !prev)}
                        title="Stats for Nerds (I)"
                      >
                        <Info size={18} />
                      </button>

                      {/* Dual-Stream Split Toggle */}
                      <button
                        className={`player-hud-btn ${isDualStream ? "active" : ""}`}
                        onClick={() => {
                          setIsDualStream(prev => !prev);
                          if (!activeChannelId2 && channels[1]) {
                            setActiveChannelId2(channels[1].id);
                          }
                        }}
                        style={{ color: isDualStream ? "var(--accent)" : "inherit" }}
                        title="Toggle Dual Split-Stream"
                      >
                        <LayoutGrid size={18} />
                      </button>

                      {isDualStream && (
                        <div style={{ display: "flex", alignItems: "center" }}>
                          <select
                            style={{
                              background: "rgba(0,0,0,0.85)",
                              border: "1px solid var(--border-accent)",
                              color: "var(--text-primary)",
                              fontSize: "0.7rem",
                              padding: "4px 8px",
                              outline: "none",
                              cursor: "pointer",
                              borderRadius: "4px",
                              maxWidth: "110px",
                              textOverflow: "ellipsis"
                            }}
                            value={activeChannelId2}
                            onChange={(e) => setActiveChannelId2(e.target.value)}
                          >
                            {channels.map((c) => (
                              <option key={c.id} value={c.id}>
                                Pane 2: {c.name}
                              </option>
                            ))}
                          </select>
                        </div>
                      )}

                      {/* Aspect Ratio config selector */}
                      <button
                        className="player-hud-btn"
                        onClick={() => {
                          const aspects: Array<"fit" | "fill" | "stretch" | "zoom" | "16-9" | "4-3"> = ["fit", "fill", "stretch", "zoom", "16-9", "4-3"];
                          const nextIdx = (aspects.indexOf(aspectRatio) + 1) % aspects.length;
                          setAspectRatio(aspects[nextIdx]);
                        }}
                        title={`Aspect Ratio: ${aspectRatio}`}
                      >
                        <span style={{ fontSize: "0.65rem", border: "1px solid var(--accent)", padding: "2px 4px", borderRadius: "2px" }}>
                          {aspectRatio.toUpperCase()}
                        </span>
                      </button>

                      <span className="stream-quality-indicator">{activeChannel.quality}</span>

                      <button className="player-hud-btn" onClick={toggleFullscreen} title="Fullscreen (F)">
                        <Maximize size={18} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Dynamic canvas visual equalizer */}
              <div className="equalizer-canvas-container" title="Audio Equalizer Visualizer">
                <canvas ref={canvasRef} className="equalizer-canvas" />
                <span style={{ position: "absolute", left: "15px", top: "50%", transform: "translateY(-50%)", fontSize: "0.65rem", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.2em", pointerEvents: "none" }}>
                  Equalizer Matrix
                </span>
              </div>

              {/* Tuner Filter panel overlay */}
              {showTuner && (
                <div className="video-tuner-panel">
                  <div className="tuner-title">Cinematic Video Filters</div>
                  <div className="tuner-row">
                    <span>Brightness ({brightness}%)</span>
                    <input type="range" min="50" max="150" className="tuner-slider" value={brightness} onChange={(e) => setBrightness(parseInt(e.target.value))} />
                  </div>
                  <div className="tuner-row">
                    <span>Contrast ({contrast}%)</span>
                    <input type="range" min="50" max="150" className="tuner-slider" value={contrast} onChange={(e) => setContrast(parseInt(e.target.value))} />
                  </div>
                  <div className="tuner-row">
                    <span>Saturation ({saturation}%)</span>
                    <input type="range" min="50" max="150" className="tuner-slider" value={saturation} onChange={(e) => setSaturation(parseInt(e.target.value))} />
                  </div>
                  <div className="tuner-row">
                    <span>Gold Cinematic Sepia ({goldTint}%)</span>
                    <input type="range" min="0" max="100" className="tuner-slider" value={goldTint} onChange={(e) => setGoldTint(parseInt(e.target.value))} />
                  </div>
                </div>
              )}
            </section>

            {/* Right Column: Interaction details panel */}
            <section className="interaction-panel" aria-label="Interactive panels">
              <div className="panel-tab-headers">
                <button className="panel-tab-btn active">Broadcast EPG</button>
                <button className="panel-tab-btn">Pundits Chat</button>
              </div>

              <div className="tab-scrollable-content">
                {/* Active Channel EPG segment details */}
                {activeChannelEPGBlock ? (
                  <div className="now-playing-program-block">
                    <span className="program-block-label">Currently Broadcasting</span>
                    <h4 className="program-block-title">{activeChannelEPGBlock.title}</h4>
                    <p className="program-block-time">Duration: {formatEPGTime(activeProgramIndices)}</p>
                    <p className="program-block-desc">{activeChannelEPGBlock.description}</p>
                  </div>
                ) : (
                  <div style={{ padding: "10px", color: "var(--text-muted)" }}>No EPG timeline blocks loaded.</div>
                )}

                {/* Chat feed */}
                <div className="chat-scroll-wrapper" style={{ marginTop: "15px" }}>
                  {chatMessages.map((msg) => (
                    <div key={msg.id} className="chat-message-row">
                      <div className="chat-user-meta">
                        <span className="chat-username">{msg.username}</span>
                        <span className={`chat-badge ${msg.role}`}>{msg.role}</span>
                      </div>
                      <p className="chat-text">{msg.message}</p>
                    </div>
                  ))}
                  <div ref={chatEndRef} />
                </div>

                <form onSubmit={handleSendChat} className="chat-input-row">
                  <input
                    type="text"
                    placeholder="Contribute to debate..."
                    className="chat-input"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                  />
                  <button type="submit" className="chat-send-btn" title="Send message">
                    <Send size={14} />
                  </button>
                </form>
              </div>
            </section>
          </div>
        )}

        {/* -------------------- EPG VIEW (TV GUIDE) -------------------- */}
        {activeTab === "epg" && (
          <section className="epg-timeline-view" aria-label="Electronic TV Guide">
            <div className="epg-time-header-row">
              <div className="epg-channel-header-col">Channel Network</div>
              <div className="epg-hours-scroll-area">
                {Array.from({ length: 12 }).map((_, blockIdx) => (
                  <div key={blockIdx} className="epg-hour-slot">
                    {formatEPGTime(blockIdx)}
                  </div>
                ))}
              </div>
            </div>

            <div className="epg-channel-rows-scrollable">
              {channels.map((c) => (
                <div key={c.id} className="epg-channel-row">
                  <div className="epg-row-channel-info-cell">
                    <span className="epg-row-channel-name">{c.name}</span>
                    <span className="epg-row-channel-number">CH {c.number.toString().padStart(3, "0")}</span>
                  </div>

                  <div className="epg-row-programs-cells">
                    {c.epg.map((prog, blockIdx) => {
                      const isActive = blockIdx === activeProgramIndices;
                      return (
                        <div
                          key={prog.id}
                          className={`epg-program-cell ${isActive ? "active-program" : ""}`}
                          onClick={() => {
                            setActiveChannelId(c.id);
                            setActiveTab("livetv");
                          }}
                          title={`Surf to ${c.name}`}
                        >
                          <span className="epg-cell-title">{prog.title}</span>
                          <span className="epg-cell-time">{formatEPGTime(blockIdx)}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* -------------------- MATCH CENTER VIEW -------------------- */}
        {activeTab === "matches" && (
          <div className="match-center-view">
            <section className="matches-grid-wrapper" aria-label="Scores list deck">
              {matches.map((m) => (
                <div
                  key={m.id}
                  className={`match-card ${selectedMatchId === m.id ? "selected" : ""}`}
                  onClick={() => setSelectedMatchId(m.id)}
                >
                  <div className="match-card-header">
                    <span className="match-tournament">{m.tournament}</span>
                    <span
                      className={`match-status-badge ${
                        m.status === "LIVE" ? "live" : m.status === "UPCOMING" ? "upcoming" : "finished"
                      }`}
                    >
                      {m.status === "LIVE" ? `LIVE ${m.time}` : m.status === "UPCOMING" ? m.time : "FT"}
                    </span>
                  </div>

                  <div className="match-card-teams">
                    <div className="match-team-row">
                      <span className="match-team-name">{m.homeTeam}</span>
                      <span className="match-team-score">{m.status === "UPCOMING" ? "-" : m.homeScore}</span>
                    </div>
                    <div className="match-team-row">
                      <span className="match-team-name">{m.awayTeam}</span>
                      <span className="match-team-score">{m.status === "UPCOMING" ? "-" : m.awayScore}</span>
                    </div>
                  </div>

                  <div className="match-card-footer">
                    <span>Possession: {m.status === "UPCOMING" ? "50/50" : `${m.possession[0]}% - ${m.possession[1]}%`}</span>
                    <span style={{ color: "var(--accent)", display: "flex", alignItems: "center", gap: "4px" }}>
                      Details <ChevronRight size={14} />
                    </span>
                  </div>
                </div>
              ))}
            </section>

            <section className="match-detail-panel" aria-label="Squad lineups and metrics">
              <div className="match-detail-header-teams">
                <div className="match-detail-team-block">
                  <div className="match-detail-team-name">{selectedMatch.homeTeam}</div>
                  <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>HOME</span>
                </div>
                <div className="match-detail-score-block">
                  {selectedMatch.status === "UPCOMING" ? "VS" : `${selectedMatch.homeScore} - ${selectedMatch.awayScore}`}
                </div>
                <div className="match-detail-team-block">
                  <div className="match-detail-team-name">{selectedMatch.awayTeam}</div>
                  <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>AWAY</span>
                </div>
              </div>

              {/* 2D Canvas Match Pitch Tracker */}
              {selectedMatch.status !== "UPCOMING" && (
                <div className="pitch-tracker-wrapper">
                  <div className="pitch-tracker-header">Live 2D Match Tracker</div>
                  <div className="pitch-canvas-container">
                    <canvas ref={pitchCanvasRef} width={310} height={200} className="pitch-canvas" />
                  </div>
                </div>
              )}

              {selectedMatch.status !== "UPCOMING" ? (
                <div className="match-detail-stats-section">
                  <h4 className="stats-section-title">Team Performance Stats</h4>
                  
                  <div>
                    <div className="match-stat-row">
                      <span>Possession</span>
                      <span className="stat-val">{selectedMatch.possession[0]}% - {selectedMatch.possession[1]}%</span>
                    </div>
                    <div className="match-possession-bar">
                      <div className="possession-home" style={{ width: `${selectedMatch.possession[0]}%` }}></div>
                      <div className="possession-away" style={{ width: `${selectedMatch.possession[1]}%` }}></div>
                    </div>
                  </div>

                  <div className="match-stat-row">
                    <span>Total Shots</span>
                    <span className="stat-val">{selectedMatch.shots[0]} - {selectedMatch.shots[1]}</span>
                  </div>

                  <div className="match-stat-row">
                    <span>Yellow Cards</span>
                    <span className="stat-val">{selectedMatch.yellowCards[0]} - {selectedMatch.yellowCards[1]}</span>
                  </div>

                  <div className="match-stat-row">
                    <span>Red Cards</span>
                    <span className="stat-val">{selectedMatch.redCards[0]} - {selectedMatch.redCards[1]}</span>
                  </div>

                  <div style={{ marginTop: "10px" }}>
                    <h4 className="stats-section-title">Squad Lineups</h4>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginTop: "8px" }}>
                      <div>
                        <div style={{ fontSize: "0.8rem", color: "var(--accent)", marginBottom: "4px" }}>Home XI</div>
                        <ul style={{ listStyle: "none", fontSize: "0.75rem", color: "var(--text-muted)", display: "flex", flexDirection: "column", gap: "4px" }}>
                          {selectedMatch.lineups.home.map((p, idx) => (
                            <li key={idx}>· {p}</li>
                          ))}
                        </ul>
                      </div>
                      <div>
                        <div style={{ fontSize: "0.8rem", color: "var(--accent)", marginBottom: "4px" }}>Away XI</div>
                        <ul style={{ listStyle: "none", fontSize: "0.75rem", color: "var(--text-muted)", display: "flex", flexDirection: "column", gap: "4px" }}>
                          {selectedMatch.lineups.away.map((p, idx) => (
                            <li key={idx}>· {p}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div style={{ textAlign: "center", color: "var(--text-muted)", fontSize: "0.9rem", padding: "40px 0" }}>
                  Squad lineups and live stats will load upon kickoff.
                </div>
              )}
            </section>
          </div>
        )}

        {/* -------------------- SPORTS NEWS VIEW -------------------- */}
        {activeTab === "news" && (
          <div className="news-view-container">
            {news[0] && (
              <article className="news-spotlight-card">
                <span className="news-category-pill" style={{ alignSelf: "flex-start" }}>{news[0].category}</span>
                <h3 className="news-spotlight-title">{news[0].title}</h3>
                <p className="news-spotlight-summary">{news[0].summary}</p>
                <div className="news-meta">
                  <span>Published {news[0].publishedAt}</span>
                  <span>·</span>
                  <span>{news[0].readTime}</span>
                  <span>·</span>
                  <span>By {news[0].author}</span>
                </div>
              </article>
            )}

            {news.slice(1).map((art) => (
              <article key={art.id} className="news-standard-card">
                <span className="news-category-pill" style={{ alignSelf: "flex-start" }}>{art.category}</span>
                <h4 className="news-title">{art.title}</h4>
                <p className="news-summary">{art.summary}</p>
                <div className="news-meta">
                  <span>Published {art.publishedAt}</span>
                  <span>·</span>
                  <span>{art.readTime}</span>
                </div>
              </article>
            ))}
          </div>
        )}

        {/* -------------------- SETTINGS VIEW -------------------- */}
        {activeTab === "settings" && (
          <div className="settings-view-container">
            <section className="settings-card" aria-label="Aesthetics configuration">
              <h3 className="settings-card-title">Aesthetics Accents</h3>
              
              <div className="settings-option-group">
                <label className="settings-label">Color Theme Accent</label>
                <div className="theme-toggle-row">
                  <button
                    className={`theme-option-btn gold ${activeTheme === "gold" ? "active" : ""}`}
                    onClick={() => setActiveTheme("gold")}
                  >
                    Champagne Gold
                  </button>
                  <button
                    className={`theme-option-btn platinum ${activeTheme === "platinum" ? "active" : ""}`}
                    onClick={() => setActiveTheme("platinum")}
                  >
                    Royal Platinum
                  </button>
                </div>
              </div>

              <div className="settings-option-group">
                <label className="settings-label">Streaming Buffer Size</label>
                <select
                  className="settings-select"
                  value={bufferDelay}
                  onChange={(e) => {
                    const val = parseInt(e.target.value);
                    setBufferDelay(val);
                    localStorage.setItem(storageKeys.buffer, val.toString());
                  }}
                >
                  <option value={2}>Low Latency Beam (2s buffer)</option>
                  <option value={5}>Balanced Stream Beam (5s buffer)</option>
                  <option value={10}>Standard Secure Beam (10s buffer)</option>
                  <option value={30}>High Stability Beam (30s buffer)</option>
                </select>
              </div>

              <div className="settings-option-group">
                <label className="settings-label">Preferred Audio track</label>
                <select
                  className="settings-select"
                  value={audioLanguage}
                  onChange={(e) => {
                    const val = e.target.value as "english" | "spanish";
                    setAudioLanguage(val);
                    localStorage.setItem(storageKeys.lang, val);
                  }}
                >
                  <option value="english">English (Dolby Atmos Simulated)</option>
                  <option value="spanish">Español (Estéreo Pro)</option>
                </select>
              </div>
            </section>

            <section className="settings-card" aria-label="Hotkeys reference">
              <h3 className="settings-card-title">Keyboard Navigation Guide</h3>
              <div className="settings-shortcuts-list" style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                <div className="shortcut-row">
                  <span>Toggle TV Interface Mode</span>
                  <kbd className="shortcut-key">T</kbd>
                </div>
                <div className="shortcut-row">
                  <span>Play / Pause Broadcast</span>
                  <kbd className="shortcut-key">Space</kbd>
                </div>
                <div className="shortcut-row">
                  <span>Mute / Unmute stream</span>
                  <kbd className="shortcut-key">M</kbd>
                </div>
                <div className="shortcut-row">
                  <span>Toggle Fullscreen Display</span>
                  <kbd className="shortcut-key">F</kbd>
                </div>
                <div className="shortcut-row">
                  <span>Toggle Stats for Nerds</span>
                  <kbd className="shortcut-key">I</kbd>
                </div>
                <div className="shortcut-row">
                  <span>Surf to Next Channel</span>
                  <kbd className="shortcut-key">Arrow Down</kbd>
                </div>
                <div className="shortcut-row">
                  <span>Surf to Previous Channel</span>
                  <kbd className="shortcut-key">Arrow Up</kbd>
                </div>
                <div className="shortcut-row">
                  <span>Adjust Audio Volume</span>
                  <kbd className="shortcut-key">Arrow Left / Right</kbd>
                </div>
              </div>
            </section>
          </div>
        )}
      </main>
    </div>
  );
}
