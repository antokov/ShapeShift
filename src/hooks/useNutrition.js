import { useState } from 'react';

const DEFAULT_SETTINGS = {
  ernährungsform: null,
  allergien: [],
  mahlzeitenProTag: 3,
  kalorienzielModus: 'auto',
  kalorienziel: null,
  lebensmittelMag: [],
  lebensmittelMagNicht: [],
};

function storageKey(username) {
  return `fitnessapp_${username}_nutrition_settings`;
}

export function useNutrition(username) {
  const [settings, setSettings] = useState(() => {
    try {
      const raw = localStorage.getItem(storageKey(username));
      return raw ? { ...DEFAULT_SETTINGS, ...JSON.parse(raw) } : { ...DEFAULT_SETTINGS };
    } catch {
      return { ...DEFAULT_SETTINGS };
    }
  });

  const isSetupDone = settings.ernährungsform !== null;

  function saveSettings(newSettings) {
    const merged = { ...DEFAULT_SETTINGS, ...newSettings };
    localStorage.setItem(storageKey(username), JSON.stringify(merged));
    setSettings(merged);
  }

  return { settings, isSetupDone, saveSettings };
}
