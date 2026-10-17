import AsyncStorage from "@react-native-async-storage/async-storage";
import { getState, setState, subscribe, STORAGE_KEY } from "./store";
import { programsWithoutSwaps } from "../engine/runtime";

// Saves half a second after the last change. We only keep what the user made
// (names, costumes, start positions, scripts), not where sprites ended up mid-run.
// If saving fails the app keeps working, the header just says "Not saved".
export function startAutosave() {
  let lastVersion = getState().projectVersion;
  let timer = null;
  let disposed = false;

  const save = async () => {
    timer = null;
    const s = getState();
    try {
      const sprites = programsWithoutSwaps(s.sprites).map(({ id, name, costume, initial, program }) => ({
        id, name, costume, initial, program,
      }));
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ title: s.title, selectedId: s.selectedId, sprites }));
      // something else may have changed while we were writing, then it's not really "saved" yet
      if (!disposed && getState().projectVersion === s.projectVersion) setState((st) => ({ ...st, saveStatus: "saved" }));
    } catch {
      if (!disposed) setState((st) => ({ ...st, saveStatus: "error" }));
    }
  };

  const unsub = subscribe(() => {
    const s = getState();
    if (s.projectVersion === lastVersion) return;
    lastVersion = s.projectVersion;
    if (s.saveStatus !== "saving") setState((st) => ({ ...st, saveStatus: "saving" }));
    if (timer) clearTimeout(timer);
    timer = setTimeout(save, 500);
  });

  return () => {
    disposed = true;
    unsub();
    if (timer) clearTimeout(timer);
  };
}
