const fs = require('fs');
let content = fs.readFileSync('src/app/globals.css', 'utf-8');
const lines = content.split(/\r?\n/);
const newTop = `@import "tailwindcss";

@theme inline {
  --color-bg: var(--bg);
  --color-surface-1: var(--surface-1);
  --color-surface-2: var(--surface-2);
  --color-surface-hover: var(--surface-hover);
  --color-card: var(--card);
  --color-line: var(--line);
  --color-border: var(--border);
  --color-border-strong: var(--border-strong);
  --color-ink: var(--ink);
  --color-ink-soft: var(--ink-soft);
  --color-ink-muted: var(--ink-muted);
  --color-primary: var(--primary);
  --color-primary-strong: var(--primary-strong);
  --color-primary-bg: var(--primary-bg);
  --color-success: var(--success);
  --color-success-bg: var(--success-bg);
  --color-danger: var(--danger);
  --color-danger-bg: var(--danger-bg);

  --radius: 12px;
  --radius-sm: 6px;
  --radius-pill: 999px;
}

:root {
  color-scheme: light;
  /* LIGHT THEME (AuthKit Geometry) */
  --bg: #F8FAFC;
  --surface-1: #FFFFFF;
  --surface-2: #F1F5F9;
  --surface-hover: rgba(15, 23, 42, 0.04);
  --card: #FFFFFF;
  --line: #E2E8F0;
  --border: #E2E8F0;
  --border-strong: #CBD5E1;
  --ink: #0F172A;
  --ink-soft: #475569;
  --ink-muted: #64748B;
  --primary: #0F766E;
  --primary-strong: #115E59;
  --primary-bg: rgba(15, 118, 110, 0.08);
  --success: #059669;
  --success-bg: rgba(5, 150, 105, 0.10);
  --danger: #DC2626;
  --danger-bg: rgba(220, 38, 38, 0.10);

  --sidebar-bg: transparent;
  --sidebar-line: transparent;
  --sidebar-hover: rgba(15, 23, 42, 0.04);
  --sidebar-text: #334155;
  --sidebar-text-soft: #64748B;
  --sidebar-accent: #0F766E;
}

html[data-theme="dark"] {
  color-scheme: dark;
  /* DARK THEME (AuthKit Midnight Frost) */
  --bg: #05060F;
  --surface-1: rgba(186,214,247,0.025);
  --surface-2: rgba(186,214,247,0.045);
  --surface-hover: rgba(186,214,247,0.075);
  --card: rgba(186,214,247,0.025);
  --line: rgba(186,215,247,0.10);
  --border: rgba(186,215,247,0.10);
  --border-strong: rgba(186,215,247,0.18);
  --ink: #D8ECF8;
  --ink-soft: #C7D3EA;
  --ink-muted: #9DA7BA;
  --primary: #2DD4BF;
  --primary-strong: #14B8A6;
  --primary-bg: rgba(45,212,191,0.10);
  --success: #34D399;
  --success-bg: rgba(52, 211, 153, 0.12);
  --danger: #F87171;
  --danger-bg: rgba(248, 113, 113, 0.12);

  --sidebar-bg: transparent;
  --sidebar-line: transparent;
  --sidebar-hover: rgba(186,214,247,0.075);
  --sidebar-text: #C7D3EA;
  --sidebar-text-soft: #9DA7BA;
  --sidebar-accent: #2DD4BF;
}

* {
  box-sizing: border-box;
}

html,
body {
  margin: 0;
  padding: 0;
  background: var(--bg);
  background-color: var(--bg);
  height: 100%;
  min-height: 100vh;
  min-height: 100dvh;
  overscroll-behavior-y: none;
}

body {
  font-family: Inter, 'Noto Sans JP', system-ui, sans-serif;
  color: var(--ink);
  transition: background .2s, color .2s;
}
`;

const remaining = lines.slice(103).join('\n');
fs.writeFileSync('src/app/globals.css', newTop + remaining);
console.log('Done rewriting globals.css');
