import { useState, useEffect } from "react";

/* ─── Fonts + CSS Custom Properties + Keyframes ─────────────────────────── */
const GlobalStyles = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,700;0,9..144,900;1,9..144,900&family=Outfit:wght@300;400;500;600;700&display=swap');

    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

    :root {
      --bg-page:              #F5F0E8;
      --bg-sidebar:           #F0EBE3;
      --bg-card:              #FFFFFF;
      --bg-card-hover:        #FAFAF8;
      --border:               rgba(0,0,0,0.07);
      --text-primary:         #1A1410;
      --text-secondary:       #7A6E5F;
      --text-muted:           #B0A898;
      --green-primary:        #1B5E35;
      --green-accent:         #22C55E;
      --green-light:          #DCFCE7;
      --amber:                #F59E0B;
      --amber-light:          #FEF3C7;
      --red:                  #EF4444;
      --red-light:            #FEE2E2;
      --pink:                 #FB7185;
      --pink-light:           #FFE4E6;
      --sidebar-active-bg:    rgba(251,124,75,0.10);
      --sidebar-active-text:  #D4460A;
      --sidebar-active-border:#EA580C;
      --invite-btn-bg:        #EA580C;
      --invite-btn-text:      #FFFFFF;
      --toggle-on:            #F97316;
      --card-shadow:          0 1px 3px rgba(0,0,0,0.05), 0 8px 24px rgba(0,0,0,0.06);
      --cell-upper:           rgba(0,0,0,0.03);
    }

    :root.dark {
      --bg-page:              #080C10;
      --bg-sidebar:           #0C0F14;
      --bg-card:              rgba(255,255,255,0.03);
      --bg-card-hover:        rgba(255,255,255,0.05);
      --border:               rgba(255,255,255,0.06);
      --text-primary:         #F0ECE4;
      --text-secondary:       #4A5568;
      --text-muted:           #2A3A4A;
      --green-primary:        #4DE38A;
      --green-accent:         #22C55E;
      --green-light:          rgba(34,197,94,0.12);
      --amber:                #FBBF24;
      --amber-light:          rgba(251,191,36,0.12);
      --red:                  #F87171;
      --red-light:            rgba(248,113,113,0.12);
      --pink:                 #FDA4AF;
      --pink-light:           rgba(253,164,175,0.12);
      --sidebar-active-bg:    rgba(251,124,75,0.08);
      --sidebar-active-text:  #FB923C;
      --sidebar-active-border:#EA580C;
      --invite-btn-bg:        linear-gradient(135deg,#C43A08,#EA580C);
      --invite-btn-text:      #FFFFFF;
      --toggle-on:            #F97316;
      --card-shadow:          0 1px 3px rgba(0,0,0,0.3), 0 8px 24px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.04);
      --cell-upper:           rgba(255,255,255,0.04);
    }

    html, body { height: 100%; font-family: 'Outfit', sans-serif; }
    #root { height: 100%; }

    * {
      transition:
        background-color 350ms ease,
        color 350ms ease,
        border-color 350ms ease,
        box-shadow 350ms ease;
    }

    @keyframes fadeSlideUp {
      from { opacity: 0; transform: translateY(12px); }
      to   { opacity: 1; transform: translateY(0);    }
    }
    @keyframes fadeSlideDown {
      from { opacity: 0; transform: translateY(-8px); }
      to   { opacity: 1; transform: translateY(0);    }
    }
    @keyframes fadeSlideLeft {
      from { opacity: 0; transform: translateX(12px); }
      to   { opacity: 1; transform: translateX(0);    }
    }
    @keyframes growWidth {
      from { width: 0; }
      to   { width: 100%; }
    }
    @keyframes cellBorder {
      from { width: 0; }
      to   { width: 100%; }
    }

    .anim-banner   { animation: fadeSlideDown 400ms ease both; }
    .anim-card     { animation: fadeSlideUp   500ms ease both 80ms; }
    .anim-right-0  { animation: fadeSlideLeft 400ms ease both 160ms; }
    .anim-right-1  { animation: fadeSlideLeft 400ms ease both 240ms; }
    .anim-right-2  { animation: fadeSlideLeft 400ms ease both 320ms; }
    .anim-right-3  { animation: fadeSlideLeft 400ms ease both 400ms; }
    .anim-right-4  { animation: fadeSlideLeft 400ms ease both 480ms; }

    .invite-btn {
      width: 100%;
      height: 44px;
      border-radius: 12px;
      background: var(--invite-btn-bg);
      color: var(--invite-btn-text);
      font-family: 'Outfit', sans-serif;
      font-weight: 700;
      font-size: 14px;
      border: none;
      cursor: pointer;
      box-shadow: 0 4px 12px rgba(234,88,12,0.30);
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
    }
    .invite-btn:hover {
      filter: brightness(1.05);
      transform: scale(1.01);
    }

    .get-ai-btn {
      width: 100%;
      height: 52px;
      border-radius: 12px;
      font-family: 'Outfit', sans-serif;
      font-weight: 700;
      font-size: 15px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      transition: transform 200ms, box-shadow 200ms, background 350ms;
    }
    .get-ai-btn:hover  { transform: scale(1.01); box-shadow: 0 8px 24px rgba(0,0,0,0.18); }
    .get-ai-btn:active { transform: scale(0.98); }

    ::-webkit-scrollbar { width: 4px; }
    ::-webkit-scrollbar-track { background: transparent; }
    ::-webkit-scrollbar-thumb { background: var(--border); border-radius: 2px; }
  `}</style>
);

/* ─── Inline SVG Icons ───────────────────────────────────────────────────── */
const ShieldIcon = ({ size = 20, color = "currentColor" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
    <path d="M12 2L3 6v6c0 5.25 3.75 10.15 9 11.35C17.25 22.15 21 17.25 21 12V6l-9-4z" />
  </svg>
);
const TrophyIcon = ({ size = 14 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
    <path d="M19 5h-2V3H7v2H5C3.9 5 3 5.9 3 7v1c0 2.55 1.92 4.63 4.39 4.94.63 1.5 1.98 2.63 3.61 2.96V18H8v2h8v-2h-3v-2.1c1.63-.33 2.98-1.46 3.61-2.96C19.08 12.63 21 10.55 21 8V7c0-1.1-.9-2-2-2zm-2 3.08V7h2v1c0 1.57-1 2.9-2 3.45V8.08zm-12 .77V7h2v1.08C6 9.56 5 10.57 5 12c0-.51.1-1.01.29-1.47C5.1 9.55 5 8.8 5 8.08z" opacity=".8"/>
    <path d="M12 5v12M9 19h6" stroke="currentColor" strokeWidth="0.5" fill="none"/>
  </svg>
);
const GridIcon = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
    <rect x="3" y="3" width="7" height="7" rx="1"/>
    <rect x="14" y="3" width="7" height="7" rx="1"/>
    <rect x="3" y="14" width="7" height="7" rx="1"/>
    <rect x="14" y="14" width="7" height="7" rx="1"/>
  </svg>
);
const PeopleIcon = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
    <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/>
    <circle cx="9" cy="7" r="4"/>
    <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/>
  </svg>
);
const CalendarIcon = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
    <rect x="3" y="4" width="18" height="18" rx="2"/>
    <line x1="16" y1="2" x2="16" y2="6"/>
    <line x1="8" y1="2" x2="8" y2="6"/>
    <line x1="3" y1="10" x2="21" y2="10"/>
  </svg>
);
const WarningIcon = ({ size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
    <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
    <line x1="12" y1="9" x2="12" y2="13"/>
    <line x1="12" y1="17" x2="12.01" y2="17"/>
  </svg>
);
const LightningIcon = ({ size = 22 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="#F97316">
    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
  </svg>
);
const ChevronDownIcon = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
    <polyline points="6 9 12 15 18 9"/>
  </svg>
);
const SunIcon = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="#F59E0B" strokeWidth={2}>
    <circle cx="12" cy="12" r="5"/>
    <line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/>
    <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
    <line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/>
    <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
  </svg>
);
const MoonIcon = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="#C8D8E8" strokeWidth={2}>
    <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/>
  </svg>
);
const PlusIcon = ({ size = 14 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
    <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
  </svg>
);

/* ─── Sai Avatar (illustrated) ──────────────────────────────────────────── */
const SaiAvatar = () => (
  <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
    <circle cx="20" cy="20" r="20" fill="#E8D5C4"/>
    {/* Hair */}
    <ellipse cx="20" cy="13" rx="10" ry="9" fill="#2D1B00"/>
    {/* Face */}
    <ellipse cx="20" cy="22" rx="8" ry="9" fill="#F5C8A0"/>
    {/* Hair top */}
    <ellipse cx="20" cy="12" rx="9" ry="7" fill="#1A0F00"/>
    {/* Eyes */}
    <ellipse cx="16.5" cy="21" rx="1.5" ry="1.8" fill="#2D1B00"/>
    <ellipse cx="23.5" cy="21" rx="1.5" ry="1.8" fill="#2D1B00"/>
    {/* Smile */}
    <path d="M16.5 26 Q20 29 23.5 26" stroke="#C49070" strokeWidth="1.2" fill="none" strokeLinecap="round"/>
    {/* Shoulders */}
    <ellipse cx="20" cy="38" rx="12" ry="6" fill="#3B82F6"/>
    <ellipse cx="20" cy="36" rx="8" ry="5" fill="#F5C8A0"/>
  </svg>
);

/* ─── LEFT SIDEBAR ───────────────────────────────────────────────────────── */
const Sidebar = () => (
  <aside style={{
    width: "210px",
    minWidth: "210px",
    background: "var(--bg-sidebar)",
    borderRight: "1px solid var(--border)",
    padding: "24px 16px",
    display: "flex",
    flexDirection: "column",
    justifyContent: "space-between",
    height: "100vh",
    overflow: "hidden",
  }}>
    <div>
      {/* Logo */}
      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
        <ShieldIcon size={22} color="var(--green-primary)" />
        <span style={{
          fontFamily: "'Fraunces', serif",
          fontWeight: 700,
          fontSize: "20px",
          color: "var(--green-primary)",
          lineHeight: 1,
        }}>
          Coverly
        </span>
      </div>

      {/* Org label */}
      <p style={{
        marginTop: "24px",
        marginBottom: "8px",
        fontSize: "9px",
        fontWeight: 600,
        letterSpacing: "0.12em",
        textTransform: "uppercase",
        color: "var(--text-muted)",
        fontFamily: "'Outfit', sans-serif",
      }}>
        Organization
      </p>

      {/* Org tree */}
      <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
        {/* FIFA */}
        <div style={{
          height: "32px",
          display: "flex",
          alignItems: "center",
          gap: "8px",
          padding: "0 8px",
          borderRadius: "8px",
          cursor: "pointer",
          color: "var(--text-secondary)",
        }}>
          <TrophyIcon size={14} />
          <span style={{ fontSize: "13px", fontWeight: 500 }}>FIFA</span>
        </div>
        {/* Shin Kuni DA FC */}
        <div style={{
          height: "32px",
          display: "flex",
          alignItems: "center",
          gap: "6px",
          paddingLeft: "20px",
          cursor: "pointer",
          color: "var(--text-muted)",
        }}>
          <span style={{ fontSize: "11px", opacity: 0.6 }}>↳</span>
          <span style={{ fontSize: "12px", fontWeight: 400 }}>Shin Kuni DA FC</span>
        </div>
        {/* France FC — active */}
        <div style={{
          height: "32px",
          display: "flex",
          alignItems: "center",
          gap: "6px",
          paddingLeft: "20px",
          paddingRight: "8px",
          borderRadius: "8px",
          cursor: "pointer",
          background: "var(--sidebar-active-bg)",
          borderLeft: "2.5px solid var(--sidebar-active-border)",
          color: "var(--sidebar-active-text)",
        }}>
          <span style={{ fontSize: "11px" }}>↳</span>
          <span style={{ fontSize: "13px", fontWeight: 600 }}>France FC</span>
        </div>
      </div>

      {/* Divider */}
      <div style={{ height: "1px", background: "var(--border)", margin: "16px 0" }} />

      {/* Nav */}
      <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
        {/* Dashboard */}
        <div style={{
          height: "40px",
          display: "flex",
          alignItems: "center",
          gap: "12px",
          padding: "0 12px",
          borderRadius: "12px",
          cursor: "pointer",
          color: "var(--text-secondary)",
          fontSize: "14px",
          fontWeight: 500,
        }}>
          <GridIcon size={16} />
          Dashboard
        </div>
        {/* Team — active */}
        <div style={{
          height: "40px",
          display: "flex",
          alignItems: "center",
          gap: "12px",
          padding: "0 12px",
          borderRadius: "12px",
          cursor: "pointer",
          background: "var(--sidebar-active-bg)",
          borderLeft: "2.5px solid var(--sidebar-active-border)",
          color: "var(--sidebar-active-text)",
          fontSize: "14px",
          fontWeight: 700,
        }}>
          <span style={{ color: "var(--sidebar-active-text)" }}>
            <PeopleIcon size={16} />
          </span>
          Team
        </div>
      </div>
    </div>

    {/* Invite Team button */}
    <button className="invite-btn">
      <PlusIcon size={14} />
      Invite Team
    </button>
  </aside>
);

/* ─── AVAILABILITY CELL ──────────────────────────────────────────────────── */
const AvailCell = ({ color, colIndex }) => {
  const delay = `${colIndex * 40}ms`;
  return (
    <div style={{
      width: "46px",
      height: "48px",
      borderRadius: "8px",
      margin: "0 auto",
      overflow: "hidden",
      display: "flex",
      flexDirection: "column",
    }}>
      {/* Upper portion */}
      <div style={{
        flex: 1,
        background: "var(--cell-upper)",
        borderRadius: "8px 8px 0 0",
      }} />
      {/* Bottom color indicator */}
      <div style={{
        height: "4px",
        borderRadius: "0 0 8px 8px",
        background: color,
        animationName: "cellBorder",
        animationDuration: "300ms",
        animationDelay: delay,
        animationFillMode: "both",
        animationTimingFunction: "ease-out",
      }} />
    </div>
  );
};

/* ─── CALENDAR GRID ──────────────────────────────────────────────────────── */
const AVAIL_COLORS = {
  green: "#22C55E",
  amber: "#F59E0B",
  pink:  "#FB7185",
  red:   "#EF4444",
};

const dates = [
  { num: "22", day: "SUN", today: true  },
  { num: "23", day: "MON", today: false },
  { num: "24", day: "TUE", today: false },
  { num: "25", day: "WED", today: false },
  { num: "26", day: "THU", today: false },
  { num: "27", day: "FRI", today: false },
  { num: "28", day: "SAT", today: false },
  { num: "29", day: "SUN", today: false },
  { num: "30", day: "MON", today: false },
  { num: "3",  day: "TUE", today: false },
];

const members = [
  {
    name:    "Sai",
    load:    "0% LOAD",
    avail:   ["green","green","amber","pink","pink","red","red","green","green","green"],
    avatar:  "sai",
  },
  {
    name:    "Sky",
    load:    "32% LOAD",
    avail:   ["green","green","green","red","red","red","amber","green","green","green"],
    avatar:  "sky",
  },
];

const gridTemplateColumns = "200px repeat(10, 1fr)";

const CalendarGrid = () => (
  <div style={{ marginTop: "24px" }}>
    {/* Header row */}
    <div style={{ display: "grid", gridTemplateColumns, gap: "4px", paddingBottom: "4px" }}>
      <div style={{
        paddingBottom: "12px",
        fontSize: "10px",
        fontWeight: 600,
        letterSpacing: "0.12em",
        textTransform: "uppercase",
        color: "var(--text-muted)",
      }}>
        Team Member
      </div>
      {dates.map((d) => (
        <div key={d.num + d.day} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "2px" }}>
          {d.today ? (
            <div style={{
              width: "32px",
              height: "32px",
              borderRadius: "50%",
              background: "#EA580C",
              color: "#fff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "15px",
              fontWeight: 800,
            }}>
              {d.num}
            </div>
          ) : (
            <div style={{ fontSize: "15px", fontWeight: 600, color: "var(--text-primary)" }}>
              {d.num}
            </div>
          )}
          <div style={{
            fontSize: "9px",
            fontWeight: 500,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            color: "var(--text-muted)",
          }}>
            {d.day}
          </div>
        </div>
      ))}
    </div>

    {/* Member rows */}
    {members.map((m, mi) => (
      <div key={m.name} style={{
        display: "grid",
        gridTemplateColumns,
        gap: "4px",
        borderTop: "1px solid var(--border)",
        padding: "12px 0",
      }}>
        {/* Member info */}
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          {m.avatar === "sai" ? (
            <SaiAvatar />
          ) : (
            <div style={{
              width: "40px",
              height: "40px",
              borderRadius: "50%",
              background: "#1E3A5F",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "16px",
              fontWeight: 700,
              color: "#fff",
              flexShrink: 0,
            }}>
              S
            </div>
          )}
          <div>
            <div style={{ fontSize: "14px", fontWeight: 600, color: "var(--text-primary)" }}>
              {m.name}
            </div>
            <div style={{
              fontSize: "10px",
              fontWeight: 500,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              color: "var(--text-muted)",
              marginTop: "2px",
            }}>
              {m.load}
            </div>
          </div>
        </div>

        {/* Availability cells */}
        {m.avail.map((a, ci) => (
          <AvailCell key={ci} color={AVAIL_COLORS[a]} colIndex={ci} />
        ))}
      </div>
    ))}

    {/* Legend */}
    <div style={{
      display: "flex",
      alignItems: "center",
      gap: "24px",
      marginTop: "24px",
      paddingTop: "16px",
      borderTop: "1px solid var(--border)",
    }}>
      {[
        { color: "#22C55E", label: "AVAILABLE" },
        { color: "#F59E0B", label: "PARTIAL"   },
        { color: "#FB7185", label: "BUSY"       },
        { color: "#EF4444", label: "OOO"        },
      ].map(({ color, label }) => (
        <div key={label} style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <div style={{ width: "10px", height: "10px", borderRadius: "50%", background: color, flexShrink: 0 }} />
          <span style={{ fontSize: "12px", fontWeight: 500, color: "var(--text-secondary)" }}>{label}</span>
        </div>
      ))}
    </div>
  </div>
);

/* ─── MAIN CONTENT ───────────────────────────────────────────────────────── */
const MainContent = () => (
  <main style={{
    flex: 1,
    background: "var(--bg-page)",
    padding: "20px 24px",
    overflowY: "auto",
    minWidth: 0,
  }}>
    {/* Alert Banner */}
    <div className="anim-banner" style={{
      background: "var(--amber-light)",
      border: "1px solid var(--amber)",
      borderRadius: "12px",
      padding: "16px 20px",
      display: "flex",
      alignItems: "center",
      gap: "16px",
      marginBottom: "20px",
      opacity: 1,
    }}>
      <span style={{ color: "var(--amber)", flexShrink: 0 }}>
        <WarningIcon size={20} />
      </span>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: "14px", fontWeight: 600, color: "var(--text-primary)" }}>
          4 Potential coverage gaps detected
        </div>
        <div style={{ fontSize: "13px", fontWeight: 400, color: "var(--sidebar-active-text)", marginTop: "2px" }}>
          France FC has critical tasks unassigned between Oct 25-28.
        </div>
      </div>
      <button style={{
        fontSize: "13px",
        fontWeight: 600,
        color: "var(--sidebar-active-text)",
        textDecoration: "underline",
        background: "none",
        border: "none",
        cursor: "pointer",
        whiteSpace: "nowrap",
        flexShrink: 0,
      }}>
        Review All
      </button>
    </div>

    {/* Main card */}
    <div className="anim-card" style={{
      background: "var(--bg-card)",
      border: "1px solid var(--border)",
      borderRadius: "16px",
      padding: "24px",
      boxShadow: "var(--card-shadow)",
    }}>
      {/* Card header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <h1 style={{
          fontFamily: "'Fraunces', serif",
          fontWeight: 900,
          fontStyle: "italic",
          fontSize: "32px",
          color: "var(--text-primary)",
          maxWidth: "340px",
          lineHeight: 1.15,
        }}>
          Team Availability — Next 2 Weeks
        </h1>
        <div style={{ display: "flex", alignItems: "center", gap: "8px", flexShrink: 0, marginTop: "4px" }}>
          <span style={{ color: "var(--text-muted)" }}><CalendarIcon size={16} /></span>
          <span style={{ fontSize: "14px", fontWeight: 500, color: "var(--text-secondary)" }}>
            Oct 22 - Nov 04, 2023
          </span>
        </div>
      </div>

      <CalendarGrid />
    </div>
  </main>
);

/* ─── ANIMATED PROGRESS BAR ─────────────────────────────────────────────── */
const AtRiskBar = () => {
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const t = setTimeout(() => setWidth(100), 100);
    return () => clearTimeout(t);
  }, []);
  return (
    <div style={{ height: "6px", borderRadius: "9999px", background: "var(--border)", overflow: "hidden" }}>
      <div style={{
        height: "100%",
        width: `${width}%`,
        borderRadius: "9999px",
        background: "#22C55E",
        transition: "width 800ms ease-out",
      }} />
    </div>
  );
};

/* ─── RIGHT PANEL ────────────────────────────────────────────────────────── */
const RightPanel = ({ dark }) => {
  const [toggleOn] = useState(true);

  return (
    <aside style={{
      width: "280px",
      minWidth: "280px",
      background: "var(--bg-page)",
      borderLeft: "1px solid var(--border)",
      padding: "20px",
      display: "flex",
      flexDirection: "column",
      gap: "16px",
      overflowY: "auto",
    }}>
      {/* AI Coverage header */}
      <div className="anim-right-0" style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
        <LightningIcon size={22} />
        <span style={{
          fontFamily: "'Fraunces', serif",
          fontWeight: 700,
          fontSize: "18px",
          color: "var(--text-primary)",
        }}>
          AI Coverage Suggestions
        </span>
        <span style={{
          fontSize: "8px",
          fontWeight: 600,
          letterSpacing: "0.12em",
          textTransform: "uppercase",
          background: dark ? "rgba(59,130,246,0.15)" : "#E0F2FE",
          color: dark ? "#60A5FA" : "#0369A1",
          padding: "3px 8px",
          borderRadius: "6px",
          marginLeft: "2px",
        }}>
          BETA
        </span>
      </div>

      {/* Accordion */}
      <div className="anim-right-1" style={{
        background: "var(--bg-card)",
        border: "1px solid var(--border)",
        borderRadius: "12px",
        padding: "12px 16px",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        cursor: "pointer",
      }}>
        <span style={{ fontSize: "14px", fontWeight: 500, color: "var(--text-primary)" }}>
          How AI Coverage Works
        </span>
        <span style={{ color: "var(--text-muted)" }}><ChevronDownIcon size={16} /></span>
      </div>

      {/* Auto-approve toggle */}
      <div className="anim-right-2" style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "4px 0",
      }}>
        <span style={{ fontSize: "14px", fontWeight: 500, color: "var(--text-primary)" }}>
          Auto-approve suggestions
        </span>
        {/* iOS toggle */}
        <div style={{
          width: "44px",
          height: "24px",
          borderRadius: "12px",
          background: toggleOn ? "var(--toggle-on)" : "var(--border)",
          position: "relative",
          cursor: "pointer",
          flexShrink: 0,
          transition: "background 200ms",
        }}>
          <div style={{
            position: "absolute",
            top: "2px",
            left: toggleOn ? "22px" : "2px",
            width: "20px",
            height: "20px",
            borderRadius: "50%",
            background: "#FFFFFF",
            boxShadow: "0 1px 4px rgba(0,0,0,0.25)",
            transition: "left 200ms",
          }} />
        </div>
      </div>

      {/* Segmented control */}
      <div className="anim-right-2" style={{
        background: dark ? "rgba(255,255,255,0.05)" : "#F0EBE3",
        padding: "4px",
        borderRadius: "12px",
        display: "flex",
        gap: "4px",
      }}>
        {["Auto Coverage","Reassign Task"].map((label, i) => (
          <button key={label} style={{
            flex: 1,
            padding: "8px",
            borderRadius: "10px",
            border: "none",
            cursor: "pointer",
            fontSize: "13px",
            fontWeight: i === 0 ? 600 : 500,
            color: i === 0 ? "var(--text-primary)" : "var(--text-secondary)",
            background: i === 0
              ? (dark ? "rgba(255,255,255,0.10)" : "#FFFFFF")
              : "transparent",
            boxShadow: i === 0 ? "0 1px 3px rgba(0,0,0,0.08)" : "none",
            fontFamily: "'Outfit', sans-serif",
          }}>
            {label}
          </button>
        ))}
      </div>

      {/* Empty state card */}
      <div className="anim-right-3" style={{
        background: "var(--bg-card)",
        border: "1px dashed var(--border)",
        borderRadius: "16px",
        padding: "24px",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        textAlign: "center",
        gap: "12px",
      }}>
        <span style={{ fontSize: "48px", lineHeight: 1 }}>🎉</span>
        <div>
          <p style={{ fontSize: "15px", fontWeight: 700, color: "var(--text-primary)", marginBottom: "6px" }}>
            No at-risk tasks — great job!
          </p>
          <p style={{ fontSize: "13px", fontWeight: 400, color: "var(--text-secondary)", lineHeight: 1.6 }}>
            0 tasks are currently flagged for coverage gaps in France FC.
          </p>
        </div>
      </div>

      {/* Get AI Suggestions button */}
      <button
        className="get-ai-btn anim-right-3"
        style={{
          background: dark ? "rgba(255,255,255,0.06)" : "#111827",
          border: dark ? "1px solid rgba(255,255,255,0.10)" : "1px solid transparent",
          color: dark ? "var(--text-primary)" : "#FFFFFF",
          fontFamily: "'Outfit', sans-serif",
        }}
      >
        ✦ Get AI Suggestions
      </button>

      {/* At-risk tasks section */}
      <div className="anim-right-4">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "8px" }}>
          <span style={{
            fontSize: "10px",
            fontWeight: 600,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            color: "var(--text-muted)",
          }}>
            AT-RISK TASKS
          </span>
          <span style={{
            fontFamily: "'Fraunces', serif",
            fontWeight: 900,
            fontSize: "32px",
            color: "var(--text-primary)",
            lineHeight: 1,
          }}>
            0
          </span>
        </div>
        <AtRiskBar />
      </div>
    </aside>
  );
};

/* ─── DARK MODE TOGGLE ───────────────────────────────────────────────────── */
const DarkToggle = ({ dark, onToggle }) => (
  <button
    onClick={onToggle}
    style={{
      position: "fixed",
      top: "16px",
      right: "16px",
      zIndex: 50,
      width: "40px",
      height: "40px",
      borderRadius: "50%",
      border: dark
        ? "1px solid rgba(255,255,255,0.10)"
        : "1px solid var(--border)",
      background: dark ? "rgba(255,255,255,0.08)" : "#FFFFFF",
      boxShadow: dark ? "none" : "0 2px 8px rgba(0,0,0,0.12)",
      cursor: "pointer",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
    }}
    title="Toggle dark mode"
  >
    <span style={{ opacity: 1, transition: "opacity 200ms" }}>
      {dark ? <MoonIcon size={18} /> : <SunIcon size={18} />}
    </span>
  </button>
);

/* ─── APP ROOT ───────────────────────────────────────────────────────────── */
export default function App() {
  const [dark, setDark] = useState(false);

  const toggleDark = () => {
    const next = !dark;
    setDark(next);
    if (next) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  };

  return (
    <>
      <GlobalStyles />
      <div style={{
        display: "flex",
        height: "100vh",
        overflow: "hidden",
        background: "var(--bg-page)",
      }}>
        <Sidebar />
        <MainContent />
        <RightPanel dark={dark} />
      </div>
      <DarkToggle dark={dark} onToggle={toggleDark} />
    </>
  );
}
