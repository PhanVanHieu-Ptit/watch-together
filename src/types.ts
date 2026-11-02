export type Person = {
  id: string;
  name: string;
  avatar: string;
  seat: number | null;
  shirtColor?: string;
  gender?: "male" | "female";
  isBot?: boolean;
  emote?: {kind: "wave" | "clap" | "dance"; until: number};
  stageSpot?: number | null;
  stageUntil?: number;
  bodyStyle?: "classic" | "tall" | "broad" | "cap";
};
export type Video = {
  id: string;
  youtubeId: string;
  title: string;
  addedBy: string;
  votes: string[];
  energetic?: boolean;
  bpm?: number;
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
  roomId?: string; name?: string; maxMembers?: number; expiresAt?: number;
  permissions?: {chat: boolean; addVideo: boolean; playback: boolean};
  skipVote?: {id: string; votes: string[]; threshold: number; expiresAt: number} | null;
  participants: Person[];
  queue: Video[];
  messages: Chat[];
  playback: {
    videoId: string;
    title: string;
    energetic?: boolean;
    bpm?: number;
    status: "playing" | "paused";
    positionAtUpdate: number;
    updatedAtServer: number;
    revision: number;
  };
  nextAt?:number|null;
  serverTime?: number;
};
