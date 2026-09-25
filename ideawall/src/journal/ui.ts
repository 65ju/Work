import { createStore } from "../lib/store";

/** Welche Berichtsheft-Fenster offen sind – von überall aus steuerbar (z. B. aus einer Erinnerung). */
export interface JournalUi {
  archive: string | null;
  report: string | null;
}

export const uiStore = createStore<JournalUi>({ archive: null, report: null });

export const openArchive = (week: string) => uiStore.set((s) => ({ ...s, archive: week }));
export const closeArchive = () => uiStore.set((s) => ({ ...s, archive: null }));
/** Das Studio übernimmt die Bühne – das Archiv geht dafür zu. */
export const openReport = (week: string) => uiStore.set({ archive: null, report: week });
export const closeReport = () => uiStore.set((s) => ({ ...s, report: null }));
