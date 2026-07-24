import { db } from "@/db";
import { screens } from "@/db/schema";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function Home() {
  // Dynamically query all seeded screens from the SQLite database
  const activeScreens = await db.select().from(screens);

  // Helper to determine if a screen is online (pinged in the last 30 seconds)
  const isScreenOnline = (lastSeenAt: Date | null) => {
    if (!lastSeenAt) return false;
    return Date.now() - new Date(lastSeenAt).getTime() < 30000;
  };

  return (
    <div className="min-h-screen bg-[#090a0b] text-[#e5e7eb] font-sans selection:bg-[#e63946] selection:text-white">
      {/* Background radial glow */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_var(--tw-gradient-stops))] from-[rgba(230,57,70,0.06)] via-transparent to-transparent pointer-events-none" />

      <div className="relative max-w-5xl mx-auto px-6 py-16 sm:py-24">
        {/* Top Header */}
        <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-16 border-b border-white/5 pb-8">
          <div className="flex items-center gap-3">
            <span className="w-3 h-3 rounded-full bg-[#e63946]" />
            <div>
              <h1 className="text-xl font-semibold tracking-tight text-white sm:text-2xl">sDorf</h1>
              <p className="text-xs text-zinc-500 uppercase tracking-widest font-mono mt-0.5">Village Screen Network</p>
            </div>
          </div>
          <div className="flex items-center gap-3 bg-white/5 border border-white/5 rounded-full px-3.5 py-1 text-xs font-mono text-zinc-400">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Local Sandbox Environment
          </div>
        </header>

        {/* Main Content Layout */}
        <main className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left/Middle: Core Hub */}
          <div className="lg:col-span-2 space-y-10">
            {/* Project Hero introduction */}
            <section className="space-y-4">
              <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
                The Kiosk Network for Swiss Villages.
              </h2>
              <p className="text-lg text-zinc-400 leading-relaxed max-w-2xl">
                sDorf is a modern digital platform that runs useful local loops (schedules, campaigns, weather) on public screens, while allowing visitors to interact via screen-specific QR codes to ask localized questions and trigger public display takeovers.
              </p>
            </section>

            {/* Active Screens List (Seeded) */}
            <section className="space-y-6">
              <div className="flex items-center justify-between border-b border-white/5 pb-3">
                <h3 className="text-lg font-medium text-white">Active Kiosk Screens ({activeScreens.length})</h3>
                <span className="text-xs text-zinc-500 font-mono">SQLite Grounded</span>
              </div>

              <div className="grid grid-cols-1 gap-4">
                {activeScreens.map((sc) => {
                  const online = isScreenOnline(sc.lastSeenAt);
                  return (
                    <div
                      key={sc.id}
                      className="group relative bg-[#111315]/80 border border-white/5 hover:border-white/10 rounded-xl p-6 transition-all duration-300 backdrop-blur-sm"
                    >
                      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                        <div className="space-y-1.5">
                          <div className="flex items-center gap-2.5">
                            <h4 className="text-base font-semibold text-white group-hover:text-[#e63946] transition-colors">
                              {sc.publicName}
                            </h4>
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                online
                                  ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                                  : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                              }`}
                            >
                              {online ? "ONLINE" : "SLEEP / UNPINGED"}
                            </span>
                          </div>
                          <p className="text-xs text-zinc-500 font-mono">
                            Slug: <span className="text-zinc-400">{sc.slug}</span> &bull; Program: <span className="text-zinc-400">{sc.playlistId || "Default Loop"}</span>
                          </p>
                        </div>

                        {/* Interactive Buttons */}
                        <div className="flex flex-wrap gap-2.5 w-full sm:w-auto">
                          <Link
                            href={`/display/${sc.slug}`}
                            target="_blank"
                            className="flex-1 sm:flex-initial text-center text-xs font-medium bg-white/5 hover:bg-white/10 text-zinc-200 hover:text-white px-4 py-2.5 rounded-lg border border-white/5 transition-all"
                          >
                            📺 Open Kiosk Player
                          </Link>
                          <Link
                            href={`/q/${sc.slug}`}
                            target="_blank"
                            className="flex-1 sm:flex-initial text-center text-xs font-medium bg-[#e63946] hover:bg-[#d02d3b] text-white px-4 py-2.5 rounded-lg transition-all shadow-[0_2px_12px_-3px_rgba(230,57,70,0.3)]"
                          >
                            📱 Simulate QR Scan
                          </Link>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>

            {/* Step-by-Step Simulation Flow Guide */}
            <section className="space-y-6">
              <div className="border-b border-white/5 pb-3">
                <h3 className="text-lg font-medium text-white">Interactive Takeover Simulation Guide</h3>
              </div>

              <div className="relative border-l border-zinc-800 ml-4 pl-6 space-y-8 py-2">
                {/* Step 1 */}
                <div className="relative">
                  <span className="absolute -left-[31px] top-0.5 w-4.5 h-4.5 rounded-full bg-[#111315] border-2 border-zinc-700 flex items-center justify-center text-[10px] font-mono font-bold text-zinc-400">1</span>
                  <div className="space-y-1">
                    <h5 className="text-sm font-semibold text-white">Start Both Local Servers</h5>
                    <p className="text-xs text-zinc-400 leading-relaxed">
                      Make sure you are running sDorf (Port 3000) and the QSTN application (Port 3001) in parallel terminals:
                    </p>
                    <div className="bg-black/40 border border-white/5 rounded-lg p-3 font-mono text-[11px] text-zinc-300 space-y-1.5 mt-2">
                      <div className="text-zinc-500"># Terminal 1 (sDorf directory)</div>
                      <div>npm run dev</div>
                      <div className="text-zinc-500 mt-2"># Terminal 2 (QSTN directory)</div>
                      <div>npm run dev -- -p 3001</div>
                    </div>
                  </div>
                </div>

                {/* Step 2 */}
                <div className="relative">
                  <span className="absolute -left-[31px] top-0.5 w-4.5 h-4.5 rounded-full bg-[#111315] border-2 border-zinc-700 flex items-center justify-center text-[10px] font-mono font-bold text-zinc-400">2</span>
                  <div className="space-y-1">
                    <h5 className="text-sm font-semibold text-white">Launch the Kiosk Player</h5>
                    <p className="text-xs text-zinc-400 leading-relaxed">
                      Click the <span className="text-white font-medium">📺 Open Kiosk Player</span> button above. Keep this window open on one half of your screen. It runs the normal local program loop (welcome content, train schedules, etc.).
                    </p>
                  </div>
                </div>

                {/* Step 3 */}
                <div className="relative">
                  <span className="absolute -left-[31px] top-0.5 w-4.5 h-4.5 rounded-full bg-[#111315] border-2 border-zinc-700 flex items-center justify-center text-[10px] font-mono font-bold text-zinc-400">3</span>
                  <div className="space-y-1">
                    <h5 className="text-sm font-semibold text-white">Simulate QR Scan (Mobile Interaction)</h5>
                    <p className="text-xs text-zinc-400 leading-relaxed">
                      Click <span className="text-white font-medium">📱 Simulate QR Scan</span> above. This logs a local scan event, cryptographically signs a secure short-lived token, and redirects you directly to the mobile QSTN input page running on Port 3001.
                    </p>
                  </div>
                </div>

                {/* Step 4 */}
                <div className="relative">
                  <span className="absolute -left-[31px] top-0.5 w-4.5 h-4.5 rounded-full bg-[#111315] border-2 border-zinc-700 flex items-center justify-center text-[10px] font-mono font-bold text-zinc-400">4</span>
                  <div className="space-y-1">
                    <h5 className="text-sm font-semibold text-white">Ask your Question & Observe Takeover</h5>
                    <p className="text-xs text-zinc-400 leading-relaxed">
                      In the simulated mobile card, type your question (e.g., <em className="text-white font-semibold">&ldquo;When is the next departure to Göschenen?&rdquo;</em> or <em className="text-white font-semibold">&ldquo;Where is the nearest toilet?&rdquo;</em>) and hit send.
                    </p>
                    <p className="text-xs text-amber-400/90 leading-relaxed mt-1">
                      💡 <strong>API Key Note:</strong> If no <code className="font-mono text-[11px] text-amber-200">GEMINI_API_KEY</code> is configured, the system uses its integrated offline bypass. It generates a high-quality deterministic response and enqueues the takeover instantly so you can test without key configs!
                    </p>
                  </div>
                </div>
              </div>
            </section>
          </div>

          {/* Right Column: Sidebar & Admin Info */}
          <div className="space-y-8">
            {/* Admin card */}
            <div className="bg-[#111315]/80 border border-white/5 rounded-xl p-6 backdrop-blur-sm space-y-4">
              <div className="flex items-center gap-2 text-[#e63946]">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6h9.75M10.5 6a1.5 1.5 0 11-3 0m3 0a1.5 1.5 0 10-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-9.75 0h9.75" />
                </svg>
                <h3 className="text-base font-semibold text-white">Control Room</h3>
              </div>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Monitor live heartbeats, view incoming visitor questions, inspect responses, and view real-time audit logs of the screen network.
              </p>
              <Link
                href="/admin"
                className="block text-center text-xs font-semibold bg-white/10 hover:bg-white/15 text-white py-2.5 rounded-lg border border-white/10 transition-all"
              >
                ⚙️ Open Admin Dashboard
              </Link>
            </div>

            {/* Architecture Card */}
            <div className="bg-[#111315]/40 border border-white/5 rounded-xl p-6 backdrop-blur-sm space-y-4">
              <h4 className="text-xs uppercase tracking-widest font-mono font-bold text-zinc-500">Security Architecture</h4>
              <ul className="space-y-3.5 text-xs text-zinc-400">
                <li className="flex items-start gap-2">
                  <span className="text-[#e63946] font-bold">&bull;</span>
                  <span><strong>Cryptographic Handshake:</strong> QR-scanned redirects are secured using short-lived (60s) HMAC signed tokens.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#e63946] font-bold">&bull;</span>
                  <span><strong>Defense-in-Depth Moderation:</strong> Both sDorf and QSTN run deterministic public validators that strip raw URLs, emails, personal data, and enforce length boundaries.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#e63946] font-bold">&bull;</span>
                  <span><strong>Resilient Offline Fallback:</strong> Local player buffers playlists and schedules via localCache to handle mountain network dropouts.</span>
                </li>
              </ul>
            </div>
          </div>
        </main>

        {/* Footer */}
        <footer className="mt-24 border-t border-white/5 pt-8 text-center text-xs text-zinc-600">
          <p>© 2026 swissdesign / sDorf. Single-Screen Public Display & Secure QSTN Handshake Answering Service.</p>
        </footer>
      </div>
    </div>
  );
}
