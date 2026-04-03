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

function mergeDefaults(currentValue, defaults) {
  return {
    ...defaults,
    ...(currentValue || {})
  };
}

function ensureDefaults() {
  chrome.storage.local.get(["buddySettings", "buddyStats"], (result) => {
    chrome.storage.local.set({
      buddySettings: mergeDefaults(result.buddySettings, DEFAULT_SETTINGS),
      buddyStats: mergeDefaults(result.buddyStats, DEFAULT_STATS)
    });
  });
}

chrome.runtime.onInstalled.addListener(() => {
  ensureDefaults();
});

chrome.runtime.onStartup.addListener(() => {
  ensureDefaults();
});
