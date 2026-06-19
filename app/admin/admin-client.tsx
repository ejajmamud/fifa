"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Plus,
  Edit2,
  Trash2,
  ArrowUp,
  ArrowDown,
  Search,
  Database,
  Settings as SettingsIcon,
  Shield,
  RefreshCw,
  FileText,
  CheckCircle,
  XCircle,
  Activity,
  Sliders,
  Save,
  Download
} from "lucide-react";
import { Channel } from "@/lib/playlist";
import { DashboardLayout } from "@/components/dashboard-layout";

type AdminClientPageProps = {
  initialChannels: Channel[];
};

type RawChannel = {
  name: string;
  url: string;
  group: string;
  logo?: string;
  working?: boolean;
  latency?: number;
  checking?: boolean;
};

type PriorityRule = {
  name: string;
  urlContains: string;
};

type RssFeedSetting = {
  url: string;
  name: string;
};

type PlatformSettings = {
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
};

function isSports(name: string): boolean {
  const sportWords = [
    "sport", "sports", "futbol", "football", "soccer", "deportes", "liga", "cup",
    "espn", "fox", "bein", "dazn", "sky", "match", "setanta", "tnt", "la liga", "premier",
    "fifa", "championship", "arena", "golf", "tenis", "tennis", "olympics", "f1", "formula",
    "racing", "nfl", "nba", "mlb", "nhl", "ufc", "wwe", "boxing"
  ];
  const lower = name.toLowerCase();
  return sportWords.some(word => lower.includes(word));
}

export function AdminClientPage({ initialChannels }: AdminClientPageProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"METRICS" | "CHANNELS" | "IMPORT" | "SETTINGS" | "LOGS">("METRICS");

  // Channels state
  const [rawChannels, setRawChannels] = useState<RawChannel[]>([]);
  const [isLoadingChannels, setIsLoadingChannels] = useState(true);
  const [isSavingChannels, setIsSavingChannels] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [groupFilter, setGroupFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "ONLINE" | "OFFLINE">("ALL");

  // Settings state
  const [settings, setSettings] = useState<PlatformSettings>({
    cacheTtl: 300000,
    checkTimeout: 1200,
    playlistFile: "Fifa world cup.m3u",
    scoreboardUrl: "https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard?dates=20260601-20260731&limit=200",
    epgDurationMinutes: 120,
    epgBlocksCount: 12,
    groqApiKey: "",
    openRouterApiKey: "",
    aiDirectorEnabled: true,
    priorityRules: [],
    rssFeeds: []
  });
  const [isLoadingSettings, setIsLoadingSettings] = useState(true);
  const [isSavingSettings, setIsSavingSettings] = useState(false);

  // Modal state (Add / Edit)
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"ADD" | "EDIT">("ADD");
  const [modalIndex, setModalIndex] = useState<number | null>(null);
  const [modalForm, setModalForm] = useState({
    name: "",
    url: "",
    group: "Live Sports",
    logo: ""
  });

  // Importer state
  const [m3uUrl, setM3uUrl] = useState("");
  const [m3uText, setM3uText] = useState("");
  const [harvested, setHarvested] = useState<RawChannel[]>([]);
  const [isHarvesting, setIsHarvesting] = useState(false);
  const [selectedToImport, setSelectedToImport] = useState<Record<number, boolean>>({});

  // System logs state
  const [logs, setLogs] = useState<string[]>([]);

  // Statistics
  const stats = useMemo(() => {
    const total = initialChannels.length;
    const working = initialChannels.filter(c => c.working !== false).length;
    const offline = total - working;
    const workingChannels = initialChannels.filter(c => c.working !== false && c.latency && c.latency < 9999);
    const avgLatency = workingChannels.length > 0 
      ? Math.round(workingChannels.reduce((sum, c) => sum + (c.latency ?? 0), 0) / workingChannels.length)
      : 0;

    return { total, working, offline, avgLatency };
  }, [initialChannels]);

  const addLog = (msg: string) => {
    const time = new Date().toLocaleTimeString([], { hour12: false });
    setLogs(prev => [...prev, `[${time}] ${msg}`]);
  };

  // Fetch raw M3U channels from API
  const fetchRawChannels = () => {
    setIsLoadingChannels(true);
    fetch("/api/admin/channels")
      .then(res => res.json())
      .then(data => {
        setIsLoadingChannels(false);
        if (Array.isArray(data)) {
          setRawChannels(data);
          addLog(`Loaded ${data.length} raw channels from M3U playlist file.`);
        }
      })
      .catch(err => {
        setIsLoadingChannels(false);
        console.error("Error loading raw channels:", err);
        addLog(`Error loading M3U channels: ${err.message}`);
      });
  };

  // Fetch settings from API
  const fetchSettings = () => {
    setIsLoadingSettings(true);
    fetch("/api/admin/settings")
      .then(res => res.json())
      .then(data => {
        setIsLoadingSettings(false);
        if (data && !data.error) {
          setSettings(data);
          addLog("System platform settings loaded.");
        }
      })
      .catch(err => {
        setIsLoadingSettings(false);
        console.error("Error loading settings:", err);
      });
  };

  useEffect(() => {
    fetchRawChannels();
    fetchSettings();
    addLog("Admin console session initialized.");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Filter channels
  const filteredRawChannels = useMemo(() => {
    const query = searchQuery.toLowerCase().trim();
    return rawChannels.map((c, originalIndex) => ({ ...c, originalIndex })).filter(c => {
      const matchSearch = !query || c.name.toLowerCase().includes(query) || c.url.toLowerCase().includes(query);
      const matchGroup = groupFilter === "ALL" || c.group === groupFilter;
      
      let matchStatus = true;
      if (statusFilter === "ONLINE") {
        matchStatus = c.working === true;
      } else if (statusFilter === "OFFLINE") {
        matchStatus = c.working === false;
      }

      return matchSearch && matchGroup && matchStatus;
    });
  }, [rawChannels, searchQuery, groupFilter, statusFilter]);

  // Unique groups list
  const uniqueGroups = useMemo(() => {
    const groups = new Set<string>();
    rawChannels.forEach(c => {
      if (c.group) groups.add(c.group);
    });
    return Array.from(groups).sort();
  }, [rawChannels]);

  // Save M3U channel changes
  const saveChannelsToDisk = (listToSave = rawChannels) => {
    setIsSavingChannels(true);
    addLog("Rewriting M3U playlist file back to disk...");
    fetch("/api/admin/channels", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(listToSave)
    })
      .then(res => res.json())
      .then(data => {
        setIsSavingChannels(false);
        if (data.success) {
          addLog(`Successfully saved ${data.count} channels. Playlist cache cleared.`);
          alert("M3U channels layout saved persistently!");
        } else {
          addLog(`Failed to save channels: ${data.error}`);
        }
      })
      .catch(err => {
        setIsSavingChannels(false);
        addLog(`Error saving M3U file: ${err.message}`);
        console.error("Save M3U error:", err);
      });
  };

  // Reorder channel indices
  const moveChannel = (index: number, direction: -1 | 1) => {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= rawChannels.length) return;

    const updated = [...rawChannels];
    const temp = updated[index];
    updated[index] = updated[targetIndex];
    updated[targetIndex] = temp;
    
    setRawChannels(updated);
    addLog(`Swapped order of channel '${temp.name}' from index ${index} to ${targetIndex}.`);
  };

  // Single status checker
  const checkSingleStream = (index: number) => {
    const ch = rawChannels[index];
    setRawChannels(prev => prev.map((c, i) => i === index ? { ...c, checking: true } : c));
    addLog(`Testing stream connectivity for: ${ch.name}...`);

    fetch("/api/admin/check-stream", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: ch.url, timeout: settings.checkTimeout })
    })
      .then(res => res.json())
      .then(data => {
        setRawChannels(prev => prev.map((c, i) => i === index ? { 
          ...c, 
          checking: false, 
          working: data.working,
          latency: data.latency
        } : c));
        
        if (data.working) {
          addLog(`Stream '${ch.name}' is ONLINE (Ping: ${data.latency}ms).`);
        } else {
          addLog(`Stream '${ch.name}' is OFFLINE / TIMEOUT.`);
        }
      })
      .catch(err => {
        setRawChannels(prev => prev.map((c, i) => i === index ? { ...c, checking: false, working: false } : c));
        addLog(`Check failed for '${ch.name}': ${err.message}`);
      });
  };

  // Ping check all channels
  const checkAllChannels = async () => {
    addLog("Starting batch ping check for all channel listings...");
    const batchSize = 10;
    
    for (let i = 0; i < rawChannels.length; i += batchSize) {
      const batch = rawChannels.slice(i, i + batchSize);
      addLog(`Testing stream batch index ${i} to ${Math.min(rawChannels.length, i + batchSize)}...`);
      
      const promises = batch.map(async (c, batchIdx) => {
        const actualIndex = i + batchIdx;
        setRawChannels(prev => prev.map((item, idx) => idx === actualIndex ? { ...item, checking: true } : item));
        
        try {
          const res = await fetch("/api/admin/check-stream", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ url: c.url, timeout: settings.checkTimeout })
          });
          const data = await res.json();
          setRawChannels(prev => prev.map((item, idx) => idx === actualIndex ? { 
            ...item, 
            checking: false, 
            working: data.working,
            latency: data.latency
          } : item));
        } catch {
          setRawChannels(prev => prev.map((item, idx) => idx === actualIndex ? { ...item, checking: false, working: false } : item));
        }
      });
      
      await Promise.all(promises);
    }
    addLog("Batch stream verification process completed.");
  };

  // Save modal channel CRUD
  const handleSaveModal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!modalForm.name || !modalForm.url) return;

    if (modalMode === "ADD") {
      const added = { ...modalForm };
      setRawChannels(prev => [...prev, added]);
      addLog(`Added new channel metadata: '${added.name}'.`);
    } else if (modalMode === "EDIT" && modalIndex !== null) {
      const updated = [...rawChannels];
      updated[modalIndex] = { ...updated[modalIndex], ...modalForm };
      setRawChannels(updated);
      addLog(`Updated channel metadata at index ${modalIndex}: '${modalForm.name}'.`);
    }

    setIsModalOpen(false);
  };

  // Delete channel CRUD
  const handleDeleteChannel = (index: number) => {
    if (!confirm("Are you sure you want to delete this channel?")) return;
    const name = rawChannels[index].name;
    const updated = rawChannels.filter((_, i) => i !== index);
    setRawChannels(updated);
    addLog(`Deleted channel listing: '${name}'.`);
    saveChannelsToDisk(updated);
  };

  // Open modal in edit/add mode
  const openModal = (mode: "ADD" | "EDIT", index: number | null = null) => {
    setModalMode(mode);
    setModalIndex(index);
    if (mode === "EDIT" && index !== null) {
      const ch = rawChannels[index];
      setModalForm({
        name: ch.name,
        url: ch.url,
        group: ch.group || "Live Sports",
        logo: ch.logo || ""
      });
    } else {
      setModalForm({
        name: "",
        url: "",
        group: "Live Sports",
        logo: ""
      });
    }
    setIsModalOpen(true);
  };

  // Save configurations
  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingSettings(true);
    addLog("Saving settings parameters to disk...");
    fetch("/api/admin/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(settings)
    })
      .then(res => res.json())
      .then(data => {
        setIsSavingSettings(false);
        if (data.success) {
          setSettings(data.settings);
          addLog("Platform settings updated. Playlist cache flushed.");
          alert("Platform configurations updated successfully!");
        }
      })
      .catch(err => {
        setIsSavingSettings(false);
        addLog(`Error saving settings: ${err.message}`);
      });
  };

  const handleLogout = async () => {
    if (!confirm("Are you sure you want to sign out from the broadcast control console?")) return;
    try {
      const res = await fetch("/api/admin/logout", { method: "POST" });
      if (res.ok) {
        router.push("/login");
        router.refresh();
      }
    } catch (err) {
      console.error("Logout error:", err);
    }
  };

  // Add/remove priority channel sorting rules
  const handleAddRule = () => {
    setSettings(prev => ({
      ...prev,
      priorityRules: [...prev.priorityRules, { name: "", urlContains: "" }]
    }));
  };

  const handleRemoveRule = (index: number) => {
    setSettings(prev => ({
      ...prev,
      priorityRules: prev.priorityRules.filter((_, i) => i !== index)
    }));
  };

  const handleRuleChange = (index: number, field: keyof PriorityRule, value: string) => {
    setSettings(prev => {
      const updatedRules = [...prev.priorityRules];
      updatedRules[index] = { ...updatedRules[index], [field]: value };
      return { ...prev, priorityRules: updatedRules };
    });
  };

  // Add/remove RSS feeds
  const handleAddRssFeed = () => {
    setSettings(prev => ({
      ...prev,
      rssFeeds: [...(prev.rssFeeds || []), { name: "", url: "" }]
    }));
  };

  const handleRemoveRssFeed = (index: number) => {
    setSettings(prev => ({
      ...prev,
      rssFeeds: (prev.rssFeeds || []).filter((_, i) => i !== index)
    }));
  };

  const handleRssFeedChange = (index: number, field: keyof RssFeedSetting, value: string) => {
    setSettings(prev => {
      const updatedFeeds = [...(prev.rssFeeds || [])];
      updatedFeeds[index] = { ...updatedFeeds[index], [field]: value };
      return { ...prev, rssFeeds: updatedFeeds };
    });
  };

  // Fetch external M3U link and scan sports streams
  const handleScanM3U = async () => {
    if (!m3uUrl.trim() && !m3uText.trim()) {
      alert("Please provide either a remote M3U URL or paste M3U playlist text.");
      return;
    }

    setIsHarvesting(true);
    setHarvested([]);
    setSelectedToImport({});
    addLog("Beginning remote playlist scanning and harvesting...");

    try {
      let rawText = m3uText;
      if (m3uUrl.trim()) {
        addLog(`Fetching external M3U URL: ${m3uUrl}...`);
        const res = await fetch(`/api/proxy-stream?url=${encodeURIComponent(m3uUrl.trim())}`);
        if (!res.ok) throw new Error(`Fetch failed with status ${res.status}`);
        rawText = await res.text();
      }

      const lines = rawText.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
      addLog(`Downloaded playlist file. Parsing ${lines.length} lines...`);

      const tempChannels: RawChannel[] = [];
      let tempInfo: string | null = null;

      for (const line of lines) {
        if (line.startsWith("#EXTINF")) {
          tempInfo = line;
        } else if (line.startsWith("http") && tempInfo) {
          const [, fallbackName = "Untitled channel"] = tempInfo.match(/,(.*)$/) ?? [];
          const name = cleanImportName(fallbackName);
          
          if (isSports(name)) {
            tempChannels.push({
              name,
              url: line,
              group: "Live Sports"
            });
          }
          tempInfo = null;
        }
      }

      addLog(`Extracted ${tempChannels.length} candidate sports channels. Running status validator...`);

      // Test streams in parallel batch
      const workingHarvested: RawChannel[] = [];
      const batchSize = 10;
      
      for (let i = 0; i < Math.min(100, tempChannels.length); i += batchSize) {
        const batch = tempChannels.slice(i, i + batchSize);
        addLog(`Pinging external streams index ${i} to ${Math.min(tempChannels.length, i + batchSize)}...`);
        
        const promises = batch.map(async (c) => {
          const working = await validateStreamLocal(c.url);
          if (working) {
            workingHarvested.push({ ...c, working: true });
          }
        });
        
        await Promise.all(promises);
      }

      setHarvested(workingHarvested);
      addLog(`Scanned successfully. Found ${workingHarvested.length} verified ONLINE sports channels.`);
      setIsHarvesting(false);
    } catch (err: any) {
      addLog(`Playlist scanning failed: ${err.message}`);
      setIsHarvesting(false);
    }
  };

  const cleanImportName = (val: string) => {
    return val.replace(/^✔️\s*/i, "").replace(/[\u2700-\u27BF]|[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]/g, "").trim();
  };

  const validateStreamLocal = async (url: string) => {
    try {
      const res = await fetch("/api/admin/check-stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url, timeout: 1500 })
      });
      const data = await res.json();
      return data.working;
    } catch {
      return false;
    }
  };

  // Import checked harvested streams
  const handleImportSelected = () => {
    const itemsToImport = harvested.filter((_, idx) => selectedToImport[idx]);
    if (itemsToImport.length === 0) {
      alert("No channels selected for import.");
      return;
    }

    const cleanedImportList = itemsToImport.map(h => ({
      name: h.name,
      url: h.url,
      group: h.group,
      logo: ""
    }));

    const updatedChannels = [...rawChannels, ...cleanedImportList];
    setRawChannels(updatedChannels);
    addLog(`Imported ${cleanedImportList.length} new channels into the layout. Saving to M3U...`);
    saveChannelsToDisk(updatedChannels);
    setHarvested([]);
  };

  return (
    <DashboardLayout>
      <div style={{ display: "flex", flexDirection: "column", gap: "25px", width: "100%" }}>
        
        {/* Navigation Tabs */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid rgba(255, 255, 255, 0.08)", paddingBottom: "2px", margin: "0 0 10px 0" }}>
          <div style={{ display: "flex", gap: "20px" }}>
            {([
              { id: "METRICS", label: "System Metrics" },
              { id: "CHANNELS", label: "M3U Channels Editor" },
              { id: "IMPORT", label: "EPG Playlist Importer" },
              { id: "SETTINGS", label: "Dashboard Variables" },
              { id: "LOGS", label: "Process Diagnostics" }
            ] as const).map(t => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              style={{
                padding: "10px 16px",
                background: "transparent",
                border: "none",
                borderBottom: activeTab === t.id ? "2px solid var(--accent)" : "2px solid transparent",
                color: activeTab === t.id ? "var(--accent)" : "var(--text-muted)",
                fontSize: "0.82rem",
                fontWeight: "bold",
                cursor: "pointer",
                textTransform: "uppercase",
                letterSpacing: "0.06em",
                transition: "all 0.2s"
              }}
            >
              {t.label}
            </button>
          ))}
          </div>

          <button
            onClick={handleLogout}
            style={{
              padding: "8px 16px",
              background: "rgba(239, 68, 68, 0.08)",
              border: "1px solid rgba(239, 68, 68, 0.2)",
              borderRadius: "3px",
              color: "#ef4444",
              fontSize: "0.75rem",
              fontWeight: "bold",
              cursor: "pointer",
              transition: "all 0.2s"
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "rgba(239, 68, 68, 0.15)";
              e.currentTarget.style.borderColor = "#ef4444";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "rgba(239, 68, 68, 0.08)";
              e.currentTarget.style.borderColor = "rgba(239, 68, 68, 0.2)";
            }}
          >
            Sign Out
          </button>
        </div>

        {/* Tab 1: System Metrics & Stats Dashboard */}
        {activeTab === "METRICS" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "25px" }}>
            
            {/* Visual Gauges */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "20px" }}>
              <div style={{ background: "var(--bg-panel-strong)", border: "1px solid var(--border-accent)", borderRadius: "4px", padding: "24px", display: "flex", alignItems: "center", gap: "20px" }}>
                <div style={{ width: "48px", height: "48px", borderRadius: "50%", background: "rgba(197, 168, 92, 0.05)", display: "flex", alignItems: "center", justifyContent: "center", border: "1px solid var(--border-accent)" }}>
                  <Database size={22} style={{ color: "var(--accent)" }} />
                </div>
                <div>
                  <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Total Loaded Channels</div>
                  <div style={{ fontSize: "1.8rem", fontWeight: "bold", color: "#fff", marginTop: "4px" }}>{stats.total}</div>
                </div>
              </div>

              <div style={{ background: "var(--bg-panel-strong)", border: "1px solid var(--border-accent)", borderRadius: "4px", padding: "24px", display: "flex", alignItems: "center", gap: "20px" }}>
                <div style={{ width: "48px", height: "48px", borderRadius: "50%", background: "rgba(34, 197, 94, 0.05)", display: "flex", alignItems: "center", justifyContent: "center", border: "1px solid rgba(34, 197, 94, 0.2)" }}>
                  <CheckCircle size={22} style={{ color: "#22c55e" }} />
                </div>
                <div>
                  <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Verified Online</div>
                  <div style={{ fontSize: "1.8rem", fontWeight: "bold", color: "#22c55e", marginTop: "4px" }}>{stats.working}</div>
                </div>
              </div>

              <div style={{ background: "var(--bg-panel-strong)", border: "1px solid var(--border-accent)", borderRadius: "4px", padding: "24px", display: "flex", alignItems: "center", gap: "20px" }}>
                <div style={{ width: "48px", height: "48px", borderRadius: "50%", background: "rgba(239, 68, 68, 0.05)", display: "flex", alignItems: "center", justifyContent: "center", border: "1px solid rgba(239, 68, 68, 0.2)" }}>
                  <XCircle size={22} style={{ color: "#ef4444" }} />
                </div>
                <div>
                  <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Offline Streams</div>
                  <div style={{ fontSize: "1.8rem", fontWeight: "bold", color: "#ef4444", marginTop: "4px" }}>{stats.offline}</div>
                </div>
              </div>

              <div style={{ background: "var(--bg-panel-strong)", border: "1px solid var(--border-accent)", borderRadius: "4px", padding: "24px", display: "flex", alignItems: "center", gap: "20px" }}>
                <div style={{ width: "48px", height: "48px", borderRadius: "50%", background: "rgba(197, 168, 92, 0.05)", display: "flex", alignItems: "center", justifyContent: "center", border: "1px solid var(--border-accent)" }}>
                  <Activity size={22} style={{ color: "var(--accent)" }} />
                </div>
                <div>
                  <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Average Ping Latency</div>
                  <div style={{ fontSize: "1.8rem", fontWeight: "bold", color: "#fff", marginTop: "4px" }}>{stats.avgLatency} ms</div>
                </div>
              </div>
            </div>

            {/* Diagnostics Console Panel */}
            <div style={{ background: "var(--bg-panel-strong)", border: "1px solid var(--border-accent)", borderRadius: "4px", padding: "24px", display: "flex", flexDirection: "column", gap: "15px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid rgba(255,255,255,0.06)", paddingBottom: "12px" }}>
                <div>
                  <h3 style={{ fontSize: "1rem", color: "#fff", margin: 0 }}>System Health Diagnostics</h3>
                  <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", margin: "4px 0 0 0" }}>High-fidelity stream validators and Next.js backend response codes</p>
                </div>
                <button
                  onClick={checkAllChannels}
                  style={{
                    background: "rgba(197,168,92,0.1)",
                    border: "1px solid var(--accent)",
                    color: "var(--accent)",
                    padding: "8px 16px",
                    borderRadius: "3px",
                    fontSize: "0.75rem",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "6px"
                  }}
                >
                  <RefreshCw size={13} />
                  Validate All Streams
                </button>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }} className="match-pitch-stats-grid">
                <div style={{ background: "rgba(0,0,0,0.25)", padding: "16px", borderRadius: "3px", border: "1px solid var(--border-muted)", display: "flex", flexDirection: "column", gap: "10px" }}>
                  <div style={{ fontSize: "0.8rem", color: "var(--accent)" }}>Backend Server Parameters</div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.75rem" }}>
                    <span style={{ color: "var(--text-muted)" }}>Server Uptime</span>
                    <span style={{ color: "#fff" }}>Online</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.75rem" }}>
                    <span style={{ color: "var(--text-muted)" }}>Next.js Cache State</span>
                    <span style={{ color: "#22c55e" }}>Warm cache</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.75rem" }}>
                    <span style={{ color: "var(--text-muted)" }}>Harvester Engine</span>
                    <span style={{ color: "var(--accent)" }}>Standby</span>
                  </div>
                </div>

                <div style={{ background: "rgba(0,0,0,0.25)", padding: "16px", borderRadius: "3px", border: "1px solid var(--border-muted)", display: "flex", flexDirection: "column", gap: "10px" }}>
                  <div style={{ fontSize: "0.8rem", color: "var(--accent)" }}>M3U Database Metrics</div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.75rem" }}>
                    <span style={{ color: "var(--text-muted)" }}>Playlist file</span>
                    <span style={{ color: "#fff", fontFamily: "monospace" }}>Fifa world cup.m3u</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.75rem" }}>
                    <span style={{ color: "var(--text-muted)" }}>Priority Rules Active</span>
                    <span style={{ color: "#fff" }}>{settings.priorityRules?.length || 0} rules</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.75rem" }}>
                    <span style={{ color: "var(--text-muted)" }}>Total Sports Groups</span>
                    <span style={{ color: "#fff" }}>{uniqueGroups.length} groups</span>
                  </div>
                </div>
              </div>
            </div>

          </div>
        )}

        {/* Tab 2: Channels Editor (CRUD + Reorder) */}
        {activeTab === "CHANNELS" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
            
            {/* Filtering header */}
            <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: "15px", alignItems: "center" }}>
              <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                <div style={{ position: "relative" }}>
                  <Search size={14} style={{ position: "absolute", left: "10px", top: "10px", color: "var(--text-muted)" }} />
                  <input
                    type="text"
                    placeholder="Search name/URL..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    style={{ background: "#000", border: "1px solid var(--border-accent)", borderRadius: "3px", color: "#fff", padding: "8px 12px 8px 30px", fontSize: "0.8rem", width: "200px" }}
                  />
                </div>

                <select
                  value={groupFilter}
                  onChange={(e) => setGroupFilter(e.target.value)}
                  style={{ background: "#000", border: "1px solid var(--border-accent)", color: "#fff", padding: "8px 12px", fontSize: "0.8rem", borderRadius: "3px" }}
                >
                  <option value="ALL">All Groups</option>
                  {uniqueGroups.map(g => <option key={g} value={g}>{g}</option>)}
                </select>

                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as any)}
                  style={{ background: "#000", border: "1px solid var(--border-accent)", color: "#fff", padding: "8px 12px", fontSize: "0.8rem", borderRadius: "3px" }}
                >
                  <option value="ALL">All Status</option>
                  <option value="ONLINE">Online Only</option>
                  <option value="OFFLINE">Offline Only</option>
                </select>
              </div>

              <div style={{ display: "flex", gap: "10px" }}>
                <button
                  onClick={() => openModal("ADD")}
                  style={{ background: "transparent", border: "1px solid var(--accent)", color: "var(--accent)", padding: "8px 16px", borderRadius: "3px", fontSize: "0.8rem", cursor: "pointer", display: "flex", alignItems: "center", gap: "6px" }}
                >
                  <Plus size={14} /> Add Channel
                </button>
                <button
                  onClick={() => saveChannelsToDisk()}
                  disabled={isSavingChannels}
                  style={{ background: "var(--accent)", border: "none", color: "var(--bg-obsidian)", padding: "8px 16px", borderRadius: "3px", fontSize: "0.8rem", cursor: "pointer", fontWeight: "bold", display: "flex", alignItems: "center", gap: "6px" }}
                >
                  <Save size={14} className={isSavingChannels ? "spin-animate" : ""} /> Save Changes
                </button>
              </div>
            </div>

            {/* Channels Table */}
            <div style={{ background: "var(--bg-panel-strong)", border: "1px solid var(--border-accent)", borderRadius: "4px", overflow: "hidden" }}>
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.8rem", textAlign: "left" }}>
                  <thead>
                    <tr style={{ background: "rgba(255,255,255,0.02)", color: "var(--text-muted)", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                      <th style={{ padding: "12px 16px", width: "60px" }}>Order</th>
                      <th style={{ padding: "12px 16px" }}>Channel Name</th>
                      <th style={{ padding: "12px 16px" }}>Group</th>
                      <th style={{ padding: "12px 16px", width: "120px" }}>Ping Status</th>
                      <th style={{ padding: "12px 16px" }}>Stream URL</th>
                      <th style={{ padding: "12px 16px", width: "180px", textAlign: "right" }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {isLoadingChannels ? (
                      <tr>
                        <td colSpan={6} style={{ padding: "40px", textAlign: "center", color: "var(--text-muted)" }}>
                          <RefreshCw className="spin-animate" style={{ margin: "0 auto 10px" }} />
                          <span>Loading channels from M3U...</span>
                        </td>
                      </tr>
                    ) : filteredRawChannels.length > 0 ? (
                      filteredRawChannels.map((c, index) => (
                        <tr key={index} style={{ borderBottom: "1px solid rgba(255,255,255,0.03)", transition: "background 0.2s" }}>
                          <td style={{ padding: "12px 16px", fontFamily: "monospace", color: "var(--accent)" }}>
                            {(c.originalIndex + 1).toString().padStart(3, "0")}
                          </td>
                          <td style={{ padding: "12px 16px", fontWeight: "bold", color: "#fff" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                              {c.logo && (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={c.logo} alt="" style={{ width: "18px", height: "18px", objectFit: "contain", borderRadius: "2px" }} />
                              )}
                              <span>{c.name}</span>
                            </div>
                          </td>
                          <td style={{ padding: "12px 16px", color: "var(--text-muted)" }}>{c.group}</td>
                          <td style={{ padding: "12px 16px" }}>
                            {c.checking ? (
                              <span style={{ color: "var(--accent)", display: "flex", alignItems: "center", gap: "4px" }}>
                                <RefreshCw size={12} className="spin-animate" /> Pinging
                              </span>
                            ) : c.working === true ? (
                              <span style={{ color: "#22c55e", fontWeight: "500" }}>Online ({c.latency ?? 100}ms)</span>
                            ) : c.working === false ? (
                              <span style={{ color: "#ef4444" }}>Offline</span>
                            ) : (
                              <span style={{ color: "var(--text-muted)" }}>Untested</span>
                            )}
                          </td>
                          <td style={{ padding: "12px 16px", maxWidth: "250px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontFamily: "monospace", color: "var(--text-muted)", fontSize: "0.75rem" }} title={c.url}>
                            {c.url}
                          </td>
                          <td style={{ padding: "12px 16px", textAlign: "right" }}>
                            <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
                              <button
                                onClick={() => checkSingleStream(c.originalIndex)}
                                style={{ background: "transparent", border: "1px solid rgba(255,255,255,0.08)", color: "var(--accent)", padding: "4px 8px", borderRadius: "3px", cursor: "pointer", fontSize: "0.7rem" }}
                                title="Ping Check"
                              >
                                Test
                              </button>
                              <button
                                onClick={() => moveChannel(c.originalIndex, -1)}
                                disabled={c.originalIndex === 0}
                                style={{ background: "transparent", border: "1px solid rgba(255,255,255,0.08)", color: "#fff", padding: "4px", borderRadius: "3px", cursor: "pointer" }}
                                title="Move Up"
                              >
                                <ArrowUp size={12} />
                              </button>
                              <button
                                onClick={() => moveChannel(c.originalIndex, 1)}
                                disabled={c.originalIndex === rawChannels.length - 1}
                                style={{ background: "transparent", border: "1px solid rgba(255,255,255,0.08)", color: "#fff", padding: "4px", borderRadius: "3px", cursor: "pointer" }}
                                title="Move Down"
                              >
                                <ArrowDown size={12} />
                              </button>
                              <button
                                onClick={() => openModal("EDIT", c.originalIndex)}
                                style={{ background: "transparent", border: "1px solid rgba(255,255,255,0.08)", color: "var(--accent)", padding: "4px", borderRadius: "3px", cursor: "pointer" }}
                                title="Edit metadata"
                              >
                                <Edit2 size={12} />
                              </button>
                              <button
                                onClick={() => handleDeleteChannel(c.originalIndex)}
                                style={{ background: "transparent", border: "1px solid rgba(255,68,68,0.15)", color: "#ef4444", padding: "4px", borderRadius: "3px", cursor: "pointer" }}
                                title="Delete Channel"
                              >
                                <Trash2 size={12} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={6} style={{ padding: "30px", textAlign: "center", color: "var(--text-muted)" }}>
                          No channels matched your filters.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        )}

        {/* Tab 3: EPG Playlist Importer & Harvester */}
        {activeTab === "IMPORT" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "25px" }}>
            
            {/* Input Config Form */}
            <div style={{ background: "var(--bg-panel-strong)", border: "1px solid var(--border-accent)", borderRadius: "4px", padding: "20px", display: "flex", flexDirection: "column", gap: "15px" }}>
              <div style={{ fontSize: "0.85rem", color: "var(--accent)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Load M3U Playlist Source</div>
              
              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                <label style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>Playlist URL (e.g. Samsung / LG Channels / custom M3U link)</label>
                <input
                  type="text"
                  placeholder="https://example.com/playlist.m3u"
                  value={m3uUrl}
                  onChange={(e) => setM3uUrl(e.target.value)}
                  style={{ background: "#000", border: "1px solid var(--border-accent)", borderRadius: "3px", color: "#fff", padding: "8px 12px", fontSize: "0.8rem" }}
                />
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                <label style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>Or Paste M3U Raw Text</label>
                <textarea
                  rows={4}
                  placeholder="#EXTM3U&#10;#EXTINF:-1 ,TNT Sports&#10;http://example.com/live.m3u8"
                  value={m3uText}
                  onChange={(e) => setM3uText(e.target.value)}
                  style={{ background: "#000", border: "1px solid var(--border-accent)", borderRadius: "3px", color: "#fff", padding: "8px 12px", fontSize: "0.8rem", fontFamily: "monospace", resize: "vertical" }}
                />
              </div>

              <button
                onClick={handleScanM3U}
                disabled={isHarvesting}
                style={{ background: "var(--accent)", border: "none", color: "var(--bg-obsidian)", padding: "10px 20px", borderRadius: "3px", fontSize: "0.82rem", cursor: "pointer", fontWeight: "bold", display: "flex", alignItems: "center", justifyContent: "center", gap: "6px" }}
              >
                <Download size={14} className={isHarvesting ? "spin-animate" : ""} />
                {isHarvesting ? "Scanning & Validating..." : "Fetch & Scan Sports Channels"}
              </button>
            </div>

            {/* Candidates Result List */}
            {harvested.length > 0 && (
              <div style={{ background: "var(--bg-panel-strong)", border: "1px solid var(--border-accent)", borderRadius: "4px", padding: "20px", display: "flex", flexDirection: "column", gap: "15px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid rgba(255,255,255,0.06)", paddingBottom: "10px" }}>
                  <div>
                    <h4 style={{ fontSize: "0.9rem", color: "#fff", margin: 0 }}>Scan Results</h4>
                    <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", margin: "4px 0 0 0" }}>Found {harvested.length} verified ONLINE sports channels. Check to import.</p>
                  </div>
                  
                  <div style={{ display: "flex", gap: "10px" }}>
                    <button
                      onClick={() => {
                        const all: Record<number, boolean> = {};
                        harvested.forEach((_, idx) => all[idx] = true);
                        setSelectedToImport(all);
                      }}
                      style={{ background: "transparent", border: "1px solid var(--border-accent)", color: "#fff", padding: "6px 12px", borderRadius: "3px", fontSize: "0.75rem", cursor: "pointer" }}
                    >
                      Select All
                    </button>
                    <button
                      onClick={handleImportSelected}
                      style={{ background: "var(--accent)", border: "none", color: "var(--bg-obsidian)", padding: "6px 12px", borderRadius: "3px", fontSize: "0.75rem", cursor: "pointer", fontWeight: "bold" }}
                    >
                      Import Checked Channels
                    </button>
                  </div>
                </div>

                <div style={{ maxHeight: "300px", overflowY: "auto", display: "flex", flexDirection: "column", gap: "10px" }} className="matches-scrollable">
                  {harvested.map((h, idx) => (
                    <div key={idx} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px", background: "rgba(255,255,255,0.01)", border: "1px solid rgba(255,255,255,0.04)", borderRadius: "3px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                        <input
                          type="checkbox"
                          checked={!!selectedToImport[idx]}
                          onChange={(e) => {
                            setSelectedToImport(prev => ({ ...prev, [idx]: e.target.checked }));
                          }}
                          style={{ accentColor: "var(--accent)", cursor: "pointer" }}
                        />
                        <div>
                          <span style={{ fontSize: "0.85rem", color: "#fff", fontWeight: "bold" }}>{h.name}</span>
                          <div style={{ fontSize: "0.7rem", color: "var(--text-muted)", marginTop: "2px", fontFamily: "monospace" }}>{h.url}</div>
                        </div>
                      </div>
                      <span style={{ color: "#22c55e", fontSize: "0.7rem", fontWeight: "bold" }}>Online</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

          </div>
        )}

        {/* Tab 4: Platform Config Settings */}
        {activeTab === "SETTINGS" && (
          <form onSubmit={handleSaveSettings} style={{ background: "var(--bg-panel-strong)", border: "1px solid var(--border-accent)", borderRadius: "4px", padding: "24px", display: "flex", flexDirection: "column", gap: "20px" }}>
            <div style={{ fontSize: "0.85rem", color: "var(--accent)", textTransform: "uppercase", letterSpacing: "0.05em", borderBottom: "1px solid rgba(255, 255, 255, 0.06)", paddingBottom: "10px" }}>Platform Tuning Variables</div>
            
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }} className="match-pitch-stats-grid">
              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                <label style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>Playlist Cache TTL (seconds)</label>
                <input
                  type="number"
                  value={settings.cacheTtl / 1000}
                  onChange={(e) => setSettings(prev => ({ ...prev, cacheTtl: parseInt(e.target.value) * 1000 }))}
                  style={{ background: "#000", border: "1px solid var(--border-accent)", borderRadius: "3px", color: "#fff", padding: "8px 12px", fontSize: "0.8rem" }}
                />
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                <label style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>Stream Check Timeout (milliseconds)</label>
                <input
                  type="number"
                  value={settings.checkTimeout}
                  onChange={(e) => setSettings(prev => ({ ...prev, checkTimeout: parseInt(e.target.value) }))}
                  style={{ background: "#000", border: "1px solid var(--border-accent)", borderRadius: "3px", color: "#fff", padding: "8px 12px", fontSize: "0.8rem" }}
                />
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }} className="match-pitch-stats-grid">
              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                <label style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>Playlist File Name</label>
                <input
                  type="text"
                  value={settings.playlistFile || ""}
                  onChange={(e) => setSettings(prev => ({ ...prev, playlistFile: e.target.value }))}
                  style={{ background: "#000", border: "1px solid var(--border-accent)", borderRadius: "3px", color: "#fff", padding: "8px 12px", fontSize: "0.8rem" }}
                />
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                <label style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>ESPN Live Scoreboard API URL</label>
                <input
                  type="text"
                  value={settings.scoreboardUrl || ""}
                  onChange={(e) => setSettings(prev => ({ ...prev, scoreboardUrl: e.target.value }))}
                  style={{ background: "#000", border: "1px solid var(--border-accent)", borderRadius: "3px", color: "#fff", padding: "8px 12px", fontSize: "0.8rem" }}
                />
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }} className="match-pitch-stats-grid">
              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                <label style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>EPG Show Block Duration (minutes)</label>
                <input
                  type="number"
                  value={settings.epgDurationMinutes || 120}
                  onChange={(e) => setSettings(prev => ({ ...prev, epgDurationMinutes: parseInt(e.target.value) }))}
                  style={{ background: "#000", border: "1px solid var(--border-accent)", borderRadius: "3px", color: "#fff", padding: "8px 12px", fontSize: "0.8rem" }}
                />
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                <label style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>EPG Show Total Blocks Count</label>
                <input
                  type="number"
                  value={settings.epgBlocksCount || 12}
                  onChange={(e) => setSettings(prev => ({ ...prev, epgBlocksCount: parseInt(e.target.value) }))}
                  style={{ background: "#000", border: "1px solid var(--border-accent)", borderRadius: "3px", color: "#fff", padding: "8px 12px", fontSize: "0.8rem" }}
                />
              </div>
            </div>

            <div style={{ fontSize: "0.85rem", color: "var(--accent)", textTransform: "uppercase", letterSpacing: "0.05em", borderBottom: "1px solid rgba(255, 255, 255, 0.06)", paddingBottom: "10px", marginTop: "10px" }}>AI Integration (OpenRouter & Groq)</div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }} className="match-pitch-stats-grid">
              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                <label style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>OpenRouter API Key (Primary)</label>
                <input
                  type="password"
                  placeholder="sk-or-..."
                  value={settings.openRouterApiKey || ""}
                  onChange={(e) => setSettings(prev => ({ ...prev, openRouterApiKey: e.target.value }))}
                  style={{ background: "#000", border: "1px solid var(--border-accent)", borderRadius: "3px", color: "#fff", padding: "8px 12px", fontSize: "0.8rem" }}
                />
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                <label style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>Groq API Key (Fallback)</label>
                <input
                  type="password"
                  placeholder="gsk_..."
                  value={settings.groqApiKey || ""}
                  onChange={(e) => setSettings(prev => ({ ...prev, groqApiKey: e.target.value }))}
                  style={{ background: "#000", border: "1px solid var(--border-accent)", borderRadius: "3px", color: "#fff", padding: "8px 12px", fontSize: "0.8rem" }}
                />
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }} className="match-pitch-stats-grid">
              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                <label style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>AI Director Auto-Switch</label>
                <select
                  value={settings.aiDirectorEnabled ? "true" : "false"}
                  onChange={(e) => setSettings(prev => ({ ...prev, aiDirectorEnabled: e.target.value === "true" }))}
                  style={{ background: "#000", border: "1px solid var(--border-accent)", color: "#fff", padding: "8px 12px", fontSize: "0.8rem", borderRadius: "3px" }}
                >
                  <option value="true">Enabled (Auto-switches to live matches)</option>
                  <option value="false">Disabled (Manual only)</option>
                </select>
              </div>
            </div>

            {/* Priority Rules */}
            <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginTop: "10px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: "0.8rem", color: "var(--accent)" }}>Forced Priority Channel Ordering Rules</span>
                <button
                  type="button"
                  onClick={handleAddRule}
                  style={{ background: "transparent", border: "1px solid var(--border-accent)", color: "var(--accent)", padding: "4px 10px", borderRadius: "3px", fontSize: "0.75rem", cursor: "pointer" }}
                >
                  + Add Rule
                </button>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                {settings.priorityRules?.map((rule, idx) => (
                  <div key={idx} style={{ display: "grid", gridTemplateColumns: "1fr 1fr 40px", gap: "15px", alignItems: "center" }} className="match-lineups-grid">
                    <input
                      type="text"
                      placeholder="Channel Name (e.g. DSports)"
                      value={rule.name}
                      onChange={(e) => handleRuleChange(idx, "name", e.target.value)}
                      style={{ background: "#000", border: "1px solid var(--border-accent)", borderRadius: "3px", color: "#fff", padding: "8px 12px", fontSize: "0.8rem" }}
                    />
                    <input
                      type="text"
                      placeholder="URL Contains (e.g. A008)"
                      value={rule.urlContains}
                      onChange={(e) => handleRuleChange(idx, "urlContains", e.target.value)}
                      style={{ background: "#000", border: "1px solid var(--border-accent)", borderRadius: "3px", color: "#fff", padding: "8px 12px", fontSize: "0.8rem" }}
                    />
                    <button
                      type="button"
                      onClick={() => handleRemoveRule(idx)}
                      style={{ background: "rgba(255,68,68,0.1)", border: "1px solid rgba(255,68,68,0.2)", color: "#ef4444", height: "34px", borderRadius: "3px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* RSS News Feeds */}
            <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginTop: "10px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: "0.8rem", color: "var(--accent)" }}>Sports Newsroom RSS Feeds</span>
                <button
                  type="button"
                  onClick={handleAddRssFeed}
                  style={{ background: "transparent", border: "1px solid var(--border-accent)", color: "var(--accent)", padding: "4px 10px", borderRadius: "3px", fontSize: "0.75rem", cursor: "pointer" }}
                >
                  + Add RSS Feed
                </button>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                {settings.rssFeeds?.map((feed, idx) => (
                  <div key={idx} style={{ display: "grid", gridTemplateColumns: "1fr 1fr 40px", gap: "15px", alignItems: "center" }} className="match-lineups-grid">
                    <input
                      type="text"
                      placeholder="Feed Name (e.g. BBC Sport)"
                      value={feed.name}
                      onChange={(e) => handleRssFeedChange(idx, "name", e.target.value)}
                      style={{ background: "#000", border: "1px solid var(--border-accent)", borderRadius: "3px", color: "#fff", padding: "8px 12px", fontSize: "0.8rem" }}
                    />
                    <input
                      type="text"
                      placeholder="RSS XML URL (https://...)"
                      value={feed.url}
                      onChange={(e) => handleRssFeedChange(idx, "url", e.target.value)}
                      style={{ background: "#000", border: "1px solid var(--border-accent)", borderRadius: "3px", color: "#fff", padding: "8px 12px", fontSize: "0.8rem" }}
                    />
                    <button
                      type="button"
                      onClick={() => handleRemoveRssFeed(idx)}
                      style={{ background: "rgba(255,68,68,0.1)", border: "1px solid rgba(255,68,68,0.2)", color: "#ef4444", height: "34px", borderRadius: "3px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <button
              type="submit"
              disabled={isSavingSettings}
              style={{ background: "var(--accent)", border: "none", color: "var(--bg-obsidian)", padding: "10px 20px", borderRadius: "3px", fontSize: "0.82rem", cursor: "pointer", fontWeight: "bold", display: "flex", alignItems: "center", justifyContent: "center", gap: "6px", width: "160px", marginTop: "10px" }}
            >
              <Save size={14} className={isSavingSettings ? "spin-animate" : ""} />
              Save Settings
            </button>
          </form>
        )}

        {/* Tab 5: Real-time Diagnostics Logs */}
        {activeTab === "LOGS" && (
          <div style={{ background: "#000", border: "1px solid var(--border-accent)", borderRadius: "4px", padding: "20px", display: "flex", flexDirection: "column", gap: "12px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid rgba(255,255,255,0.06)", paddingBottom: "10px" }}>
              <div style={{ fontSize: "0.85rem", color: "var(--accent)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Validation Diagnostics Logger</div>
              <button
                onClick={() => setLogs([])}
                style={{ background: "transparent", border: "1px solid var(--border-accent)", color: "var(--text-muted)", padding: "4px 10px", borderRadius: "3px", fontSize: "0.75rem", cursor: "pointer" }}
              >
                Clear Log Console
              </button>
            </div>
            
            <div style={{ height: "300px", overflowY: "auto", background: "rgba(255,255,255,0.01)", border: "1px solid rgba(255,255,255,0.03)", borderRadius: "3px", padding: "15px", fontFamily: "monospace", fontSize: "0.75rem", color: "var(--accent)", display: "flex", flexDirection: "column", gap: "6px", overflowX: "hidden" }} className="matches-scrollable">
              {logs.map((log, idx) => (
                <div key={idx} style={{ wordBreak: "break-all", whiteSpace: "pre-wrap" }}>{log}</div>
              ))}
            </div>
          </div>
        )}

        {/* Modal: Add / Edit Channel metadata */}
        {isModalOpen && (
          <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.8)", backdropFilter: "blur(15px)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <div style={{ background: "var(--bg-panel-strong)", border: "1px solid var(--border-accent)", borderRadius: "4px", padding: "25px", width: "100%", maxWidth: "450px", display: "flex", flexDirection: "column", gap: "15px" }}>
              <h3 style={{ fontSize: "1.1rem", color: "#fff", margin: 0, borderBottom: "1px solid rgba(255,255,255,0.06)", paddingBottom: "10px" }}>
                {modalMode === "ADD" ? "Add New Channel Metadata" : "Edit Channel Metadata"}
              </h3>

              <form onSubmit={handleSaveModal} style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                  <label style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>Channel Name</label>
                  <input
                    type="text"
                    required
                    value={modalForm.name}
                    onChange={(e) => setModalForm(prev => ({ ...prev, name: e.target.value }))}
                    style={{ background: "#000", border: "1px solid var(--border-accent)", borderRadius: "3px", color: "#fff", padding: "8px 12px", fontSize: "0.8rem" }}
                  />
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                  <label style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>Stream URL (HLS / m3u8)</label>
                  <input
                    type="text"
                    required
                    value={modalForm.url}
                    onChange={(e) => setModalForm(prev => ({ ...prev, url: e.target.value }))}
                    style={{ background: "#000", border: "1px solid var(--border-accent)", borderRadius: "3px", color: "#fff", padding: "8px 12px", fontSize: "0.8rem" }}
                  />
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                  <label style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>Group Category</label>
                  <input
                    type="text"
                    required
                    value={modalForm.group}
                    onChange={(e) => setModalForm(prev => ({ ...prev, group: e.target.value }))}
                    style={{ background: "#000", border: "1px solid var(--border-accent)", borderRadius: "3px", color: "#fff", padding: "8px 12px", fontSize: "0.8rem" }}
                  />
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                  <label style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>Logo URL (Optional)</label>
                  <input
                    type="text"
                    value={modalForm.logo}
                    onChange={(e) => setModalForm(prev => ({ ...prev, logo: e.target.value }))}
                    style={{ background: "#000", border: "1px solid var(--border-accent)", borderRadius: "3px", color: "#fff", padding: "8px 12px", fontSize: "0.8rem" }}
                  />
                </div>

                <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end", marginTop: "10px" }}>
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    style={{ background: "transparent", border: "1px solid var(--border-accent)", color: "#fff", padding: "8px 16px", borderRadius: "3px", fontSize: "0.8rem", cursor: "pointer" }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    style={{ background: "var(--accent)", border: "none", color: "var(--bg-obsidian)", padding: "8px 16px", borderRadius: "3px", fontSize: "0.8rem", cursor: "pointer", fontWeight: "bold" }}
                  >
                    Confirm & Apply
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

      </div>
    </DashboardLayout>
  );
}
