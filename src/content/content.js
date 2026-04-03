const ROOT_ID = "browser-buddy-root";
const ACTIVITY_WINDOW_MS = 7000;
const CLICK_KICK_THRESHOLD = 220;
const DEFAULT_SETTINGS = {
  enabled: true,
  petName: "Momo",
  size: "medium",
  theme: "workshop",
  petVariant: "classic",
  anchor: "bottom-right",
  positionMode: "anchor",
  customPosition: null,
  personality: "hype",
  speech: true,
  autoHop: true,
  roaming: true,
  gravityDrop: false
};
const DEFAULT_STATS = {
  pokes: 0,
  kicks: 0,
  drags: 0,
  steals: 0
};

const anchorPositions = [
  { name: "bottom-right", x: () => window.innerWidth - 164, y: () => window.innerHeight - 176 },
  { name: "bottom-left", x: () => 28, y: () => window.innerHeight - 176 },
  { name: "mid-right", x: () => window.innerWidth - 154, y: () => Math.max(120, window.innerHeight * 0.52) },
  { name: "mid-left", x: () => 24, y: () => Math.max(120, window.innerHeight * 0.46) }
];

const themeMap = {
  workshop: {
    accent: "#ffb655",
    accentSoft: "#ffe1a5",
    workshopTop: "#77533d",
    workshopBottom: "#301d12",
    apronTop: "#8fd0c8",
    apronBottom: "#5aa7a0"
  },
  sunset: {
    accent: "#ff8a65",
    accentSoft: "#ffd2a6",
    workshopTop: "#8c5448",
    workshopBottom: "#3d2019",
    apronTop: "#ffbe84",
    apronBottom: "#e27d52"
  },
  mint: {
    accent: "#78d3b0",
    accentSoft: "#d9ffef",
    workshopTop: "#5a6f62",
    workshopBottom: "#23342d",
    apronTop: "#9be1bf",
    apronBottom: "#58b88f"
  }
};

const variantMap = {
  classic: {
    furTop: "#ffffff",
    furBottom: "#171717",
    bodyTop: "#f6f0e8",
    bodyBottom: "#171717",
    mask: "rgba(29, 29, 29, 0.85)",
    earTop: "#ffb655",
    earBottom: "#ff8b50"
  },
  spark: {
    furTop: "#fff7dd",
    furBottom: "#144c5a",
    bodyTop: "#f0fffd",
    bodyBottom: "#0b667b",
    mask: "rgba(14, 83, 99, 0.88)",
    earTop: "#67d9cb",
    earBottom: "#26a7b7"
  },
  shadow: {
    furTop: "#f4eefc",
    furBottom: "#32223f",
    bodyTop: "#f4eefc",
    bodyBottom: "#4b3864",
    mask: "rgba(54, 36, 73, 0.9)",
    earTop: "#b388ff",
    earBottom: "#6f58a8"
  }
};

const sizeMap = {
  small: 0.84,
  medium: 1,
  large: 1.14
};

const talkMap = {
  hype: {
    active: ["We are cooking. Keep going.", "Tiny browser gremlin is thriving.", "Momentum acquired. Love that for us."],
    idle: ["I can wait. Tiny move is still a move.", "No stress. We can reboot in one click.", "I am chilling until you are back."],
    poke: ["Hey. I am literally on shift.", "Bonk received. Morale unchanged.", "Rude, but kind of funny."],
    kick: ["Okay wow, new corner it is.", "I am filing a tiny complaint.", "Relocating dramatically."],
    steal: ["Hehe. Borrowing this.", "Temporary loot acquisition.", "I found a shiny thing."]
  },
  chill: {
    active: ["Nice pace. We are in a groove.", "Calm focus mode looks good on us.", "Steady energy. Tiny progress counts."],
    idle: ["I am just hanging out here.", "All good. We can ease back in.", "Taking a small breather."],
    poke: ["Soft bonk noted.", "I am still here, buddy.", "That was unnecessary but adorable."],
    kick: ["Sliding over a little.", "New view, same vibe.", "I will allow the relocation."],
    steal: ["Just borrowing this for a second.", "Tiny keepsake acquired.", "This one looked cute."]
  },
  chaos: {
    active: ["Browser chaos underway.", "We are so back.", "Absolutely thriving in here."],
    idle: ["Resting before the next scheme.", "I am pretending to be harmless.", "Low motion. High potential."],
    poke: ["Violence in the workplace.", "You poke, I remember.", "I will recover and maybe unionize."],
    kick: ["Yeeted to another district.", "Corner change. Spirit unchanged.", "I have been launched."],
    steal: ["Loot event detected.", "This is mine now. Briefly.", "Absolutely borrowing that."]
  }
};

let activityUntil = Date.now();
let currentAnchorIndex = 0;
let activeDrag = null;
let pointerWasDrag = false;
let lastTapAt = 0;
let cursorPosition = { x: -9999, y: -9999 };
let imageHeistCooldownUntil = 0;

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function merge(defaults, value) {
  return {
    ...defaults,
    ...(value || {})
  };
}

function getAnchorIndexByName(name) {
  const foundIndex = anchorPositions.findIndex((item) => item.name === name);
  return foundIndex >= 0 ? foundIndex : 0;
}

function resolveAnchorPosition(anchorIndex) {
  const anchor = anchorPositions[anchorIndex];
  return {
    x: clamp(anchor.x(), 16, Math.max(16, window.innerWidth - 156)),
    y: clamp(anchor.y(), 16, Math.max(16, window.innerHeight - 172))
  };
}

function isHtmlDocument() {
  return document.contentType?.includes("text/html");
}

function pickLine(personality, key) {
  const bank = talkMap[personality] || talkMap.hype;
  const lines = bank[key] || bank.idle;
  return lines[Math.floor(Math.random() * lines.length)];
}

function createStyles() {
  return `
    :host { all: initial; }
    *, *::before, *::after { box-sizing: border-box; }
    .buddy {
      --theme-accent: #ffb655;
      --theme-accent-soft: #ffe1a5;
      --theme-workshop-top: #77533d;
      --theme-workshop-bottom: #301d12;
      --theme-apron-top: #8fd0c8;
      --theme-apron-bottom: #5aa7a0;
      --fur-top: #e5b384;
      --fur-bottom: #be7f54;
      --body-top: #c88a57;
      --body-bottom: #9d6139;
      --mask-color: rgba(80, 49, 30, 0.72);
      --ear-top: #d89d6d;
      --ear-bottom: #a86842;
      --buddy-scale: 1;
      position: fixed;
      left: 0;
      top: 0;
      width: 110px;
      height: 122px;
      z-index: 2147483647;
      user-select: none;
      pointer-events: auto;
      transition: transform 280ms cubic-bezier(0.2, 0.8, 0.2, 1), left 320ms cubic-bezier(0.2, 0.8, 0.2, 1), top 320ms cubic-bezier(0.2, 0.8, 0.2, 1), filter 160ms ease;
      transform-origin: center bottom;
      filter: drop-shadow(0 18px 28px rgba(35, 18, 8, 0.2));
      transform: scale(var(--buddy-scale));
    }
    .buddy[hidden] { display: none !important; }
    .buddy[data-state="active"] { animation: bounce 1.3s ease-in-out infinite; }
    .buddy[data-roam="walking"] { animation: stride 0.82s ease-in-out infinite; }
    .buddy[data-state="idle"] .raccoon { animation: breathe 2.8s ease-in-out infinite; }
    .buddy[data-kicked="true"] { transform: rotate(-8deg) scale(calc(var(--buddy-scale) * 0.97)); }
    .buddy[data-dragging="true"] { transition: none; transform: scale(calc(var(--buddy-scale) * 1.03)); filter: drop-shadow(0 24px 36px rgba(35, 18, 8, 0.28)); }
    .buddy[data-falling="true"] { transition: top 520ms cubic-bezier(0.2, 0.78, 0.18, 1.06), left 220ms ease, transform 160ms ease; }
    .scene { position: relative; width: 100%; height: 100%; cursor: grab; }
    .scene:active { cursor: grabbing; }
    .actor {
      position: absolute;
      inset: 0;
      transform-origin: center bottom;
      transition: transform 180ms ease;
    }
    .buddy[data-direction="left"] .actor { transform: scaleX(-1); }
    .buddy[data-falling="true"] .actor { animation: fall-squash 0.56s ease-in; }
    .buddy[data-impact="hit"] .actor { animation: hit-react 0.38s ease; }
    .bubble {
      position: absolute; left: 50%; top: -6px; max-width: 170px; padding: 8px 10px; border-radius: 14px; background: rgba(49, 30, 16, 0.94); color: #fff5ea;
      font: 600 11px/1.3 "Segoe UI", sans-serif; text-align: center; transform: translate(-50%, -100%); opacity: 0; transition: opacity 180ms ease, transform 180ms ease;
      pointer-events: none; box-shadow: 0 12px 24px rgba(20, 8, 2, 0.2);
    }
    .bubble::after { content: ""; position: absolute; left: 50%; bottom: -6px; width: 12px; height: 12px; background: rgba(49, 30, 16, 0.94); transform: translateX(-50%) rotate(45deg); border-radius: 3px; }
    .buddy[data-bubble="true"] .bubble { opacity: 1; transform: translate(-50%, calc(-100% - 4px)); }
    .sparkles { position: absolute; inset: 0; pointer-events: none; }
    .spark { position: absolute; width: 8px; height: 8px; border-radius: 999px; background: radial-gradient(circle, var(--theme-accent-soft), var(--theme-accent) 65%, transparent 66%); opacity: 0; }
    .buddy[data-state="active"] .spark,
    .buddy[data-loot="true"] .spark,
    .buddy[data-antic="spin"] .spark { opacity: 1; animation: spark 1.5s ease-in-out infinite; }
    .spark:nth-child(1) { left: 76px; top: 22px; animation-delay: 0s; }
    .spark:nth-child(2) { left: 92px; top: 34px; animation-delay: 0.4s; }
    .spark:nth-child(3) { left: 58px; top: 30px; animation-delay: 0.8s; }
    .impact {
      position: absolute;
      left: 50px;
      top: 4px;
      width: 18px;
      height: 18px;
      opacity: 0;
      transform: scale(0.4) rotate(-10deg);
      transition: opacity 120ms ease, transform 120ms ease;
      pointer-events: none;
    }
    .impact::before,
    .impact::after {
      content: "";
      position: absolute;
      inset: 0;
      clip-path: polygon(50% 0%, 63% 33%, 100% 33%, 70% 54%, 82% 100%, 50% 71%, 18% 100%, 30% 54%, 0% 33%, 37% 33%);
      background: linear-gradient(180deg, #fff4bc, #ffb655 68%, #e26d36);
    }
    .impact::after {
      inset: 4px;
      background: linear-gradient(180deg, #fff9dc, #ffd77d 65%, #ff9860);
    }
    .buddy[data-impact="hit"] .impact {
      opacity: 1;
      transform: scale(1) rotate(8deg);
    }
    .workshop,
    .crate,
    .progress { display: none !important; }
    .raccoon { position: absolute; left: 26px; bottom: 16px; width: 48px; height: 88px; transition: transform 180ms ease; transform-origin: center bottom; }
    .buddy[data-state="active"] .raccoon { animation: work 0.9s ease-in-out infinite; }
    .buddy[data-roam="walking"] .raccoon { animation: walk-cycle 0.64s ease-in-out infinite; }
    .buddy[data-mood="sleepy"] .raccoon { animation: sleepy 3.6s ease-in-out infinite; }
    .buddy[data-mood="annoyed"] .raccoon { animation: shake 0.28s ease-in-out 2; }
    .buddy[data-mood="proud"] .raccoon { animation: proud 1.2s ease-in-out infinite; }
    .buddy[data-antic="wave"] .arm.right { animation: wave-arm 0.52s ease-in-out infinite; }
    .buddy[data-antic="trip"] .actor { animation: trip 0.54s ease; }
    .buddy[data-antic="spin"] .actor { animation: spin-pop 0.72s ease; }
    .tail,
    .apron,
    .mask,
    .snout,
    .blush,
    .head::before,
    .head::after { display: none !important; }
    .body {
      position: absolute;
      left: 22px;
      bottom: 18px;
      width: 6px;
      height: 34px;
      border-radius: 999px;
      background: linear-gradient(180deg, var(--body-top), var(--body-bottom));
      box-shadow: 12px 4px 0 -4px var(--theme-accent);
    }
    .head {
      position: absolute;
      left: 11px;
      top: 0;
      width: 28px;
      height: 28px;
      border-radius: 999px;
      background: linear-gradient(180deg, var(--fur-top), #ffffff);
      border: 4px solid var(--fur-bottom);
      box-shadow: inset 0 2px 0 rgba(255, 255, 255, 0.65);
      transform-origin: center bottom;
    }
    .buddy[data-state="active"] .head { animation: nod 0.9s ease-in-out infinite; }
    .buddy[data-roam="walking"] .head { animation: head-bob 0.64s ease-in-out infinite; }
    .head::before, .head::after { content: ""; position: absolute; top: -5px; width: 18px; height: 18px; border-radius: 4px 16px 5px 16px; background: linear-gradient(180deg, var(--ear-top), var(--ear-bottom)); }
    .head::before { left: 4px; transform: rotate(-24deg); }
    .head::after { right: 4px; transform: scaleX(-1) rotate(-24deg); }
    .mask { position: absolute; left: 9px; top: 10px; width: 28px; height: 14px; border-radius: 999px; background: var(--mask-color); }
    .eye { position: absolute; top: 10px; width: 4px; height: 4px; border-radius: 999px; background: #1d1008; transform-origin: center center; transition: transform 140ms ease; }
    .eye.left { left: 6px; }
    .eye.right { right: 6px; }
    .buddy[data-state="idle"] .eye { animation: blink 4s ease-in-out infinite; }
    .buddy[data-mood="focused"] .eye { transform: scaleY(0.85) translateY(1px); }
    .buddy[data-mood="sleepy"] .eye { transform: scaleY(0.25) translateY(2px); }
    .buddy[data-mood="annoyed"] .eye { transform: scaleY(0.8); }
    .brow { position: absolute; top: 6px; width: 10px; height: 2px; border-radius: 999px; background: rgba(63, 36, 17, 0.78); transition: transform 160ms ease; }
    .brow.left { left: 4px; transform: rotate(-8deg); }
    .brow.right { right: 4px; transform: rotate(8deg); }
    .buddy[data-mood="focused"] .brow.left { transform: translateY(1px) rotate(10deg); }
    .buddy[data-mood="focused"] .brow.right { transform: translateY(1px) rotate(-10deg); }
    .buddy[data-mood="annoyed"] .brow.left { transform: translateY(-1px) rotate(18deg); }
    .buddy[data-mood="annoyed"] .brow.right { transform: translateY(-1px) rotate(-18deg); }
    .buddy[data-mood="sleepy"] .brow.left,
    .buddy[data-mood="sleepy"] .brow.right { transform: translateY(2px) rotate(0deg); }
    .mouth { position: absolute; left: 9px; bottom: 5px; width: 10px; height: 5px; border-radius: 0 0 10px 10px; border-bottom: 2px solid #6e4632; }
    .buddy[data-mood="sleepy"] .mouth { width: 8px; height: 2px; border-bottom-width: 1px; }
    .buddy[data-mood="annoyed"] .mouth { border-bottom: 0; border-top: 2px solid #6e4632; border-radius: 10px 10px 0 0; bottom: 6px; }
    .buddy[data-mood="proud"] .mouth { width: 12px; border-bottom-width: 3px; }
    .blush { position: absolute; top: 22px; width: 8px; height: 5px; border-radius: 999px; background: rgba(255, 174, 132, 0.4); opacity: 0; transition: opacity 180ms ease; }
    .blush.left { left: 9px; }
    .blush.right { right: 8px; }
    .buddy[data-mood="proud"] .blush { opacity: 1; }
    .goggles {
      position: absolute;
      left: 2px;
      top: 8px;
      width: 16px;
      height: 4px;
      border-radius: 999px;
      background: var(--mask-color);
      box-shadow: 10px 0 0 var(--mask-color);
    }
    .goggles::before {
      content: "";
      position: absolute;
      left: 6px;
      top: 1px;
      width: 10px;
      height: 2px;
      background: var(--mask-color);
    }
    .goggles::after { display: none; }
    .arm { position: absolute; top: 33px; width: 4px; height: 26px; border-radius: 999px; background: linear-gradient(180deg, var(--body-top), var(--body-bottom)); transform-origin: top center; }
    .arm.left { left: 10px; transform: rotate(28deg); }
    .arm.right { right: 10px; transform: rotate(-28deg); }
    .buddy[data-state="active"] .arm.left { animation: left-arm 0.72s ease-in-out infinite; }
    .buddy[data-state="active"] .arm.right { animation: right-arm 0.72s ease-in-out infinite; }
    .buddy[data-roam="walking"] .arm.left { animation: walk-arm-left 0.64s ease-in-out infinite; }
    .buddy[data-roam="walking"] .arm.right { animation: walk-arm-right 0.64s ease-in-out infinite; }
    .leg { position: absolute; bottom: 0; width: 4px; height: 28px; border-radius: 999px; background: linear-gradient(180deg, var(--body-top), var(--body-bottom)); transform-origin: top center; }
    .leg.left { left: 19px; }
    .leg.right { left: 27px; }
    .buddy[data-state="active"] .leg.left { animation: left-leg 0.8s ease-in-out infinite; }
    .buddy[data-state="active"] .leg.right { animation: right-leg 0.8s ease-in-out infinite; }
    .buddy[data-roam="walking"] .leg.left { animation: walk-leg-left 0.64s ease-in-out infinite; }
    .buddy[data-roam="walking"] .leg.right { animation: walk-leg-right 0.64s ease-in-out infinite; }
    .tool { position: absolute; right: -3px; top: 43px; width: 24px; height: 4px; border-radius: 999px; background: #2c2c2c; transform: rotate(-18deg); }
    .tool::after { content: ""; position: absolute; right: -2px; top: -3px; width: 8px; height: 10px; border-radius: 3px; background: linear-gradient(180deg, #f0f3f6, #96a1a8); }
    .buddy[data-state="active"] .tool { animation: tool-work 0.72s ease-in-out infinite; }
    .buddy[data-roam="walking"] .tool { animation: tool-sway 0.64s ease-in-out infinite; }
    .crate { display: none !important; }
    .coin { display: none !important; }
    .halo { position: absolute; left: 22px; top: -2px; width: 48px; height: 48px; border-radius: 999px; background: radial-gradient(circle, rgba(255, 227, 151, 0.32), rgba(255, 227, 151, 0)); opacity: 0; transform: scale(0.75); transition: opacity 220ms ease, transform 220ms ease; }
    .buddy[data-loot="true"] .halo,
    .buddy[data-antic="spin"] .halo { opacity: 1; transform: scale(1); }
    .zzz { position: absolute; right: 16px; top: 8px; color: rgba(96, 67, 43, 0.86); font: 700 13px/1 "Segoe UI", sans-serif; letter-spacing: 0.04em; opacity: 0; transform: translateY(3px); transition: opacity 180ms ease, transform 180ms ease; text-shadow: 0 1px 0 rgba(255,255,255,0.45); }
    .buddy[data-mood="sleepy"] .zzz { opacity: 1; transform: translateY(0); }
    .shadow { position: absolute; left: 26px; bottom: 10px; width: 46px; height: 12px; border-radius: 999px; background: rgba(33, 18, 10, 0.18); filter: blur(6px); }
    .loot {
      position: absolute;
      left: 40px;
      top: 34px;
      width: 24px;
      height: 24px;
      border-radius: 8px;
      background: linear-gradient(180deg, rgba(255,255,255,0.96), rgba(236, 224, 212, 0.96));
      border: 2px solid rgba(41, 27, 18, 0.16);
      box-shadow: 0 8px 20px rgba(40, 18, 6, 0.18);
      object-fit: cover;
      opacity: 0;
      transform: translateY(6px) rotate(8deg) scale(0.84);
      transition: opacity 180ms ease, transform 180ms ease;
      pointer-events: none;
    }
    .buddy[data-loot="true"] .loot {
      opacity: 1;
      transform: translateY(0) rotate(10deg) scale(1);
    }
    @keyframes breathe { 0%, 100% { transform: translateY(0) scale(1); } 50% { transform: translateY(1px) scale(0.985); } }
    @keyframes work { 0%, 100% { transform: rotate(0deg) translateY(0); } 50% { transform: rotate(-4deg) translateY(-2px); } }
    @keyframes walk-cycle { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-3px) translateX(1px); } }
    @keyframes bounce { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-3px); } }
    @keyframes blink { 0%, 45%, 100% { transform: scaleY(1); } 48%, 52% { transform: scaleY(0.2); } }
    @keyframes spark { 0%, 100% { transform: translateY(0) scale(0.7); opacity: 0.1; } 50% { transform: translateY(-10px) scale(1); opacity: 1; } }
    @keyframes pulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.08); } }
    @keyframes tail { 0%, 100% { transform: rotate(24deg); } 50% { transform: rotate(17deg); } }
    @keyframes sleepy { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(2px); } }
    @keyframes shake { 0%, 100% { transform: translateX(0); } 25% { transform: translateX(-2px) rotate(-2deg); } 75% { transform: translateX(2px) rotate(2deg); } }
    @keyframes proud { 0%, 100% { transform: translateY(-4px); } 50% { transform: translateY(-7px); } }
    @keyframes nod { 0%, 100% { transform: rotate(0deg); } 50% { transform: rotate(-5deg) translateY(1px); } }
    @keyframes head-bob { 0%, 100% { transform: rotate(0deg); } 50% { transform: rotate(-3deg) translateY(1px); } }
    @keyframes left-arm { 0%, 100% { transform: rotate(18deg); } 50% { transform: rotate(40deg) translateY(-1px); } }
    @keyframes right-arm { 0%, 100% { transform: rotate(-22deg); } 50% { transform: rotate(-52deg) translateY(-2px); } }
    @keyframes wave-arm { 0%, 100% { transform: rotate(-18deg); } 50% { transform: rotate(-78deg) translateY(-1px); } }
    @keyframes walk-arm-left { 0%, 100% { transform: rotate(18deg); } 50% { transform: rotate(34deg) translateY(1px); } }
    @keyframes walk-arm-right { 0%, 100% { transform: rotate(-22deg); } 50% { transform: rotate(-38deg) translateY(1px); } }
    @keyframes left-leg { 0%, 100% { transform: rotate(0deg); } 50% { transform: rotate(9deg); } }
    @keyframes right-leg { 0%, 100% { transform: rotate(0deg); } 50% { transform: rotate(-9deg); } }
    @keyframes walk-leg-left { 0%, 100% { transform: rotate(-8deg); } 50% { transform: rotate(14deg) translateY(1px); } }
    @keyframes walk-leg-right { 0%, 100% { transform: rotate(12deg); } 50% { transform: rotate(-12deg) translateY(-1px); } }
    @keyframes stride { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-2px); } }
    @keyframes tool-work { 0%, 100% { transform: rotate(-24deg); } 50% { transform: rotate(-42deg) translateY(-1px); } }
    @keyframes tool-sway { 0%, 100% { transform: rotate(-24deg); } 50% { transform: rotate(-12deg); } }
    @keyframes hit-react {
      0% { transform: translateX(0) rotate(0deg); }
      20% { transform: translateX(-6px) rotate(-8deg); }
      52% { transform: translateX(4px) rotate(5deg); }
      100% { transform: translateX(0) rotate(0deg); }
    }
    @keyframes trip {
      0% { transform: translateX(0) rotate(0deg); }
      30% { transform: translateX(6px) rotate(12deg); }
      65% { transform: translateX(-2px) rotate(-7deg); }
      100% { transform: translateX(0) rotate(0deg); }
    }
    @keyframes spin-pop {
      0% { transform: rotate(0deg) scale(1); }
      55% { transform: rotate(320deg) scale(1.06); }
      100% { transform: rotate(360deg) scale(1); }
    }
    @keyframes fall-squash {
      0% { transform: translateY(-6px) scaleY(1.02); }
      70% { transform: translateY(0) scaleY(1); }
      82% { transform: translateY(2px) scaleY(0.92) scaleX(1.06); }
      100% { transform: translateY(0) scaleY(1) scaleX(1); }
    }
  `;
}

function createMarkup() {
  return `
    <div class="buddy" data-state="idle" aria-label="Browser Buddy companion" title="Browser Buddy">
      <div class="bubble" role="status" aria-live="polite">Momo is hanging out.</div>
      <div class="scene">
        <div class="actor">
          <div class="sparkles"><div class="spark"></div><div class="spark"></div><div class="spark"></div></div>
          <div class="impact"></div>
          <div class="shadow"></div>
          <img class="loot" alt="" />
          <div class="halo"></div>
          <div class="zzz">Zz</div>
          <div class="workshop"><div class="crate"></div><div class="coin"></div><div class="progress"><div class="progress-fill"></div></div></div>
          <div class="raccoon">
            <div class="tail"></div><div class="body"></div><div class="apron"></div>
            <div class="head"><div class="mask"></div><div class="goggles"></div><div class="brow left"></div><div class="brow right"></div><div class="eye left"></div><div class="eye right"></div><div class="blush left"></div><div class="blush right"></div><div class="snout"></div><div class="mouth"></div></div>
            <div class="arm left"></div><div class="arm right"></div><div class="leg left"></div><div class="leg right"></div><div class="tool"></div>
          </div>
        </div>
      </div>
    </div>
  `;
}

function setBubble(buddy, bubble, text, visible) {
  bubble.textContent = text;
  buddy.dataset.bubble = visible ? "true" : "false";
}

function bumpStat(stats, key, amount = 1) {
  const nextStats = {
    ...stats,
    [key]: (stats[key] || 0) + amount
  };
  chrome.storage.local.set({ buddyStats: nextStats });
  return nextStats;
}

function mountBuddy() {
  if (document.getElementById(ROOT_ID)) return null;

  const host = document.createElement("div");
  host.id = ROOT_ID;
  host.setAttribute("data-browser-buddy", "true");

  const shadowRoot = host.attachShadow({ mode: "open" });
  const style = document.createElement("style");
  style.textContent = createStyles();

  const wrapper = document.createElement("div");
  wrapper.innerHTML = createMarkup();

  shadowRoot.append(style, wrapper);
  document.documentElement.appendChild(host);

  const buddy = shadowRoot.querySelector(".buddy");
  const scene = shadowRoot.querySelector(".scene");
  const bubble = shadowRoot.querySelector(".bubble");
  const loot = shadowRoot.querySelector(".loot");

  let settings = { ...DEFAULT_SETTINGS };
  let stats = { ...DEFAULT_STATS };
  let bubbleTimer = null;
  let intervalId = null;
  let roamingTimer = null;
  let homePosition = { x: 0, y: 0 };
  let lootTimer = null;
  let stolenImageTarget = null;
  let anticTimer = null;

  function getBuddyPosition() {
    return {
      x: parseFloat(buddy.style.left || "0"),
      y: parseFloat(buddy.style.top || "0")
    };
  }

  function setBuddyPosition(nextPosition) {
    buddy.style.left = `${nextPosition.x}px`;
    buddy.style.top = `${nextPosition.y}px`;
  }

  function setDirection(fromX, toX) {
    buddy.dataset.direction = toX < fromX ? "left" : "right";
  }

  function pulseImpact() {
    buddy.dataset.impact = "hit";
    window.setTimeout(() => {
      buddy.dataset.impact = "none";
    }, 380);
  }

  function getFloorY() {
    return clamp(window.innerHeight - buddy.offsetHeight - 8, 8, window.innerHeight - buddy.offsetHeight - 8);
  }

  function showMessage(text, duration = 1500) {
    if (!settings.speech && duration !== 0) return;
    window.clearTimeout(bubbleTimer);
    setBubble(buddy, bubble, text, true);
    bubbleTimer = window.setTimeout(() => {
      setBubble(buddy, bubble, text, false);
    }, duration);
  }

  function saveSettings() {
    chrome.storage.local.set({ buddySettings: settings });
  }

  function clearLoot() {
    window.clearTimeout(lootTimer);
    lootTimer = null;
    stolenImageTarget = null;
    loot.removeAttribute("src");
    loot.style.removeProperty("width");
    loot.style.removeProperty("height");
    buddy.dataset.loot = "false";
  }

  function setAntic(name, duration = 700) {
    window.clearTimeout(anticTimer);
    buddy.dataset.antic = name;
    anticTimer = window.setTimeout(() => {
      buddy.dataset.antic = "none";
    }, duration);
  }

  function attemptFunnyAntic() {
    if (activeDrag || stolenImageTarget) return;
    if (Math.random() > 0.34) return;

    if (Math.random() > 0.5) {
      buddy.dataset.mood = "proud";
      setAntic("wave", 1100);
      if (settings.speech) {
        showMessage("Tiny wave from your browser goblin.", 900);
      }
      return;
    }

    buddy.dataset.mood = "annoyed";
    setAntic(Math.random() > 0.5 ? "trip" : "spin", 720);
    if (settings.speech) {
      showMessage("Whoops. Totally meant to do that.", 900);
    }
    window.setTimeout(() => {
      buddy.dataset.mood = Date.now() < activityUntil ? "focused" : "calm";
    }, 760);
  }

  function isStealableImage(image) {
    if (!(image instanceof HTMLImageElement)) return false;
    if (!image.currentSrc || !image.complete) return false;
    if (image.closest(`#${ROOT_ID}`)) return false;
    if (image.closest("button, a, input, textarea, select, label")) return false;

    const rect = image.getBoundingClientRect();
    if (rect.width < 28 || rect.height < 28 || rect.width > 220 || rect.height > 220) return false;
    if (rect.bottom < 0 || rect.right < 0 || rect.top > window.innerHeight || rect.left > window.innerWidth) return false;

    return true;
  }

  function attemptImageHeist() {
    if (!settings.enabled || buddy.hidden || activeDrag) return;
    if (Date.now() < imageHeistCooldownUntil) return;
    if (Date.now() < activityUntil) return;
    if (stolenImageTarget) return;
    if (Math.random() > 0.18) return;

    const images = Array.from(document.images).filter(isStealableImage);
    if (!images.length) return;

    const image = images[Math.floor(Math.random() * images.length)];
    const rect = image.getBoundingClientRect();
    const size = clamp(Math.round(Math.min(rect.width, rect.height, 42)), 20, 42);

    stolenImageTarget = image;
    loot.src = image.currentSrc;
    loot.style.width = `${size}px`;
    loot.style.height = `${size}px`;
    buddy.dataset.loot = "true";
    buddy.dataset.mood = "proud";
    stats = bumpStat(stats, "steals");
    imageHeistCooldownUntil = Date.now() + 18000;
    showMessage(pickLine(settings.personality, "steal"), 1200);

    lootTimer = window.setTimeout(() => {
      buddy.dataset.mood = buddy.dataset.state === "active" ? "focused" : "calm";
      clearLoot();
    }, 3600);
  }

  function applySettings() {
    currentAnchorIndex = getAnchorIndexByName(settings.anchor);
    const theme = themeMap[settings.theme] || themeMap.workshop;
    const variant = variantMap[settings.petVariant] || variantMap.classic;
    const scale = sizeMap[settings.size] || sizeMap.medium;
    const nextPosition = settings.positionMode === "custom" && settings.customPosition
      ? {
          x: clamp(settings.customPosition.x, 8, window.innerWidth - buddy.offsetWidth - 8),
          y: clamp(settings.gravityDrop ? getFloorY() : settings.customPosition.y, 8, window.innerHeight - buddy.offsetHeight - 8)
        }
      : resolveAnchorPosition(currentAnchorIndex);

    buddy.hidden = !settings.enabled;
    if (!settings.enabled) {
      clearLoot();
    }
    setDirection(getBuddyPosition().x || nextPosition.x, nextPosition.x);
    setBuddyPosition(nextPosition);
    homePosition = { ...nextPosition };
    buddy.style.setProperty("--buddy-scale", scale);
    buddy.style.setProperty("--theme-accent", theme.accent);
    buddy.style.setProperty("--theme-accent-soft", theme.accentSoft);
    buddy.style.setProperty("--theme-workshop-top", theme.workshopTop);
    buddy.style.setProperty("--theme-workshop-bottom", theme.workshopBottom);
    buddy.style.setProperty("--theme-apron-top", theme.apronTop);
    buddy.style.setProperty("--theme-apron-bottom", theme.apronBottom);
    buddy.style.setProperty("--fur-top", variant.furTop);
    buddy.style.setProperty("--fur-bottom", variant.furBottom);
    buddy.style.setProperty("--body-top", variant.bodyTop);
    buddy.style.setProperty("--body-bottom", variant.bodyBottom);
    buddy.style.setProperty("--mask-color", variant.mask);
    buddy.style.setProperty("--ear-top", variant.earTop);
    buddy.style.setProperty("--ear-bottom", variant.earBottom);
    buddy.title = settings.petName;
    buddy.dataset.mood = "calm";
  }

  function updateVisualState() {
    if (!settings.enabled) return;
    const isActive = Date.now() < activityUntil;

    if (isActive) {
      buddy.dataset.state = "active";
      if (!stolenImageTarget) {
        buddy.dataset.mood = "focused";
      }
    } else {
      buddy.dataset.state = "idle";
      if (!stolenImageTarget) {
        buddy.dataset.mood = "sleepy";
      }
    }
  }

  function moveToAnchor(anchorIndex, announceText) {
    currentAnchorIndex = anchorIndex;
    settings.anchor = anchorPositions[anchorIndex].name;
    settings.positionMode = "anchor";
    settings.customPosition = null;
    saveSettings();
    const nextPosition = resolveAnchorPosition(anchorIndex);
    setDirection(getBuddyPosition().x || nextPosition.x, nextPosition.x);
    setBuddyPosition(nextPosition);
    homePosition = { ...nextPosition };
    buddy.dataset.kicked = "true";
    buddy.dataset.mood = "annoyed";

    window.setTimeout(() => {
      buddy.dataset.kicked = "false";
      if (buddy.dataset.state === "active") {
        buddy.dataset.mood = "focused";
      } else {
        buddy.dataset.mood = "calm";
      }
    }, 250);

    if (announceText) {
      showMessage(announceText, 1300);
    }
  }

  function pickNextAnchor(excludeIndex) {
    const candidates = anchorPositions.map((anchor, index) => ({ anchor, index })).filter((item) => item.index !== excludeIndex);
    return candidates[Math.floor(Math.random() * candidates.length)].index;
  }

  function kickToAnotherSpot() {
    if (!settings.autoHop) {
      pulseImpact();
      showMessage(pickLine(settings.personality, "poke"), 1000);
      return;
    }

    stats = bumpStat(stats, "kicks");
    const nextAnchorIndex = pickNextAnchor(currentAnchorIndex);
    moveToAnchor(nextAnchorIndex, pickLine(settings.personality, "kick"));
  }

  function markActivity() {
    activityUntil = Date.now() + ACTIVITY_WINDOW_MS;
  }

  function nudgeFromCursor() {
    const currentPosition = getBuddyPosition();
    const centerX = currentPosition.x + buddy.offsetWidth / 2;
    const centerY = currentPosition.y + buddy.offsetHeight / 2;
    const dx = centerX - cursorPosition.x;
    const dy = centerY - cursorPosition.y;
    const distance = Math.hypot(dx, dy);

    if (distance > 120 || distance < 0.001) return;

    const push = (120 - distance) / 120 * 26;
    const nextX = clamp(currentPosition.x + (dx / distance) * push, 8, window.innerWidth - buddy.offsetWidth - 8);
    const nextY = clamp(currentPosition.y + (dy / distance) * push, 8, window.innerHeight - buddy.offsetHeight - 8);
    setDirection(currentPosition.x, nextX);
    setBuddyPosition({ x: nextX, y: nextY });
    buddy.dataset.mood = "annoyed";
    buddy.dataset.roam = "walking";
    pulseImpact();
  }

  function roamNearHome() {
    if (!settings.enabled || !settings.roaming || activeDrag) return;
    if (Date.now() < activityUntil) {
      buddy.dataset.roam = "idle";
      return;
    }

    const maxOffsetX = settings.positionMode === "custom" ? 34 : 22;
    const maxOffsetY = settings.gravityDrop ? 0 : 16;
    const target = {
      x: clamp(homePosition.x + Math.round((Math.random() * 2 - 1) * maxOffsetX), 8, window.innerWidth - buddy.offsetWidth - 8),
      y: clamp(homePosition.y + Math.round((Math.random() * 2 - 1) * maxOffsetY), 8, window.innerHeight - buddy.offsetHeight - 8)
    };

    const currentPosition = getBuddyPosition();
    buddy.dataset.roam = "walking";
    setDirection(currentPosition.x, target.x);
    setBuddyPosition(target);

    window.setTimeout(() => {
      buddy.dataset.roam = "idle";
      if (settings.positionMode === "custom") {
        setBuddyPosition(settings.gravityDrop ? { x: homePosition.x, y: getFloorY() } : homePosition);
      }
      attemptImageHeist();
      attemptFunnyAntic();
    }, 900);
  }

  function onPointerDown(event) {
    pointerWasDrag = false;
    const rect = buddy.getBoundingClientRect();
    activeDrag = {
      pointerId: event.pointerId,
      offsetX: event.clientX - rect.left,
      offsetY: event.clientY - rect.top
    };
    buddy.dataset.dragging = "true";
    scene.setPointerCapture(event.pointerId);
  }

  function onPointerMove(event) {
    if (!activeDrag || event.pointerId !== activeDrag.pointerId) return;

    pointerWasDrag = true;
    const nextX = clamp(event.clientX - activeDrag.offsetX, 8, window.innerWidth - buddy.offsetWidth - 8);
    const nextY = clamp(event.clientY - activeDrag.offsetY, 8, window.innerHeight - buddy.offsetHeight - 8);
    setDirection(parseFloat(buddy.style.left || "0"), nextX);
    setBuddyPosition({ x: nextX, y: nextY });
  }

  function onPointerUp(event) {
    if (!activeDrag || event.pointerId !== activeDrag.pointerId) return;

    buddy.dataset.dragging = "false";
    scene.releasePointerCapture(event.pointerId);
    activeDrag = null;

    if (!pointerWasDrag) return;

    stats = bumpStat(stats, "drags");
    const currentLeft = parseFloat(buddy.style.left || "0");
    const currentTop = parseFloat(buddy.style.top || "0");
    if (settings.gravityDrop) {
      const floorY = getFloorY();
      settings.positionMode = "custom";
      settings.customPosition = { x: currentLeft, y: floorY };
      homePosition = { x: currentLeft, y: floorY };
      saveSettings();
      buddy.dataset.falling = "true";
      buddy.dataset.roam = "walking";
      setDirection(parseFloat(buddy.style.left || "0"), currentLeft);
      setBuddyPosition({ x: currentLeft, y: floorY });
      window.setTimeout(() => {
        buddy.dataset.falling = "false";
        buddy.dataset.roam = "idle";
        buddy.dataset.mood = "proud";
      }, 560);
      showMessage("Wheee... floor acquired.", 1200);
    } else {
      settings.positionMode = "custom";
      settings.customPosition = { x: currentLeft, y: currentTop };
      homePosition = { x: currentLeft, y: currentTop };
      saveSettings();
      buddy.dataset.mood = "proud";
      showMessage("Nice. I live here now.", 1100);
    }
  }

  function setupStorageSync() {
    chrome.storage.local.get(["buddySettings", "buddyStats"], (result) => {
      settings = merge(DEFAULT_SETTINGS, result.buddySettings);
      stats = merge(DEFAULT_STATS, result.buddyStats);
      applySettings();
      setBubble(buddy, bubble, `${settings.petName} is hanging out.`, false);
      if (intervalId === null) {
        intervalId = window.setInterval(updateVisualState, 140);
        updateVisualState();
      }
      if (roamingTimer === null) {
        roamingTimer = window.setInterval(roamNearHome, 2800);
      }
    });

    chrome.storage.onChanged.addListener((changes, areaName) => {
      if (areaName !== "local") return;
      if (changes.buddySettings) {
        settings = merge(DEFAULT_SETTINGS, changes.buddySettings.newValue);
        applySettings();
      }
      if (changes.buddyStats) {
        stats = merge(DEFAULT_STATS, changes.buddyStats.newValue);
      }
    });
  }

  scene.addEventListener("pointerdown", onPointerDown);
  scene.addEventListener("pointermove", onPointerMove);
  scene.addEventListener("pointerup", onPointerUp);
  scene.addEventListener("pointercancel", onPointerUp);

  scene.addEventListener("click", () => {
    if (pointerWasDrag) {
      pointerWasDrag = false;
      return;
    }

    stats = bumpStat(stats, "pokes");

    const now = Date.now();
    if (now - lastTapAt < CLICK_KICK_THRESHOLD) {
      kickToAnotherSpot();
    } else {
      buddy.dataset.mood = "annoyed";
      pulseImpact();
      window.setTimeout(() => {
        if (Date.now() < activityUntil) {
          buddy.dataset.mood = "focused";
        } else {
          buddy.dataset.mood = "calm";
        }
      }, 420);
      if (Math.random() > 0.55) {
        setAntic("wave", 800);
      }
      showMessage(pickLine(settings.personality, "poke"), 1200);
    }
    lastTapAt = now;
  });

  scene.addEventListener("mouseenter", () => {
    if (!settings.speech) return;

    if (stolenImageTarget) {
      showMessage("Look what I borrowed.", 900);
      return;
    }

    if (Date.now() < activityUntil) {
      showMessage(pickLine(settings.personality, "active"), 900);
    } else {
      showMessage(pickLine(settings.personality, "idle"), 900);
    }
  });

  ["scroll", "pointerdown", "keydown", "mousemove", "wheel"].forEach((eventName) => {
    window.addEventListener(eventName, markActivity, { passive: true });
  });

  window.addEventListener("mousemove", (event) => {
    cursorPosition = { x: event.clientX, y: event.clientY };
    if (!activeDrag) {
      nudgeFromCursor();
    }
  }, { passive: true });

  window.addEventListener("resize", () => {
    const nextPosition = settings.positionMode === "custom" && settings.customPosition
      ? {
          x: clamp(settings.customPosition.x, 8, window.innerWidth - buddy.offsetWidth - 8),
          y: clamp(settings.gravityDrop ? getFloorY() : settings.customPosition.y, 8, window.innerHeight - buddy.offsetHeight - 8)
        }
      : resolveAnchorPosition(currentAnchorIndex);
    setDirection(parseFloat(buddy.style.left || "0"), nextPosition.x);
    setBuddyPosition(nextPosition);
    homePosition = { ...nextPosition };
  });

  setupStorageSync();
  window.addEventListener("beforeunload", clearLoot);
  return host;
}

if (isHtmlDocument()) {
  mountBuddy();
}
