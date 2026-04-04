// NeuralLedger Dashboard — Soul Reapers
// Add to backend server.js: app.use(require('cors')())
// Run: npm install cors in backend folder

import { useState, useEffect, useCallback, useRef } from "react";

const API = "/api";

const COLORS = {
  bg: "#020202",
  surface: "rgba(5, 5, 8, 0.85)", // Less transparent, darker base blocks the light
  surfaceHover: "rgba(20, 20, 25, 0.95)",
  border: "rgba(255, 255, 255, 0.15)", // Stronger borders
  borderLight: "rgba(255, 255, 255, 0.25)",
  text: "#ffffff",
  textMuted: "#a0a0ab", // Brighter muted text for readability
  textDim: "#7a7a85",
  blue: "#4da3ff", // Brought back intense neon blue for charts!
  blueLight: "#8ac2ff",
  blueDim: "rgba(77, 163, 255, 0.2)",
  green: "#cedd2c", 
  greenDim: "rgba(206, 221, 44, 0.2)",
  red: "#ff4747",
  redDim: "rgba(255, 71, 71, 0.2)",
  amber: "#ffb800",
  amberDim: "rgba(255, 184, 0, 0.2)",
};

const styles = {
  app: {
    minHeight: "100vh",
    backgroundColor: COLORS.bg,
    color: COLORS.text,
    fontFamily: "'Inter', -apple-system, sans-serif",
    display: "flex",
    position: "relative",
    zIndex: 1,
  },
  sidebar: {
    width: "240px",
    minHeight: "100vh",
    background: "rgba(2, 2, 2, 0.6)",
    backdropFilter: "blur(20px)",
    borderRight: `1px solid ${COLORS.border}`,
    display: "flex",
    flexDirection: "column",
    padding: "0",
    flexShrink: 0,
    zIndex: 10,
  },
  sidebarLogo: {
    padding: "32px 24px 24px",
    borderBottom: `1px solid ${COLORS.border}`,
  },
  logoText: {
    fontSize: "18px",
    fontWeight: "500",
    color: COLORS.text,
    letterSpacing: "1px",
    textTransform: "uppercase",
  },
  logoSub: {
    fontSize: "10px",
    color: COLORS.textMuted,
    marginTop: "4px",
    letterSpacing: "2px",
    textTransform: "uppercase",
  },
  navSection: {
    padding: "24px 16px",
    flex: 1,
  },
  navLabel: {
    fontSize: "9px",
    color: COLORS.textDim,
    letterSpacing: "2px",
    textTransform: "uppercase",
    padding: "0 12px",
    marginBottom: "12px",
  },
  navItem: (active) => ({
    display: "flex",
    alignItems: "center",
    gap: "12px",
    padding: "10px 14px",
    borderRadius: "4px",
    cursor: "pointer",
    fontSize: "12px",
    fontWeight: active ? "500" : "400",
    letterSpacing: "1px",
    color: active ? COLORS.text : COLORS.textMuted,
    background: active ? "rgba(255,255,255,0.03)" : "transparent",
    borderLeft: active ? `2px solid ${COLORS.text}` : "2px solid transparent",
    marginBottom: "4px",
    transition: "all 0.2s ease",
  }),
  navIcon: {
    fontSize: "14px",
    width: "20px",
    textAlign: "center",
    opacity: active => (active ? 1 : 0.5),
  },
  main: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    minHeight: "100vh",
    overflow: "auto",
    position: "relative",
  },
  topbar: {
    padding: "20px 40px",
    borderBottom: `1px solid ${COLORS.border}`,
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    background: "rgba(2, 2, 2, 0.4)",
    backdropFilter: "blur(12px)",
    position: "sticky",
    top: 0,
    zIndex: 10,
  },
  topbarTitle: {
    fontSize: "13px",
    fontWeight: "400",
    letterSpacing: "1.5px",
    textTransform: "uppercase",
    color: COLORS.text,
  },
  topbarRight: {
    display: "flex",
    alignItems: "center",
    gap: "16px",
  },
  liveDot: {
    width: "6px",
    height: "6px",
    borderRadius: "50%",
    background: COLORS.green,
    animation: "pulse 2s infinite",
  },
  liveText: {
    fontSize: "10px",
    color: COLORS.textMuted,
    letterSpacing: "1.5px",
    textTransform: "uppercase",
  },
  content: {
    padding: "40px",
    flex: 1,
    maxWidth: "1400px",
    margin: "0 auto",
    width: "100%",
  },
  pageTitle: {
    fontSize: "36px",
    fontWeight: "400",
    color: COLORS.text,
    marginBottom: "8px",
    letterSpacing: "-1px",
  },
  pageSubtitle: {
    fontSize: "13px",
    color: COLORS.textMuted,
    marginBottom: "40px",
    letterSpacing: "0.5px",
  },
  grid4: {
    display: "grid",
    gridTemplateColumns: "repeat(4, 1fr)",
    gap: "24px",
    marginBottom: "32px",
  },
  grid2: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "24px",
    marginBottom: "32px",
  },
  card: {
    background: COLORS.surface,
    backdropFilter: "blur(16px)",
    border: `1px solid ${COLORS.border}`,
    borderRadius: "2px", // Sharp corners
    padding: "28px",
    position: "relative",
    overflow: "hidden",
  },
  statCard: (accent) => ({
    background: COLORS.surface,
    backdropFilter: "blur(16px)",
    border: `1px solid ${COLORS.border}`,
    borderRadius: "2px",
    padding: "28px",
    display: "flex",
    flexDirection: "column",
    position: "relative",
  }),
  statValue: {
    fontSize: "42px",
    fontWeight: "400",
    fontFamily: "'Space Grotesk', monospace",
    letterSpacing: "-2px",
    lineHeight: 1,
    marginBottom: "12px",
    color: COLORS.text,
  },
  statLabel: {
    fontSize: "10px",
    color: COLORS.textMuted,
    textTransform: "uppercase",
    letterSpacing: "1.5px",
  },
  badge: (color, bg) => ({
    display: "inline-flex",
    alignItems: "center",
    padding: "4px 10px",
    borderRadius: "2px",
    fontSize: "9px",
    fontWeight: "600",
    color: color,
    background: bg,
    border: `1px solid ${color}40`,
    letterSpacing: "1px",
    textTransform: "uppercase",
  }),
  table: {
    width: "100%",
    borderCollapse: "collapse",
    fontSize: "12px",
  },
  th: {
    padding: "16px",
    textAlign: "left",
    fontSize: "9px",
    fontWeight: "600",
    color: COLORS.textDim,
    textTransform: "uppercase",
    letterSpacing: "2px",
    borderBottom: `1px solid ${COLORS.border}`,
  },
  td: {
    padding: "16px",
    borderBottom: `1px solid ${COLORS.border}`,
    color: COLORS.textMuted,
    verticalAlign: "middle",
  },
  btn: (variant = "primary") => ({
    padding: variant === "sm" ? "8px 16px" : "12px 24px",
    borderRadius: "2px",
    border: `1px solid ${variant === "ghost" ? COLORS.border : COLORS.text}`,
    cursor: "pointer",
    fontSize: variant === "sm" ? "10px" : "11px",
    fontWeight: "500",
    background: variant === "ghost" ? "transparent" : COLORS.text,
    color: variant === "ghost" ? COLORS.text : "#000",
    transition: "all 0.2s ease",
    letterSpacing: "1.5px",
    textTransform: "uppercase",
  }),
  input: {
    background: "rgba(0,0,0,0.2)",
    border: `1px solid ${COLORS.border}`,
    borderRadius: "2px",
    padding: "14px 16px",
    color: COLORS.text,
    fontSize: "13px",
    outline: "none",
    width: "100%",
    boxSizing: "border-box",
    transition: "border 0.2s",
  },
  emptyState: {
    textAlign: "center",
    padding: "80px 20px",
    color: COLORS.textMuted,
  },
};

// ── Background Effects Component ──────────────────────────────
function TenbinBackground() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    
    let w = window.innerWidth;
    let h = window.innerHeight;
    canvas.width = w;
    canvas.height = h;

    // Generates a 3D Interactive Node Network
    const particles = [];
    for(let i=0; i<120; i++) {
       particles.push({
          x: Math.random() * w,
          y: Math.random() * h,
          z: Math.random() * 3 + 0.5, // 3D depth field (Z-Axis)
          vx: (Math.random() - 0.5) * 0.4,
          vy: (Math.random() - 0.5) * 0.4
       });
    }

    let mouseX = w / 2;
    let mouseY = h / 2;

    const onMove = (e) => { mouseX = e.clientX; mouseY = e.clientY; };
    window.addEventListener('mousemove', onMove);

    let animFrame;
    const draw = () => {
       ctx.clearRect(0, 0, w, h);
       for(let i=0; i<particles.length; i++) {
          const p = particles[i];
          // Slow drift
          p.x += p.vx;
          p.y += p.vy;
          
          if(p.x < 0 || p.x > w) p.vx *= -1;
          if(p.y < 0 || p.y > h) p.vy *= -1;

          // Localized magnetic 'reach': nodes gently pull toward the cursor when touched
          const mouseDist = Math.sqrt((p.x - mouseX)**2 + (p.y - mouseY)**2);
          let dx = 0, dy = 0;
          let highlight = 0;
          if (mouseDist < 120) {
             const force = (120 - mouseDist) / 120;
             dx = (mouseX - p.x) * force * 0.25; 
             dy = (mouseY - p.y) * force * 0.25;
             highlight = force * 0.5;
          }
          
          const renderX = p.x + dx;
          const renderY = p.y + dy;

          // Draw the nodes (Delicate highlight when near cursor)
          ctx.beginPath();
          ctx.arc(renderX, renderY, p.z * 0.4, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(255, 255, 255, ${0.8 + highlight})`; 
          ctx.fill();

          // Connect nearby dots (Static connections unless near cursor)
          for(let j=i+1; j<particles.length; j++) {
             const p2 = particles[j];
             
             // Calculate p2's attraction
             const mouseDist2 = Math.sqrt((p2.x - mouseX)**2 + (p2.y - mouseY)**2);
             let dx2 = 0, dy2 = 0;
             if (mouseDist2 < 120) {
                const force2 = (120 - mouseDist2) / 120;
                dx2 = (mouseX - p2.x) * force2 * 0.25;
                dy2 = (mouseY - p2.y) * force2 * 0.25;
             }
             
             const renderX2 = p2.x + dx2;
             const renderY2 = p2.y + dy2;
             
             const dist = Math.sqrt((renderX - renderX2)**2 + (renderY - renderY2)**2);
             if (dist < 150) { 
                 ctx.beginPath();
                 ctx.moveTo(renderX, renderY);
                 ctx.lineTo(renderX2, renderY2);
                 ctx.lineWidth = 0.2 + (highlight * 0.1); 
                 ctx.strokeStyle = `rgba(255, 255, 255, ${0.6 + (1 - dist/150) * 0.4})`; 
                 ctx.stroke();
             }
          }
       }
       animFrame = requestAnimationFrame(draw);
    };
    
    draw();
    
    const onResize = () => { w = window.innerWidth; h = window.innerHeight; canvas.width = w; canvas.height = h; };
    window.addEventListener('resize', onResize);
    
    return () => {
       window.removeEventListener('mousemove', onMove);
       window.removeEventListener('resize', onResize);
       cancelAnimationFrame(animFrame);
    };
  }, []);

  return (
    <>
      {/* 3D Canvas Interactive Node Network */}
      <canvas ref={canvasRef} style={{ position: 'fixed', inset: 0, zIndex: -1, pointerEvents: 'none' }} />
      
      {/* Ambient Radial Glows */}
      <div style={{
        position: 'fixed', top: '-10%', left: '-10%', width: '40vw', height: '40vw',
        background: 'radial-gradient(circle, rgba(255,255,255,0.08) 0%, rgba(0,0,0,0) 70%)',
        filter: 'blur(60px)', zIndex: 0, pointerEvents: 'none',
      }} />
      <div style={{
        position: 'fixed', bottom: '-20%', right: '-10%', width: '60vw', height: '60vw',
        background: 'radial-gradient(circle, rgba(206, 221, 44, 0.06) 0%, rgba(0,0,0,0) 70%)',
        filter: 'blur(80px)', zIndex: 0, pointerEvents: 'none',
      }} />
      
      {/* Central Atmospheric Glow */}
      <div style={{
        position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
        width: '100vw', height: '100vh',
        background: 'radial-gradient(circle, rgba(255, 255, 255, 0.03) 0%, rgba(0,0,0,0) 80%)',
        zIndex: 0, pointerEvents: 'none',
      }} />
    </>
  );
}

// ... Rest of User's UI translated into the aesthetic ...

function LoginPage({ onLogin }) {
  const [name, setName] = useState("");
  return (
    <div style={{
      minHeight: "100vh", background: COLORS.bg,
      display: "flex", alignItems: "center", justifyContent: "center",
      fontFamily: "'Inter', sans-serif", position: "relative"
    }}>
      <TenbinBackground />
      <div style={{ width: "420px", zIndex: 1 }}>
        <div style={{ textAlign: "center", marginBottom: "48px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "12px", marginBottom: "12px" }}>
            <img src="/logo_3d.png" style={{ width: "48px", height: "48px", mixBlendMode: "screen", filter: "brightness(1.2) contrast(1.1)" }} alt="Logo" />
            <h1 style={{ fontSize: "32px", fontWeight: "400", color: COLORS.text, margin: 0, letterSpacing: "2px", textTransform: "uppercase" }}>
              NeuralLedger
            </h1>
          </div>
          <p style={{ fontSize: "11px", color: COLORS.textMuted, marginTop: "4px", letterSpacing: "3px", textTransform: "uppercase" }}>
            Institutional Scale Liquidity
          </p>
        </div>
        <div style={{ ...styles.card, padding: "40px" }}>
          <p style={{ fontSize: "9px", color: COLORS.textDim, textTransform: "uppercase", letterSpacing: "2px", marginBottom: "12px" }}>
            System Access
          </p>
          <input
            style={styles.input}
            placeholder="Enter operator ID"
            value={name}
            onChange={e => setName(e.target.value)}
            onKeyDown={e => e.key === "Enter" && onLogin(name || "Soul Reapers")}
          />
          <button
            style={{ ...styles.btn(), width: "100%", marginTop: "24px" }}
            onClick={() => onLogin(name || "Soul Reapers")}
            onMouseEnter={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#fff'; }}
            onMouseLeave={e => { e.currentTarget.style.background = '#fff'; e.currentTarget.style.color = '#000'; }}
          >
            Authenticate
          </button>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, accent, sub }) {
  return (
    <div style={styles.statCard(accent)}>
      <div style={styles.statLabel}>{label}</div>
      <div style={{ ...styles.statValue, marginTop: "16px" }}>{value}</div>
      {sub && <div style={{ fontSize: "10px", color: COLORS.textMuted, marginTop: "auto", letterSpacing: "1px", textTransform: "uppercase" }}>{sub}</div>}
    </div>
  );
}

function StatusBadge({ status }) {
  if (status === "RESOLVED") return <span style={styles.badge(COLORS.green, COLORS.greenDim)}>Resolved</span>;
  if (status === "MANUAL_REVIEW") return <span style={styles.badge(COLORS.red, COLORS.redDim)}>Manual Review</span>;
  if (status === "CLEAN") return <span style={styles.badge(COLORS.text, COLORS.blueDim)}>Clean</span>;
  return <span style={styles.badge(COLORS.textMuted, COLORS.surfaceHover)}>{status}</span>;
}

function AnomalyBadge({ type }) {
  const map = {
    MISSING_CREATED: [COLORS.amber, COLORS.amberDim],
    OUT_OF_ORDER: [COLORS.text, COLORS.blueDim],
    DUPLICATE_EVENT: [COLORS.textDim, "transparent"],
    EMPTY_EVENTS: [COLORS.red, COLORS.redDim],
    INVALID_EVENTS: [COLORS.red, COLORS.redDim],
  };
  const [c, bg] = map[type] || [COLORS.textMuted, "transparent"];
  return <span style={styles.badge(c, bg)}>{type?.replace(/_/g, " ")}</span>;
}

function DashboardPage() {
  const [issues, setIssues] = useState([]);
  const [metrics, setMetrics] = useState(null);
  const [surge, setSurge] = useState(null);
  const [flags, setFlags] = useState([]);
  const [insightsLoading, setInsightsLoading] = useState(true);
  const [insightsError, setInsightsError] = useState(false);
  const [selectedTxn, setSelectedTxn] = useState(null);

  const fetchData = useCallback(async () => {
    try {
      const resIssues = await fetch(`${API}/patterns/security`);
      if (resIssues.ok) {
        const data = await resIssues.json();
        setIssues(data.anomalies || []);
      }
      
      const resMetrics = await fetch(`${API}/patterns/metrics`);
      if (resMetrics.ok) setMetrics(await resMetrics.json());

      const resSurge = await fetch(`${API}/patterns/surge`);
      if (resSurge.ok) setSurge(await resSurge.json());

      const resFlags = await fetch(`${API}/api/dashboard/pattern-insights`);
      if (resFlags.ok) {
         const data = await resFlags.json();
         setFlags(data || []);
         setInsightsError(false);
      } else {
         setInsightsError(true);
      }
    } catch {
      setInsightsError(true);
    } finally {
      setInsightsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const totalProcessed = metrics?.total || "0";
  const driftRate = metrics?.driftRate ? metrics.driftRate + "%" : "0%";
  const healSuccessRate = metrics?.healSuccessRate ? metrics.healSuccessRate + "%" : "0%";
  const manualReviewCount = metrics?.pending || 0;

  const tableRows = issues.map(dbRow => {
     let issueName = dbRow.anomaly_type ? dbRow.anomaly_type.replace(/_/g, " ") : "System Fault";
     let statusString = dbRow.action === "RESOLVED" ? "Resolved" : dbRow.action === "MANUAL_REVIEW" ? "Under Review" : "Auto-Healed";
     
     return { 
       id: dbRow.transaction_id, 
       seq: dbRow.detail || "Corrupted Frame", 
       issue: issueName, 
       status: statusString, 
       act: "Inspect",
       raw: dbRow
     };
  });

  return (
    <div style={styles.content}>
      <div style={styles.pageTitle}>System Health & Pipeline Dashboard</div>
      <div style={styles.pageSubtitle}>Real-time monitoring of webhook events and autonomous ledger reconciliations</div>

      <div style={styles.grid4}>
        <StatCard label="Total Processed" value={totalProcessed} accent={COLORS.blue} />
        <StatCard label="System Drift Rate" value={driftRate} accent={COLORS.amber} sub="Events out of alignment" />
        <StatCard label="Auto-Healed" value={healSuccessRate} accent={COLORS.green} sub="Successfully patched" />
        <StatCard label="Manual Review" value={manualReviewCount} accent={COLORS.red} sub="Awaiting operator" />
      </div>

      <div style={{ display: "flex", gap: "24px", marginTop: "40px" }}>
          
          {/* Active Anomalies Panes */}
          <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "24px" }}>
            <div style={{ ...styles.card, display: "flex", flexDirection: "column", flex: 1, padding: "28px" }}>
              <div style={{ marginBottom: "20px" }}>
                <div style={{ fontSize: "14px", color: COLORS.text, fontWeight: "600", letterSpacing: "0.5px", marginBottom: "6px" }}>
                  Pattern Detection Insights
                </div>
                <div style={{ fontSize: "12px", color: COLORS.textDim }}>
                  AI-driven aggregate system pattern monitoring
                </div>
              </div>
              
              <div style={{ display: "flex", flexDirection: "column", gap: "12px", flex: 1 }}>
                {insightsLoading ? (
                  <div style={{ ...styles.emptyState, padding: "40px 20px" }}>Initializing Neural Handshake... Fetching baseline data...</div>
                ) : insightsError ? (
                  <div style={{ ...styles.emptyState, padding: "40px 20px", color: COLORS.red }}>Error retrieving AI pattern insights from engine. Check server connection.</div>
                ) : flags.length > 0 ? (
                  flags.map((alert, i) => {
                     let color = alert.severity === 'high' ? COLORS.red : alert.severity === 'medium' ? COLORS.amber : COLORS.blue;
                     let detectedTime = alert.detectedAt ? new Date(alert.detectedAt).toLocaleTimeString() : "Just now";
                     return (
                       <div key={i} style={{ flex: 1, display: "flex", alignItems: "center", gap: "16px", padding: "16px 20px", border: `1px solid rgba(255,184,0,0.4)`, borderRadius: "8px", background: `linear-gradient(90deg, rgba(255,184,0,0.08) 0%, transparent 100%)` }}>
                          <div style={{ fontSize: "16px", color: color, width: "20px", textAlign: "center" }}>⚠</div>
                          <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "6px" }}>
                            <div style={{ fontSize: "14px", fontWeight: "600", color: COLORS.text, letterSpacing: "0.2px", textTransform: 'capitalize' }}>
                              <span style={styles.badge(color, "transparent")}>{alert.severity}</span> {alert.type.replace(/_/g, " ")}
                            </div>
                            <div style={{ fontSize: "12px", color: COLORS.textMuted }}>{alert.message}</div>
                          </div>
                          <div style={{ fontSize: "11px", color: COLORS.textDim, whiteSpace: "nowrap", textAlign: "right" }}>
                             <div>Cur: {alert.currentValue?.toFixed(2)} | Bsl: {alert.baselineValue?.toFixed(2)}</div>
                             <div style={{ marginTop: "4px", color: COLORS.textMuted }}>{detectedTime}</div>
                          </div>
                       </div>
                     );
                  })
                ) : (
                  <div style={{ ...styles.emptyState, padding: "40px 20px" }}>Stable baselines. No aggregate pattern anomalies detected.</div>
                )}
              </div>
            </div>
          </div>
          
          <div style={{ ...styles.card, padding: "20px 28px", minWidth: "300px" }}>
            <div style={{ fontSize: "11px", color: COLORS.textMuted, textTransform: "uppercase", letterSpacing: "2px", marginBottom: "16px" }}>
              Webhook Security & Surge Control
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px", fontSize: "11px", color: COLORS.textDim, textTransform: "uppercase", letterSpacing: "1px", marginBottom: "8px" }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}><span>Signature Verif:</span> <span style={{ color: COLORS.green }}>Enabled</span></div>
              <div style={{ display: "flex", justifyContent: "space-between" }}><span>Replay Protect:</span> <span style={{ color: COLORS.green }}>Active</span></div>
              <div style={{ display: "flex", justifyContent: "space-between" }}><span>Idempotency Guard:</span> <span style={{ color: COLORS.green }}>Active</span></div>
            </div>
            {surge ? (
               <div style={{ padding: "12px", background: "rgba(255,255,255,0.02)", borderRadius: "4px", fontSize: "10px", color: COLORS.textMuted, marginTop: "16px" }}>
                 <div style={{ color: surge.status === "HEALTHY" ? COLORS.green : COLORS.red }}>RATE LIMIT HEALTH: {surge.status}</div>
                 <div style={{ marginTop: "4px" }}>Requests queued: {surge.queueDepth}</div>
               </div>
            ) : null}
          </div>
      </div>

      <div style={{ ...styles.card, marginBottom: "32px", padding: "20px 28px" }}>
        <div style={{ fontSize: "11px", color: COLORS.textDim, textTransform: "uppercase", letterSpacing: "2px", marginBottom: "16px" }}>
          Reconciliation Pipeline
        </div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "8px", flexWrap: "wrap" }}>
          {["Webhook Ingestion", "Idempotency Check", "Event Log", "State Machine", "Auto-Heal", "Final Ledger"].map((step, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: "16px", marginBottom: "8px" }}>
              <div style={{ fontSize: "11px", padding: "8px 16px", background: COLORS.surfaceHover, border: `1px solid ${COLORS.border}`, borderRadius: "2px", color: COLORS.text, fontWeight: "500", textTransform: "uppercase", letterSpacing: "1px" }}>{step}</div>
              {i < 5 && <span style={{ color: COLORS.borderLight }}>→</span>}
            </div>
          ))}
        </div>
      </div>

      <div style={styles.grid2}>
        <div style={styles.card}>
          <div style={{ fontSize: "11px", color: COLORS.textMuted, textTransform: "uppercase", letterSpacing: "2px", marginBottom: "24px" }}>
            Anomaly Detection Breakdown
          </div>
          {[
            { type: "Duplicate Events", count: 42, color: COLORS.amber },
            { type: "Missing Events", count: 21, color: COLORS.red },
            { type: "Out-of-Order Events", count: 16, color: COLORS.blue },
            { type: "Delayed Events", count: 11, color: COLORS.textMuted },
            { type: "Unresolved Cases", count: 17, color: COLORS.redDim }
          ].map((data) => (
            <div key={data.type} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px" }}>
              <span style={{ fontSize: "12px", color: COLORS.textDim, textTransform: "uppercase", letterSpacing: "1px" }}>{data.type}</span>
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <div style={{ width: "140px", height: "6px", borderRadius: "2px", background: COLORS.border, overflow: "hidden" }}>
                  <div style={{ width: `${(data.count / 42) * 100}%`, height: "100%", background: data.color === COLORS.redDim ? COLORS.red : data.color, borderRadius: "2px" }} />
                </div>
                <span style={{ fontSize: "14px", color: COLORS.text, width: "24px", textAlign: "right", fontFamily:"'Space Grotesk', monospace" }}>{data.count}</span>
              </div>
            </div>
          ))}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
          <div style={{ ...styles.card, display: "flex", flexDirection: "column", flex: 1, padding: "28px" }}>
            <div style={{ marginBottom: "20px" }}>
              <div style={{ fontSize: "14px", color: COLORS.text, fontWeight: "600", letterSpacing: "0.5px", marginBottom: "6px" }}>
                Active Anomalies
              </div>
              <div style={{ fontSize: "12px", color: COLORS.textDim }}>
                Recent alerts and detected issues
              </div>
            </div>
            
            <div style={{ display: "flex", flexDirection: "column", gap: "12px", flex: 1 }}>
              {flags.length > 0 ? flags.map((alert, i) => {
                 let color = alert.severity === 'high' ? COLORS.red : COLORS.amber;
                 let bColor = color.replace(')', ', 0.4)').replace('rgb', 'rgba'); // simple mock for border
                 return (
                   <div key={i} style={{ flex: 1, display: "flex", alignItems: "center", gap: "16px", padding: "16px 20px", border: `1px solid rgba(255,184,0,0.4)`, borderRadius: "8px", background: `linear-gradient(90deg, rgba(255,184,0,0.08) 0%, transparent 100%)` }}>
                      <div style={{ fontSize: "16px", color: color, width: "20px", textAlign: "center" }}>⚠</div>
                      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "6px" }}>
                        <div style={{ fontSize: "14px", fontWeight: "600", color: COLORS.text, letterSpacing: "0.2px", textTransform: 'capitalize' }}>{alert.type.replace(/_/g, " ")}</div>
                        <div style={{ fontSize: "12px", color: COLORS.textMuted }}>{alert.message}</div>
                      </div>
                      <div style={{ fontSize: "11px", color: COLORS.textDim, whiteSpace: "nowrap" }}>
                         Cur: {alert.currentValue?.toFixed(2)} | Bsl: {alert.baselineValue?.toFixed(2)}
                      </div>
                   </div>
                 );
              }) : (
                 <div style={{ ...styles.emptyState, padding: "40px 20px" }}>Stable baselines. No aggregate pattern anomalies detected.</div>
              )}
            </div>
          </div>
          <div style={{ ...styles.card, padding: "20px 28px" }}>
            <div style={{ fontSize: "11px", color: COLORS.textMuted, textTransform: "uppercase", letterSpacing: "2px", marginBottom: "16px" }}>
              Webhook Security & Surge Control
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", color: COLORS.textDim, textTransform: "uppercase", letterSpacing: "1px", marginBottom: "8px" }}>
              <span>Signature Verif: <span style={{ color: COLORS.green }}>Enabled</span></span>
              <span>Replay Protect: <span style={{ color: COLORS.green }}>Active</span></span>
              <span>Idempotency Guard: <span style={{ color: COLORS.green }}>Active</span></span>
            </div>
            {surge && (
               <div style={{ padding: "12px", background: COLORS.surfaceHover, borderRadius: "4px", fontSize: "10px", color: COLORS.textMuted, marginTop: "12px" }}>
                 <div style={{ color: surge.status === "HEALTHY" ? COLORS.blue : COLORS.red }}>RATE LIMIT HEALTH: {surge.status}</div>
                 <div style={{ display: "flex", justifyContent: "space-between", marginTop: "4px" }}>
                    <span>Avg Resp: {surge.avgResponseTime}ms</span>
                    <span>Queued: {surge.queueDepth}</span>
                    <span>Limit: {surge.currentLimit} req/s</span>
                 </div>
               </div>
            )}
          </div>
        </div>
      </div>

      <div style={styles.card}>
        <div style={{ fontSize: "11px", color: COLORS.textDim, textTransform: "uppercase", letterSpacing: "2px", marginBottom: "24px" }}>
          Recent Anomalous Transactions
        </div>
        <table style={styles.table}>
          <thead>
            <tr>
              {["Transaction ID", "Event Sequence", "Detected Issue", "Status", "Action"].map(h => <th key={h} style={styles.th}>{h}</th>)}
            </tr>
          </thead>
          <tbody>
            {tableRows.length > 0 ? tableRows.map((r, i) => (
              <tr key={i} style={{ transition: "background 0.2s", borderBottom:`1px solid ${COLORS.border}` }}
                onMouseEnter={e => e.currentTarget.style.background = COLORS.surfaceHover}
                onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                <td style={{ ...styles.td, color: COLORS.text, fontFamily: "'Space Grotesk', monospace" }}>{r.id}</td>
                <td style={{ ...styles.td, color: COLORS.textDim }}>{r.seq}</td>
                <td style={{ ...styles.td, color: COLORS.textMuted }}>{r.issue}</td>
                <td style={styles.td}>
                   <span style={styles.badge(
                     r.status === 'Auto-Healed' ? COLORS.green : 
                     r.status === 'Under Review' ? COLORS.red : 
                     r.status === 'Resolved' ? COLORS.blue : COLORS.amber, 
                     "transparent"
                   )}>{r.status}</span>
                </td>
                <td style={styles.td}><button style={styles.btn("sm")} onClick={() => setSelectedTxn(r)}>{r.act}</button></td>
              </tr>
            )) : (
              <tr><td colSpan="5" style={{ ...styles.emptyState, textAlign: "left", padding: "32px 16px" }}>No anomalies logged. Node streams are secure.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* AI Inspector Modal */}
      {selectedTxn && (
        <div style={{
          position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
          background: "rgba(0, 0, 5, 0.85)", backdropFilter: "blur(6px)",
          display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999
        }}>
          <div style={{ ...styles.card, width: "640px", maxWidth: "90vw", border: `1px solid ${COLORS.blueDim}`, boxShadow: `0 0 40px ${COLORS.blueDim}` }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
              <div style={{ fontSize: "14px", color: COLORS.text, textTransform: "uppercase", letterSpacing: "2px", fontWeight: "600", display: "flex", alignItems: "center", gap: "10px" }}>
                <div style={{ width: "8px", height: "8px", background: COLORS.blue, borderRadius: "50%", boxShadow: `0 0 10px ${COLORS.blue}` }} />
                AI Audit Inspector
              </div>
              <button 
                onClick={() => setSelectedTxn(null)} 
                style={{ background: "transparent", border: "none", color: COLORS.textDim, fontSize: "24px", cursor: "pointer", transition: "color 0.2s" }}
                onMouseEnter={e => e.currentTarget.style.color = COLORS.text}
                onMouseLeave={e => e.currentTarget.style.color = COLORS.textDim}
              >×</button>
            </div>
            
            <div style={{ display: "flex", gap: "24px", marginBottom: "24px", paddingBottom: "16px", borderBottom: `1px solid ${COLORS.border}` }}>
              <span style={{ fontSize: "11px", color: COLORS.textDim, textTransform: "uppercase", letterSpacing: "1px" }}>Target: <span style={{ color: COLORS.text, fontFamily: "'Space Grotesk', monospace", marginLeft: "6px" }}>{selectedTxn.id}</span></span>
              <span style={{ fontSize: "11px", color: COLORS.textDim, textTransform: "uppercase", letterSpacing: "1px" }}>Status: <span style={{ color: selectedTxn.status === 'Resolved' ? COLORS.blue : selectedTxn.status === 'Under Review' ? COLORS.red : COLORS.amber, marginLeft: "6px" }}>{selectedTxn.status}</span></span>
            </div>

            <div style={{ fontSize: "10px", color: COLORS.blueLight, textTransform: "uppercase", letterSpacing: "2px", marginBottom: "12px", fontWeight: "600" }}>Neural Engine Analysis</div>
            <div style={{ background: "rgba(77, 163, 255, 0.05)", borderLeft: `3px solid ${COLORS.blue}`, padding: "20px", borderRadius: "0 4px 4px 0", color: COLORS.text, fontSize: "14px", lineHeight: "1.6", marginBottom: "28px", letterSpacing: "0.2px", fontStyle: "italic" }}>
              "{selectedTxn.raw?.explanation || "Awaiting advanced generative analysis from backend nodes."}"
            </div>

            <div style={{ fontSize: "10px", color: COLORS.textMuted, textTransform: "uppercase", letterSpacing: "2px", marginBottom: "12px" }}>Raw Ledger Output</div>
            <pre style={{ background: "#020204", border: `1px solid ${COLORS.borderLight}`, padding: "20px", borderRadius: "4px", color: COLORS.green, fontFamily: "'Space Grotesk', monospace", fontSize: "12px", overflowX: "auto", maxHeight: "250px", boxShadow: "inset 0 0 20px rgba(0,0,0,0.8)" }}>
              {JSON.stringify(selectedTxn.raw || { message: "Simulated Data Record", sync_status: "AWAITING_WEBHOOK" }, null, 2)}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}

function InterventionBadge({ strategy }) {
  const map = {
    SEQUENCING: [COLORS.blue, COLORS.blueDim],
    SYNTHETIC_INJECTION: [COLORS.green, COLORS.greenDim],
    DUPLICATE_PRUNING: [COLORS.amber, COLORS.amberDim],
    VALIDATION_BYPASS: [COLORS.red, COLORS.redDim],
  };
  const [c, bg] = map[strategy] || [COLORS.textMuted, "transparent"];
  return <span style={styles.badge(c, bg)}>{strategy?.replace(/_/g, " ")}</span>;
}

function HealLogPage() {
  const [interventions] = useState([]);

  return (
    <div style={styles.content}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: "40px" }}>
        <div>
          <div style={styles.pageTitle}>Strategic Interventions</div>
          <div style={styles.pageSubtitle}>Autonomous Ledger Correction Pipeline (ALCP) Activity</div>
        </div>
        <button style={styles.btn("sm")}>Export Compliance Report</button>
      </div>

      <div style={styles.grid4}>
        <StatCard label="Autonomous Efficacy" value="98.4%" accent={COLORS.green} />
        <StatCard label="Avg. Core Latency" value="14.2ms" accent={COLORS.blue} />
        <StatCard label="Labor Shift (H)" value="122.5" accent={COLORS.amber} sub="Man-Hours Saved" />
        <StatCard label="Ledger Fidelity" value="HIGH" accent={COLORS.green} sub="Verified Integrity" />
      </div>

      <div style={styles.card}>
        <div style={{ fontSize: "11px", color: COLORS.textDim, textTransform: "uppercase", letterSpacing: "2px", marginBottom: "32px" }}>
          Active Interventions & Strategy Logging
        </div>
        <table style={styles.table}>
          <thead>
            <tr>
              {["Audit ID", "Transaction", "Strategy", "Confidence", "AI Strategic Logic", "Status"].map(h => <th key={h} style={styles.th}>{h}</th>)}
            </tr>
          </thead>
          <tbody>
            {interventions.length > 0 ? interventions.map((int, i) => (
              <tr key={i} style={{ transition: "background 0.2s", borderBottom:`1px solid ${COLORS.border}` }}
                onMouseEnter={e => e.currentTarget.style.background = COLORS.surfaceHover}
                onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                <td style={{ ...styles.td, color: COLORS.textMuted, fontFamily: "'Space Grotesk', monospace" }}>{int.id}</td>
                <td style={{ ...styles.td, color: COLORS.text, fontFamily: "'Space Grotesk', monospace" }}>{int.txn}</td>
                <td style={styles.td}><InterventionBadge strategy={int.strategy} /></td>
                <td style={{ ...styles.td, color: COLORS.green, fontWeight: "600" }}>{int.confidence}</td>
                <td style={{ ...styles.td, fontSize: "11px", color: COLORS.textDim }}>{int.reason}</td>
                <td style={styles.td}>
                   <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <div style={{ width: "6px", height: "6px", borderRadius: "50%", background: COLORS.green }} />
                      <span style={{ color: COLORS.green }}>{int.status}</span>
                   </div>
                </td>
              </tr>
            )) : (
              <tr><td colSpan="6" style={{ ...styles.emptyState, textAlign: "left", padding: "32px 16px" }}>Neural Engine has not required any synthetic interventions yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ManualReviewPage() { 
  const [txnId, setTxnId] = useState("");
  const [statusMsg, setStatusMsg] = useState("");

  const handleResolve = async (decision) => {
    if (!txnId) return;
    try {
      const res = await fetch(`${API}/review/resolve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transaction_id: txnId, decision })
      });
      if (res.ok) setStatusMsg(`Transaction ${txnId} successfully marked as ${decision}.`);
      else setStatusMsg(`Error escalating transaction.`);
      setTxnId("");
    } catch (e) {
      console.error(e);
      setStatusMsg("Network failure.");
    }
  };

  return (
    <div style={styles.content}>
      <div style={styles.pageTitle}>Human Operator Review Console</div>
      <div style={styles.pageSubtitle}>Forced command override for transactions marked unresolvable by the Neural Engine</div>
      
      <div style={{ ...styles.card, maxWidth: "600px" }}>
        <p style={{ fontSize: "11px", color: COLORS.textDim, textTransform: "uppercase", letterSpacing: "2px", marginBottom: "16px" }}>
          Target Identification
        </p>
        <input 
          style={{ ...styles.input, marginBottom: "20px" }}
          placeholder="Enter Transaction ID (e.g. txn_103...)"
          value={txnId}
          onChange={(e) => setTxnId(e.target.value)}
        />
        <div style={{ display: "flex", gap: "12px" }}>
          <button style={{ ...styles.btn(), background: COLORS.green, color: "#000", border: "none" }} onClick={() => handleResolve("SAFE")}>
            Force Approve (Safe)
          </button>
          <button style={{ ...styles.btn(), background: "transparent", color: COLORS.red, border: `1px solid ${COLORS.redDim}` }} onClick={() => handleResolve("FRAUD")}>
            Confirm Fraud (Reject)
          </button>
        </div>
        
        {statusMsg && (
           <div style={{ marginTop: "24px", padding: "12px", background: "rgba(255,255,255,0.05)", borderRadius: "4px", fontSize: "12px", color: COLORS.green }}>
             {statusMsg}
           </div>
        )}
      </div>
    </div>
  );
}
function GatewayPage() { 
  const [txnId, setTxnId] = useState("");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleQuery = async () => {
    if (!txnId) return;
    setLoading(true);
    try {
      const res = await fetch(`${API}/check`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transaction_id: txnId })
      });
      if (res.ok) {
        setResult(await res.json());
      } else {
        setResult({ error: "No anomaly detected, or transaction not found.", status: res.status });
      }
    } catch {
      setResult({ error: "Connection to endpoint failed. Network Error." });
    }
    setLoading(false);
  };

  return (
    <div style={styles.content}>
      <div style={styles.pageTitle}>Transaction Check Engine</div>
      <div style={styles.pageSubtitle}>Direct query access to check and auto-heal transaction health via /check endpoint</div>
      
      <div style={{...styles.card, marginBottom: "24px"}}>
        <div style={{ fontSize: "11px", color: COLORS.textMuted, textTransform: "uppercase", letterSpacing: "2px", marginBottom: "16px" }}>
          Query Canonical History
        </div>
        <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
          <input 
            type="text" 
            placeholder="Enter Transaction ID (e.g. txn_2003)" 
            value={txnId}
            onChange={(e) => setTxnId(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleQuery()}
            style={{ flex: 1, background: "rgba(0,0,0,0.5)", border: `1px solid ${COLORS.border}`, outline: "none", borderRadius: "4px", padding: "12px 16px", color: COLORS.text, fontFamily: "'Space Grotesk', monospace", fontSize: "14px" }}
          />
          <button onClick={handleQuery} style={{ ...styles.btn("md"), padding: "12px 32px", fontSize: "14px", height: "auto" }}>
            {loading ? "Querying..." : "Execute"}
          </button>
        </div>
      </div>

      <div style={{...styles.card, minHeight: "300px"}}>
        <div style={{ fontSize: "11px", color: COLORS.textMuted, textTransform: "uppercase", letterSpacing: "2px", marginBottom: "16px" }}>
          Gateway Response Node
        </div>
        {result ? (
          <pre style={{ background: "rgba(0,0,0,0.5)", border: `1px solid ${COLORS.borderLight}`, padding: "24px", borderRadius: "4px", color: result.error ? COLORS.red : COLORS.blueLight, fontFamily: "'Space Grotesk', monospace", fontSize: "13px", overflowX: "auto", boxShadow: "inset 0 0 20px rgba(0,0,0,0.8)" }}>
            {JSON.stringify(result, null, 2)}
          </pre>
        ) : (
          <div style={{...styles.emptyState, marginTop: "60px"}}>Awaiting transaction query block...</div>
        )}
      </div>
    </div>
  ); 
}

const NAV = [
  { id: "dashboard", label: "Dashboard" },
  { id: "heallog", label: "Interventions" },
  { id: "manual", label: "Manual Review" },
  { id: "gateway", label: "Gateway Node" },
];

export default function App() {
  const [user, setUser] = useState(null);
  const [page, setPage] = useState("dashboard");

  if (!user) return <LoginPage onLogin={setUser} />;

  const pageMap = { dashboard: <DashboardPage />, heallog: <HealLogPage />, manual: <ManualReviewPage />, gateway: <GatewayPage /> };
  const pageTitle = NAV.find(n => n.id === page)?.label;

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500&family=Space+Grotesk:wght@300;400;500&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: ${COLORS.bg}; }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: ${COLORS.borderLight}; border-radius: 2px; }
      `}</style>
      <div style={styles.app}>
        <TenbinBackground />
        
        <div style={styles.sidebar}>
          <div style={styles.sidebarLogo}>
            <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
              <img 
                 src="/logo_3d.png" 
                 style={{ 
                    width: '38px', 
                    height: '38px', 
                    mixBlendMode: 'screen',
                    filter: 'brightness(1.4) drop-shadow(0 0 10px rgba(255,255,255,0.2))' 
                 }} 
                 alt="Neural Ledger Protocol" 
              />
              <div style={{ display: "flex", flexDirection: "column" }}>
                <div style={styles.logoText}>NEURALLEDGER</div>
                <div style={styles.logoSub}>Protocol v2.4</div>
              </div>
            </div>
          </div>
          <div style={styles.navSection}>
            <div style={styles.navLabel}>Modules</div>
            {NAV.map(n => (
              <div key={n.id} style={styles.navItem(page === n.id)} onClick={() => setPage(n.id)}>
                {n.label}
              </div>
            ))}
          </div>
        </div>

        <div style={styles.main}>
          <div style={styles.topbar}>
            <div>
              <div style={styles.topbarTitle}>Webhook Reconciliation Engine</div>
              <div style={{ fontSize: "10px", color: COLORS.textMuted, marginTop: "4px", letterSpacing: "1px", textTransform: "uppercase" }}>
                Autonomous Ledger Healing Dashboard
              </div>
            </div>
            <div style={styles.topbarRight}>
              <div style={styles.liveDot} />
              <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start" }}>
                <span style={{ fontSize: "11px", color: COLORS.text, letterSpacing: "1px", textTransform: "uppercase", fontWeight: "600" }}>System Healthy</span>
                <span style={{ fontSize: "9px", color: COLORS.textDim, textTransform: "uppercase", letterSpacing: "1.5px" }}>Monitoring Live</span>
              </div>
            </div>
          </div>
          {pageMap[page]}
          
          {/* Global Footer */}
          <div style={{ padding: "30px 40px", textAlign: "center", borderTop: `1px solid ${COLORS.borderLight}`, background: "rgba(0,0,0,0.5)", marginTop: "auto" }}>
            <span style={{ fontSize: "11px", color: COLORS.textDim, letterSpacing: "1px" }}>
              Ensuring webhook reliability, ledger correctness, and autonomous transaction healing.
            </span>
          </div>
        </div>
      </div>
    </>
  );
}
