export type Person = {
  id: string;
  name: string;
  avatar: string;
  seat: number | null;
};
export type Video = {
  id: string;
  youtubeId: string;
  title: string;
  addedBy: string;
  votes: string[];
};
export type Chat = {
  id: string;
  userId: string;
  name: string;
  avatar: string;
  text: string;
  createdAt: number;
};
export type Room = {
  participants: Person[];
  queue: Video[];
  messages: Chat[];
  playback: {
    youtubeId: string;
    title: string;
    playing: boolean;
    position: number;
    updatedAt: number;
  };
  serverTime?: number;
};
