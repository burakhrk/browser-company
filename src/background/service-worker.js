chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.get(["buddySettings"], (result) => {
    if (result.buddySettings) return;

    chrome.storage.local.set({
      buddySettings: {
        enabled: true,
        petName: "Momo",
        size: "medium",
        theme: "workshop",
        anchor: "bottom-right"
      }
    });
  });
});
