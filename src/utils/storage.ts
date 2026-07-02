import type { SavedScenario, ScenarioInput } from '../types/sizing';

const STORAGE_KEY = 'instana-sizing-advisor:last-scenario';

export function saveScenario(input: ScenarioInput): SavedScenario {
  const saved: SavedScenario = { ...input, savedAt: new Date().toISOString() };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(saved));
  return saved;
}

export function loadScenario(): SavedScenario | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as SavedScenario) : null;
  } catch {
    return null;
  }
}
