"use client";

import { useState, useEffect } from "react";

interface ScreenLog {
  id: string;
  slug: string;
  publicName: string;
  status: string;
  lastSeenAt: string | null;
  softwareVersion: string | null;
  playlistName: string | null;
}

interface InteractionLog {
  id: string;
  questionCategory: string;
  publicQuestion: string;
  publicAnswer: string;
  status: "queued" | "claimed" | "displaying" | "completed" | "rejected" | "expired" | "failed";
  queuedAt: string;
  claimedAt: string | null;
  completedAt: string | null;
}

interface EventLog {
  id: string;
  screenSlug: string;
  eventType: string;
  eventDataJson: string;
  createdAt: string;
}

export default function AdminDashboard() {
  const [screens, setScreens] = useState<ScreenLog[]>([]);
  const [interactions, setInteractions] = useState<InteractionLog[]>([]);
  const [events, setEvents] = useState<EventLog[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [refreshCounter, setRefreshCounter] = useState(0);

  useEffect(() => {
    async function fetchDiagnostics() {
      try {
        const response = await fetch("/api/admin/diagnostics");
        if (!response.ok) throw new Error("Failed to fetch diagnostics");
        const data = await response.json();
        
        setScreens(data.screens);
        setInteractions(data.interactions);
        setEvents(data.events);
      } catch (err) {
        console.error("[sDorf Admin] Diagnostic load failed:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchDiagnostics();

    // Auto-refresh diagnostics every 5s for real-time visibility
    const interval = setInterval(() => {
      setRefreshCounter((prev) => prev + 1);
    }, 5000);

    return () => clearInterval(interval);
  }, [refreshCounter]);

  // Clean formatted timestamp helper
  const formatTime = (isoString: string | null) => {
    if (!isoString) return "-";
    const date = new Date(isoString);
    return date.toLocaleTimeString("de-CH", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  };

  const getStatusBadge = (status: string, lastSeenAt?: string | null) => {
    if (status === "active") {
      // eslint-disable-next-line react-hooks/purity
      const isOnline = lastSeenAt && (Date.now() - new Date(lastSeenAt).getTime() < 30000);
      return isOnline ? (
        <span className="badge online">ONLINE</span>
      ) : (
        <span className="badge offline-warn">SLEEP</span>
      );
    }
    return <span className="badge inactive">{status.toUpperCase()}</span>;
  };

  const getInteractionBadge = (status: InteractionLog["status"]) => {
    switch (status) {
      case "queued": return <span className="badge status-queued">QUEUED</span>;
      case "displaying": return <span className="badge status-active">DISPLAYING</span>;
      case "completed": return <span className="badge status-completed">COMPLETED</span>;
      case "failed": return <span className="badge status-failed">FAILED</span>;
      default: return <span className="badge status-expired">{status.toUpperCase()}</span>;
    }
  };

  if (loading && refreshCounter === 0) {
    return (
      <div className="admin-loading">
        <div className="spinner" />
        <p>sDorf Diagnostics werden geladen...</p>
      </div>
    );
  }

  return (
    <div className="admin-container">
      {/* Premium Header */}
      <header className="admin-header">
        <div className="logo-group">
          <div className="logo-dot" />
          <h1 className="admin-title">sDorf Screen Network</h1>
          <span className="env-pill">V1 PILOT</span>
        </div>
        <div className="refresh-status">
          <span className="live-dot" /> Auto-Aktualisierung alle 5s
        </div>
      </header>

      <div className="admin-grid">
        {/* Left Column: Screen Status Summary */}
        <section className="admin-section section-screens">
          <h2 className="section-title">Kiosk-Bildschirme ({screens.length})</h2>
          <div className="screens-list">
            {screens.map((sc) => (
              <div key={sc.id} className="screen-card">
                <div className="screen-card-header">
                  <div className="screen-details">
                    <h3 className="screen-name">{sc.publicName}</h3>
                    <span className="screen-slug">{sc.slug}</span>
                  </div>
                  {getStatusBadge(sc.status, sc.lastSeenAt)}
                </div>
                <div className="screen-metadata-grid">
                  <div className="meta-item">
                    <span className="meta-label">Software:</span>
                    <span className="meta-value">{sc.softwareVersion || "v1.0.0"}</span>
                  </div>
                  <div className="meta-item">
                    <span className="meta-label">Letzter Ping:</span>
                    <span className="meta-value">{formatTime(sc.lastSeenAt)}</span>
                  </div>
                  <div className="meta-item full-width">
                    <span className="meta-label">Aktive Schleife:</span>
                    <span className="meta-value">{sc.playlistName || "Standard-Schleife"}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Right Column: Interaction Queue Status */}
        <section className="admin-section section-queue">
          <h2 className="section-title">Bürger-Interaktionen (Warteschlange)</h2>
          <div className="table-responsive">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Zeit</th>
                  <th>Kategorie</th>
                  <th>Öffentliche Frage / Antwort</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {interactions.length > 0 ? (
                  interactions.map((int) => (
                    <tr key={int.id}>
                      <td className="cell-time">{formatTime(int.queuedAt)}</td>
                      <td>
                        <span className="category-chip">{int.questionCategory}</span>
                      </td>
                      <td className="cell-qa">
                        <div className="qa-q">&ldquo;{int.publicQuestion}&rdquo;</div>
                        <div className="qa-a">{int.publicAnswer}</div>
                      </td>
                      <td>{getInteractionBadge(int.status)}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4} className="table-empty">Keine Interaktionen in der Warteschlange.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      {/* Footer Event Audit Log */}
      <section className="admin-section section-audit">
        <h2 className="section-title">Echtzeit-Ereignisprotokoll (Audit Logs)</h2>
        <div className="audit-logs-box">
          {events.length > 0 ? (
            events.map((ev) => (
              <div key={ev.id} className="audit-row">
                <span className="audit-time">{formatTime(ev.createdAt)}</span>
                <span className="audit-screen">{ev.screenSlug}</span>
                <span className={`audit-type type-${ev.eventType}`}>{ev.eventType.toUpperCase()}</span>
                <span className="audit-data">{ev.eventDataJson}</span>
              </div>
            ))
          ) : (
            <p className="audit-empty">Keine Audit-Ereignisse protokolliert.</p>
          )}
        </div>
      </section>

      <style jsx global>{`
        body {
          background-color: #090a0b;
          color: #e5e7eb;
          font-family: system-ui, -apple-system, sans-serif;
          margin: 0;
          padding: 0;
        }
        .admin-container {
          padding: 40px;
          max-width: 1400px;
          margin: 0 auto;
        }
        .admin-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 36px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
          padding-bottom: 20px;
        }
        .logo-group {
          display: flex;
          align-items: center;
          gap: 16px;
        }
        .logo-dot {
          width: 14px;
          height: 14px;
          background: #e63946;
          border-radius: 50%;
        }
        .admin-title {
          font-size: 24px;
          font-weight: 600;
          margin: 0;
          color: #ffffff;
        }
        .env-pill {
          background: rgba(230, 57, 70, 0.1);
          color: #e63946;
          border: 1px solid rgba(230, 57, 70, 0.2);
          font-size: 11px;
          font-weight: 700;
          padding: 4px 10px;
          border-radius: 4px;
          letter-spacing: 0.05em;
        }
        .refresh-status {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 13px;
          color: #9ca3af;
        }
        .live-dot {
          width: 8px;
          height: 8px;
          background: #10b981;
          border-radius: 50%;
          animation: pulse 1s infinite;
        }

        /* ADMIN GRID */
        .admin-grid {
          display: grid;
          grid-template-columns: 1fr 2fr;
          gap: 32px;
          margin-bottom: 32px;
        }
        .admin-section {
          background: rgba(22, 24, 27, 0.6);
          border: 1px solid rgba(255, 255, 255, 0.06);
          border-radius: 8px;
          padding: 24px;
        }
        .section-title {
          font-size: 18px;
          font-weight: 600;
          color: #ffffff;
          margin: 0 0 20px;
        }

        /* SCREENS LIST */
        .screens-list {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }
        .screen-card {
          background: rgba(0, 0, 0, 0.2);
          border: 1px solid rgba(255, 255, 255, 0.04);
          border-radius: 6px;
          padding: 16px;
        }
        .screen-card-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 14px;
        }
        .screen-name {
          font-size: 16px;
          font-weight: 600;
          color: #ffffff;
          margin: 0 0 2px;
        }
        .screen-slug {
          font-size: 11px;
          font-family: monospace;
          color: #9ca3af;
        }
        .screen-metadata-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
        }
        .meta-item {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }
        .meta-item.full-width {
          grid-column: span 2;
        }
        .meta-label {
          font-size: 10px;
          text-transform: uppercase;
          color: #9ca3af;
          font-weight: 500;
        }
        .meta-value {
          font-size: 13px;
          color: #f3f4f6;
          font-weight: 500;
        }

        /* BADGES */
        .badge {
          font-size: 10px;
          font-weight: 700;
          padding: 3px 8px;
          border-radius: 4px;
          letter-spacing: 0.02em;
        }
        .badge.online {
          background: rgba(16, 185, 129, 0.12);
          color: #10b981;
          border: 1px solid rgba(16, 185, 129, 0.2);
        }
        .badge.offline-warn {
          background: rgba(245, 158, 11, 0.12);
          color: #f59e0b;
          border: 1px solid rgba(245, 158, 11, 0.2);
        }
        .badge.inactive {
          background: rgba(255, 255, 255, 0.05);
          color: #9ca3af;
        }
        .badge.status-queued {
          background: rgba(245, 158, 11, 0.15);
          color: #f59e0b;
        }
        .badge.status-active {
          background: rgba(230, 57, 70, 0.15);
          color: #e63946;
        }
        .badge.status-completed {
          background: rgba(16, 185, 129, 0.15);
          color: #10b981;
        }
        .badge.status-failed {
          background: rgba(107, 114, 128, 0.15);
          color: #9ca3af;
        }
        .badge.status-expired {
          background: rgba(255, 255, 255, 0.05);
          color: #9ca3af;
        }

        /* TABLE */
        .table-responsive {
          overflow-x: auto;
        }
        .admin-table {
          width: 100%;
          border-collapse: collapse;
          text-align: left;
        }
        .admin-table th {
          font-size: 11px;
          text-transform: uppercase;
          color: #9ca3af;
          font-weight: 600;
          padding: 12px 16px;
          border-bottom: 2px solid rgba(255, 255, 255, 0.08);
          letter-spacing: 0.05em;
        }
        .admin-table td {
          padding: 14px 16px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.04);
          font-size: 14px;
          vertical-align: top;
        }
        .cell-time {
          font-family: monospace;
          color: #9ca3af;
        }
        .category-chip {
          background: rgba(255, 255, 255, 0.05);
          padding: 2px 8px;
          border-radius: 4px;
          font-size: 11px;
          font-weight: 500;
        }
        .cell-qa {
          max-width: 400px;
        }
        .qa-q {
          font-weight: 600;
          color: #ffffff;
          margin-bottom: 4px;
          font-style: italic;
        }
        .qa-a {
          color: #d1d5db;
          line-height: 1.4;
        }
        .table-empty {
          text-align: center;
          padding: 48px !important;
          color: #9ca3af;
        }

        /* AUDIT LOG */
        .section-audit {
          background: #111315;
        }
        .audit-logs-box {
          background: rgba(0, 0, 0, 0.3);
          border: 1px solid rgba(255, 255, 255, 0.04);
          border-radius: 6px;
          padding: 16px;
          font-family: monospace;
          font-size: 12px;
          max-height: 250px;
          overflow-y: auto;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .audit-row {
          display: flex;
          gap: 16px;
          padding: 4px 0;
          border-bottom: 1px solid rgba(255, 255, 255, 0.02);
        }
        .audit-row:last-child {
          border-bottom: none;
        }
        .audit-time {
          color: #f59e0b;
          width: 80px;
        }
        .audit-screen {
          color: #10b981;
          width: 180px;
        }
        .audit-type {
          font-weight: bold;
          width: 140px;
        }
        .audit-type.type-qr_scan { color: #3b82f6; }
        .audit-type.type-heartbeat { color: #6b7280; }
        .audit-type.type-takeover_queued { color: #f59e0b; }
        .audit-type.type-takeover_completed { color: #10b981; }
        .audit-data {
          color: #d1d5db;
          flex: 1;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .audit-empty {
          text-align: center;
          color: #9ca3af;
          padding: 16px;
          margin: 0;
        }

        .spinner {
          width: 24px;
          height: 24px;
          border: 2px solid rgba(255, 255, 255, 0.1);
          border-top-color: #e63946;
          border-radius: 50%;
          animation: spin 1s infinite linear;
          margin-bottom: 12px;
        }
        .admin-loading {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 100vh;
          width: 100vw;
          background: #090a0b;
          color: #9ca3af;
        }

        @keyframes pulse {
          0% { opacity: 0.4; }
          50% { opacity: 1; }
          100% { opacity: 0.4; }
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
