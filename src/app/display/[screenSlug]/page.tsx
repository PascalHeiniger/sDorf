"use client";

import { useState, useEffect, useRef } from "react";
import { useParams } from "next/navigation";

// Local TypeScript interfaces
interface PlaylistCard {
  id: string;
  contentType: "info_card" | "live_departures";
  title: string;
  mediaUrl?: string;
  body?: {
    headline?: string;
    body?: string;
    footer?: string;
    provider?: string;
    locationName?: string;
  };
  displayDuration: number;
}

interface Departure {
  time: string;
  destination: string;
  line: string;
  platform: string;
  status: string;
}

interface ScreenInfo {
  id: string;
  slug: string;
  publicName: string;
  orientation: "landscape" | "portrait";
}

interface Takeover {
  id: string;
  publicQuestion: string;
  publicAnswer: string;
  questionCategory: string;
}

export default function ScreenPlayer() {
  const { screenSlug } = useParams() as { screenSlug: string };

  const [screen, setScreen] = useState<ScreenInfo | null>(null);
  const [playlist, setPlaylist] = useState<PlaylistCard[]>([]);
  const [currentCardIndex, setCurrentCardIndex] = useState<number>(0);
  const [departures, setDepartures] = useState<Departure[]>([]);
  const [takeover, setTakeover] = useState<Takeover | null>(null);
  
  const [isOffline, setIsOffline] = useState<boolean>(false);
  const [isBootstrapping, setIsBootstrapping] = useState<boolean>(true);
  const [serverStatus, setServerStatus] = useState<"connected" | "disconnected">("connected");
  const [takeoverProgress, setTakeoverProgress] = useState<number>(100);

  // References for timing loops
  const cardTimerRef = useRef<NodeJS.Timeout | null>(null);
  const takeoverPollRef = useRef<NodeJS.Timeout | null>(null);
  const departuresRef = useRef<NodeJS.Timeout | null>(null);
  const heartbeatRef = useRef<NodeJS.Timeout | null>(null);

  // Screen configuration
  const deviceToken = "andermatt-secret-token-1234"; // Default seeded token for this station

  // 1. Initial Load & Offline Backup Recovery
  useEffect(() => {
    async function loadKiosk() {
      try {
        const response = await fetch(`/api/public/screens/${screenSlug}/playlist`);
        if (!response.ok) throw new Error("Server error");
        const data = await response.json();

        setScreen(data.screen);
        setPlaylist(data.playlist);
        setIsOffline(false);
        setServerStatus("connected");

        // Save local copy for offline resilience
        localStorage.setItem(`sdorf_screen_${screenSlug}`, JSON.stringify(data.screen));
        localStorage.setItem(`sdorf_playlist_${screenSlug}`, JSON.stringify(data.playlist));
        setIsBootstrapping(false);
      } catch (err) {
        console.warn("[sDorf Kiosk] Network unavailable. Entering resilient offline cache mode.", err);
        setIsOffline(true);
        setServerStatus("disconnected");

        // Attempt local storage fallback
        const cachedScreen = localStorage.getItem(`sdorf_screen_${screenSlug}`);
        const cachedPlaylist = localStorage.getItem(`sdorf_playlist_${screenSlug}`);

        if (cachedScreen && cachedPlaylist) {
          setScreen(JSON.parse(cachedScreen));
          setPlaylist(JSON.parse(cachedPlaylist));
          setIsBootstrapping(false);
        } else {
          // If no cache, keep bootstrapping to wait for network
          setTimeout(loadKiosk, 3000);
        }
      }
    }

    loadKiosk();

    // Hot-reload mechanism: automatically reloads the page every 3 hours to clean RAM / leaks
    const pageReloadTimer = setTimeout(() => {
      window.location.reload();
    }, 3 * 60 * 60 * 1000);

    return () => {
      clearTimeout(pageReloadTimer);
      if (cardTimerRef.current) clearTimeout(cardTimerRef.current);
      if (takeoverPollRef.current) clearInterval(takeoverPollRef.current);
      if (departuresRef.current) clearInterval(departuresRef.current);
      if (heartbeatRef.current) clearInterval(heartbeatRef.current);
    };
  }, [screenSlug]);

  // 2. Playback Loop Engine
  useEffect(() => {
    if (playlist.length === 0 || takeover) return;

    const currentCard = playlist[currentCardIndex];
    const duration = currentCard.displayDuration * 1000;

    // Set up timer for next card
    cardTimerRef.current = setTimeout(() => {
      setCurrentCardIndex((prev) => (prev + 1) % playlist.length);
    }, duration);

    // Fetch departures instantly if active card is train schedule
    if (currentCard.contentType === "live_departures") {
      fetchDepartures();
      // Poll departures every 15s while on departures slide
      departuresRef.current = setInterval(fetchDepartures, 15000);
    } else {
      if (departuresRef.current) clearInterval(departuresRef.current);
    }

    return () => {
      if (cardTimerRef.current) clearTimeout(cardTimerRef.current);
    };
  }, [currentCardIndex, playlist, takeover]);

  // 3. Heartbeat & Signage Synchronization
  useEffect(() => {
    if (isBootstrapping) return;

    async function sendHeartbeat() {
      try {
        const response = await fetch(`/api/public/screens/${screenSlug}/heartbeat`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${deviceToken}`
          }
        });
        if (response.ok) {
          setServerStatus("connected");
        } else {
          setServerStatus("disconnected");
        }
      } catch {
        setServerStatus("disconnected");
      }
    }

    sendHeartbeat();
    heartbeatRef.current = setInterval(sendHeartbeat, 15000); // 15s Heartbeats

    return () => {
      if (heartbeatRef.current) clearInterval(heartbeatRef.current);
    };
  }, [screenSlug, isBootstrapping]);

  // 4. Queued Interaction Takeover Polling (FIFO claiming)
  useEffect(() => {
    if (isBootstrapping) return;

    async function pollTakeovers() {
      if (takeover) return; // Skip if currently showing an active takeover

      try {
        const response = await fetch(`/api/public/screens/${screenSlug}/active-takeover`);
        if (!response.ok) return;
        const data = await response.json();

        if (data.takeover) {
          // Atomic takeover claimed successfully! Trigger display
          if (cardTimerRef.current) clearTimeout(cardTimerRef.current);
          setTakeover(data.takeover);
          setTakeoverProgress(100);

          // Handle takeover animation countdown
          const startTime = Date.now();
          const duration = 12000; // 12-second display duration

          const progressInterval = setInterval(() => {
            const elapsed = Date.now() - startTime;
            const remaining = Math.max(0, 100 - (elapsed / duration) * 100);
            setTakeoverProgress(remaining);

            if (elapsed >= duration) {
              clearInterval(progressInterval);
              completeTakeover(data.takeover.id);
            }
          }, 100);
        }
      } catch (err) {
        console.error("[sDorf Takeover Poll] Failed:", err);
      }
    }

    pollTakeovers();
    takeoverPollRef.current = setInterval(pollTakeovers, 1500); // FIFO short polling (1.5s)

    return () => {
      if (takeoverPollRef.current) clearInterval(takeoverPollRef.current);
    };
  }, [screenSlug, takeover, isBootstrapping]);

  // Complete displaying active takeover
  const completeTakeover = async (takeoverId: string) => {
    try {
      await fetch(`/api/public/screens/${screenSlug}/takeover-event`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ takeoverId, event: "completed" })
      });
    } catch (err) {
      console.error("[sDorf Takeover Completion Notify] Failed:", err);
    } finally {
      setTakeover(null);
      // Advance to next card on resuming to keep program alive
      setCurrentCardIndex((prev) => (prev + 1) % playlist.length);
    }
  };

  // Fetch train departures from local cache/API
  const fetchDepartures = async () => {
    try {
      const response = await fetch(`/api/public/screens/${screenSlug}/departures`);
      if (!response.ok) throw new Error();
      const data = await response.json();
      setDepartures(data.departures.slice(0, 5)); // Keep only the top 5 upcoming departures
    } catch {
      console.warn("[sDorf Departures] Failed to query live API. Rendering cached schedule.");
    }
  };

  // 5. Render States
  if (isBootstrapping) {
    return (
      <div className="player-bootstrap">
        <div className="bootstrap-container">
          <div className="system-dot" />
          <h1 className="system-title">sDorf Infrastructure</h1>
          <p className="system-status">System wird initialisiert und synchronisiert • Bitte warten...</p>
        </div>
        <style jsx global>{`
          body {
            background-color: #0c0d0e;
            color: #d1d5db;
            font-family: system-ui, -apple-system, sans-serif;
            margin: 0;
            padding: 0;
            overflow: hidden;
            display: flex;
            align-items: center;
            justify-content: center;
            height: 100vh;
            width: 100vw;
          }
          .player-bootstrap {
            text-align: center;
          }
          .system-dot {
            width: 12px;
            height: 12px;
            background: #e63946;
            border-radius: 50%;
            margin: 0 auto 24px;
            animation: pulse 2s infinite ease-in-out;
          }
          .system-title {
            font-size: 24px;
            font-weight: 500;
            color: #f3f4f6;
            letter-spacing: 0.05em;
            text-transform: uppercase;
            margin: 0 0 8px;
          }
          .system-status {
            font-size: 14px;
            color: #9ca3af;
          }
          @keyframes pulse {
            0% { opacity: 0.4; }
            50% { opacity: 1; }
            100% { opacity: 0.4; }
          }
        `}</style>
      </div>
    );
  }

  const currentCard = playlist[currentCardIndex];

  return (
    <div className="kiosk-container">
      {/* Resilient Indicators */}
      <div className="kiosk-header">
        <div className="kiosk-branding">sDorf • Andermatt Bahnhof</div>
        <div className="kiosk-status-pills">
          {isOffline && <span className="status-pill offline">Offline-Modus</span>}
          {serverStatus === "disconnected" && <span className="status-pill server-err">Verbindungsverlust</span>}
          <span className="status-pill active-dot">Kiosk OK</span>
        </div>
      </div>

      {/* Main viewport grid split */}
      <div className="kiosk-grid">
        {/* Main Content Area (Left 2/3) */}
        <div className="kiosk-content-pane">
          {takeover ? (
            /* TAKEOVER STATE RENDER */
            <div className="takeover-screen">
              <div className="takeover-indicator">Aktive Bürgeranfrage am Bahnhof</div>
              <div className="takeover-body">
                <div className="takeover-question-box">
                  <span className="takeover-label">Frage:</span>
                  <p className="takeover-question">&ldquo;{takeover.publicQuestion}&rdquo;</p>
                </div>
                <div className="takeover-answer-box">
                  <span className="takeover-label">Antwort:</span>
                  <p className="takeover-answer">{takeover.publicAnswer}</p>
                </div>
              </div>
              
              {/* Calm, solid countdown progress bar */}
              <div className="takeover-progress-container">
                <div 
                  className="takeover-progress-bar" 
                  style={{ width: `${takeoverProgress}%` }}
                />
              </div>
            </div>
          ) : (
            /* IDLE PROGRAMME STATE RENDER */
            <div className="programme-slide">
              {currentCard.contentType === "info_card" ? (
                <div className="info-card-layout">
                  <h2 className="info-card-headline">{currentCard.body?.headline}</h2>
                  <p className="info-card-body">{currentCard.body?.body}</p>
                  <div className="info-card-footer">{currentCard.body?.footer}</div>
                </div>
              ) : (
                /* LIVE TRAIN DEPARTURES DASHBOARD */
                <div className="departures-board">
                  <h2 className="board-title">Abfahrtstafel Bahnhof Andermatt</h2>
                  <div className="board-header">
                    <span className="col-time">Abfahrt</span>
                    <span className="col-destination">Richtung</span>
                    <span className="col-line">Zug</span>
                    <span className="col-plat">Gleis</span>
                    <span className="col-status">Status</span>
                  </div>
                  <div className="board-rows">
                    {departures.length > 0 ? (
                      departures.map((dep, idx) => (
                        <div key={idx} className="board-row">
                          <span className="col-time col-val-time">{dep.time}</span>
                          <span className="col-destination">{dep.destination}</span>
                          <span className="col-line col-val-line">{dep.line}</span>
                          <span className="col-plat">{dep.platform}</span>
                          <span className={`col-status ${dep.status !== "On Time" ? "delayed" : ""}`}>
                            {dep.status === "On Time" ? "Pünktlich" : dep.status}
                          </span>
                        </div>
                      ))
                    ) : (
                      <div className="board-loading">Fahrplandaten werden geladen...</div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* QR Code Invitation Badge (Right 1/3) */}
        <div className="kiosk-qr-pane">
          <div className="qr-badge-container">
            <h3 className="qr-badge-title">Fragen stellen</h3>
            <p className="qr-badge-desc">Gibt es Fragen zum Fahrplan, Ausflugszielen, Hotels oder dem Dorf? Scannen Sie den QR-Code und stellen Sie Ihre Frage!</p>
            
            <div className="qr-visual-box">
              {/* Secure SVG path representing clean, minimal QR layout */}
              <svg className="qr-svg" viewBox="0 0 100 100">
                <rect width="100" height="100" fill="white" />
                {/* Outlines of positioning finders */}
                <rect x="8" y="8" width="24" height="24" fill="black" />
                <rect x="12" y="12" width="16" height="16" fill="white" />
                <rect x="15" y="15" width="10" height="10" fill="black" />
                
                <rect x="68" y="8" width="24" height="24" fill="black" />
                <rect x="72" y="12" width="16" height="16" fill="white" />
                <rect x="75" y="15" width="10" height="10" fill="black" />
                
                <rect x="8" y="68" width="24" height="24" fill="black" />
                <rect x="12" y="72" width="16" height="16" fill="white" />
                <rect x="15" y="75" width="10" height="10" fill="black" />
                
                {/* Mock data pixels */}
                <rect x="40" y="12" width="6" height="6" fill="black" />
                <rect x="52" y="20" width="8" height="4" fill="black" />
                <rect x="44" y="44" width="12" height="12" fill="black" />
                <rect x="12" y="44" width="8" height="8" fill="black" />
                <rect x="76" y="44" width="12" height="6" fill="black" />
                <rect x="44" y="76" width="6" height="12" fill="black" />
                <rect x="68" y="76" width="16" height="16" fill="black" />
                <rect x="84" y="68" width="8" height="8" fill="black" />
              </svg>
            </div>

            <div className="qr-domain-hint">qstn.swissdesign.me</div>
          </div>
        </div>
      </div>

      <style jsx global>{`
        * {
          box-sizing: border-box;
        }
        body {
          background-color: #0c0d0e;
          color: #e5e7eb;
          font-family: system-ui, -apple-system, sans-serif;
          margin: 0;
          padding: 0;
          overflow: hidden;
          width: 100vw;
          height: 100vh;
        }
        .kiosk-container {
          display: flex;
          flex-direction: column;
          height: 100vh;
          width: 100vw;
          padding: 32px;
          background: radial-gradient(circle at center, #131517 0%, #0c0d0e 100%);
        }
        .kiosk-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 24px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
          padding-bottom: 16px;
        }
        .kiosk-branding {
          font-size: 16px;
          text-transform: uppercase;
          letter-spacing: 0.1em;
          color: #9ca3af;
          font-weight: 500;
        }
        .kiosk-status-pills {
          display: flex;
          gap: 12px;
        }
        .status-pill {
          font-size: 12px;
          padding: 4px 10px;
          border-radius: 4px;
          font-weight: 500;
          letter-spacing: 0.02em;
        }
        .status-pill.offline {
          background: rgba(245, 158, 11, 0.15);
          color: #f59e0b;
          border: 1px solid rgba(245, 158, 11, 0.25);
        }
        .status-pill.server-err {
          background: rgba(239, 68, 68, 0.15);
          color: #ef4444;
          border: 1px solid rgba(239, 68, 68, 0.25);
        }
        .status-pill.active-dot {
          background: rgba(16, 185, 129, 0.12);
          color: #10b981;
          border: 1px solid rgba(16, 185, 129, 0.2);
        }
        .kiosk-grid {
          display: grid;
          grid-template-columns: 1.8fr 1fr;
          gap: 32px;
          flex: 1;
          height: calc(100vh - 120px);
          overflow: hidden;
        }
        .kiosk-content-pane {
          background: rgba(20, 22, 25, 0.5);
          border: 1px solid rgba(255, 255, 255, 0.06);
          border-radius: 8px;
          padding: 48px;
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
          overflow: hidden;
        }
        .programme-slide {
          width: 100%;
          height: 100%;
          display: flex;
          align-items: center;
        }
        .info-card-layout {
          width: 100%;
        }
        .info-card-headline {
          font-size: 44px;
          font-weight: 600;
          margin: 0 0 24px;
          color: #ffffff;
          line-height: 1.15;
          letter-spacing: -0.02em;
        }
        .info-card-body {
          font-size: 22px;
          line-height: 1.6;
          color: #d1d5db;
          margin: 0 0 40px;
          font-weight: 400;
        }
        .info-card-footer {
          font-size: 14px;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          color: #9ca3af;
          font-weight: 500;
          border-top: 1px solid rgba(255, 255, 255, 0.05);
          padding-top: 16px;
        }
        
        /* DEPARTURES BOARD STYLING */
        .departures-board {
          width: 100%;
          height: 100%;
          display: flex;
          flex-direction: column;
        }
        .board-title {
          font-size: 26px;
          font-weight: 600;
          color: #ffffff;
          margin: 0 0 32px;
        }
        .board-header {
          display: grid;
          grid-template-columns: 1.1fr 3fr 1fr 1fr 1.2fr;
          font-size: 13px;
          text-transform: uppercase;
          color: #9ca3af;
          font-weight: 600;
          letter-spacing: 0.05em;
          border-bottom: 2px solid rgba(255, 255, 255, 0.1);
          padding-bottom: 12px;
          margin-bottom: 12px;
        }
        .board-row {
          display: grid;
          grid-template-columns: 1.1fr 3fr 1fr 1fr 1.2fr;
          font-size: 20px;
          font-weight: 500;
          border-bottom: 1px solid rgba(255, 255, 255, 0.04);
          padding: 14px 0;
          align-items: center;
        }
        .board-row:last-child {
          border-bottom: none;
        }
        .col-val-time {
          font-family: monospace;
          color: #f59e0b;
        }
        .col-val-line {
          font-weight: 600;
          font-size: 16px;
          background: rgba(255, 255, 255, 0.08);
          padding: 2px 6px;
          border-radius: 3px;
          display: inline-block;
          text-align: center;
          width: fit-content;
        }
        .col-status {
          font-weight: 600;
          font-size: 16px;
          color: #10b981;
        }
        .col-status.delayed {
          color: #ef4444;
        }
        .board-loading {
          padding: 48px;
          text-align: center;
          color: #9ca3af;
          font-size: 18px;
        }

        /* PUBLIC TAKEOVER STYLING */
        .takeover-screen {
          width: 100%;
          height: 100%;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          animation: fadeSlideIn 0.5s ease-out;
        }
        .takeover-indicator {
          font-size: 13px;
          text-transform: uppercase;
          letter-spacing: 0.1em;
          color: #ef4444;
          font-weight: 600;
          background: rgba(239, 68, 68, 0.1);
          border: 1px solid rgba(239, 68, 68, 0.2);
          padding: 6px 14px;
          border-radius: 4px;
          width: fit-content;
        }
        .takeover-body {
          flex: 1;
          display: flex;
          flex-direction: column;
          justify-content: center;
          gap: 36px;
        }
        .takeover-question-box {
          border-left: 4px solid #ef4444;
          padding-left: 20px;
        }
        .takeover-answer-box {
          border-left: 4px solid #10b981;
          padding-left: 20px;
        }
        .takeover-label {
          font-size: 12px;
          text-transform: uppercase;
          color: #9ca3af;
          font-weight: 600;
          letter-spacing: 0.05em;
          display: block;
          margin-bottom: 6px;
        }
        .takeover-question {
          font-size: 26px;
          font-weight: 600;
          color: #f3f4f6;
          margin: 0;
          line-height: 1.3;
          font-style: italic;
        }
        .takeover-answer {
          font-size: 24px;
          font-weight: 500;
          color: #ffffff;
          margin: 0;
          line-height: 1.4;
        }
        .takeover-progress-container {
          height: 4px;
          background: rgba(255, 255, 255, 0.08);
          border-radius: 2px;
          overflow: hidden;
          width: 100%;
        }
        .takeover-progress-bar {
          height: 100%;
          background: #ef4444;
          transition: width 0.1s linear;
        }

        /* QR BADGE STYLING */
        .kiosk-qr-pane {
          background: rgba(255, 255, 255, 0.02);
          border: 1px solid rgba(255, 255, 255, 0.04);
          border-radius: 8px;
          padding: 40px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .qr-badge-container {
          text-align: center;
          width: 100%;
        }
        .qr-badge-title {
          font-size: 22px;
          font-weight: 600;
          color: #ffffff;
          margin: 0 0 12px;
        }
        .qr-badge-desc {
          font-size: 14px;
          line-height: 1.5;
          color: #9ca3af;
          margin: 0 0 32px;
          padding: 0 16px;
        }
        .qr-visual-box {
          background: white;
          padding: 16px;
          border-radius: 6px;
          width: 190px;
          height: 190px;
          margin: 0 auto 24px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .qr-svg {
          width: 100%;
          height: 100%;
        }
        .qr-domain-hint {
          font-family: monospace;
          font-size: 13px;
          color: #9ca3af;
          letter-spacing: 0.05em;
        }

        @keyframes fadeSlideIn {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
