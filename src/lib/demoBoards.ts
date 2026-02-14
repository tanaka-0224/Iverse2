const STORAGE_KEY = 'demo-boards';

export type DemoBoardStatus = 'draft' | 'published' | 'closed';

export interface DemoBoardRecord {
  id: string;
  user_id: string;
  title: string;
  purpose: string | null;
  limit_count: number | null;
  created_at: string;
  updated_at: string;
  owner_name: string | null;
  category?: string | null;
  status?: DemoBoardStatus;
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

export const deleteDemoBoardRecord = (id: string): boolean => {
  const boards = readBoards();
  const initialLength = boards.length;
  const filtered = boards.filter((board) => board.id !== id);

  if (filtered.length === initialLength) {
    return false;
  }

  writeBoards(filtered);
  return true;
};

// --- Demo Likes & Participants for Mutual Match ---

const LIKES_KEY = 'demo-likes';
const PARTICIPANTS_KEY = 'demo-participants';

export interface DemoLike {
  user_id: string;
  board_id: string;
}

export interface DemoParticipant {
  id: string;
  user_id: string;
  board_id: string;
  status: 'pending' | 'accepted' | 'rejected';
}

const readLikes = (): DemoLike[] => {
  if (!canUseStorage()) return [];
  try {
    const raw = window.localStorage.getItem(LIKES_KEY);
    return raw ? (JSON.parse(raw) as DemoLike[]) : [];
  } catch (error) {
    console.warn('[DemoBoards] Failed to parse likes', error);
    return [];
  }
};

const writeLikes = (likes: DemoLike[]) => {
  if (!canUseStorage()) return;
  window.localStorage.setItem(LIKES_KEY, JSON.stringify(likes));
};

const readParticipants = (): DemoParticipant[] => {
  if (!canUseStorage()) return [];
  try {
    const raw = window.localStorage.getItem(PARTICIPANTS_KEY);
    return raw ? (JSON.parse(raw) as DemoParticipant[]) : [];
  } catch (error) {
    console.warn('[DemoBoards] Failed to parse participants', error);
    return [];
  }
};

const writeParticipants = (participants: DemoParticipant[]) => {
  if (!canUseStorage()) return;
  window.localStorage.setItem(PARTICIPANTS_KEY, JSON.stringify(participants));
};

export const toggleDemoLike = (boardId: string, userId: string): boolean => {
  const likes = readLikes();
  const exists = likes.some((l) => l.board_id === boardId && l.user_id === userId);

  if (exists) {
    // Unlike
    const filtered = likes.filter((l) => !(l.board_id === boardId && l.user_id === userId));
    writeLikes(filtered);
    return false; // Unliked
  } else {
    // Like
    likes.push({ board_id: boardId, user_id: userId });
    writeLikes(likes);
    return true; // Liked
  }
};

export const getDemoLikes = (userId: string): string[] => {
  return readLikes()
    .filter((l) => l.user_id === userId)
    .map((l) => l.board_id);
};

export const checkDemoMutualLike = (userA: string, userB: string): boolean => {
  const likes = readLikes();
  const boards = readBoards();

  // Boards owned by B
  const boardsOfB = boards.filter((b) => b.user_id === userB).map((b) => b.id);
  // Boards owned by A
  const boardsOfA = boards.filter((b) => b.user_id === userA).map((b) => b.id);

  // Does A like any of B's boards?
  const aLikesB = likes.some((l) => l.user_id === userA && boardsOfB.includes(l.board_id));
  // Does B like any of A's boards?
  const bLikesA = likes.some((l) => l.user_id === userB && boardsOfA.includes(l.board_id));

  return aLikesB && bLikesA;
};

export const createDemoDmBoard = (userA: string, userB: string): string | null => {
  const boards = readBoards();

  // Check if DM board already exists
  const dmTitle = `Chat: ${userA} & ${userB}`;
  const reverseDmTitle = `Chat: ${userB} & ${userA}`;

  const existing = boards.find((b) => b.title === dmTitle || b.title === reverseDmTitle);
  if (existing) return existing.id;

  // Create new DM Board
  const newBoard: DemoBoardRecord = {
    id: `demo-dm-${Date.now()}`,
    user_id: userA, // Owner is A (arbitrary)
    title: dmTitle,
    purpose: 'DM',
    limit_count: 2,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    owner_name: 'System',
    status: 'published',
  };

  addDemoBoardRecord(newBoard);

  // Add participants
  const newParticipants: DemoParticipant[] = [
    {
      id: `demo-part-${Date.now()}-1`,
      user_id: userA,
      board_id: newBoard.id,
      status: 'accepted',
    },
    {
      id: `demo-part-${Date.now()}-2`,
      user_id: userB,
      board_id: newBoard.id,
      status: 'accepted',
    },
  ];

  const currentParticipants = readParticipants();
  writeParticipants([...currentParticipants, ...newParticipants]);

  return newBoard.id;
};

export const findDemoDmBoard = (userA: string, userB: string): string | null => {
  const boards = readBoards();
  // Also check for new single-name format: `Chat: UserB` (created by UserA) or `Chat: UserA` (created by UserB)
  // But in `handleApprove` we implemented: `Chat: ${likeRequest.users.name}`

  // A robust way in demo mode is to check participants.
  const participants = readParticipants();

  // Find boards where both are participants
  const userABoards = participants.filter(p => p.user_id === userA).map(p => p.board_id);
  const userBBoards = participants.filter(p => p.user_id === userB).map(p => p.board_id);

  const sharedBoards = userABoards.filter(id => userBBoards.includes(id));

  // Filter for DM purpose
  const dmBoard = boards.find(b => sharedBoards.includes(b.id) && b.purpose === 'DM');

  return dmBoard ? dmBoard.id : null;
};

// Helper to list boards user is participating in (for ChatScreen)
export const listDemoParticipatingBoards = (userId: string): DemoBoardRecord[] => {
  const participants = readParticipants();
  const boards = readBoards();

  const myParticipations = participants.filter(
    (p) => p.user_id === userId && p.status === 'accepted',
  );
  const boardIds = myParticipations.map((p) => p.board_id);

  return boards.filter((b) => boardIds.includes(b.id));
};

// --- Demo Messages ---

const MESSAGES_KEY = 'demo-messages';

export interface DemoMessageRecord {
  id: string;
  board_id: string;
  user_id: string;
  content: string;
  created_at: string;
  is_system: boolean;
  user_name: string;
}

const readMessages = (): DemoMessageRecord[] => {
  if (!canUseStorage()) return [];
  try {
    const raw = window.localStorage.getItem(MESSAGES_KEY);
    return raw ? (JSON.parse(raw) as DemoMessageRecord[]) : [];
  } catch (error) {
    console.warn('[DemoBoards] Failed to parse messages', error);
    return [];
  }
};

const writeMessages = (messages: DemoMessageRecord[]) => {
  if (!canUseStorage()) return;
  window.localStorage.setItem(MESSAGES_KEY, JSON.stringify(messages));
};

export const listDemoMessages = (boardId: string): DemoMessageRecord[] => {
  const messages = readMessages();
  return messages
    .filter((m) => m.board_id === boardId)
    .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
};

export const createDemoMessage = (
  boardId: string,
  userId: string,
  content: string,
  isSystem = false
): DemoMessageRecord => {
  const messages = readMessages();

  // Mock user name lookup (in real app we'd have a user table or pass it in)
  // For demo, we'll try to find it from boards or default to 'User'
  const boards = readBoards();
  const userBoard = boards.find(b => b.user_id === userId);
  const userName = userBoard?.owner_name || (userId.startsWith('demo-') ? 'Demo User' : 'User');

  const newMessage: DemoMessageRecord = {
    id: `demo-msg-${Date.now()}`,
    board_id: boardId,
    user_id: userId,
    content,
    created_at: new Date().toISOString(),
    is_system: isSystem,
    user_name: userName,
  };

  messages.push(newMessage);
  writeMessages(messages);

  return newMessage;
};

// --- Demo Notifications ---

const NOTIFICATIONS_KEY = 'demo-notifications';

export interface DemoNotification {
  id: string;
  user_id: string; // Recipient
  type: 'match' | 'like_received';
  title: string;
  message: string;
  created_at: string;
  is_read: boolean;
  data?: {
    board_id?: string;
    partner_id?: string;
  };
  sender?: {
    name: string;
    photo: string | null;
  };
}

const readNotifications = (): DemoNotification[] => {
  if (!canUseStorage()) return [];
  try {
    const raw = window.localStorage.getItem(NOTIFICATIONS_KEY);
    return raw ? (JSON.parse(raw) as DemoNotification[]) : [];
  } catch (error) {
    console.warn('[DemoBoards] Failed to parse notifications', error);
    return [];
  }
};

const writeNotifications = (notifications: DemoNotification[]) => {
  if (!canUseStorage()) return;
  window.localStorage.setItem(NOTIFICATIONS_KEY, JSON.stringify(notifications));
};

export const listDemoNotifications = (userId: string): DemoNotification[] => {
  const notifications = readNotifications();
  return notifications
    .filter((n) => n.user_id === userId)
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
};

export const createDemoNotification = (
  userId: string,
  type: 'match' | 'like_received',
  title: string,
  message: string,
  data?: { board_id?: string; partner_id?: string },
  sender?: { name: string; photo: string | null }
): DemoNotification => {
  const notifications = readNotifications();

  const newNotification: DemoNotification = {
    id: `demo-notif-${Date.now()}`,
    user_id: userId,
    type,
    title,
    message,
    created_at: new Date().toISOString(),
    is_read: false,
    data,
    sender,
  };

  notifications.unshift(newNotification);
  writeNotifications(notifications);

  return newNotification;
};

export const markDemoNotificationAsRead = (notificationId: string) => {
  const notifications = readNotifications();
  const index = notifications.findIndex((n) => n.id === notificationId);
  if (index !== -1) {
    notifications[index].is_read = true;
    writeNotifications(notifications);
  }
};
