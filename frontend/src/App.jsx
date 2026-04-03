import React, { useState, useEffect, useRef } from 'react';
import './index.css';

const eventTypes = ['payment.created', 'payment.authorized', 'payment.captured', 'payment.refunded', 'payment.failed'];
const statuses = ['ACCEPTED', 'ACCEPTED', 'ACCEPTED', 'ACCEPTED', 'DUPLICATE', 'HEALED', 'ANOMALY'];
const anomalyTypes = ['Sequence gap', 'Double capture', 'Terminal violation', 'Out-of-order', 'Heal failure'];
const fsmStatesInitial = [
  { label: 'created', color: '#4a6080', pct: 15 },
  { label: 'authorized', color: '#00d4ff', pct: 25 },
  { label: 'captured', color: '#00ff94', pct: 45 },
  { label: 'refunded', color: '#7c6fff', pct: 8 },
  { label: 'failed', color: '#ff4466', pct: 7 },
];

function txnId() { return 'TXN' + Math.random().toString(36).substr(2, 6).toUpperCase(); }
function pad(n) { return String(n).padStart(2, '0'); }
function randBetween(a, b) { return Math.floor(Math.random() * (b - a + 1)) + a; }

export default function App() {
  const [clockStr, setClockStr] = useState('--:--:-- IST');
  const [uptimeStr, setUptimeStr] = useState('00:00:00');
  
  // Data Refs instead of state to prevent massive re-renders on rapid 900ms updates 
  // We'll sync them to state periodically or just update state 
  const [metrics, setMetrics] = useState({
    totalWh: 0,
    healed: 0,
    failed: 0,
    manualCount: 0,
    dupCount: 0,
    idemCount: 0,
    dbRows: 0,
  });

  const [feed, setFeed] = useState([]);
  const [anomalies, setAnomalies] = useState([]);
  const [sparkData, setSparkData] = useState([]);
  const [healHistory, setHealHistory] = useState(
    Array(8).fill(null).map(() => ({ h: randBetween(2, 14), f: Math.floor(Math.random() * 3), p: Math.floor(Math.random() * 4) }))
  );
  
  const [reqRate, setReqRate] = useState(0);
  const [healDelta, setHealDelta] = useState(0);
  const [driftDelta, setDriftDelta] = useState({ val: 0, up: true });

  const startTimeRef = useRef(Date.now());

  // Clock interval
  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      setClockStr(`${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())} IST`);
      
      const s = Math.floor((Date.now() - startTimeRef.current) / 1000);
      setUptimeStr(`${pad(Math.floor(s / 3600))}:${pad(Math.floor((s % 3600) / 60))}:${pad(s % 60)}`);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Main Event Generation
  useEffect(() => {
    const addEvent = () => {
      const type = eventTypes[Math.floor(Math.random() * eventTypes.length)];
      const status = statuses[Math.floor(Math.random() * statuses.length)];
      const latency = randBetween(8, 180);
      const now = new Date();
      const time = `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
      const txn = txnId();

      setMetrics(prev => {
        const next = { ...prev };
        next.totalWh++;
        next.idemCount++;
        next.dbRows++;
        if (status === 'DUPLICATE') next.dupCount++;
        if (status === 'HEALED') { next.healed++; next.dbRows++; }
        if (status === 'ANOMALY') { next.failed++; next.manualCount++; }
        return next;
      });

      setSparkData(prev => {
        const d = [...prev, prev.length > 0 ? prev[prev.length - 1] + 1 : 1];
        if (d.length > 20) d.shift();
        return d;
      });

      setFeed(prev => {
        const badgeClass = { ACCEPTED: 'badge-ok', DUPLICATE: 'badge-dup', HEALED: 'badge-heal', ANOMALY: 'badge-err' }[status] || 'badge-ok';
        const newEvent = { id: Math.random(), time, txn, type, status, badgeClass, latency };
        const next = [newEvent, ...prev];
        if (next.length > 50) next.pop();
        return next;
      });

      if (status === 'ANOMALY') {
        setAnomalies(prev => {
          const type = anomalyTypes[Math.floor(Math.random() * anomalyTypes.length)];
          const isCritical = Math.random() > .5;
          const newAnom = { id: Math.random(), txn, type, isCritical };
          const next = [newAnom, ...prev];
          if (next.length > 20) next.pop();
          return next;
        });
        
        setHealHistory(prev => {
            const hist = [...prev];
            hist[7] = { ...hist[7], f: hist[7].f + 1 };
            return hist;
        })
      }
    };

    // Pre-populate
    for (let i = 0; i < 8; i++) setTimeout(() => addEvent(), i * 120);

    const timer = setInterval(addEvent, 900);
    return () => clearInterval(timer);
  }, []);

  // Periodic metrics
  useEffect(() => {
     const timer = setInterval(() => {
        setReqRate(randBetween(4, 18));
        setHealDelta((Math.random() * 2).toFixed(1));
        setDriftDelta({
            up: Math.random() > .5,
            val: (Math.random() * 0.5).toFixed(2)
        });
     }, 3000);
     return () => clearInterval(timer);
  }, []);

  // Derived computations
  const hr = metrics.totalWh > 0 ? Math.round((metrics.healed / (metrics.healed + metrics.failed || 1)) * 1000) / 10 : 0;
  const dr = metrics.totalWh > 0 ? Math.round((metrics.manualCount / metrics.totalWh) * 1000) / 10 : 0;

  // Sparkline Generation
  let sparkPts = "";
  if (sparkData.length >= 2) {
      const min = Math.min(...sparkData), max = Math.max(...sparkData);
      sparkPts = sparkData.map((v, i) => {
        const x = (i / (sparkData.length - 1)) * 100;
        const y = max === min ? 14 : 28 - ((v - min) / (max - min)) * 24;
        return `${x},${y}`;
      }).join(' ');
  }

  const chartLabels = ['T-7', 'T-6', 'T-5', 'T-4', 'T-3', 'T-2', 'T-1', 'NOW'];

  return (
    <>
      <div className="grid-bg"></div>
      <div className="dash">

        {/* Header */}
        <div className="header">
          <div className="logo">
            <div className="logo-icon">
              <svg viewBox="0 0 18 18" fill="none"><path d="M2 9h4l2-6 4 12 2-6h2" stroke="#080c14" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </div>
            <div>
              <div className="logo-text">RECONCILE·OS</div>
              <div className="logo-sub">WEBHOOK RECONCILIATION ENGINE</div>
            </div>
          </div>
          <div className="header-right">
            <div className="live-badge"><div className="pulse"></div>LIVE</div>
            <div className="timestamp" id="clock">{clockStr}</div>
          </div>
        </div>

        {/* Metric Cards */}
        <div className="metrics">
          <div className="card blue">
            <div className="card-label">Total Webhooks</div>
            <div className="card-value">{metrics.totalWh.toLocaleString()}</div>
            <div className="card-sub">processed today</div>
            <div className="sparkline">
                <svg id="spark-total" viewBox="0 0 100 28" preserveAspectRatio="none">
                    <polyline id="spark-line-total" points={sparkPts} fill="none" stroke="#00d4ff" strokeWidth="1.5" opacity="0.8"/>
                </svg>
            </div>
          </div>
          <div className="card green">
            <div className="card-label">Heal Success Rate</div>
            <div className="card-value">{hr}%</div>
            <div className="card-sub">auto-resolved gaps</div>
            <div className="card-delta delta-up">+{healDelta}% vs last hr</div>
          </div>
          <div className="card warn">
            <div className="card-label">Drift Rate</div>
            <div className="card-value">{dr}%</div>
            <div className="card-sub">ledger vs expected</div>
            <div className={`card-delta ${driftDelta.up ? 'delta-dn' : 'delta-up'}`}>
                {driftDelta.up ? '▲' : '▼'} {driftDelta.val}% vs last hr
            </div>
          </div>
          <div className="card danger">
            <div className="card-label">Manual Review</div>
            <div className="card-value">{metrics.manualCount}</div>
            <div className="card-sub">unresolvable anomalies</div>
            <div className="card-delta delta-dn">{metrics.manualCount} new this session</div>
          </div>
        </div>

        {/* Main grid */}
        <div className="main-grid">
          {/* Event feed */}
          <div className="panel">
            <div className="panel-header">
              <span className="panel-title">// LIVE EVENT FEED</span>
              <span className="panel-count">{feed.length} events</span>
            </div>
            <div style={{display:'grid', gridTemplateColumns:'70px 100px 1fr 80px 60px', gap:'8px', padding:'6px 18px', borderBottom:'1px solid var(--border)'}}>
              <span style={{fontFamily:'var(--mono)', fontSize:'9px', color:'var(--muted)', letterSpacing:'1px'}}>TIME</span>
              <span style={{fontFamily:'var(--mono)', fontSize:'9px', color:'var(--muted)', letterSpacing:'1px'}}>TXN_ID</span>
              <span style={{fontFamily:'var(--mono)', fontSize:'9px', color:'var(--muted)', letterSpacing:'1px'}}>EVENT TYPE</span>
              <span style={{fontFamily:'var(--mono)', fontSize:'9px', color:'var(--muted)', letterSpacing:'1px'}}>STATUS</span>
              <span style={{fontFamily:'var(--mono)', fontSize:'9px', color:'var(--muted)', letterSpacing:'1px', textAlign:'right'}}>MS</span>
            </div>
            <div className="feed" id="event-feed">
                {feed.map(f => (
                    <div className="event-row" key={f.id}>
                        <span className="event-time">{f.time}</span>
                        <span className="event-txn">{f.txn}</span>
                        <span className="event-type">{f.type}</span>
                        <span><span className={`badge ${f.badgeClass}`}>{f.status}</span></span>
                        <span className="latency">{f.latency}ms</span>
                    </div>
                ))}
            </div>
          </div>

          {/* FSM state distribution */}
          <div className="fsm-panel">
            <div className="panel-header">
              <span className="panel-title">// FSM STATE MAP</span>
              <span className="panel-count">{metrics.totalWh} txns</span>
            </div>
            <div className="fsm-body">
              <div className="fsm-track">
                {fsmStatesInitial.map((s, i) => (
                    <React.Fragment key={s.label}>
                        <div className="fsm-state">
                            <div className="fsm-dot" style={{background:s.color, color:s.color}}></div>
                            <span className="fsm-label" style={{fontFamily:'var(--mono)', fontSize:'11px'}}>{s.label}</span>
                            <div className="fsm-bar-wrap">
                                <div className="fsm-bar" style={{width:`${s.pct}%`, background:s.color}}></div>
                            </div>
                            <span className="fsm-count">{randBetween(10,200)}</span>
                        </div>
                        {i < fsmStatesInitial.length - 1 && <div className="fsm-line"></div>}
                    </React.Fragment>
                ))}
              </div>
            </div>
            <div style={{padding:'14px 18px', borderTop:'1px solid var(--border)'}}>
              <div style={{fontFamily:'var(--mono)', fontSize:'10px', color:'var(--muted)', marginBottom:'8px', letterSpacing:'1px'}}>IDEMPOTENCY CACHE</div>
              <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                <div style={{fontFamily:'var(--mono)', fontSize:'18px', color:'var(--accent)'}}>{metrics.idemCount.toLocaleString()}</div>
                <div style={{fontSize:'11px', color:'var(--muted)'}}>keys cached</div>
                <div style={{fontFamily:'var(--mono)', fontSize:'11px', color:'var(--warn)'}}>{metrics.dupCount} replays dropped</div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom grid */}
        <div className="bottom-grid">
          {/* Anomaly queue */}
          <div className="panel">
            <div className="panel-header">
              <span className="panel-title">// ANOMALY QUEUE</span>
              <span className="panel-count">{metrics.manualCount} pending</span>
            </div>
            <div style={{display:'grid', gridTemplateColumns:'90px 1fr 80px 90px 36px', gap:'8px', padding:'6px 18px', borderBottom:'1px solid var(--border)'}}>
              <span style={{fontFamily:'var(--mono)', fontSize:'9px', color:'var(--muted)'}}>TXN</span>
              <span style={{fontFamily:'var(--mono)', fontSize:'9px', color:'var(--muted)'}}>TYPE</span>
              <span style={{fontFamily:'var(--mono)', fontSize:'9px', color:'var(--muted)'}}>SEVERITY</span>
              <span style={{fontFamily:'var(--mono)', fontSize:'9px', color:'var(--muted)'}}>STATUS</span>
              <span></span>
            </div>
            <div id="anomaly-list" style={{maxHeight:'180px', overflowY:'auto'}}>
                {anomalies.map(a => (
                    <div className="anomaly-row" key={a.id}>
                        <span className="anomaly-id">{a.txn}</span>
                        <span className="anomaly-type">{a.type}</span>
                        <span className={a.isCritical ? 'severity-high' : 'severity-mid'}>
                            <span className="sev-dot" style={{background: a.isCritical ? 'var(--danger)' : 'var(--warn)'}}></span>
                            {a.isCritical ? 'CRITICAL' : 'HIGH'}
                        </span>
                        <span className="badge badge-err" style={{fontSize:'9px'}}>PENDING</span>
                        <button className="review-btn">→</button>
                    </div>
                ))}
            </div>
          </div>

          {/* Heal rate chart */}
          <div className="panel">
            <div className="panel-header">
              <span className="panel-title">// HEAL ACTIVITY</span>
              <span className="panel-count">last 8 cycles</span>
            </div>
            <div className="heal-chart">
              <div className="bar-chart">
                  {healHistory.map((d, i) => {
                      const total = d.h + d.f + d.p || 1;
                      const maxH = 70;
                      return (
                          <div className="bar-col" key={i}>
                              <div style={{display:'flex', flexDirection:'column-reverse', gap:'2px', flex:1, width:'100%', alignItems:'stretch'}}>
                                  <div className="bar" style={{height:`${(d.h/total)*maxH}px`, background:'var(--accent2)', opacity: i===7 ? 1 : .7}}></div>
                                  <div className="bar" style={{height:`${(d.f/total)*maxH}px`, background:'var(--danger)', opacity: i===7 ? 1 : .7}}></div>
                                  <div className="bar" style={{height:`${(d.p/total)*maxH}px`, background:'var(--warn)', opacity: i===7 ? 1 : .7}}></div>
                              </div>
                              <span className="bar-label">{chartLabels[i]}</span>
                          </div>
                      );
                  })}
              </div>
              <div style={{display:'flex', justifyContent:'space-between', marginTop:'12px'}}>
                <div style={{display:'flex', alignItems:'center', gap:'6px', fontSize:'11px', color:'var(--muted)'}}>
                  <div style={{width:'8px', height:'8px', background:'var(--accent2)', borderRadius:'1px'}}></div>Healed
                </div>
                <div style={{display:'flex', alignItems:'center', gap:'6px', fontSize:'11px', color:'var(--muted)'}}>
                  <div style={{width:'8px', height:'8px', background:'var(--danger)', borderRadius:'1px'}}></div>Failed
                </div>
                <div style={{display:'flex', alignItems:'center', gap:'6px', fontSize:'11px', color:'var(--muted)'}}>
                  <div style={{width:'8px', height:'8px', background:'var(--warn)', borderRadius:'1px'}}></div>Pending
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="footer-strip">
          <div className="footer-stat">
            <span className="footer-stat-label">GATEWAY</span>
            <span className="footer-stat-val">Razorpay · Stripe · Cashfree</span>
          </div>
          <div className="divider-v"></div>
          <div className="footer-stat">
            <span className="footer-stat-label">DB</span>
            <span className="footer-stat-val">{metrics.dbRows} rows</span>
          </div>
          <div className="divider-v"></div>
          <div className="footer-stat">
            <span className="footer-stat-label">RATE LIMIT</span>
            <span className="footer-stat-val">{reqRate} req/s</span>
          </div>
          <div className="divider-v"></div>
          <div className="footer-stat">
            <span className="footer-stat-label">UPTIME</span>
            <span className="footer-stat-val">{uptimeStr}</span>
          </div>
          <div className="status-ok"><div className="pulse"></div>ALL SYSTEMS OPERATIONAL</div>
        </div>

      </div>
    </>
  );
}
