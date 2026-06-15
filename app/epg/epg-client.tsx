"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { Search, Clock, Play, Info } from "lucide-react";
import { Channel, EPGItem } from "@/lib/playlist";
import { DashboardLayout } from "@/components/dashboard-layout";

type EpgClientPageProps = {
  channels: Channel[];
};

export function EpgClientPage({ channels }: EpgClientPageProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeGroup, setActiveGroup] = useState("All");
  const [selectedProgram, setSelectedProgram] = useState<{
    channel: Channel;
    program: EPGItem;
    timeSlot: string;
  } | null>(null);

  // Group tabs list
  const groups = useMemo(() => {
    const counts = channels.reduce<Record<string, number>>((acc, channel) => {
      acc[channel.group] = (acc[channel.group] ?? 0) + 1;
      return acc;
    }, {});
    return [
      ["All", channels.length] as const,
      ...Object.entries(counts).sort((a, b) => b[1] - a[1])
    ];
  }, [channels]);

  // Filter channels
  const filteredChannels = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return channels.filter((c) => {
      const matchGroup = activeGroup === "All" || c.group === activeGroup;
      const matchSearch = !q || c.name.toLowerCase().includes(q) || c.group.toLowerCase().includes(q);
      return matchGroup && matchSearch;
    });
  }, [channels, activeGroup, searchQuery]);

  // Compute active program index based on current time
  const currentProgramIndex = useMemo(() => {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
    const msPassed = now.getTime() - startOfToday.getTime();
    const hrsPassed = msPassed / (1000 * 60 * 60);
    return Math.min(11, Math.floor(hrsPassed / 2));
  }, []);

  const formatEPGTime = (blockIdx: number) => {
    const startHour = blockIdx * 2;
    const format = (h: number) => `${h.toString().padStart(2, "0")}:00`;
    return `${format(startHour)} - ${format(startHour + 2)}`;
  };

  // Set default selected program to first channel's current program on mount
  React.useEffect(() => {
    if (channels[0] && channels[0].epg[currentProgramIndex]) {
      setSelectedProgram({
        channel: channels[0],
        program: channels[0].epg[currentProgramIndex],
        timeSlot: formatEPGTime(currentProgramIndex)
      });
    }
  }, [channels, currentProgramIndex]);

  return (
    <DashboardLayout channels={channels}>
      <div className="epg-main-grid">
        
        {/* Left Column: Interactive EPG Schedule Timeline */}
        <section style={{ display: "flex", flexDirection: "column", gap: "20px", overflow: "hidden" }}>
          
          {/* Header Filters */}
          <div style={{ display: "flex", gap: "15px", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between" }}>
            {/* Search */}
            <div className="search-container" style={{ margin: 0, width: "300px" }}>
              <Search size={18} className="search-icon-svg" />
              <input
                type="text"
                placeholder="Search TV Guide..."
                className="search-input"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            {/* Badges */}
            <div className="groups-container" style={{ margin: 0, border: "none", padding: 0 }}>
              {groups.slice(0, 5).map(([groupName, count]) => (
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

          {/* Timetable Header Grid */}
          <div style={{ display: "grid", gridTemplateColumns: "150px 1fr", borderBottom: "1px solid var(--border-accent)", paddingBottom: "10px", paddingRight: "5px" }}>
            <div style={{ fontSize: "0.8rem", color: "var(--accent)" }}>CHANNELS</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(12, minmax(100px, 1fr))", gap: "10px", overflowX: "auto", scrollbarWidth: "none" }} className="epg-hours-header">
              {Array.from({ length: 12 }).map((_, idx) => (
                <div key={idx} style={{ fontSize: "0.75rem", color: "var(--text-muted)", textAlign: "center" }}>
                  {formatEPGTime(idx).split(" - ")[0]}
                </div>
              ))}
            </div>
          </div>

          {/* Channels EPG Rows Scroll Container */}
          <div style={{ display: "flex", flexDirection: "column", gap: "15px", overflowY: "auto", flexGrow: 1 }} className="epg-rows-scrollable">
            {filteredChannels.length > 0 ? (
              filteredChannels.map((channel) => (
                <div key={channel.id} style={{ display: "grid", gridTemplateColumns: "150px 1fr", alignItems: "center", background: "rgba(10, 11, 14, 0.3)", border: "1px solid var(--border-muted)", borderRadius: "4px", padding: "10px 0" }}>
                  
                  {/* Left Side: Channel Badge */}
                  <div style={{ padding: "0 15px", borderRight: "1px solid var(--border-muted)", display: "flex", flexDirection: "column", gap: "2px" }}>
                    <div style={{ fontSize: "0.85rem", color: "var(--text-primary)", fontWeight: "bold", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {channel.name}
                    </div>
                    <div style={{ fontSize: "0.7rem", color: "var(--accent)" }}>
                      CH {channel.number.toString().padStart(3, "0")}
                    </div>
                  </div>

                  {/* Right Side: Horizontal timeline of 2hr programs */}
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(12, minmax(120px, 1fr))", gap: "8px", padding: "0 10px", overflowX: "auto" }}>
                    {channel.epg.map((prog, idx) => {
                      const isActive = currentProgramIndex === idx;
                      const isSelected = selectedProgram?.program.id === prog.id;
                      
                      return (
                        <div
                          key={prog.id}
                          onClick={() => setSelectedProgram({
                            channel,
                            program: prog,
                            timeSlot: formatEPGTime(idx)
                          })}
                          style={{
                            padding: "8px 12px",
                            background: isSelected 
                              ? "rgba(197, 168, 92, 0.15)" 
                              : isActive 
                                ? "rgba(255, 255, 255, 0.05)" 
                                : "rgba(0,0,0,0.2)",
                            border: isSelected
                              ? "1px solid var(--accent)"
                              : isActive
                                ? "1px solid var(--border-accent-strong)"
                                : "1px solid var(--border-muted)",
                            borderRadius: "3px",
                            cursor: "pointer",
                            transition: "all 0.2s ease"
                          }}
                        >
                          <div style={{ fontSize: "0.75rem", color: isActive ? "var(--accent)" : "var(--text-primary)", fontWeight: isActive ? "bold" : "normal", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                            {prog.title}
                          </div>
                          <div style={{ fontSize: "0.65rem", color: "var(--text-muted)", marginTop: "3px", display: "flex", alignItems: "center", gap: "4px" }}>
                            <Clock size={10} />
                            {formatEPGTime(idx).split(" - ")[0]}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                </div>
              ))
            ) : (
              <div style={{ textAlign: "center", padding: "40px", color: "var(--text-muted)" }}>
                No channels found.
              </div>
            )}
          </div>

        </section>

        {/* Right Column: Highlighted Program Details */}
        <aside style={{ background: "var(--bg-panel-strong)", border: "1px solid var(--border-accent)", borderRadius: "4px", padding: "24px", display: "flex", flexDirection: "column", justifyContent: "space-between" }} className="epg-details-sidebar">
          {selectedProgram ? (
            <>
              <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
                <div style={{ borderBottom: "1px solid var(--border-accent)", paddingBottom: "15px" }}>
                  <div style={{ fontSize: "0.75rem", color: "var(--accent)", textTransform: "uppercase", letterSpacing: "0.1em" }}>
                    Selected Program
                  </div>
                  <h3 style={{ fontSize: "1.4rem", color: "var(--text-primary)", margin: "8px 0 4px 0", lineHeight: "1.2" }}>
                    {selectedProgram.program.title}
                  </h3>
                  <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", display: "flex", alignItems: "center", gap: "6px", marginTop: "10px" }}>
                    <Clock size={14} style={{ color: "var(--accent)" }} />
                    <span>{selectedProgram.timeSlot}</span>
                    <span>({selectedProgram.program.durationMinutes} mins)</span>
                  </div>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                  <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", textTransform: "uppercase" }}>Description</div>
                  <p style={{ fontSize: "0.85rem", color: "var(--text-primary)", lineHeight: "1.6", whiteSpace: "pre-line" }}>
                    {selectedProgram.program.description}
                  </p>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "10px", background: "rgba(0,0,0,0.3)", padding: "15px", borderRadius: "4px", border: "1px solid var(--border-muted)", marginTop: "10px" }}>
                  <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>Channel Info</div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: "0.85rem", color: "#fff", fontWeight: "bold" }}>{selectedProgram.channel.name}</span>
                    <span style={{ fontSize: "0.75rem", color: "var(--accent)", border: "1px solid var(--border-accent)", padding: "2px 6px", borderRadius: "2px" }}>
                      CH {selectedProgram.channel.number.toString().padStart(3, "0")}
                    </span>
                  </div>
                  <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", display: "flex", justifyContent: "space-between" }}>
                    <span>Category: {selectedProgram.channel.group}</span>
                    <span>Quality: {selectedProgram.channel.quality}</span>
                  </div>
                </div>
              </div>

              <Link
                href={`/?channel=${selectedProgram.channel.id}`}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "10px",
                  background: "var(--accent)",
                  color: "#000",
                  border: "none",
                  padding: "14px",
                  borderRadius: "4px",
                  cursor: "pointer",
                  fontWeight: "bold",
                  textDecoration: "none",
                  fontSize: "0.85rem",
                  transition: "all 0.25s ease",
                  textAlign: "center"
                }}
                className="epg-action-btn"
              >
                <Play size={16} fill="currentColor" />
                WATCH LIVE CHANNEL
              </Link>
            </>
          ) : (
            <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-muted)", fontSize: "0.85rem", textAlign: "center" }}>
              <Info size={24} style={{ marginBottom: "10px", color: "var(--accent)" }} /><br />
              Select a timetable slot program to view details.
            </div>
          )}
        </aside>

      </div>
    </DashboardLayout>
  );
}
