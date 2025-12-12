import { z } from "zod";

// Game types for multiplayer
export type PlayerColor = 'red' | 'green' | 'yellow' | 'blue';
export type GameMode = '2-player' | '4-player';

export interface GamePiece {
  id: string;
  color: PlayerColor;
  position: number;
  isSafe: boolean;
}

export interface Player {
  id: string;
  name: string;
  color: PlayerColor | null;
  ready: boolean;
}

export interface GameRoom {
  code: string;
  players: Player[];
  gameMode: GameMode;
  gameState: {
    pieces: GamePiece[];
    currentTurnIndex: number;
    diceValue: number | null;
    lastDiceValue: number | null; // Last roll from PREVIOUS player for weighted probability
    isFirstRollOfTurn: boolean; // Track if this is the first roll of current player's turn
    waitingForMove: boolean;
    winner: PlayerColor | null;
    started: boolean;
  };
  createdAt: number;
}

// WebSocket message types
export type WSMessage =
  | { type: 'join'; payload: { roomCode: string; playerName: string } }
  | { type: 'create'; payload: { playerName: string; gameMode: GameMode } }
  | { type: 'choose_color'; payload: { color: PlayerColor } }
  | { type: 'ready' }
  | { type: 'start_game' }
  | { type: 'roll_dice' }
  | { type: 'move_piece'; payload: { pieceId: string } }
  | { type: 'leave' };

export type WSResponse =
  | { type: 'room_joined'; payload: { room: GameRoom; playerId: string } }
  | { type: 'room_created'; payload: { room: GameRoom; playerId: string } }
  | { type: 'room_updated'; payload: { room: GameRoom } }
  | { type: 'game_started'; payload: { room: GameRoom } }
  | { type: 'piece_captured'; payload: { capturedPiece: GamePiece; room: GameRoom } }
  | { type: 'error'; payload: { message: string } };

// Validation schemas
export const joinRoomSchema = z.object({
  roomCode: z.string().length(6),
  playerName: z.string().min(1).max(20),
});

export const createRoomSchema = z.object({
  playerName: z.string().min(1).max(20),
});
