"use client";

import React, { useEffect, useState } from "react";
import { Sliders, Settings as SettingsIcon, Sun, Award, Radio, RefreshCw, Volume2, Shield } from "lucide-react";
import { Channel } from "@/lib/playlist";
import { DashboardLayout } from "@/components/dashboard-layout";

type SettingsClientPageProps = {
  channels: Channel[];
};

const storageKeys = {
  theme: "emjsports:theme",
  buffer: "emjsports:buffer",
  brightness: "emjsports:brightness",
  contrast: "emjsports:contrast",
  saturation: "emjsports:saturation",
  goldTint: "emjsports:goldTint"
};

export function SettingsClientPage({ channels }: SettingsClientPageProps) {
  // Theme & Buffer states
  const [activeTheme, setActiveTheme] = useState<"gold" | "platinum">("gold");
  const [bufferDelay, setBufferDelay] = useState(5);
  
  // Tuner states
  const [brightness, setBrightness] = useState(100);
  const [contrast, setContrast] = useState(100);
  const [saturation, setSaturation] = useState(100);
  const [goldTint, setGoldTint] = useState(0);

  // Sync settings on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        const th = localStorage.getItem(storageKeys.theme);
        if (th === "platinum" || th === "gold") setActiveTheme(th);
        
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
        console.error("Settings load error:", e);
      }
    }
  }, []);

  const saveTheme = (theme: "gold" | "platinum") => {
    setActiveTheme(theme);
    localStorage.setItem(storageKeys.theme, theme);
    // Dispatch standard storage event to update other pages instantly
    window.dispatchEvent(new Event("storage"));
  };

  const saveBuffer = (val: number) => {
    setBufferDelay(val);
    localStorage.setItem(storageKeys.buffer, val.toString());
  };

  const saveTuner = (key: string, val: number, setter: React.Dispatch<React.SetStateAction<number>>) => {
    setter(val);
    localStorage.setItem(key, val.toString());
  };

  const resetTuner = () => {
    saveTuner(storageKeys.brightness, 100, setBrightness);
    saveTuner(storageKeys.contrast, 100, setContrast);
    saveTuner(storageKeys.saturation, 100, setSaturation);
    saveTuner(storageKeys.goldTint, 0, setGoldTint);
  };

  return (
    <DashboardLayout channels={channels}>
      <div className="settings-main-grid">
        
        {/* Left Column: Visual Tuner, Themes & Latency buffer */}
        <section style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
          
          {/* Aesthetic Accents Section */}
          <div style={{ background: "var(--bg-panel-strong)", border: "1px solid var(--border-accent)", borderRadius: "4px", padding: "24px", display: "flex", flexDirection: "column", gap: "15px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "0.85rem", color: "var(--accent)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              <Award size={16} />
              <span>Aesthetic Accent Theme</span>
            </div>
            
            <p style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
              Customize the platform accent colors, glowing depth indicators, and visual visualizer tones.
            </p>

            <div style={{ display: "flex", gap: "15px", marginTop: "5px" }}>
              {/* Gold theme */}
              <button
                onClick={() => saveTheme("gold")}
                style={{
                  flex: 1,
                  padding: "16px",
                  background: activeTheme === "gold" ? "rgba(197,168,92,0.1)" : "rgba(0,0,0,0.3)",
                  border: activeTheme === "gold" ? "2px solid #c5a85c" : "1px solid var(--border-muted)",
                  color: activeTheme === "gold" ? "#c5a85c" : "var(--text-muted)",
                  borderRadius: "4px",
                  cursor: "pointer",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: "8px",
                  transition: "all 0.25s ease"
                }}
              >
                <div style={{ width: "20px", height: "20px", borderRadius: "50%", background: "#c5a85c", boxShadow: "0 0 10px rgba(197,168,92,0.6)" }} />
                <span style={{ fontSize: "0.85rem", fontWeight: "bold" }}>CHAMPAGNE GOLD</span>
                <span style={{ fontSize: "0.65rem", opacity: 0.8 }}>Luxury Golden Accent Glow</span>
              </button>

              {/* Platinum theme */}
              <button
                onClick={() => saveTheme("platinum")}
                style={{
                  flex: 1,
                  padding: "16px",
                  background: activeTheme === "platinum" ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.3)",
                  border: activeTheme === "platinum" ? "2px solid #ffffff" : "1px solid var(--border-muted)",
                  color: activeTheme === "platinum" ? "#ffffff" : "var(--text-muted)",
                  borderRadius: "4px",
                  cursor: "pointer",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: "8px",
                  transition: "all 0.25s ease"
                }}
              >
                <div style={{ width: "20px", height: "20px", borderRadius: "50%", background: "#ffffff", boxShadow: "0 0 10px rgba(255,255,255,0.6)" }} />
                <span style={{ fontSize: "0.85rem", fontWeight: "bold" }}>METALLIC PLATINUM</span>
                <span style={{ fontSize: "0.65rem", opacity: 0.8 }}>Sleek Brushed Silver Accents</span>
              </button>
            </div>
          </div>

          {/* Video Broadcast Tuner Filters */}
          <div style={{ background: "var(--bg-panel-strong)", border: "1px solid var(--border-accent)", borderRadius: "4px", padding: "24px", display: "flex", flexDirection: "column", gap: "15px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "0.85rem", color: "var(--accent)", textTransform: "uppercase" }}>
              <Sliders size={16} />
              <span>Video Broadcast Tuner Filters</span>
            </div>
            
            <p style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
              Tune the rendering contrast, brightness values, and sepia gold filters applied to HLS streams.
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginTop: "5px" }}>
              <div className="tuner-row">
                <label style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8rem" }}>
                  <span>Brightness</span>
                  <span style={{ color: "var(--accent)" }}>{brightness}%</span>
                </label>
                <input type="range" min="50" max="150" value={brightness} onChange={(e) => saveTuner(storageKeys.brightness, parseInt(e.target.value), setBrightness)} />
              </div>
              <div className="tuner-row">
                <label style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8rem" }}>
                  <span>Contrast</span>
                  <span style={{ color: "var(--accent)" }}>{contrast}%</span>
                </label>
                <input type="range" min="50" max="150" value={contrast} onChange={(e) => saveTuner(storageKeys.contrast, parseInt(e.target.value), setContrast)} />
              </div>
              <div className="tuner-row">
                <label style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8rem" }}>
                  <span>Saturation</span>
                  <span style={{ color: "var(--accent)" }}>{saturation}%</span>
                </label>
                <input type="range" min="0" max="200" value={saturation} onChange={(e) => saveTuner(storageKeys.saturation, parseInt(e.target.value), setSaturation)} />
              </div>
              <div className="tuner-row">
                <label style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8rem" }}>
                  <span>Gold Beam Tint</span>
                  <span style={{ color: "var(--accent)" }}>{goldTint}%</span>
                </label>
                <input type="range" min="0" max="100" value={goldTint} onChange={(e) => saveTuner(storageKeys.goldTint, parseInt(e.target.value), setGoldTint)} />
              </div>
              
              <button
                onClick={resetTuner}
                style={{
                  background: "transparent",
                  border: "1px solid var(--border-accent)",
                  color: "var(--accent)",
                  padding: "10px",
                  borderRadius: "3px",
                  cursor: "pointer",
                  fontSize: "0.8rem",
                  marginTop: "10px"
                }}
              >
                Reset Tuner Filters
              </button>
            </div>
          </div>

        </section>

        {/* Right Column: Latency Offset tuning & Keyboard Hotkeys */}
        <section style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
          
          {/* Latency buffer delay offset */}
          <div style={{ background: "var(--bg-panel-strong)", border: "1px solid var(--border-accent)", borderRadius: "4px", padding: "24px", display: "flex", flexDirection: "column", gap: "15px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "0.85rem", color: "var(--accent)", textTransform: "uppercase" }}>
              <Radio size={16} />
              <span>HLS Latency Buffer Offset</span>
            </div>
            
            <p style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
              Fine-tune the HLS buffer target length. Lower offsets reduce stream latency. Higher offsets eliminate buffering.
            </p>

            <div style={{ display: "flex", gap: "8px", marginTop: "5px" }}>
              {[2, 5, 10, 15, 30].map((sec) => (
                <button
                  key={sec}
                  onClick={() => saveBuffer(sec)}
                  style={{
                    flex: 1,
                    padding: "12px 0",
                    background: bufferDelay === sec ? "rgba(197,168,92,0.15)" : "rgba(0,0,0,0.3)",
                    border: "1px solid",
                    borderColor: bufferDelay === sec ? "var(--accent)" : "var(--border-muted)",
                    color: bufferDelay === sec ? "var(--accent)" : "var(--text-muted)",
                    borderRadius: "3px",
                    fontSize: "0.78rem",
                    cursor: "pointer",
                    transition: "all 0.25s ease"
                  }}
                >
                  {sec === 2 ? "2s (Low Lat)" : `${sec}s`}
                </button>
              ))}
            </div>
          </div>

          {/* Keyboard Hotkeys cheatsheet */}
          <div style={{ background: "var(--bg-panel-strong)", border: "1px solid var(--border-accent)", borderRadius: "4px", padding: "24px", display: "flex", flexDirection: "column", gap: "15px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "0.85rem", color: "var(--accent)", textTransform: "uppercase" }}>
              <Shield size={16} />
              <span>Keyboard Hotkey Commands</span>
            </div>
            
            <p style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
              Control the live video player directly using standard keyboard commands.
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginTop: "5px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid rgba(255,255,255,0.03)", paddingBottom: "8px", fontSize: "0.8rem" }}>
                <span style={{ color: "var(--text-muted)" }}>Play / Pause</span>
                <kbd style={{ background: "#000", border: "1px solid var(--border-accent)", padding: "2px 8px", borderRadius: "3px", fontSize: "0.75rem", fontFamily: "monospace" }}>Space</kbd>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid rgba(255,255,255,0.03)", paddingBottom: "8px", fontSize: "0.8rem" }}>
                <span style={{ color: "var(--text-muted)" }}>Mute / Unmute Audio</span>
                <kbd style={{ background: "#000", border: "1px solid var(--border-accent)", padding: "2px 8px", borderRadius: "3px", fontSize: "0.75rem", fontFamily: "monospace" }}>M</kbd>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid rgba(255,255,255,0.03)", paddingBottom: "8px", fontSize: "0.8rem" }}>
                <span style={{ color: "var(--text-muted)" }}>Toggle Fullscreen</span>
                <kbd style={{ background: "#000", border: "1px solid var(--border-accent)", padding: "2px 8px", borderRadius: "3px", fontSize: "0.75rem", fontFamily: "monospace" }}>F</kbd>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid rgba(255,255,255,0.03)", paddingBottom: "8px", fontSize: "0.8rem" }}>
                <span style={{ color: "var(--text-muted)" }}>Toggle Stats for Nerds</span>
                <kbd style={{ background: "#000", border: "1px solid var(--border-accent)", padding: "2px 8px", borderRadius: "3px", fontSize: "0.75rem", fontFamily: "monospace" }}>I</kbd>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid rgba(255,255,255,0.03)", paddingBottom: "8px", fontSize: "0.8rem" }}>
                <span style={{ color: "var(--text-muted)" }}>Toggle TV Grid UI Mode</span>
                <kbd style={{ background: "#000", border: "1px solid var(--border-accent)", padding: "2px 8px", borderRadius: "3px", fontSize: "0.75rem", fontFamily: "monospace" }}>T</kbd>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid rgba(255,255,255,0.03)", paddingBottom: "8px", fontSize: "0.8rem" }}>
                <span style={{ color: "var(--text-muted)" }}>Surf Channels Up / Down</span>
                <kbd style={{ background: "#000", border: "1px solid var(--border-accent)", padding: "2px 8px", borderRadius: "3px", fontSize: "0.75rem", fontFamily: "monospace" }}>ArrowUp / ArrowDown</kbd>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", paddingBottom: "8px", fontSize: "0.8rem" }}>
                <span style={{ color: "var(--text-muted)" }}>Volume Level Up / Down</span>
                <kbd style={{ background: "#000", border: "1px solid var(--border-accent)", padding: "2px 8px", borderRadius: "3px", fontSize: "0.75rem", fontFamily: "monospace" }}>ArrowLeft / ArrowRight</kbd>
              </div>
            </div>
          </div>

        </section>

      </div>
    </DashboardLayout>
  );
}
