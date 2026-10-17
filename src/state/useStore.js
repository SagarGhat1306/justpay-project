import { useSyncExternalStore } from "react";
import { getState, subscribe } from "./store";

// Selectors should return primitives or existing objects. Building a new object/array
// inside one makes React think the value changed every time.
export function useStore(selector) {
  const read = () => selector(getState());
  return useSyncExternalStore(subscribe, read, read);
}
