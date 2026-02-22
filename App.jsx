import { useState, useEffect, useRef } from "react";

/* ═══════════════════════════════════════════════════════
   GLOBAL STYLES — Fonts · CSS Vars · Keyframes
═══════════════════════════════════════════════════════ */
const GlobalStyles = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,700;0,9..144,900;1,9..144,900&family=Outfit:wght@300;400;500;600;700&display=swap');

    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

    :root {
      --bg-page:                #F5F0E8;
      --bg-sidebar:             #F0EBE3;
      --bg-card:                #FFFFFF;
      --bg-card-hover:          #FAFAF8;
      --border:                 rgba(0,0,0,0.07);
      --text-primary:           #1A1410;
      --text-secondary:         #7A6E5F;
      --text-muted:             #B0A898;
      --green-primary:          #1B5E35;
      --green-accent:           #22C55E;
      --sidebar-active-bg:      rgba(34,197,94,0.08);
      --sidebar-active-text:    #1B5E35;
      --sidebar-active-border:  #1B5E35;
      --selected-card-bg:       #FFFFFF;
      --selected-card-border:   #3B4FDE;
      --selected-badge-bg:      #3B4FDE;
      --selected-badge-text:    #FFFFFF;
      --highload-badge-bg:      #FEE2E2;
      --highload-badge-text:    #DC2626;
      --workload-green:         #1B5E35;
      --workload-red:           #EF4444;
      --workload-track:         #E5E7EB;
      --stat-total-color:       #1B5E35;
      --stat-completed-color:   #6B7280;
      --stat-blocked-color:     #F59E0B;
      --stat-overdue-color:     #EF4444;
      --tab-active-text:        #1B5E35;
      --tab-active-border:      #1B5E35;
      --tab-inactive-text:      #7A6E5F;
      --badge-high-bg:          #FEF3C7;
      --badge-high-text:        #92400E;
      --badge-critical-bg:      #EF4444;
      --badge-critical-text:    #FFFFFF;
      --badge-less-bg:          #F3F4F6;
      --badge-less-text:        #6B7280;
      --badge-ps4-bg:           #F3F4F6;
      --badge-ps4-text:         #374151;
      --status-inprogress-bg:   #EFF6FF;
      --status-inprogress-text: #1D4ED8;
      --status-inprogress-border:#BFDBFE;
      --status-todo-bg:         #F9FAFB;
      --status-todo-text:       #374151;
      --status-todo-border:     #E5E7EB;
      --reassign-text:          #6B7280;
      --tag-design-bg:          #F0FDF4;
      --tag-design-text:        #15803D;
      --tag-fc-bg:              #F0FDF4;
      --tag-fc-text:            #15803D;
      --meeting-date-bg:        #F0FDF4;
      --meeting-date-text:      #1B5E35;
      --availability-dot:       #22C55E;
      --invite-btn-bg:          #FFFFFF;
      --invite-btn-border:      #E5E7EB;
      --invite-btn-text:        #1A1410;
      --new-member-btn-bg:      #1B5E35;
      --new-member-btn-text:    #FFFFFF;
      --card-shadow:            0 1px 3px rgba(0,0,0,0.04), 0 8px 24px rgba(0,0,0,0.06);
      --card-inset:             none;
    }

    :root.dark {
      --bg-page:                #080C10;
      --bg-sidebar:             #0C0F14;
      --bg-card:                rgba(255,255,255,0.03);
      --bg-card-hover:          rgba(255,255,255,0.05);
      --border:                 rgba(255,255,255,0.06);
      --text-primary:           #F0ECE4;
      --text-secondary:         #4A5568;
      --text-muted:             #2A3A4A;
      --green-primary:          #4DE38A;
      --green-accent:           #22C55E;
      --sidebar-active-bg:      rgba(77,227,138,0.08);
      --sidebar-active-text:    #4DE38A;
      --sidebar-active-border:  #4DE38A;
      --selected-card-bg:       rgba(59,79,222,0.08);
      --selected-card-border:   rgba(79,110,247,0.5);
      --selected-badge-bg:      #4F6EF7;
      --selected-badge-text:    #FFFFFF;
      --highload-badge-bg:      rgba(239,68,68,0.12);
      --highload-badge-text:    #F87171;
      --workload-green:         #4DE38A;
      --workload-red:           #F87171;
      --workload-track:         rgba(255,255,255,0.08);
      --stat-total-color:       #4DE38A;
      --stat-completed-color:   #4A5568;
      --stat-blocked-color:     #FBBF24;
      --stat-overdue-color:     #F87171;
      --tab-active-text:        #4DE38A;
      --tab-active-border:      #4DE38A;
      --tab-inactive-text:      #3A4A5A;
      --badge-high-bg:          rgba(251,191,36,0.12);
      --badge-high-text:        #FBBF24;
      --badge-critical-bg:      rgba(239,68,68,0.85);
      --badge-critical-text:    #FFFFFF;
      --badge-less-bg:          rgba(255,255,255,0.06);
      --badge-less-text:        #6B7280;
      --badge-ps4-bg:           rgba(255,255,255,0.06);
      --badge-ps4-text:         #9CA3AF;
      --status-inprogress-bg:   rgba(29,78,216,0.12);
      --status-inprogress-text: #60A5FA;
      --status-inprogress-border:rgba(59,130,246,0.25);
      --status-todo-bg:         rgba(255,255,255,0.04);
      --status-todo-text:       #9CA3AF;
      --status-todo-border:     rgba(255,255,255,0.08);
      --reassign-text:          #2A3A4A;
      --tag-design-bg:          rgba(77,227,138,0.08);
      --tag-design-text:        #4DE38A;
      --tag-fc-bg:              rgba(77,227,138,0.08);
      --tag-fc-text:            #4DE38A;
      --meeting-date-bg:        rgba(77,227,138,0.1);
      --meeting-date-text:      #4DE38A;
      --availability-dot:       #4DE38A;
      --invite-btn-bg:          rgba(255,255,255,0.05);
      --invite-btn-border:      rgba(255,255,255,0.1);
      --invite-btn-text:        #F0ECE4;
      --new-member-btn-bg:      linear-gradient(135deg,#1A5C32,#22A455);
      --new-member-btn-text:    #FFFFFF;
      --card-shadow:            0 1px 3px rgba(0,0,0,0.3), 0 8px 24px rgba(0,0,0,0.4);
      --card-inset:             inset 0 1px 0 rgba(255,255,255,0.04);
    }

    html, body { height: 100%; font-family: 'Outfit', sans-serif; }
    #root { height: 100%; }

    * {
      transition: background-color 350ms ease, color 350ms ease,
                  border-color 350ms ease, box-shadow 350ms ease;
    }

    /* Grain overlay in dark mode */
    :root.dark body::after {
      content: '';
      position: fixed; inset: 0; pointer-events: none; z-index: 999;
      opacity: 0.02;
      background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
    }

    /* Green bloom in dark mode */
    :root.dark body::before {
      content: '';
      position: fixed; top: -200px; left: -200px;
      width: 700px; height: 700px; border-radius: 50%;
      background: radial-gradient(circle, rgba(34,164,85,0.05) 0%, transparent 70%);
      pointer-events: none; z-index: 0;
    }

    @keyframes fadeSlideUp {
      from { opacity:0; transform:translateY(10px); }
      to   { opacity:1; transform:translateY(0);    }
    }
    @keyframes growWidth {
      from { width:0; }
    }

    .anim-up-0 { animation: fadeSlideUp 400ms ease both 0ms;   }
    .anim-up-1 { animation: fadeSlideUp 400ms ease both 60ms;  }
    .anim-up-2 { animation: fadeSlideUp 400ms ease both 120ms; }
    .anim-up-3 { animation: fadeSlideUp 400ms ease both 180ms; }

    ::-webkit-scrollbar { width: 4px; }
    ::-webkit-scrollbar-track { background: transparent; }
    ::-webkit-scrollbar-thumb { background: var(--border); border-radius: 2px; }

    input:focus { outline: none; }
  `}</style>
);

/* ═══════════════════════════════════════════════════════
   INLINE SVG ICONS
═══════════════════════════════════════════════════════ */
const IcShield = ({ s = 16, c = "currentColor" }) => (
  <svg width={s} height={s} viewBox="0 0 24 24" fill={c}>
    <path d="M12 2L3 6v6c0 5.25 3.75 10.15 9 11.35C17.25 22.15 21 17.25 21 12V6l-9-4z"/>
  </svg>
);
const IcGrid = ({ s = 16 }) => (
  <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
    <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/>
    <rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>
  </svg>
);
const IcPeople = ({ s = 16 }) => (
  <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
    <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/>
    <circle cx="9" cy="7" r="4"/>
    <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/>
  </svg>
);
const IcFolder = ({ s = 16 }) => (
  <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
    <path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z"/>
  </svg>
);
const IcGear = ({ s = 16 }) => (
  <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
    <circle cx="12" cy="12" r="3"/>
    <path d="M19.07 4.93a10 10 0 010 14.14M4.93 4.93a10 10 0 000 14.14"/>
  </svg>
);
const IcSearch = ({ s = 16 }) => (
  <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
    <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
  </svg>
);
const IcPlus = ({ s = 14 }) => (
  <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
    <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
  </svg>
);
const IcPersonPlus = ({ s = 15 }) => (
  <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
    <path d="M16 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/>
    <circle cx="8.5" cy="7" r="4"/>
    <line x1="20" y1="8" x2="20" y2="14"/><line x1="17" y1="11" x2="23" y2="11"/>
  </svg>
);
const IcDots = ({ s = 18 }) => (
  <svg width={s} height={s} viewBox="0 0 24 24" fill="currentColor">
    <circle cx="12" cy="5" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="12" cy="19" r="1.5"/>
  </svg>
);
const IcChevron = ({ s = 13 }) => (
  <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
    <polyline points="6 9 12 15 18 9"/>
  </svg>
);
const IcReassign = ({ s = 14 }) => (
  <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
    <polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 014-4h14"/>
    <polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 01-4 4H3"/>
  </svg>
);
const IcCalendar = ({ s = 16 }) => (
  <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
    <rect x="3" y="4" width="18" height="18" rx="2"/>
    <line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/>
    <line x1="3" y1="10" x2="21" y2="10"/>
  </svg>
);
const IcSun = ({ s = 18 }) => (
  <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="#F59E0B" strokeWidth={2}>
    <circle cx="12" cy="12" r="5"/>
    <line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/>
    <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
    <line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/>
    <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
  </svg>
);
const IcMoon = ({ s = 18 }) => (
  <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="#C8D8E8" strokeWidth={2}>
    <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/>
  </svg>
);
const IcFiFA = ({ s = 15 }) => (
  <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
    <rect x="3" y="3" width="18" height="18" rx="2"/>
    <line x1="3" y1="9" x2="21" y2="9"/><line x1="3" y1="15" x2="21" y2="15"/>
    <line x1="9" y1="3" x2="9" y2="21"/>
  </svg>
);

/* ═══════════════════════════════════════════════════════
   AVATAR ILLUSTRATIONS
═══════════════════════════════════════════════════════ */
// Sai P — 48px card avatar
const AvatarSai48 = () => (
  <div style={{
    width:48, height:48, borderRadius:"50%",
    background:"linear-gradient(135deg,#D4B896,#C4A882)",
    display:"flex", alignItems:"center", justifyContent:"center",
    overflow:"hidden", flexShrink:0, position:"relative",
  }}>
    <svg viewBox="0 0 48 48" width={48} height={48}>
      {/* Body */}
      <ellipse cx="24" cy="54" rx="18" ry="14" fill="#E8C9A0"/>
      {/* Neck */}
      <rect x="19" y="32" width="10" height="10" rx="2" fill="#E8C9A0"/>
      {/* Face */}
      <ellipse cx="24" cy="24" rx="12" ry="14" fill="#F2D5B0"/>
      {/* Hair */}
      <ellipse cx="24" cy="14" rx="12" ry="8" fill="#1A0F00"/>
      <ellipse cx="14" cy="20" rx="3.5" ry="5" fill="#1A0F00"/>
      <ellipse cx="34" cy="20" rx="3.5" ry="5" fill="#1A0F00"/>
      {/* Eyes */}
      <ellipse cx="19.5" cy="23" rx="2" ry="2.2" fill="#1A0F00"/>
      <ellipse cx="28.5" cy="23" rx="2" ry="2.2" fill="#1A0F00"/>
      <circle cx="20.2" cy="22.3" r="0.7" fill="#fff"/>
      <circle cx="29.2" cy="22.3" r="0.7" fill="#fff"/>
      {/* Nose */}
      <ellipse cx="24" cy="27" rx="1.2" ry="0.8" fill="#D4A882"/>
      {/* Mouth */}
      <path d="M20.5 31 Q24 34 27.5 31" stroke="#C09070" strokeWidth="1.2" fill="none" strokeLinecap="round"/>
      {/* Shirt collar */}
      <path d="M16 38 L24 44 L32 38" fill="#FFFFFF" stroke="#E0E0E0" strokeWidth="0.5"/>
    </svg>
  </div>
);

// Sai P — 90×105 detail panel avatar
const AvatarSai90 = () => (
  <div style={{
    width:90, height:105,
    borderRadius:"16px",
    background:"linear-gradient(145deg,#C8B4A0,#D4C0AC)",
    overflow:"hidden",
    flexShrink:0,
    position:"relative",
  }}>
    <svg viewBox="0 0 90 105" width={90} height={105}>
      {/* Shirt */}
      <ellipse cx="45" cy="115" rx="40" ry="30" fill="#FFFFFF"/>
      {/* Neck */}
      <rect x="36" y="68" width="18" height="18" rx="3" fill="#F2D0A8"/>
      {/* Face */}
      <ellipse cx="45" cy="52" rx="26" ry="30" fill="#F5D5B0"/>
      {/* Hair */}
      <ellipse cx="45" cy="28" rx="27" ry="20" fill="#1A0F00"/>
      <ellipse cx="22" cy="42" rx="7" ry="14" fill="#1A0F00"/>
      <ellipse cx="68" cy="42" rx="7" ry="14" fill="#1A0F00"/>
      {/* Ears */}
      <ellipse cx="20" cy="53" rx="4" ry="5.5" fill="#F5D5B0"/>
      <ellipse cx="70" cy="53" rx="4" ry="5.5" fill="#F5D5B0"/>
      {/* Eyes */}
      <ellipse cx="35" cy="50" rx="4.5" ry="5" fill="#1A0F00"/>
      <ellipse cx="55" cy="50" rx="4.5" ry="5" fill="#1A0F00"/>
      <circle cx="36.5" cy="48.5" r="1.5" fill="#fff"/>
      <circle cx="56.5" cy="48.5" r="1.5" fill="#fff"/>
      {/* Eyebrows */}
      <path d="M30 44 Q35 41 40 44" stroke="#1A0F00" strokeWidth="2" fill="none" strokeLinecap="round"/>
      <path d="M50 44 Q55 41 60 44" stroke="#1A0F00" strokeWidth="2" fill="none" strokeLinecap="round"/>
      {/* Nose */}
      <ellipse cx="45" cy="58" rx="2.5" ry="1.8" fill="#D4A882"/>
      {/* Mouth */}
      <path d="M38 66 Q45 72 52 66" stroke="#C09070" strokeWidth="2" fill="none" strokeLinecap="round"/>
      {/* Shirt collar */}
      <path d="M30 82 L45 95 L60 82" fill="#FFFFFF" stroke="#E8E8E8" strokeWidth="1"/>
    </svg>
  </div>
);

// Elena Vance
const AvatarElena = () => (
  <div style={{
    width:48, height:48, borderRadius:"50%",
    background:"linear-gradient(135deg,#C4956A,#D4A878)",
    display:"flex", alignItems:"center", justifyContent:"center",
    overflow:"hidden", flexShrink:0,
  }}>
    <svg viewBox="0 0 48 48" width={48} height={48}>
      <ellipse cx="24" cy="54" rx="18" ry="14" fill="#F5E6D0"/>
      <rect x="19" y="33" width="10" height="9" rx="2" fill="#D4A878"/>
      <ellipse cx="24" cy="24" rx="11" ry="13" fill="#E8B888"/>
      {/* Hair */}
      <ellipse cx="24" cy="15" rx="12" ry="10" fill="#5C3317"/>
      <ellipse cx="13" cy="23" rx="4" ry="7" fill="#5C3317"/>
      <ellipse cx="35" cy="23" rx="4" ry="7" fill="#5C3317"/>
      <ellipse cx="24" cy="30" rx="13" ry="4" fill="#5C3317"/>
      {/* Eyes */}
      <ellipse cx="19.5" cy="23" rx="1.8" ry="2" fill="#3D2010"/>
      <ellipse cx="28.5" cy="23" rx="1.8" ry="2" fill="#3D2010"/>
      <circle cx="20.1" cy="22.4" r="0.6" fill="#fff"/>
      <circle cx="29.1" cy="22.4" r="0.6" fill="#fff"/>
      <path d="M17 20.5 Q19.5 19 22 20.5" stroke="#3D2010" strokeWidth="1.2" fill="none" strokeLinecap="round"/>
      <path d="M26 20.5 Q28.5 19 31 20.5" stroke="#3D2010" strokeWidth="1.2" fill="none" strokeLinecap="round"/>
      <ellipse cx="24" cy="27" rx="1" ry="0.7" fill="#C49070"/>
      <path d="M21 31 Q24 33.5 27 31" stroke="#C09070" strokeWidth="1" fill="none" strokeLinecap="round"/>
    </svg>
  </div>
);

/* ═══════════════════════════════════════════════════════
   WORKLOAD BAR — animates on mount
═══════════════════════════════════════════════════════ */
const WorkloadBar = ({ pct, color }) => {
  const [w, setW] = useState(0);
  useEffect(() => {
    const t = setTimeout(() => setW(pct), 80);
    return () => clearTimeout(t);
  }, [pct]);
  return (
    <div style={{
      height:10, borderRadius:999, background:"var(--workload-track)",
      overflow:"hidden",
    }}>
      <div style={{
        height:"100%", borderRadius:999,
        background: color === "green" ? "var(--workload-green)" : "var(--workload-red)",
        width:`${w}%`,
        transition:"width 600ms ease-out",
      }}/>
    </div>
  );
};

/* ═══════════════════════════════════════════════════════
   COL 1 — LEFT SIDEBAR
═══════════════════════════════════════════════════════ */
const Sidebar = () => (
  <aside style={{
    width:210, minWidth:210,
    background:"var(--bg-sidebar)",
    borderRight:"1px solid var(--border)",
    padding:"24px 16px",
    display:"flex", flexDirection:"column", justifyContent:"space-between",
    height:"100vh", overflow:"hidden", position:"relative", zIndex:1,
  }}>
    <div>
      {/* Logo */}
      <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:28 }}>
        <div style={{
          width:30, height:30, borderRadius:8,
          background:"var(--green-primary)", opacity:1,
          display:"flex", alignItems:"center", justifyContent:"center",
          flexShrink:0,
        }}>
          <IcShield s={16} c="#fff"/>
        </div>
        <span style={{
          fontFamily:"'Fraunces',serif", fontWeight:700, fontSize:18,
          color:"var(--text-primary)",
        }}>Coverly</span>
      </div>

      {/* Org label */}
      <p style={{ fontSize:9, fontWeight:600, letterSpacing:"0.12em", textTransform:"uppercase", color:"var(--text-muted)", marginBottom:8 }}>
        Organizations
      </p>

      {/* Org tree */}
      <div style={{ display:"flex", flexDirection:"column", gap:2 }}>
        <div style={{ display:"flex", alignItems:"center", gap:6, padding:"6px 8px", borderRadius:8, cursor:"pointer", color:"var(--text-secondary)" }}>
          <IcFiFA s={14}/><span style={{ fontSize:13, fontWeight:500 }}>FIFA</span>
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:6, paddingLeft:20, padding:"5px 8px 5px 20px", cursor:"pointer", color:"var(--text-secondary)" }}>
          <span style={{ fontSize:11, opacity:.5 }}>›</span>
          <span style={{ fontSize:12 }}>Shin Kuni DA FC</span>
        </div>
        <div style={{
          display:"flex", alignItems:"center", gap:6,
          paddingLeft:20, paddingRight:8, paddingTop:6, paddingBottom:6,
          borderRadius:"0 8px 8px 0",
          cursor:"pointer",
          background:"var(--sidebar-active-bg)",
          borderLeft:"2.5px solid var(--sidebar-active-border)",
          color:"var(--sidebar-active-text)",
        }}>
          <span style={{ fontSize:11, fontWeight:600 }}>·</span>
          <span style={{ fontSize:13, fontWeight:600 }}>France FC</span>
        </div>
      </div>

      {/* Divider */}
      <div style={{ height:1, background:"var(--border)", margin:"16px 0" }}/>

      {/* Nav label */}
      <p style={{ fontSize:9, fontWeight:600, letterSpacing:"0.12em", textTransform:"uppercase", color:"var(--text-muted)", marginBottom:8 }}>
        Navigation
      </p>

      {/* Nav items */}
      <div style={{ display:"flex", flexDirection:"column", gap:2 }}>
        {[
          { label:"Home",     icon:<IcGrid s={16}/>,   active:false },
          { label:"Team",     icon:<IcPeople s={16}/>, active:true  },
          { label:"Projects", icon:<IcFolder s={16}/>, active:false },
          { label:"Settings", icon:<IcGear s={16}/>,   active:false },
        ].map(({ label, icon, active }) => (
          <div key={label} style={{
            display:"flex", alignItems:"center", gap:10,
            padding:"10px 12px", borderRadius:"12px",
            cursor:"pointer",
            background: active ? "var(--sidebar-active-bg)" : "transparent",
            borderLeft: active ? "2.5px solid var(--sidebar-active-border)" : "2.5px solid transparent",
            color: active ? "var(--sidebar-active-text)" : "var(--text-secondary)",
            fontSize:14, fontWeight: active ? 700 : 500,
          }}>
            <span style={{ color: active ? "var(--sidebar-active-text)" : "var(--text-muted)" }}>{icon}</span>
            {label}
          </div>
        ))}
      </div>
    </div>

    {/* New Member button */}
    <button style={{
      width:"100%", height:48, borderRadius:12,
      background:"var(--new-member-btn-bg)",
      color:"var(--new-member-btn-text)",
      border:"none", cursor:"pointer",
      fontFamily:"'Outfit',sans-serif", fontWeight:700, fontSize:14,
      display:"flex", alignItems:"center", justifyContent:"center", gap:8,
      boxShadow:"0 4px 12px rgba(27,94,53,0.3)",
    }}
      onMouseEnter={e => { e.currentTarget.style.filter="brightness(1.06)"; e.currentTarget.style.transform="scale(1.01)"; }}
      onMouseLeave={e => { e.currentTarget.style.filter="none"; e.currentTarget.style.transform="scale(1)"; }}
    >
      <IcPersonPlus s={16}/> New Member
    </button>
  </aside>
);

/* ═══════════════════════════════════════════════════════
   MEMBER CARD
═══════════════════════════════════════════════════════ */
const MemberCard = ({ member, selected, onClick }) => {
  const [hovered, setHovered] = useState(false);

  const cardStyle = selected ? {
    background:"var(--selected-card-bg)",
    border:"1.5px solid var(--selected-card-border)",
    boxShadow:"0 0 0 3px rgba(59,79,222,0.12), 0 4px 16px rgba(59,79,222,0.1)",
  } : {
    background:"var(--bg-card)",
    border:"1px solid var(--border)",
    boxShadow: hovered
      ? "0 4px 20px rgba(0,0,0,0.12)"
      : "0 1px 3px rgba(0,0,0,0.04), 0 4px 12px rgba(0,0,0,0.05)",
    transform: hovered ? "translateY(-1px)" : "translateY(0)",
  };

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        borderRadius:16, padding:"16px 20px", cursor:"pointer",
        transition:"all 200ms",
        ...cardStyle,
      }}
    >
      {/* Top row */}
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom: member.workload ? 12 : 0 }}>
        <div style={{ display:"flex", alignItems:"center", gap:12 }}>
          {member.avatar}
          <div>
            <div style={{ fontSize:16, fontWeight:700, color:"var(--text-primary)" }}>{member.name}</div>
            <div style={{ fontSize:13, fontWeight:400, color:"var(--text-secondary)", marginTop:2 }}>{member.role}</div>
          </div>
        </div>
        {member.badge && (
          <span style={{
            padding:"4px 10px", borderRadius:8,
            fontSize:10, fontWeight:700, letterSpacing:"0.06em", textTransform:"uppercase",
            background: member.badge === "SELECTED"
              ? "var(--selected-badge-bg)"
              : "var(--highload-badge-bg)",
            color: member.badge === "SELECTED"
              ? "var(--selected-badge-text)"
              : "var(--highload-badge-text)",
            flexShrink:0,
          }}>
            {member.badge}
          </span>
        )}
      </div>

      {/* Workload */}
      {member.workload && (
        <div>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:6 }}>
            <span style={{ fontSize:12, fontWeight:500, color:"var(--text-secondary)" }}>Workload</span>
            <span style={{ fontSize:12, fontWeight:700, color:"var(--text-primary)" }}>{member.workload}/100</span>
          </div>
          <WorkloadBar pct={member.workload} color={member.workloadColor}/>
        </div>
      )}
    </div>
  );
};

/* ═══════════════════════════════════════════════════════
   STATUS DROPDOWN
═══════════════════════════════════════════════════════ */
const StatusDrop = ({ status }) => {
  const ip = status === "In Progress";
  return (
    <div style={{
      display:"inline-flex", alignItems:"center", gap:5,
      padding:"4px 10px 4px 8px",
      borderRadius:8,
      border:`1px solid ${ip ? "var(--status-inprogress-border)" : "var(--status-todo-border)"}`,
      background: ip ? "var(--status-inprogress-bg)" : "var(--status-todo-bg)",
      color: ip ? "var(--status-inprogress-text)" : "var(--status-todo-text)",
      fontSize:12, fontWeight:600, cursor:"pointer", userSelect:"none",
      whiteSpace:"nowrap",
    }}>
      {status}
      <IcChevron s={11}/>
    </div>
  );
};

/* ═══════════════════════════════════════════════════════
   TASK ROW
═══════════════════════════════════════════════════════ */
const TaskRow = ({ task, last }) => (
  <div style={{
    display:"grid",
    gridTemplateColumns:"28px 1fr 160px 120px 150px 90px",
    alignItems:"center", gap:8,
    padding:"14px 0",
    borderBottom: last ? "none" : "1px solid var(--border)",
  }}>
    {/* Checkbox */}
    <div style={{
      width:16, height:16, borderRadius:4,
      border:"1.5px solid var(--border)",
      background:"var(--bg-card)",
      flexShrink:0,
    }}/>

    {/* Task name + tags */}
    <div style={{ display:"flex", alignItems:"center", gap:6, minWidth:0 }}>
      <span style={{ fontSize:14, fontWeight:600, color:"var(--text-primary)", whiteSpace:"nowrap" }}>
        {task.name}
      </span>
      {task.tags.map(t => (
        <span key={t.label} style={{
          fontSize:10, fontWeight:700, letterSpacing:"0.04em",
          padding:"2px 6px", borderRadius:5,
          background: t.style === "ps4" ? "var(--badge-ps4-bg)" : "var(--badge-less-bg)",
          color: t.style === "ps4" ? "var(--badge-ps4-text)" : "var(--badge-less-text)",
          textTransform:"uppercase",
        }}>{t.label}</span>
      ))}
    </div>

    {/* Priority */}
    <div>
      <span style={{
        fontSize:10, fontWeight:700, letterSpacing:"0.04em",
        padding:"3px 8px", borderRadius:6, textTransform:"uppercase",
        background: task.priority === "HIGH" ? "var(--badge-high-bg)" : "var(--badge-critical-bg)",
        color: task.priority === "HIGH" ? "var(--badge-high-text)" : "var(--badge-critical-text)",
      }}>
        {task.priority}
      </span>
    </div>

    {/* Due date */}
    <div style={{ fontSize:13, fontWeight:500, color:"var(--text-secondary)", whiteSpace:"nowrap" }}>
      {task.due}
    </div>

    {/* Status */}
    <div><StatusDrop status={task.status}/></div>

    {/* Reassign */}
    <button style={{
      display:"flex", alignItems:"center", gap:5,
      background:"none", border:"none", cursor:"pointer",
      fontSize:12, fontWeight:500, color:"var(--reassign-text)",
      padding:"4px 6px",
    }}>
      <IcReassign s={13}/> REASSIGN
    </button>
  </div>
);

/* ═══════════════════════════════════════════════════════
   KEBAB DROPDOWN
═══════════════════════════════════════════════════════ */
const KebabMenu = () => {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);
  return (
    <div ref={ref} style={{ position:"relative" }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          background:"none", border:"none", cursor:"pointer",
          color:"var(--text-muted)", padding:8, borderRadius:8,
          display:"flex", alignItems:"center",
        }}
        onMouseEnter={e => { e.currentTarget.style.background="rgba(0,0,0,0.05)"; e.currentTarget.style.color="var(--text-primary)"; }}
        onMouseLeave={e => { e.currentTarget.style.background="none"; e.currentTarget.style.color="var(--text-muted)"; }}
      >
        <IcDots s={18}/>
      </button>
      {open && (
        <div style={{
          position:"absolute", right:0, top:"calc(100% + 4px)", zIndex:50,
          background:"var(--bg-card)", border:"1px solid var(--border)",
          borderRadius:12, overflow:"hidden", minWidth:160,
          boxShadow:"0 8px 32px rgba(0,0,0,0.12)",
        }}>
          {["Edit Profile","Remove from Team","Change Role"].map(item => (
            <div key={item} style={{
              padding:"10px 16px", fontSize:13, fontWeight:500,
              color:"var(--text-primary)", cursor:"pointer",
            }}
              onMouseEnter={e => e.currentTarget.style.background="var(--bg-card-hover)"}
              onMouseLeave={e => e.currentTarget.style.background="transparent"}
            >
              {item}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

/* ═══════════════════════════════════════════════════════
   COL 2 — MEMBER LIST
═══════════════════════════════════════════════════════ */
const MemberListPanel = ({ selectedId, onSelect }) => {
  const [search, setSearch] = useState("");
  const [focused, setFocused] = useState(false);

  const members = [
    {
      id: 1,
      name: "Sai P",
      role: "Product Designer",
      badge: "SELECTED",
      workload: 75,
      workloadColor: "green",
      avatar: <AvatarSai48/>,
    },
    {
      id: 2,
      name: "Sky junior",
      role: "Senior Developer",
      badge: "HIGH LOAD",
      workload: 93,
      workloadColor: "red",
      avatar: (
        <div style={{
          width:48, height:48, borderRadius:"50%",
          background:"#1E3A5F",
          display:"flex", alignItems:"center", justifyContent:"center",
          flexShrink:0,
          fontSize:20, fontWeight:700, color:"#fff",
          fontFamily:"'Outfit',sans-serif",
        }}>S</div>
      ),
    },
    {
      id: 3,
      name: "Elena Vance",
      role: "Marketing Lead",
      badge: null,
      workload: null,
      avatar: <AvatarElena/>,
    },
  ];

  const filtered = members.filter(m =>
    m.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div style={{
      width:420, minWidth:420,
      background:"var(--bg-page)",
      borderRight:"1px solid var(--border)",
      padding:"24px 20px",
      overflowY:"auto",
      height:"100vh",
      position:"relative", zIndex:1,
    }}>
      {/* Header */}
      <div className="anim-up-0">
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:4 }}>
          <div style={{ display:"flex", alignItems:"center", gap:12 }}>
            <span style={{ color:"var(--green-primary)" }}><IcPeople s={28}/></span>
            <h1 style={{
              fontFamily:"'Fraunces',serif", fontWeight:900, fontStyle:"italic",
              fontSize:30, color:"var(--text-primary)", lineHeight:1.1,
            }}>
              Team Management
            </h1>
          </div>
          <button style={{
            display:"flex", alignItems:"center", gap:6,
            padding:"8px 14px", borderRadius:10,
            background:"var(--invite-btn-bg)",
            border:"1px solid var(--invite-btn-border)",
            color:"var(--invite-btn-text)",
            fontSize:13, fontWeight:600, cursor:"pointer",
            fontFamily:"'Outfit',sans-serif",
          }}>
            <IcPersonPlus s={14}/> Invite Member
          </button>
        </div>
        <p style={{ fontSize:14, fontWeight:400, color:"var(--text-secondary)", marginBottom:20, marginTop:2 }}>
          Select a member to view and manage their tasks
        </p>
      </div>

      {/* Search */}
      <div className="anim-up-1" style={{
        display:"flex", alignItems:"center", gap:10,
        height:48, borderRadius:16, padding:"0 16px",
        background:"var(--bg-card)",
        border: focused
          ? "1.5px solid var(--green-primary)"
          : "1.5px solid var(--border)",
        boxShadow: focused
          ? "0 0 0 3px rgba(27,94,53,0.08)"
          : "0 1px 3px rgba(0,0,0,0.04)",
        marginBottom:20,
        transition:"all 200ms",
      }}>
        <span style={{ color:"var(--text-muted)", flexShrink:0 }}><IcSearch s={16}/></span>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder="Search members..."
          style={{
            flex:1, background:"transparent", border:"none",
            fontSize:14, fontFamily:"'Outfit',sans-serif",
            color:"var(--text-primary)",
          }}
        />
      </div>

      {/* Cards */}
      <div className="anim-up-2" style={{ display:"flex", flexDirection:"column", gap:12 }}>
        {filtered.map(m => (
          <MemberCard
            key={m.id}
            member={m}
            selected={selectedId === m.id}
            onClick={() => onSelect(m.id)}
          />
        ))}
      </div>
    </div>
  );
};

/* ═══════════════════════════════════════════════════════
   COL 3 — MEMBER DETAIL PANEL
═══════════════════════════════════════════════════════ */
const TABS = ["All 2","To Do 1","In Progress 1","Review 0","Done 0"];

const TASKS = [
  {
    name:"PSN",
    tags:[{ label:"PS4", style:"ps4" }],
    priority:"HIGH",
    due:"Feb 25, 2024",
    status:"In Progress",
  },
  {
    name:"Fix Bug",
    tags:[{ label:"LESS", style:"less" }],
    priority:"CRITICAL",
    due:"Feb 21, 2024",
    status:"To Do",
  },
];

const MemberDetailPanel = () => {
  const [activeTab, setActiveTab] = useState(0);

  const cardStyle = {
    background:"var(--bg-card)",
    border:"1px solid var(--border)",
    borderRadius:16,
    padding:24,
    boxShadow:"var(--card-shadow)",
    boxShadowAdditional:"var(--card-inset)",
  };

  return (
    <div style={{
      flex:1, background:"var(--bg-page)",
      padding:"24px", overflowY:"auto", minWidth:0,
      display:"flex", flexDirection:"column", gap:20,
      position:"relative", zIndex:1,
    }}>

      {/* ── PROFILE CARD ── */}
      <div className="anim-up-0" style={{
        ...cardStyle,
        boxShadow:`var(--card-shadow), var(--card-inset)`,
      }}>
        {/* Profile header */}
        <div style={{ display:"flex", alignItems:"flex-start", gap:20 }}>
          <AvatarSai90/>

          {/* Info */}
          <div style={{ flex:1 }}>
            <div style={{
              fontFamily:"'Fraunces',serif", fontWeight:900, fontStyle:"italic",
              fontSize:30, color:"var(--text-primary)", marginBottom:2,
            }}>Sai P</div>
            <div style={{ fontSize:14, fontWeight:400, color:"var(--text-secondary)", marginBottom:12 }}>
              sai.p@francefc.com
            </div>
            <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
              {["Product Design","France FC"].map(tag => (
                <span key={tag} style={{
                  fontSize:12, fontWeight:600,
                  padding:"4px 12px", borderRadius:999,
                  background: tag === "Product Design" ? "var(--tag-design-bg)" : "var(--tag-fc-bg)",
                  color: tag === "Product Design" ? "var(--tag-design-text)" : "var(--tag-fc-text)",
                  border:"1px solid rgba(21,128,61,0.18)",
                }}>
                  {tag}
                </span>
              ))}
            </div>
          </div>

          <KebabMenu/>
        </div>

        {/* Stat tiles */}
        <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:12, marginTop:20 }}>
          {[
            { label:"TOTAL",     value:"2", colorVar:"var(--stat-total-color)",     glow:"rgba(27,94,53,0.25)"  },
            { label:"COMPLETED", value:"0", colorVar:"var(--stat-completed-color)", glow:null },
            { label:"BLOCKED",   value:"0", colorVar:"var(--stat-blocked-color)",   glow:"rgba(245,158,11,0.2)" },
            { label:"OVERDUE",   value:"0", colorVar:"var(--stat-overdue-color)",   glow:"rgba(239,68,68,0.2)"  },
          ].map(({ label, value, colorVar, glow }) => (
            <div key={label} style={{
              background:"var(--bg-page)", border:"1px solid var(--border)",
              borderRadius:12, padding:"12px 16px",
              display:"flex", flexDirection:"column", alignItems:"center", textAlign:"center",
            }}>
              <p style={{ fontSize:9, fontWeight:600, letterSpacing:"0.14em", textTransform:"uppercase", color:"var(--text-muted)", marginBottom:6 }}>
                {label}
              </p>
              <span style={{
                fontFamily:"'Fraunces',serif", fontWeight:900,
                fontSize:42, lineHeight:1, color: colorVar,
                textShadow: glow ? `0 0 20px ${glow}` : "none",
              }}>
                {value}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* ── TASKS TABLE CARD ── */}
      <div className="anim-up-1" style={{
        ...cardStyle,
        boxShadow:`var(--card-shadow), var(--card-inset)`,
      }}>
        {/* Tab nav */}
        <div style={{
          display:"flex", alignItems:"center", gap:4,
          borderBottom:"1px solid var(--border)", marginBottom:20,
          paddingBottom:0,
        }}>
          {TABS.map((tab, i) => (
            <button
              key={tab}
              onClick={() => setActiveTab(i)}
              style={{
                background:"none", border:"none", cursor:"pointer",
                padding:"0 4px 14px 4px",
                fontSize:14, fontWeight:600,
                fontFamily:"'Outfit',sans-serif",
                color: activeTab === i ? "var(--tab-active-text)" : "var(--tab-inactive-text)",
                borderBottom: activeTab === i ? "2px solid var(--tab-active-border)" : "2px solid transparent",
                marginBottom:-1,
                transition:"color 200ms, border-color 200ms",
                whiteSpace:"nowrap",
              }}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Table header */}
        <div style={{
          display:"grid",
          gridTemplateColumns:"28px 1fr 160px 120px 150px 90px",
          gap:8, paddingBottom:10,
          borderBottom:"1px solid var(--border)",
        }}>
          {["","TASK NAME","PRIORITY","DUE DATE","STATUS",""].map((h, i) => (
            <div key={i} style={{
              fontSize:10, fontWeight:600, letterSpacing:"0.1em",
              textTransform:"uppercase", color:"var(--text-muted)",
            }}>{h}</div>
          ))}
        </div>

        {/* Task rows */}
        {TASKS.map((task, i) => (
          <TaskRow key={task.name} task={task} last={i === TASKS.length - 1}/>
        ))}
      </div>

      {/* ── BOTTOM ROW: Meetings + Availability ── */}
      <div className="anim-up-2" style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16 }}>

        {/* Upcoming Meetings */}
        <div style={{
          ...cardStyle,
          boxShadow:`var(--card-shadow), var(--card-inset)`,
        }}>
          <p style={{ fontSize:10, fontWeight:600, letterSpacing:"0.12em", textTransform:"uppercase", color:"var(--text-muted)", marginBottom:16 }}>
            Upcoming Meetings
          </p>
          <div style={{ display:"flex", alignItems:"center", gap:14 }}>
            {/* Date badge */}
            <div style={{
              width:48, minWidth:48, height:52,
              borderRadius:10,
              background:"var(--meeting-date-bg)",
              display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center",
              gap:0,
            }}>
              <span style={{ fontSize:9, fontWeight:700, letterSpacing:"0.08em", textTransform:"uppercase", color:"var(--meeting-date-text)" }}>FEB</span>
              <span style={{ fontFamily:"'Fraunces',serif", fontWeight:900, fontSize:22, color:"var(--meeting-date-text)", lineHeight:1.1 }}>24</span>
            </div>
            <div>
              <div style={{ fontSize:14, fontWeight:700, color:"var(--text-primary)", marginBottom:3 }}>
                Sprint Planning
              </div>
              <div style={{ display:"flex", alignItems:"center", gap:5, color:"var(--text-secondary)", fontSize:12 }}>
                <IcCalendar s={13}/>
                10:00 AM – 11:30 AM
              </div>
            </div>
          </div>
        </div>

        {/* Availability */}
        <div style={{
          ...cardStyle,
          boxShadow:`var(--card-shadow), var(--card-inset)`,
        }}>
          <p style={{ fontSize:10, fontWeight:600, letterSpacing:"0.12em", textTransform:"uppercase", color:"var(--text-muted)", marginBottom:12 }}>
            Availability
          </p>
          <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:10 }}>
            <div style={{ width:9, height:9, borderRadius:"50%", background:"var(--availability-dot)", flexShrink:0 }}/>
            <span style={{ fontSize:14, fontWeight:700, color:"var(--text-primary)" }}>Online Now</span>
          </div>
          <p style={{ fontSize:13, fontWeight:400, color:"var(--text-secondary)", lineHeight:1.55 }}>
            Working remotely from Paris. Expected turnaround for design reviews is 24 hours.
          </p>
        </div>
      </div>
    </div>
  );
};

/* ═══════════════════════════════════════════════════════
   DARK MODE TOGGLE
═══════════════════════════════════════════════════════ */
const DarkToggle = ({ dark, onToggle }) => (
  <button
    onClick={onToggle}
    title="Toggle dark mode"
    style={{
      position:"fixed", top:14, right:14, zIndex:9999,
      width:40, height:40, borderRadius:"50%",
      border: dark ? "1px solid rgba(255,255,255,0.1)" : "1px solid var(--border)",
      background: dark ? "rgba(255,255,255,0.07)" : "#FFFFFF",
      boxShadow: dark ? "none" : "0 2px 8px rgba(0,0,0,0.1)",
      cursor:"pointer",
      display:"flex", alignItems:"center", justifyContent:"center",
    }}
  >
    {dark ? <IcMoon s={17}/> : <IcSun s={17}/>}
  </button>
);

/* ═══════════════════════════════════════════════════════
   APP ROOT
═══════════════════════════════════════════════════════ */
export default function App() {
  const [dark, setDark] = useState(false);
  const [selectedId, setSelectedId] = useState(1);

  const toggleDark = () => {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
  };

  return (
    <>
      <GlobalStyles/>
      <div style={{
        display:"flex", height:"100vh", overflow:"hidden",
        background:"var(--bg-page)",
        position:"relative",
      }}>
        <Sidebar/>
        <MemberListPanel selectedId={selectedId} onSelect={setSelectedId}/>
        <MemberDetailPanel/>
      </div>
      <DarkToggle dark={dark} onToggle={toggleDark}/>
    </>
  );
}
