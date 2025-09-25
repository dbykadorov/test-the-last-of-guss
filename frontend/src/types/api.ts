export enum UserRole {
  SURVIVOR = 'survivor',
  NIKITA = 'nikita',
  ADMIN = 'admin',
}

export enum RoundStatus {
  COOLDOWN = 'cooldown',
  ACTIVE = 'active',
  FINISHED = 'finished',
}

export interface User {
  id: string;
  username: string;
  role: UserRole;
  createdAt: string;
}

export interface Round {
  id: string;
  startTime: string;
  endTime: string;
  status: RoundStatus;
  totalScore: number;
  winner?: RoundParticipant;
  createdAt: string;
}

export interface RoundParticipant {
  id: string;
  userId: string;
  roundId: string;
  score: number;
  tapsCount: number;
  user: User;
}

export interface RoundDetails extends Round {
  participants: RoundParticipant[];
  myParticipation?: RoundParticipant;
}

// Auth DTOs
export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  user: User;
  token: string;
}

// Round DTOs
export interface CreateRoundRequest {
  // Round is created automatically with configured duration
}

export interface TapResponse {
  myScore: number;
  tapsCount: number;
  bonusEarned: boolean; // true if this was 11th tap
}

// API Response wrappers
export interface ApiResponse<T = unknown> {
  data: T;
  message?: string;
}

export interface ApiError {
  message: string;
  statusCode: number;
  error?: string;
}
