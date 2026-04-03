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

const settingsFields = [
  "enabled",
  "petName",
  "size",
  "theme",
  "petVariant",
  "anchor",
  "personality",
  "speech",
  "motivation",
  "autoHop",
  "roaming",
  "gravityDrop"
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

function activateTab(tabName) {
  document.querySelectorAll(".tab").forEach((tab) => {
    tab.classList.toggle("is-active", tab.dataset.tab === tabName);
  });
  document.querySelectorAll(".panel").forEach((panel) => {
    panel.classList.toggle("is-active", panel.dataset.panel === tabName);
  });
}

function renderHero(settings, stats) {
  $("heroTitle").textContent = `${settings.petName || "Momo"} is on shift.`;
  $("heroBits").textContent = String(stats.shinyBits || 0);
  $("heroRewards").textContent = String(stats.rewardsCollected || 0);
  $("heroMood").textContent =
    settings.personality === "chaos" ? "Chaos" : settings.personality === "chill" ? "Chill" : "Hype";
  $("heroPosition").textContent =
    settings.gravityDrop && settings.positionMode === "custom"
      ? "Floor"
      : settings.positionMode === "custom"
        ? "Manual"
        : "Corner";
}

function renderPreview(settings) {
  const previewCard = $("previewCard");
  previewCard.dataset.theme = settings.theme;
  previewCard.dataset.variant = settings.petVariant;
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

  document.querySelectorAll("[data-picker]").forEach((picker) => {
    const fieldName = picker.dataset.picker;
    picker.querySelectorAll(".visual-option").forEach((option) => {
      option.classList.toggle("is-selected", option.dataset.value === String(settings[fieldName]));
    });
  });
}

function collectSettingsFromForm() {
  return {
    enabled: $("enabled").checked,
    petName: $("petName").value.trim() || "Momo",
    size: $("size").value,
    theme: $("theme").value,
    petVariant: $("petVariant").value,
    anchor: $("anchor").value,
    personality: $("personality").value,
    speech: $("speech").checked,
    motivation: $("motivation").checked,
    autoHop: $("autoHop").checked,
    roaming: $("roaming").checked,
    gravityDrop: $("gravityDrop").checked
  };
}

function bindTabs() {
  document.querySelectorAll(".tab").forEach((tab) => {
    tab.addEventListener("click", () => {
      activateTab(tab.dataset.tab);
    });
  });
}

function bindVisualPickers() {
  document.querySelectorAll("[data-picker]").forEach((picker) => {
    const fieldName = picker.dataset.picker;
    const hiddenField = $(fieldName);

    picker.querySelectorAll(".visual-option").forEach((option) => {
      option.addEventListener("click", () => {
        if (hiddenField) {
          hiddenField.value = option.dataset.value;
          hiddenField.dispatchEvent(new Event("change", { bubbles: true }));
        }
      });
    });
  });
}

function bindSettings(stats) {
  settingsFields.forEach((fieldName) => {
    const field = $(fieldName);
    if (!field) return;
    field.addEventListener("change", () => {
      chrome.storage.local.get(["buddySettings"], (result) => {
        const currentSettings = merge(DEFAULT_SETTINGS, result.buddySettings);
        const nextSettings = {
          ...currentSettings,
          ...collectSettingsFromForm()
        };
        chrome.storage.local.set({ buddySettings: nextSettings }, () => {
          renderHero(nextSettings, stats);
          renderPreview(nextSettings);
          showSavedState();
        });
      });
    });
  });
}

function bindResetButtons() {
  $("resetStats").addEventListener("click", () => {
    chrome.storage.local.set({ buddyStats: { ...DEFAULT_STATS } }, () => {
      renderStats(DEFAULT_STATS);
      chrome.storage.local.get(["buddySettings"], (result) => {
        renderHero(merge(DEFAULT_SETTINGS, result.buddySettings), DEFAULT_STATS);
      });
      showSavedState();
    });
  });

  $("resetPosition").addEventListener("click", () => {
    chrome.storage.local.get(["buddySettings"], (result) => {
      const currentSettings = merge(DEFAULT_SETTINGS, result.buddySettings);
      const nextSettings = {
        ...currentSettings,
        positionMode: "anchor",
        customPosition: null
      };
      chrome.storage.local.set({ buddySettings: nextSettings }, () => {
        chrome.storage.local.get(["buddyStats"], (statsResult) => {
          renderHero(nextSettings, merge(DEFAULT_STATS, statsResult.buddyStats));
          showSavedState();
        });
      });
    });
  });
}

function init() {
  bindTabs();
  bindVisualPickers();

  chrome.storage.local.get(["buddySettings", "buddyStats"], (result) => {
    const settings = merge(DEFAULT_SETTINGS, result.buddySettings);
    const stats = merge(DEFAULT_STATS, result.buddyStats);
    renderSettings(settings);
    renderHero(settings, stats);
    renderPreview(settings);
    renderStats(stats);
    bindSettings(stats);
    bindResetButtons();
  });

  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName !== "local") return;

    if (changes.buddySettings) {
      const nextSettings = merge(DEFAULT_SETTINGS, changes.buddySettings.newValue);
      renderSettings(nextSettings);
      renderPreview(nextSettings);
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
