"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Shield, Key, User, Lock, RefreshCw, AlertCircle } from "lucide-react";

export function LoginClientPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password })
      });

      const data = await res.json();
      setIsLoading(false);

      if (res.ok && data.success) {
        // Redirect to admin panel and refresh session
        router.push("/admin");
        router.refresh();
      } else {
        setError(data.error || "Invalid username or password");
      }
    } catch (err: any) {
      setIsLoading(false);
      setError("Server connection failed. Please try again.");
    }
  };

  return (
    <div style={{
      minHeight: "100vh",
      background: "radial-gradient(circle at center, #111 0%, #050505 100%)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: "20px",
      fontFamily: "var(--font-outfit), sans-serif",
      position: "relative",
      overflow: "hidden"
    }}>
      {/* Dynamic CSS styles for animations and focus indicators */}
      <style dangerouslySetInnerHTML={{ __html: `
        .login-input-focus:focus {
          border-color: var(--accent) !important;
          box-shadow: 0 0 10px rgba(197, 168, 92, 0.25) !important;
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        .spin-animate {
          animation: spin 1s linear infinite;
        }
      `}} />

      {/* Decorative ambient glowing backdrops */}
      <div style={{
        position: "absolute",
        width: "500px",
        height: "500px",
        background: "radial-gradient(circle, rgba(197,168,92,0.03) 0%, transparent 70%)",
        top: "50%",
        left: "50%",
        transform: "translate(-50%, -50%)",
        zIndex: 1,
        pointerEvents: "none"
      }} />

      <div style={{
        width: "100%",
        maxWidth: "400px",
        background: "var(--bg-panel-strong, #0d0d0d)",
        border: "1px solid var(--border-accent, rgba(197, 168, 92, 0.15))",
        boxShadow: "0 10px 40px rgba(0, 0, 0, 0.8), 0 0 20px rgba(197, 168, 92, 0.05)",
        borderRadius: "4px",
        padding: "35px 30px",
        position: "relative",
        zIndex: 2
      }}>
        
        {/* Luxury gold top beam decoration */}
        <div style={{
          position: "absolute",
          top: 0,
          left: "20px",
          right: "20px",
          height: "2px",
          background: "linear-gradient(90deg, transparent, var(--accent), transparent)"
        }} />

        {/* Center Panel Title */}
        <div style={{ textAlign: "center", marginBottom: "30px" }}>
          <div style={{
            width: "50px",
            height: "50px",
            borderRadius: "50%",
            background: "rgba(197, 168, 92, 0.04)",
            border: "1px solid var(--accent)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto 15px",
            boxShadow: "0 0 15px rgba(197, 168, 92, 0.15)"
          }}>
            <Shield size={22} style={{ color: "var(--accent)" }} />
          </div>
          <h2 style={{
            fontSize: "1.35rem",
            color: "#fff",
            fontFamily: "var(--font-marcellus), serif",
            textTransform: "uppercase",
            letterSpacing: "0.12em",
            margin: "0 0 8px 0"
          }}>
            Broadcast Control
          </h2>
          <p style={{
            fontSize: "0.72rem",
            color: "var(--text-muted)",
            margin: 0,
            textTransform: "uppercase",
            letterSpacing: "0.06em"
          }}>
            NASA Grade Secure Gateway
          </p>
        </div>

        {/* Error Alert Box */}
        {error && (
          <div style={{
            display: "flex",
            alignItems: "center",
            gap: "10px",
            background: "rgba(239, 68, 68, 0.06)",
            border: "1px solid rgba(239, 68, 68, 0.25)",
            borderRadius: "3px",
            padding: "12px 14px",
            marginBottom: "20px",
            color: "#ef4444",
            fontSize: "0.8rem"
          }}>
            <AlertCircle size={15} style={{ flexShrink: 0 }} />
            <span>{error}</span>
          </div>
        )}

        {/* Credentials Form */}
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          
          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            <label style={{
              fontSize: "0.7rem",
              color: "var(--text-muted)",
              textTransform: "uppercase",
              letterSpacing: "0.08em"
            }}>
              Administrator ID
            </label>
            <div style={{ position: "relative" }}>
              <User size={14} style={{
                position: "absolute",
                left: "12px",
                top: "12px",
                color: "var(--text-muted)"
              }} />
              <input
                type="text"
                required
                placeholder="Enter username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                style={{
                  width: "100%",
                  background: "#000",
                  border: "1px solid rgba(255, 255, 255, 0.08)",
                  borderRadius: "3px",
                  color: "#fff",
                  padding: "10px 12px 10px 34px",
                  fontSize: "0.82rem",
                  outline: "none",
                  transition: "all 0.25s ease"
                }}
                className="login-input-focus"
              />
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            <label style={{
              fontSize: "0.7rem",
              color: "var(--text-muted)",
              textTransform: "uppercase",
              letterSpacing: "0.08em"
            }}>
              Secure Password
            </label>
            <div style={{ position: "relative" }}>
              <Lock size={14} style={{
                position: "absolute",
                left: "12px",
                top: "12px",
                color: "var(--text-muted)"
              }} />
              <input
                type="password"
                required
                placeholder="Enter password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{
                  width: "100%",
                  background: "#000",
                  border: "1px solid rgba(255, 255, 255, 0.08)",
                  borderRadius: "3px",
                  color: "#fff",
                  padding: "10px 12px 10px 34px",
                  fontSize: "0.82rem",
                  outline: "none",
                  transition: "all 0.25s ease"
                }}
                className="login-input-focus"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            style={{
              background: "var(--accent)",
              border: "none",
              color: "var(--bg-obsidian, #050505)",
              padding: "12px 20px",
              borderRadius: "3px",
              fontSize: "0.82rem",
              fontWeight: "bold",
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              cursor: "pointer",
              transition: "all 0.25s ease",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px",
              marginTop: "10px",
              boxShadow: "0 0 10px rgba(197, 168, 92, 0.15)"
            }}
          >
            {isLoading ? (
              <>
                <RefreshCw size={14} className="spin-animate" />
                Establishing Session
              </>
            ) : (
              <>
                <Key size={14} />
                Access Console
              </>
            )}
          </button>

        </form>

      </div>
    </div>
  );
}
