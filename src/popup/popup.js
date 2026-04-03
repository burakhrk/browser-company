const DEFAULT_SETTINGS = {
  enabled: true,
  petName: "Momo",
  size: "medium",
  theme: "workshop",
  anchor: "bottom-right",
  personality: "hype",
  speech: true,
  motivation: true,
  autoHop: true
};

const DEFAULT_STATS = {
  shinyBits: 0,
  rewardsCollected: 0,
  pokes: 0,
  kicks: 0,
  drags: 0
};

const settingsFields = [
  "enabled",
  "petName",
  "size",
  "theme",
  "anchor",
  "personality",
  "speech",
  "motivation",
  "autoHop"
];

function merge(defaults, value) {
  return {
    ...defaults,
    ...(value || {})
  };
}

function $(id) {
  return document.getElementById(id);
}

function showSavedState() {
  const note = $("saveNote");
  note.classList.add("visible");
  window.clearTimeout(showSavedState.timerId);
  showSavedState.timerId = window.setTimeout(() => {
    note.classList.remove("visible");
  }, 1000);
}

function renderHero(settings, stats) {
  $("heroName").textContent = settings.petName || "Momo";
  $("heroBits").textContent = String(stats.shinyBits || 0);
  $("heroMood").textContent = settings.personality === "chaos" ? "Chaos" : settings.personality === "chill" ? "Chill" : "Hype";
}

function renderStats(stats) {
  $("pokesValue").textContent = String(stats.pokes || 0);
  $("kicksValue").textContent = String(stats.kicks || 0);
  $("dragsValue").textContent = String(stats.drags || 0);
  $("rewardsValue").textContent = String(stats.rewardsCollected || 0);
}

function renderSettings(settings) {
  settingsFields.forEach((fieldName) => {
    const field = $(fieldName);
    if (!field) return;
    if (field.type === "checkbox") {
      field.checked = Boolean(settings[fieldName]);
    } else {
      field.value = settings[fieldName];
    }
  });
}

function collectSettingsFromForm() {
  return {
    enabled: $("enabled").checked,
    petName: $("petName").value.trim() || "Momo",
    size: $("size").value,
    theme: $("theme").value,
    anchor: $("anchor").value,
    personality: $("personality").value,
    speech: $("speech").checked,
    motivation: $("motivation").checked,
    autoHop: $("autoHop").checked
  };
}

function bindSettings(stats) {
  settingsFields.forEach((fieldName) => {
    const field = $(fieldName);
    if (!field) return;
    field.addEventListener("change", () => {
      const nextSettings = collectSettingsFromForm();
      chrome.storage.local.set({ buddySettings: nextSettings }, () => {
        renderHero(nextSettings, stats);
        showSavedState();
      });
    });
  });
}

function bindReset() {
  $("resetStats").addEventListener("click", () => {
    chrome.storage.local.set({ buddyStats: { ...DEFAULT_STATS } }, () => {
      renderStats(DEFAULT_STATS);
      renderHero(collectSettingsFromForm(), DEFAULT_STATS);
      showSavedState();
    });
  });
}

function init() {
  chrome.storage.local.get(["buddySettings", "buddyStats"], (result) => {
    const settings = merge(DEFAULT_SETTINGS, result.buddySettings);
    const stats = merge(DEFAULT_STATS, result.buddyStats);
    renderSettings(settings);
    renderHero(settings, stats);
    renderStats(stats);
    bindSettings(stats);
    bindReset();
  });

  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName !== "local") return;
    if (changes.buddySettings) {
      const nextSettings = merge(DEFAULT_SETTINGS, changes.buddySettings.newValue);
      renderSettings(nextSettings);
      chrome.storage.local.get(["buddyStats"], (result) => {
        renderHero(nextSettings, merge(DEFAULT_STATS, result.buddyStats));
      });
    }
    if (changes.buddyStats) {
      const nextStats = merge(DEFAULT_STATS, changes.buddyStats.newValue);
      renderStats(nextStats);
      chrome.storage.local.get(["buddySettings"], (result) => {
        renderHero(merge(DEFAULT_SETTINGS, result.buddySettings), nextStats);
      });
    }
  });
}

document.addEventListener("DOMContentLoaded", init);
