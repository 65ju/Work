import { useEffect, useState } from "react";
import { load, save } from "./storage";

/** useState, der seinen Wert im localStorage behält. */
export function usePersistent<T>(key: string, initial: T) {
  const [value, setValue] = useState<T>(() => load<T>(key, initial));
  useEffect(() => save(key, value), [key, value]);
  return [value, setValue] as const;
}
