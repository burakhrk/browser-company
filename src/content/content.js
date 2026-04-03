const ROOT_ID = "browser-buddy-root";
const ACTIVITY_WINDOW_MS = 7000;
const CLICK_KICK_THRESHOLD = 220;
const DEFAULT_SETTINGS = {
  enabled: true,
  petName: "Momo",
  size: "medium",
  theme: "workshop",
  petVariant: "raccoon",
  anchor: "bottom-right",
  positionMode: "anchor",
  customPosition: null,
  personality: "hype",
  speech: true,
  motivation: true,
  autoHop: true,
  roaming: true,
  gravityDrop: false
};
const DEFAULT_STATS = {
  shinyBits: 0,
  rewardsCollected: 0,
  pokes: 0,
  kicks: 0,
  drags: 0
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
  raccoon: {
    furTop: "#e5b384",
    furBottom: "#be7f54",
    bodyTop: "#c88a57",
    bodyBottom: "#9d6139",
    mask: "rgba(80, 49, 30, 0.72)",
    earTop: "#d89d6d",
    earBottom: "#a86842"
  },
  fox: {
    furTop: "#f0a86f",
    furBottom: "#d5754d",
    bodyTop: "#da8850",
    bodyBottom: "#b35d36",
    mask: "rgba(120, 58, 26, 0.38)",
    earTop: "#f0b07e",
    earBottom: "#c76b3d"
  },
  cat: {
    furTop: "#d8c4b4",
    furBottom: "#b49a87",
    bodyTop: "#c9b09b",
    bodyBottom: "#9f8470",
    mask: "rgba(93, 74, 60, 0.28)",
    earTop: "#dbc7b7",
    earBottom: "#ac917d"
  }
};

const sizeMap = {
  small: 0.84,
  medium: 1,
  large: 1.14
};

const talkMap = {
  hype: {
    active: ["We are cooking. Keep going.", "Tiny browser company is booming.", "Momentum acquired. Love that for us."],
    idle: ["I can wait. Tiny move is still a move.", "No stress. We can reboot in one click.", "I am chilling until you are back."],
    poke: ["Hey. I am literally on shift.", "Bonk received. Morale unchanged.", "Rude, but kind of funny."],
    kick: ["Okay wow, new corner it is.", "I am filing a tiny complaint.", "Relocating dramatically."],
    reward: ["Fresh shiny bits ready.", "Look what I made.", "Reward drop. Come grab it."],
    collect: ["Huge. Economy restored.", "Shiny bits secured.", "That one goes on the company ledger."]
  },
  chill: {
    active: ["Nice pace. We are in a groove.", "Calm focus mode looks good on us.", "Steady energy. Tiny progress counts."],
    idle: ["I am just hanging out here.", "All good. We can ease back in.", "Taking a small breather."],
    poke: ["Soft bonk noted.", "I am still here, buddy.", "That was unnecessary but adorable."],
    kick: ["Sliding over a little.", "New view, same vibe.", "I will allow the relocation."],
    reward: ["A little reward is ready.", "I made something nice.", "Tap me when you want the goodies."],
    collect: ["Cute. We keep those.", "Collected and appreciated.", "That felt nice."]
  },
  chaos: {
    active: ["Browser empire expansion underway.", "We are so back.", "Absolutely thriving in here."],
    idle: ["Resting before the next scheme.", "I am pretending to be harmless.", "Low motion. High potential."],
    poke: ["Violence in the workplace.", "You poke, I remember.", "I will recover and maybe unionize."],
    kick: ["Yeeted to another district.", "Corner change. Spirit unchanged.", "I have been launched."],
    reward: ["Loot event detected.", "A suspiciously legal reward is ready.", "We made money somehow."],
    collect: ["Funds acquired.", "Glorious little paycheck.", "Excellent. Back to operations."]
  }
};

let activityUntil = Date.now();
let currentAnchorIndex = 0;
let activeDrag = null;
let pointerWasDrag = false;
let lastTapAt = 0;
let cursorPosition = { x: -9999, y: -9999 };

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
      width: 136px;
      height: 152px;
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
    .buddy[data-roam="walking"] { animation: stride 0.9s ease-in-out infinite; }
    .buddy[data-state="idle"] .raccoon { animation: breathe 2.8s ease-in-out infinite; }
    .buddy[data-kicked="true"] { transform: rotate(-8deg) scale(calc(var(--buddy-scale) * 0.97)); }
    .buddy[data-dragging="true"] { transition: none; transform: scale(calc(var(--buddy-scale) * 1.03)); filter: drop-shadow(0 24px 36px rgba(35, 18, 8, 0.28)); }
    .buddy[data-falling="true"] { transition: top 520ms cubic-bezier(0.2, 0.78, 0.18, 1.06), left 220ms ease, transform 160ms ease; }
    .scene { position: relative; width: 100%; height: 100%; cursor: grab; }
    .scene:active { cursor: grabbing; }
    .badge {
      position: absolute; top: 8px; right: 6px; min-width: 24px; height: 24px; padding: 0 8px; display: flex; align-items: center; justify-content: center;
      border-radius: 999px; background: linear-gradient(180deg, var(--theme-accent-soft), var(--theme-accent)); color: #5c2d00; font: 700 11px/1 "Segoe UI", sans-serif;
      box-shadow: 0 8px 18px rgba(154, 100, 19, 0.22); opacity: 0; transform: translateY(6px) scale(0.85); transition: opacity 180ms ease, transform 180ms ease;
    }
    .buddy[data-state="reward"] .badge { opacity: 1; transform: translateY(0) scale(1); }
    .bubble {
      position: absolute; left: 50%; top: -6px; max-width: 170px; padding: 8px 10px; border-radius: 14px; background: rgba(49, 30, 16, 0.94); color: #fff5ea;
      font: 600 11px/1.3 "Segoe UI", sans-serif; text-align: center; transform: translate(-50%, -100%); opacity: 0; transition: opacity 180ms ease, transform 180ms ease;
      pointer-events: none; box-shadow: 0 12px 24px rgba(20, 8, 2, 0.2);
    }
    .bubble::after { content: ""; position: absolute; left: 50%; bottom: -6px; width: 12px; height: 12px; background: rgba(49, 30, 16, 0.94); transform: translateX(-50%) rotate(45deg); border-radius: 3px; }
    .buddy[data-bubble="true"] .bubble { opacity: 1; transform: translate(-50%, calc(-100% - 4px)); }
    .sparkles { position: absolute; inset: 0; pointer-events: none; }
    .spark { position: absolute; width: 8px; height: 8px; border-radius: 999px; background: radial-gradient(circle, var(--theme-accent-soft), var(--theme-accent) 65%, transparent 66%); opacity: 0; }
    .buddy[data-state="active"] .spark, .buddy[data-state="reward"] .spark { opacity: 1; animation: spark 1.5s ease-in-out infinite; }
    .spark:nth-child(1) { left: 76px; top: 22px; animation-delay: 0s; }
    .spark:nth-child(2) { left: 92px; top: 34px; animation-delay: 0.4s; }
    .spark:nth-child(3) { left: 58px; top: 30px; animation-delay: 0.8s; }
    .workshop {
      position: absolute; left: 8px; right: 8px; bottom: 0; height: 90px; border-radius: 24px 24px 28px 28px;
      background: radial-gradient(circle at top center, rgba(255, 225, 165, 0.36), transparent 48%), linear-gradient(180deg, var(--theme-workshop-top), var(--theme-workshop-bottom) 62%, #23140b);
      box-shadow: inset 0 2px 0 rgba(255, 241, 218, 0.2), 0 14px 28px rgba(48, 29, 18, 0.18); overflow: hidden;
    }
    .workshop::before {
      content: ""; position: absolute; inset: auto 8px 12px 8px; height: 24px; border-radius: 14px;
      background: repeating-linear-gradient(90deg, #79563d 0 14px, #6b4933 14px 28px); opacity: 0.92;
    }
    .progress { position: absolute; left: 12px; right: 12px; bottom: 18px; height: 8px; border-radius: 999px; background: rgba(255, 243, 228, 0.12); overflow: hidden; }
    .progress-fill { width: 24%; height: 100%; border-radius: inherit; background: linear-gradient(90deg, var(--theme-accent-soft), var(--theme-accent)); transition: width 260ms ease; box-shadow: 0 0 16px rgba(255, 199, 96, 0.4); }
    .raccoon { position: absolute; left: 31px; bottom: 36px; width: 78px; height: 82px; transition: transform 180ms ease; transform-origin: center bottom; }
    .buddy[data-state="active"] .raccoon { animation: work 0.9s ease-in-out infinite; }
    .buddy[data-state="reward"] .raccoon { transform: translateY(-4px); }
    .buddy[data-mood="sleepy"] .raccoon { animation: sleepy 3.6s ease-in-out infinite; }
    .buddy[data-mood="annoyed"] .raccoon { animation: shake 0.28s ease-in-out 2; }
    .buddy[data-mood="proud"] .raccoon { animation: proud 1.2s ease-in-out infinite; }
    .tail { position: absolute; right: -7px; bottom: 8px; width: 28px; height: 46px; border-radius: 18px; background: linear-gradient(180deg, #c18b5e, #8d5b37); transform: rotate(24deg); transform-origin: center bottom; animation: tail 3s ease-in-out infinite; }
    .tail::after { content: ""; position: absolute; inset: 7px 5px 6px 5px; border-radius: 14px; background: repeating-linear-gradient(180deg, rgba(91, 50, 26, 0.85) 0 6px, rgba(242, 216, 185, 0.75) 6px 12px); }
    .body { position: absolute; left: 12px; bottom: 0; width: 52px; height: 46px; border-radius: 22px 22px 18px 18px; background: linear-gradient(180deg, var(--body-top), var(--body-bottom)); box-shadow: inset 0 3px 0 rgba(255, 231, 199, 0.18); }
    .apron { position: absolute; left: 18px; bottom: 7px; width: 40px; height: 32px; border-radius: 16px; background: linear-gradient(180deg, var(--theme-apron-top), var(--theme-apron-bottom)); box-shadow: inset 0 2px 0 rgba(255, 255, 255, 0.2); }
    .head { position: absolute; left: 16px; top: 6px; width: 46px; height: 42px; border-radius: 22px; background: linear-gradient(180deg, var(--fur-top), var(--fur-bottom)); box-shadow: inset 0 3px 0 rgba(255, 235, 210, 0.24); transform-origin: center bottom; }
    .buddy[data-state="active"] .head { animation: nod 0.9s ease-in-out infinite; }
    .head::before, .head::after { content: ""; position: absolute; top: -5px; width: 18px; height: 18px; border-radius: 4px 16px 5px 16px; background: linear-gradient(180deg, var(--ear-top), var(--ear-bottom)); }
    .head::before { left: 4px; transform: rotate(-24deg); }
    .head::after { right: 4px; transform: scaleX(-1) rotate(-24deg); }
    .mask { position: absolute; left: 9px; top: 10px; width: 28px; height: 14px; border-radius: 999px; background: var(--mask-color); }
    .eye { position: absolute; top: 14px; width: 7px; height: 10px; border-radius: 999px; background: #1d1008; transform-origin: center center; transition: transform 140ms ease; }
    .eye.left { left: 16px; }
    .eye.right { right: 15px; }
    .buddy[data-state="idle"] .eye { animation: blink 4s ease-in-out infinite; }
    .buddy[data-mood="focused"] .eye { transform: scaleY(0.85) translateY(1px); }
    .buddy[data-mood="sleepy"] .eye { transform: scaleY(0.25) translateY(2px); }
    .buddy[data-mood="annoyed"] .eye { transform: scaleY(0.8); }
    .brow { position: absolute; top: 10px; width: 12px; height: 3px; border-radius: 999px; background: rgba(63, 36, 17, 0.78); transition: transform 160ms ease; }
    .brow.left { left: 13px; transform: rotate(-8deg); }
    .brow.right { right: 12px; transform: rotate(8deg); }
    .buddy[data-mood="focused"] .brow.left { transform: translateY(1px) rotate(10deg); }
    .buddy[data-mood="focused"] .brow.right { transform: translateY(1px) rotate(-10deg); }
    .buddy[data-mood="annoyed"] .brow.left { transform: translateY(-1px) rotate(18deg); }
    .buddy[data-mood="annoyed"] .brow.right { transform: translateY(-1px) rotate(-18deg); }
    .buddy[data-mood="sleepy"] .brow.left,
    .buddy[data-mood="sleepy"] .brow.right { transform: translateY(2px) rotate(0deg); }
    .snout { position: absolute; left: 14px; bottom: 7px; width: 20px; height: 13px; border-radius: 999px; background: #f7e2cb; }
    .snout::after { content: ""; position: absolute; left: 8px; top: 2px; width: 4px; height: 4px; border-radius: 999px; background: #543120; }
    .mouth { position: absolute; left: 18px; bottom: 4px; width: 10px; height: 6px; border-radius: 0 0 10px 10px; border-bottom: 2px solid #6e4632; }
    .buddy[data-mood="sleepy"] .mouth { width: 8px; height: 2px; border-bottom-width: 1px; }
    .buddy[data-mood="annoyed"] .mouth { border-bottom: 0; border-top: 2px solid #6e4632; border-radius: 10px 10px 0 0; bottom: 6px; }
    .buddy[data-mood="proud"] .mouth,
    .buddy[data-state="reward"] .mouth { width: 12px; border-bottom-width: 3px; }
    .blush { position: absolute; top: 22px; width: 8px; height: 5px; border-radius: 999px; background: rgba(255, 174, 132, 0.4); opacity: 0; transition: opacity 180ms ease; }
    .blush.left { left: 9px; }
    .blush.right { right: 8px; }
    .buddy[data-mood="proud"] .blush,
    .buddy[data-state="reward"] .blush { opacity: 1; }
    .goggles { position: absolute; left: 11px; top: 7px; width: 26px; height: 8px; border-radius: 999px; background: #494845; }
    .goggles::before, .goggles::after { content: ""; position: absolute; top: -1px; width: 11px; height: 11px; border-radius: 999px; background: linear-gradient(180deg, rgba(175, 224, 255, 0.9), rgba(105, 154, 188, 0.9)); border: 2px solid #40403e; }
    .goggles::before { left: -1px; }
    .goggles::after { right: -1px; }
    .arm { position: absolute; top: 42px; width: 12px; height: 28px; border-radius: 999px; background: linear-gradient(180deg, #da9f73, #b9784a); transform-origin: top center; }
    .arm.left { left: 14px; transform: rotate(18deg); }
    .arm.right { right: 8px; transform: rotate(-22deg); }
    .buddy[data-state="active"] .arm.left { animation: left-arm 0.72s ease-in-out infinite; }
    .buddy[data-state="active"] .arm.right { animation: right-arm 0.72s ease-in-out infinite; }
    .leg { position: absolute; bottom: -4px; width: 10px; height: 18px; border-radius: 999px; background: linear-gradient(180deg, #9d6139, #734525); transform-origin: top center; }
    .leg.left { left: 21px; }
    .leg.right { left: 39px; }
    .buddy[data-state="active"] .leg.left { animation: left-leg 0.8s ease-in-out infinite; }
    .buddy[data-state="active"] .leg.right { animation: right-leg 0.8s ease-in-out infinite; }
    .tool { position: absolute; right: -4px; top: 53px; width: 26px; height: 7px; border-radius: 999px; background: #7c604d; transform: rotate(-24deg); }
    .tool::after { content: ""; position: absolute; right: -3px; top: -6px; width: 14px; height: 16px; border-radius: 5px; background: linear-gradient(180deg, #f0f3f6, #96a1a8); }
    .crate { position: absolute; right: 16px; bottom: 28px; width: 30px; height: 26px; border-radius: 9px; background: linear-gradient(180deg, #9b6a43, #6e4327); box-shadow: inset 0 2px 0 rgba(255, 244, 222, 0.16); }
    .crate::before, .crate::after { content: ""; position: absolute; left: 5px; right: 5px; height: 3px; border-radius: 999px; background: rgba(74, 41, 23, 0.6); }
    .crate::before { top: 8px; }
    .crate::after { bottom: 7px; }
    .coin { position: absolute; right: 24px; bottom: 54px; width: 20px; height: 20px; border-radius: 999px; background: radial-gradient(circle at 30% 30%, #fff1b0, #f3b03e 70%, #a66a13); border: 2px solid rgba(255, 236, 190, 0.35); opacity: 0; transform: scale(0.6); transition: opacity 180ms ease, transform 180ms ease; }
    .buddy[data-state="reward"] .coin { opacity: 1; transform: scale(1); animation: pulse 1.1s ease-in-out infinite; }
    .halo { position: absolute; left: 34px; top: 6px; width: 54px; height: 54px; border-radius: 999px; background: radial-gradient(circle, rgba(255, 227, 151, 0.32), rgba(255, 227, 151, 0)); opacity: 0; transform: scale(0.75); transition: opacity 220ms ease, transform 220ms ease; }
    .buddy[data-state="reward"] .halo { opacity: 1; transform: scale(1); }
    .zzz { position: absolute; right: 24px; top: 18px; color: rgba(255, 250, 241, 0.86); font: 700 13px/1 "Segoe UI", sans-serif; letter-spacing: 0.04em; opacity: 0; transform: translateY(3px); transition: opacity 180ms ease, transform 180ms ease; }
    .buddy[data-mood="sleepy"] .zzz { opacity: 1; transform: translateY(0); }
    .shadow { position: absolute; left: 23px; bottom: 16px; width: 76px; height: 18px; border-radius: 999px; background: rgba(33, 18, 10, 0.18); filter: blur(6px); }
    @keyframes breathe { 0%, 100% { transform: translateY(0) scale(1); } 50% { transform: translateY(1px) scale(0.985); } }
    @keyframes work { 0%, 100% { transform: rotate(0deg) translateY(0); } 50% { transform: rotate(-4deg) translateY(-2px); } }
    @keyframes bounce { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-3px); } }
    @keyframes blink { 0%, 45%, 100% { transform: scaleY(1); } 48%, 52% { transform: scaleY(0.2); } }
    @keyframes spark { 0%, 100% { transform: translateY(0) scale(0.7); opacity: 0.1; } 50% { transform: translateY(-10px) scale(1); opacity: 1; } }
    @keyframes pulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.08); } }
    @keyframes tail { 0%, 100% { transform: rotate(24deg); } 50% { transform: rotate(17deg); } }
    @keyframes sleepy { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(2px); } }
    @keyframes shake { 0%, 100% { transform: translateX(0); } 25% { transform: translateX(-2px) rotate(-2deg); } 75% { transform: translateX(2px) rotate(2deg); } }
    @keyframes proud { 0%, 100% { transform: translateY(-4px); } 50% { transform: translateY(-7px); } }
    @keyframes nod { 0%, 100% { transform: rotate(0deg); } 50% { transform: rotate(-5deg) translateY(1px); } }
    @keyframes left-arm { 0%, 100% { transform: rotate(18deg); } 50% { transform: rotate(40deg) translateY(-1px); } }
    @keyframes right-arm { 0%, 100% { transform: rotate(-22deg); } 50% { transform: rotate(-52deg) translateY(-2px); } }
    @keyframes left-leg { 0%, 100% { transform: rotate(0deg); } 50% { transform: rotate(9deg); } }
    @keyframes right-leg { 0%, 100% { transform: rotate(0deg); } 50% { transform: rotate(-9deg); } }
    @keyframes stride { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-2px); } }
  `;
}

function createMarkup() {
  return `
    <div class="buddy" data-state="idle" aria-label="Browser Buddy companion" title="Browser Buddy">
      <div class="bubble" role="status" aria-live="polite">Momo is hanging out.</div>
      <div class="badge">+</div>
      <div class="scene">
        <div class="sparkles"><div class="spark"></div><div class="spark"></div><div class="spark"></div></div>
        <div class="shadow"></div>
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
  const progressFill = shadowRoot.querySelector(".progress-fill");

  let settings = { ...DEFAULT_SETTINGS };
  let stats = { ...DEFAULT_STATS };
  let momentum = 24;
  let rewardReady = false;
  let bubbleTimer = null;
  let rewardTimer = 0;
  let intervalId = null;
  let roamingTimer = null;
  let homePosition = { x: 0, y: 0 };

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

  function applySettings() {
    currentAnchorIndex = getAnchorIndexByName(settings.anchor);
    const theme = themeMap[settings.theme] || themeMap.workshop;
    const variant = variantMap[settings.petVariant] || variantMap.raccoon;
    const scale = sizeMap[settings.size] || sizeMap.medium;
    const nextPosition = settings.positionMode === "custom" && settings.customPosition
      ? {
          x: clamp(settings.customPosition.x, 8, window.innerWidth - buddy.offsetWidth - 8),
          y: clamp(settings.gravityDrop ? getFloorY() : settings.customPosition.y, 8, window.innerHeight - buddy.offsetHeight - 8)
        }
      : resolveAnchorPosition(currentAnchorIndex);

    buddy.hidden = !settings.enabled;
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

    if (rewardReady) {
      buddy.dataset.state = "reward";
      buddy.dataset.mood = "proud";
      progressFill.style.width = "100%";
      return;
    }

    if (isActive) {
      momentum = Math.min(100, momentum + 1.2);
      buddy.dataset.state = "active";
      buddy.dataset.mood = momentum > 72 ? "focused" : "calm";
    } else {
      momentum = Math.max(8, momentum - 0.7);
      buddy.dataset.state = "idle";
      buddy.dataset.mood = momentum < 24 ? "sleepy" : "calm";
    }

    progressFill.style.width = `${momentum}%`;
    rewardTimer += isActive ? 1 : 0;

    if (momentum > 88 && rewardTimer > 60) {
      rewardReady = true;
      showMessage(pickLine(settings.personality, "reward"), 1800);
    }
  }

  function moveToAnchor(anchorIndex, announceText) {
    currentAnchorIndex = anchorIndex;
    settings.anchor = anchorPositions[anchorIndex].name;
    settings.positionMode = "anchor";
    settings.customPosition = null;
    saveSettings();
    const nextPosition = resolveAnchorPosition(anchorIndex);
    setBuddyPosition(nextPosition);
    homePosition = { ...nextPosition };
    buddy.dataset.kicked = "true";
    buddy.dataset.mood = "annoyed";

    window.setTimeout(() => {
      buddy.dataset.kicked = "false";
      if (buddy.dataset.state === "reward") {
        buddy.dataset.mood = "proud";
      } else if (buddy.dataset.state === "active") {
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
      showMessage(pickLine(settings.personality, "poke"), 1000);
      return;
    }

    stats = bumpStat(stats, "kicks");
    const nextAnchorIndex = pickNextAnchor(currentAnchorIndex);
    moveToAnchor(nextAnchorIndex, pickLine(settings.personality, "kick"));
  }

  function collectReward() {
    rewardReady = false;
    rewardTimer = 0;
    momentum = 32;
    stats = bumpStat(stats, "rewardsCollected");
    stats = bumpStat(stats, "shinyBits", 8);
    buddy.dataset.state = "active";
    buddy.dataset.mood = "proud";
    progressFill.style.width = `${momentum}%`;
    showMessage(pickLine(settings.personality, "collect"), 1600);
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
    setBuddyPosition({ x: nextX, y: nextY });
    buddy.dataset.mood = "annoyed";
    buddy.dataset.roam = "walking";
  }

  function roamNearHome() {
    if (!settings.enabled || !settings.roaming || activeDrag) return;
    if (Date.now() < activityUntil || rewardReady) {
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
    buddy.style.transform = `${target.x < currentPosition.x ? "scaleX(-1) " : ""}scale(var(--buddy-scale))`;
    setBuddyPosition(target);

    window.setTimeout(() => {
      buddy.dataset.roam = "idle";
      if (settings.positionMode === "custom") {
        setBuddyPosition(settings.gravityDrop ? { x: homePosition.x, y: getFloorY() } : homePosition);
        buddy.style.transform = "scale(var(--buddy-scale))";
      }
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

    if (rewardReady) {
      collectReward();
      return;
    }

    stats = bumpStat(stats, "pokes");

    const now = Date.now();
    if (now - lastTapAt < CLICK_KICK_THRESHOLD) {
      kickToAnotherSpot();
    } else {
      buddy.dataset.mood = "annoyed";
      window.setTimeout(() => {
        if (buddy.dataset.state === "reward") {
          buddy.dataset.mood = "proud";
        } else if (Date.now() < activityUntil) {
          buddy.dataset.mood = "focused";
        } else {
          buddy.dataset.mood = "calm";
        }
      }, 420);
      showMessage(pickLine(settings.personality, "poke"), 1200);
    }
    lastTapAt = now;
  });

  scene.addEventListener("mouseenter", () => {
    if (!settings.speech) return;

    if (rewardReady) {
      showMessage("Tap me. I made a thing.", 900);
      return;
    }

    if (Date.now() < activityUntil) {
      showMessage(pickLine(settings.personality, "active"), 900);
    } else if (settings.motivation) {
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
    setBuddyPosition(nextPosition);
    homePosition = { ...nextPosition };
  });

  setupStorageSync();
  return host;
}

if (isHtmlDocument()) {
  mountBuddy();
}
