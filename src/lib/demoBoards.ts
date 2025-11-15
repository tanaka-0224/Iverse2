const STORAGE_KEY = 'demo-boards';

export interface DemoBoardRecord {
  id: string;
  user_id: string;
  title: string;
  purpose: string | null;
  limit_count: number | null;
  created_at: string;
  updated_at: string;
  owner_name: string | null;
}

const canUseStorage = () =>
  typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';

const readBoards = (): DemoBoardRecord[] => {
  if (!canUseStorage()) return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as DemoBoardRecord[]) : [];
  } catch (error) {
    console.warn('[DemoBoards] Failed to parse stored boards', error);
    return [];
  }
};

const writeBoards = (boards: DemoBoardRecord[]) => {
  if (!canUseStorage()) return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(boards));
  } catch (error) {
    console.warn('[DemoBoards] Failed to persist boards', error);
  }
};

export const listDemoBoards = (): DemoBoardRecord[] => readBoards();

export const addDemoBoardRecord = (record: DemoBoardRecord) => {
  const boards = readBoards();
  boards.unshift(record);
  writeBoards(boards);
};

export const updateDemoBoardRecord = (
  id: string,
  updates: Partial<DemoBoardRecord>,
): DemoBoardRecord | null => {
  const boards = readBoards();
  const index = boards.findIndex((board) => board.id === id);
  if (index === -1) {
    return null;
  }

  boards[index] = {
    ...boards[index],
    ...updates,
    updated_at: updates.updated_at ?? new Date().toISOString(),
  };
  writeBoards(boards);
  return boards[index];
};
