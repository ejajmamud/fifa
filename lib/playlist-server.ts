import { promises as fs } from "fs";
import path from "path";
import { Channel, EPGItem } from "./playlist";

const PLAYLIST_FILE = "Fifa world cup.m3u";

const countryNames: Record<string, string> = {
  "🇦🇱": "Albania",
  "🇦🇷": "Argentina",
  "🇦🇹": "Austria",
  "🇧🇬": "Bulgaria",
  "🇧🇷": "Brazil",
  "🇨🇱": "Chile",
  "🇨🇴": "Colombia",
  "🇨🇿": "Czechia",
  "🇩🇪": "Germany",
  "🇪🇸": "Spain",
  "🇫🇷": "France",
  "🇬🇧": "United Kingdom",
  "🇭🇰": "Hong Kong",
  "🇭🇺": "Hungary",
  "🇮🇳": "India",
  "🇮🇱": "Israel",
  "🇮🇹": "Italy",
  "🇲🇴": "Macau",
  "🇲🇽": "Mexico",
  "🇳🇱": "Netherlands",
  "🇳🇴": "Norway",
  "🇵🇹": "Portugal",
  "🇶🇦": "Qatar",
  "🇷🇴": "Romania",
  "🇷🇺": "Russia",
  "🇸🇦": "Saudi Arabia",
  "🇹🇲": "Turkmenistan",
  "🇹🇷": "Turkey",
  "🇺🇦": "Ukraine"
};

const groupPatterns: Array<[RegExp, string]> = [
  [/^(AR\s*\||.*\bARG\b|.*Argentina|.*🇦🇷)/i, "Argentina"],
  [/^(MX\s*\||.*Mexico|.*🇲🇽)/i, "Mexico"],
  [/^(USA\s*\||.*NBC|.*NBA|.*Fox Soccer|.*Universo)/i, "USA"],
  [/Latino|TUDN|Claro|Telemundo|Azteca|Win Sports|TyC|Tigo/i, "Latino"],
  [/ESPN/i, "ESPN"],
  [/FOX/i, "Fox"],
  [/beIN|BEIN/i, "beIN"],
  [/DAZN/i, "DAZN"],
  [/SKY|Sky/i, "Sky"],
  [/Матч|Setanta|OTT|🇷🇺/i, "Eastern Europe"],
  [/SPORT|Sports|Sport|Deportes|Futbol|Football|Golf|Liga|LALIGA/i, "Sports"]
];

function parseAttributes(value: string) {
  const attributes: Record<string, string> = {};
  const pattern = /([\w-]+)="([^"]*)"/g;
  let match = pattern.exec(value);

  while (match) {
    attributes[match[1]] = match[2];
    match = pattern.exec(value);
  }

  return attributes;
}

function hash(value: string) {
  let current = 0;

  for (let index = 0; index < value.length; index += 1) {
    current = (current << 5) - current + value.charCodeAt(index);
    current |= 0;
  }

  return Math.abs(current).toString(36);
}

function cleanName(value: string) {
  return value
    .replace(/^✔️\s*/u, "")
    .replace(/[\u2700-\u27BF]|[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD10-\uDDFF]/gu, "")
    .replace(/\b(AR|MX|USA|ESP|COL|ARG|BRA|UK)\s*\|\s*/gi, "")
    .replace(/\s+/g, " ")
    .trim();
}

function inferCountry(name: string) {
  const flag = Object.keys(countryNames).find((emoji) => name.includes(emoji));
  if (flag) {
    return countryNames[flag];
  }

  if (/\b(ARG|AR)\b/i.test(name)) return "Argentina";
  if (/\b(MX)\b/i.test(name)) return "Mexico";
  if (/\b(USA)\b/i.test(name)) return "USA";
  if (/Latino/i.test(name)) return "Latin America";

  return undefined;
}

function inferGroup(name: string, groupTitle?: string) {
  if (groupTitle?.trim()) {
    return groupTitle
      .replace(/[\u2700-\u27BF]|[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD10-\uDDFF]/gu, "")
      .trim();
  }

  const match = groupPatterns.find(([pattern]) => pattern.test(name));
  return match?.[1] ?? "Live Sports";
}

function inferQuality(name: string, url: string) {
  const qualityMatch = name.match(/\b(4K|1080p|720p|480p|HD|SD)\b/i);
  if (qualityMatch) {
    return qualityMatch[1].toUpperCase();
  }

  if (/1080/i.test(url)) return "1080P";
  if (/720/i.test(url)) return "720P";
  if (/mpegts/i.test(url)) return "MPEGTS";

  return "LIVE HD";
}

function seededRandom(seedStr: string) {
  let h = 0;
  for (let i = 0; i < seedStr.length; i++) {
    h = Math.imul(31, h) + seedStr.charCodeAt(i) | 0;
  }
  return function() {
    let t = h += 0x6D2B79F5;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const showCatalogs = {
  spanish: [
    { title: "Debate Fútbol Pro", desc: "El análisis más caliente sobre los planteles y el planteo estratégico de la fecha." },
    { title: "Históricos de la Selección", desc: "Especial documental recordando las mayores epopeyas mundialistas de Sudamérica." },
    { title: "Fútbol de Primera", desc: "Cobertura completa en vivo con estadísticas en tiempo real y entrevistas a pie de campo." },
    { title: "Mesa de Periodistas", desc: "Los periodistas más reconocidos analizan las transferencias y la interna de los clubes." },
    { title: "Liga BetPlay Especial", desc: "Resumen detallado de todos los goles y jugadas polémicas de la jornada." },
    { title: "Pasión Sin Límites", desc: "Historias de vida de los hinchas que cruzan fronteras para alentar a su selección." }
  ],
  english: [
    { title: "FIFA World Cup Classics", desc: "A cinematic look back at legendary tournament finals and iconic golden goals." },
    { title: "ESPN FC Broadcast", desc: "The definitive news and talk show covering European and international football." },
    { title: "The Tactical Breakdown", desc: "In-depth review of formations, pressing schemes, and heatmaps using state-of-the-art virtual graphics." },
    { title: "Premier Sports Hub", desc: "Live match buildup, fan polls, and post-game manager interviews from the studio." },
    { title: "Golden Boots Elite", desc: "Profiling the prolific strikers who dominated international score sheets." },
    { title: "Next Gen Stars", desc: "Scouting reports and highlights of the best under-21 talents across the globe." }
  ],
  general: [
    { title: "Super Sports Live", desc: "Global sports compilation featuring highlights, interviews, and sports news updates." },
    { title: "All-Star Sports Center", desc: "Breaking sports news, tournament brackets, and expert analysis." },
    { title: "World Football Round-up", desc: "Weekly wrap-up of league standings, stats leaders, and upcoming matches." },
    { title: "Sports Network Journal", desc: "Investigative reports into training science, sports psychology, and biomechanics." }
  ]
};

function generateEPG(channelName: string, channelId: string, durationMinutes = 120, blocksCount = 12): EPGItem[] {
  const rand = seededRandom(channelName + channelId);
  const isSpanish = /tyc|tnt|win|deportes|futbol|claro|multimedios|azteca|telemundo/i.test(channelName);
  const isEnglish = /espn|fox|sky|nbc|bein|dazn|universo/i.test(channelName);
  
  const pool = isSpanish 
    ? [...showCatalogs.spanish, ...showCatalogs.general]
    : isEnglish 
      ? [...showCatalogs.english, ...showCatalogs.general]
      : [...showCatalogs.general, ...showCatalogs.english, ...showCatalogs.spanish];

  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
  const items: EPGItem[] = [];

  for (let block = 0; block < blocksCount; block++) {
    const startTime = new Date(startOfDay.getTime() + block * durationMinutes * 60 * 1000);
    const endTime = new Date(startTime.getTime() + durationMinutes * 60 * 1000);
    const index = Math.floor(rand() * pool.length);
    const show = pool[index];

    items.push({
      id: `${channelId}-epg-${block}`,
      title: show.title,
      description: show.desc,
      startTime: startTime.toISOString(),
      endTime: endTime.toISOString(),
      durationMinutes: durationMinutes
    });
  }

  return items;
}

let channelsCache: {
  timestamp: number;
  channels: Channel[];
} | null = null;

let globalCacheTtl = 300000;
let isRefreshing = false;

export interface PriorityRule {
  name: string;
  urlContains: string;
}

export interface RssFeedSetting {
  url: string;
  name: string;
}

export interface PlatformSettings {
  cacheTtl: number;
  checkTimeout: number;
  playlistFile: string;
  scoreboardUrl: string;
  epgDurationMinutes: number;
  epgBlocksCount: number;
  groqApiKey: string;
  openRouterApiKey: string;
  aiDirectorEnabled: boolean;
  priorityRules: PriorityRule[];
  rssFeeds: RssFeedSetting[];
}

export async function loadSettings(): Promise<PlatformSettings> {
  const defaults: PlatformSettings = {
    cacheTtl: 300000,
    checkTimeout: 1200,
    playlistFile: "Fifa world cup.m3u",
    scoreboardUrl: "https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard?dates=20260601-20260731&limit=200",
    epgDurationMinutes: 120,
    epgBlocksCount: 12,
    groqApiKey: "",
    openRouterApiKey: "",
    aiDirectorEnabled: true,
    priorityRules: [
      { name: "DSports", urlContains: "A008" },
      { name: "TyC Sports ARG", urlContains: "stream/84" }
    ],
    rssFeeds: [
      { url: "https://feeds.bbci.co.uk/sport/football/rss.xml", name: "BBC Sport" },
      { url: "https://www.skysports.com/rss/12040", name: "Sky Sports" },
      { url: "https://www.espn.com/espn/rss/soccer/news", name: "ESPN FC" }
    ]
  };
  try {
    const settingsPath = path.join(process.cwd(), "settings.json");
    const content = await fs.readFile(settingsPath, "utf8");
    const parsed = JSON.parse(content);
    return {
      cacheTtl: typeof parsed.cacheTtl === "number" ? parsed.cacheTtl : defaults.cacheTtl,
      checkTimeout: typeof parsed.checkTimeout === "number" ? parsed.checkTimeout : defaults.checkTimeout,
      playlistFile: typeof parsed.playlistFile === "string" ? parsed.playlistFile : defaults.playlistFile,
      scoreboardUrl: typeof parsed.scoreboardUrl === "string" ? parsed.scoreboardUrl : defaults.scoreboardUrl,
      epgDurationMinutes: typeof parsed.epgDurationMinutes === "number" ? parsed.epgDurationMinutes : defaults.epgDurationMinutes,
      epgBlocksCount: typeof parsed.epgBlocksCount === "number" ? parsed.epgBlocksCount : defaults.epgBlocksCount,
      groqApiKey: typeof parsed.groqApiKey === "string" ? parsed.groqApiKey : defaults.groqApiKey,
      openRouterApiKey: typeof parsed.openRouterApiKey === "string" ? parsed.openRouterApiKey : defaults.openRouterApiKey,
      aiDirectorEnabled: typeof parsed.aiDirectorEnabled === "boolean" ? parsed.aiDirectorEnabled : defaults.aiDirectorEnabled,
      priorityRules: Array.isArray(parsed.priorityRules) ? parsed.priorityRules : defaults.priorityRules,
      rssFeeds: Array.isArray(parsed.rssFeeds) ? parsed.rssFeeds : defaults.rssFeeds
    };
  } catch {
    return defaults;
  }
}

function getForcedTopRank(name: string, url: string, priorityRules: PriorityRule[]): number {
  const n = name.toLowerCase();
  for (let i = 0; i < priorityRules.length; i++) {
    const rule = priorityRules[i];
    if (n === rule.name.toLowerCase() && url.includes(rule.urlContains)) {
      return i + 1;
    }
  }
  return 999;
}

async function refreshCacheInBackground() {
  if (isRefreshing) return;
  isRefreshing = true;
  try {
    const settings = await loadSettings();
    globalCacheTtl = settings.cacheTtl;
    const playlistPath = path.join(process.cwd(), settings.playlistFile || PLAYLIST_FILE);
    const playlist = await fs.readFile(playlistPath, "utf8");
    const lines = playlist
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);

    const rawChannels: Omit<Channel, "epg" | "working" | "latency">[] = [];
    let currentInfo: string | undefined;

    for (const line of lines) {
      if (line.startsWith("#EXTINF")) {
        currentInfo = line;
        continue;
      }

      if (line.startsWith("#")) {
        continue;
      }

      if (!currentInfo || !/^https?:\/\//i.test(line)) {
        continue;
      }

      const metadata = currentInfo.replace(/^#EXTINF:-?\d+\s*/i, "");
      const attributes = parseAttributes(metadata);
      const [, fallbackName = "Untitled channel"] = metadata.match(/,(.*)$/) ?? [];
      
      const rawName = attributes["tvg-name"] || fallbackName;
      const country = inferCountry(rawName);
      
      const name = cleanName(rawName);
      const group = inferGroup(name, attributes["group-title"]);
      const url = line;
      const parsedUrl = new URL(url);
      const id = `${hash(`${name}-${url}`)}-${rawChannels.length + 1}`;

      rawChannels.push({
        id,
        number: rawChannels.length + 1,
        name,
        url,
        group,
        country,
        quality: inferQuality(name, url),
        logo: attributes["tvg-logo"],
        host: parsedUrl.hostname.replace(/^www\./, "")
      });

      currentInfo = undefined;
    }

    // Validate all streams in parallel batches
    const validated = await validateAllStreams(rawChannels, settings.checkTimeout);

    // Sort: forced-top channels first, then working first, then by latency (smaller is better)
    validated.sort((a, b) => {
      const rankA = getForcedTopRank(a.name, a.url, settings.priorityRules);
      const rankB = getForcedTopRank(b.name, b.url, settings.priorityRules);
      if (rankA !== rankB) return rankA - rankB;

      if (a.working && !b.working) return -1;
      if (!a.working && b.working) return 1;
      return a.latency - b.latency;
    });

    // Re-number and add EPG schedules
    const finalChannels = validated.map((c, idx) => ({
      ...c,
      number: idx + 1,
      epg: generateEPG(c.name, c.id, settings.epgDurationMinutes, settings.epgBlocksCount)
    }));

    channelsCache = {
      timestamp: Date.now(),
      channels: finalChannels
    };
    console.log(`[PLAYLIST] Cache successfully refreshed in background with ${finalChannels.length} channels.`);
  } catch (err) {
    console.error("[PLAYLIST] Error refreshing cache in background:", err);
  } finally {
    isRefreshing = false;
  }
}

async function checkStreamStatus(url: string, timeout = 1200): Promise<{ working: boolean; latency: number }> {
  const startTime = Date.now();
  try {
    const res = await fetch(url, {
      method: "GET",
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko)"
      },
      signal: AbortSignal.timeout(timeout)
    });
    if (res.ok) {
      return { working: true, latency: Date.now() - startTime };
    }
    return { working: false, latency: 9999 };
  } catch {
    return { working: false, latency: 9999 };
  }
}

async function validateAllStreams(rawChannels: Omit<Channel, "epg" | "working" | "latency">[], timeout = 1200): Promise<(Omit<Channel, "epg"> & { working: boolean; latency: number })[]> {
  const results: (Omit<Channel, "epg"> & { working: boolean; latency: number })[] = [];
  const batchSize = 25;
  
  for (let i = 0; i < rawChannels.length; i += batchSize) {
    const batch = rawChannels.slice(i, i + batchSize);
    const promises = batch.map(async (c) => {
      const status = await checkStreamStatus(c.url, timeout);
      return {
        ...c,
        working: status.working,
        latency: status.latency
      };
    });
    const batchResults = await Promise.all(promises);
    results.push(...batchResults);
  }
  
  return results;
}

export async function getPlaylist(): Promise<Channel[]> {
  const now = Date.now();

  // If cache is empty, build a fast placeholder playlist immediately and trigger background check
  if (!channelsCache) {
    try {
      const settings = await loadSettings();
      const playlistPath = path.join(process.cwd(), settings.playlistFile || PLAYLIST_FILE);
      const playlist = await fs.readFile(playlistPath, "utf8");
      const lines = playlist
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean);

      const rawChannels: Channel[] = [];
      let currentInfo: string | undefined;

      for (const line of lines) {
        if (line.startsWith("#EXTINF")) {
          currentInfo = line;
          continue;
        }

        if (line.startsWith("#")) {
          continue;
        }

        if (!currentInfo || !/^https?:\/\//i.test(line)) {
          continue;
        }

        const metadata = currentInfo.replace(/^#EXTINF:-?\d+\s*/i, "");
        const attributes = parseAttributes(metadata);
        const [, fallbackName = "Untitled channel"] = metadata.match(/,(.*)$/) ?? [];
        
        const rawName = attributes["tvg-name"] || fallbackName;
        const country = inferCountry(rawName);
        
        const name = cleanName(rawName);
        const group = inferGroup(name, attributes["group-title"]);
        const url = line;
        const parsedUrl = new URL(url);
        const id = `${hash(`${name}-${url}`)}-${rawChannels.length + 1}`;

        rawChannels.push({
          id,
          number: rawChannels.length + 1,
          name,
          url,
          group,
          country,
          quality: inferQuality(name, url),
          logo: attributes["tvg-logo"],
          host: parsedUrl.hostname.replace(/^www\./, ""),
          working: true,
          latency: 100,
          epg: []
        });

        currentInfo = undefined;
      }

      const initialChannels = rawChannels.map((c, idx) => ({
        ...c,
        number: idx + 1,
        epg: generateEPG(c.name, c.id, settings.epgDurationMinutes, settings.epgBlocksCount)
      }));

      channelsCache = {
        timestamp: now,
        channels: initialChannels
      };
      
      // Trigger background validation immediately
      refreshCacheInBackground();
    } catch (err) {
      console.error("[PLAYLIST] Failed to build initial cold cache:", err);
      return [];
    }
  }

  // If cache is expired, trigger validation check in background (non-blocking)
  if (now - channelsCache.timestamp > globalCacheTtl) {
    refreshCacheInBackground();
  }

  return channelsCache.channels;
}

export function clearPlaylistCache() {
  channelsCache = null;
}
