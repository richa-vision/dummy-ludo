import { GameRoom, Player, GamePiece, PlayerColor, GameMode } from '@shared/schema';
import { randomBytes } from 'crypto';

const PLAYER_COLORS_4P: PlayerColor[] = ['red', 'green', 'yellow', 'blue'];
const PLAYER_COLORS_2P: PlayerColor[] = ['red', 'yellow']; // Opposite colors for 2-player

export class GameManager {
  private rooms: Map<string, GameRoom> = new Map();
  private playerToRoom: Map<string, string> = new Map();

  generateRoomCode(): string {
    let code: string;
    do {
      code = randomBytes(3).toString('hex').toUpperCase();
    } while (this.rooms.has(code));
    return code;
  }

  createRoom(playerId: string, playerName: string, gameMode: GameMode = '4-player'): GameRoom {
    const code = this.generateRoomCode();
    const room: GameRoom = {
      code,
      players: [{
        id: playerId,
        name: playerName,
        color: null,
        ready: false,
      }],
      gameMode,
      gameState: {
        pieces: [],
        currentTurnIndex: 0,
        diceValue: null,
        lastDiceValue: null,
        isFirstRollOfTurn: true,
        waitingForMove: false,
        winner: null,
        started: false,
      },
      createdAt: Date.now(),
    };

    this.rooms.set(code, room);
    this.playerToRoom.set(playerId, code);
    return room;
  }

  joinRoom(roomCode: string, playerId: string, playerName: string): GameRoom | null {
    const room = this.rooms.get(roomCode);
    if (!room) return null;

    const maxPlayers = room.gameMode === '2-player' ? 2 : 4;
    if (room.players.length >= maxPlayers) {
      throw new Error('Room is full');
    }

    if (room.gameState.started) {
      throw new Error('Game already started');
    }

    const player: Player = {
      id: playerId,
      name: playerName,
      color: null,
      ready: false,
    };

    room.players.push(player);
    this.playerToRoom.set(playerId, roomCode);
    return room;
  }

  chooseColor(playerId: string, color: PlayerColor): GameRoom | null {
    const roomCode = this.playerToRoom.get(playerId);
    if (!roomCode) return null;

    const room = this.rooms.get(roomCode);
    if (!room) return null;

    // Check if color is available for this game mode
    const availableColors = room.gameMode === '2-player' ? PLAYER_COLORS_2P : PLAYER_COLORS_4P;
    if (!availableColors.includes(color)) {
      throw new Error('Color not available for this game mode');
    }

    // Check if color is already taken
    if (room.players.some(p => p.color === color && p.id !== playerId)) {
      throw new Error('Color already taken');
    }

    const player = room.players.find(p => p.id === playerId);
    if (player) {
      player.color = color;
    }

    return room;
  }

  setReady(playerId: string): GameRoom | null {
    const roomCode = this.playerToRoom.get(playerId);
    if (!roomCode) return null;

    const room = this.rooms.get(roomCode);
    if (!room) return null;

    const player = room.players.find(p => p.id === playerId);
    if (player && player.color) {
      player.ready = true;
    }

    return room;
  }

  canStartGame(room: GameRoom): boolean {
    const requiredPlayers = room.gameMode === '2-player' ? 2 : 2; // Allow 2-4 players for 4-player mode
    const maxPlayers = room.gameMode === '2-player' ? 2 : 4;
    
    return room.players.length >= requiredPlayers &&
           room.players.length <= maxPlayers &&
           room.players.every(p => p.color !== null && p.ready);
  }

  getAvailableColors(room: GameRoom): PlayerColor[] {
    return room.gameMode === '2-player' ? PLAYER_COLORS_2P : PLAYER_COLORS_4P;
  }

  startGame(playerId: string): GameRoom | null {
    const roomCode = this.playerToRoom.get(playerId);
    if (!roomCode) return null;

    const room = this.rooms.get(roomCode);
    if (!room) return null;

    if (!this.canStartGame(room)) {
      throw new Error('Not all players are ready');
    }

    // Initialize game pieces
    const pieces: GamePiece[] = [];
    room.players.forEach(player => {
      if (player.color) {
        for (let i = 0; i < 4; i++) {
          pieces.push({
            id: `${player.color}-${i}`,
            color: player.color,
            position: -1,
            isSafe: true,
          });
        }
      }
    });

    room.gameState = {
      pieces,
      currentTurnIndex: 0,
      diceValue: null,
      lastDiceValue: null,
      isFirstRollOfTurn: true,
      waitingForMove: false,
      winner: null,
      started: true,
    };

    return room;
  }

  // Enhanced weighted dice roll with increased 6 probability and better previous number avoidance
  private rollWeightedDice(room: GameRoom): number {
    const currentPlayer = room.players[room.gameState.currentTurnIndex];
    const playerColor = currentPlayer.color!;
    const playerPieces = room.gameState.pieces.filter(p => p.color === playerColor);
    const allPiecesInBase = playerPieces.every(p => p.position === -1);
    
    const lastRoll = room.gameState.lastDiceValue;
    const isFirstRoll = room.gameState.isFirstRollOfTurn;
    
    // Base probabilities - boost 6 to 25% (was 16.67%)
    const weights = [15, 15, 15, 15, 15, 25]; // 6 gets 25% chance
    
    // If all pieces in base, prioritize getting 6 over avoiding previous number
    if (allPiecesInBase) {
      weights[0] = 10; weights[1] = 10; weights[2] = 10; 
      weights[3] = 10; weights[4] = 10; weights[5] = 50; // 50% chance for 6!
    } else {
      // Only apply previous number reduction if NOT all pieces in base
      // Only reduce probability on the FIRST roll of current player's turn
      if (lastRoll !== null && isFirstRoll) {
        const lastRollIndex = lastRoll - 1;
        const originalWeight = weights[lastRollIndex];
        const reducedWeight = 2; // Even lower chance (2%)
        const weightToRedistribute = originalWeight - reducedWeight;
        
        if (weightToRedistribute > 0) {
          weights[lastRollIndex] = reducedWeight;
          // Distribute the removed weight among other numbers, but give extra to 6
          const otherIndices = [0, 1, 2, 3, 4, 5].filter(i => i !== lastRollIndex);
          const baseExtraPerNumber = weightToRedistribute / otherIndices.length;
          
          otherIndices.forEach((i) => {
            if (i === 5) { // Give extra boost to 6
              weights[i] += baseExtraPerNumber * 1.5;
            } else {
              weights[i] += baseExtraPerNumber * 0.875; // Slightly less for others
            }
          });
          
        }
      }
    }
    
    // Normalize weights to ensure they sum to 100
    const totalWeight = weights.reduce((sum, w) => sum + w, 0);
    const normalizedWeights = weights.map(w => (w / totalWeight) * 100);
    
    
    // Generate random number based on weights
    let random = Math.random() * 100;
    let roll = 1;
    
    for (let i = 0; i < normalizedWeights.length; i++) {
      random -= normalizedWeights[i];
      if (random <= 0) {
        roll = i + 1;
        break;
      }
    }
    
    return roll;
  }

  rollDice(playerId: string): { room: GameRoom; roll: number } | null {
    const roomCode = this.playerToRoom.get(playerId);
    if (!roomCode) return null;

    const room = this.rooms.get(roomCode);
    if (!room || !room.gameState.started) return null;

    const currentPlayer = room.players[room.gameState.currentTurnIndex];
    if (currentPlayer.id !== playerId) {
      throw new Error('Not your turn');
    }

    if (room.gameState.waitingForMove) {
      throw new Error('Already rolled, make your move');
    }

    // Use weighted dice roll
    const roll = this.rollWeightedDice(room);
    room.gameState.diceValue = roll;
    room.gameState.isFirstRollOfTurn = false; // No longer first roll of this turn

    // Check if player has valid moves
    const playerColor = currentPlayer.color!;
    const playerPieces = room.gameState.pieces.filter(p => p.color === playerColor);
    const hasValidMoves = playerPieces.some(p => this.canMovePiece(p, roll, room));

    if (hasValidMoves) {
      room.gameState.waitingForMove = true;
    } else {
      // No valid moves, next turn (unless rolled a 6)
      if (roll !== 6) {
        room.gameState.lastDiceValue = roll; // Save for next player
        room.gameState.isFirstRollOfTurn = true; // Reset for next player
        room.gameState.currentTurnIndex = (room.gameState.currentTurnIndex + 1) % room.players.length;
      }
      room.gameState.diceValue = null;
    }

    return { room, roll };
  }

  // Safe spots on the main track (ABSOLUTE positions where pieces cannot be captured)
  // Start positions: Red=0, Green=13, Yellow=26, Blue=39
  // Star positions: 8, 21, 34, 47
  private readonly SAFE_SPOT_POSITIONS = [0, 8, 13, 21, 26, 34, 39, 47];
  
  // Player start offsets on the 52-cell track
  private readonly PLAYER_START_OFFSETS: Record<PlayerColor, number> = {
    red: 0,
    green: 13,
    yellow: 26,
    blue: 39
  };

  private canMovePiece(piece: GamePiece, roll: number, room: GameRoom): boolean {
    if (piece.position === -1) {
      return roll === 6;
    }
    if (piece.position + roll > 57) return false;
    return true;
  }

  // Check if a piece is on a safe spot (using absolute track position)
  private isPieceOnSafeSpot(piece: GamePiece): boolean {
    // Positions 51-57 are home path (always safe)
    if (piece.position >= 51) return true;
    // Position -1 is base (always safe)
    if (piece.position < 0) return true;
    // Position 99 is finished (always safe)
    if (piece.position === 99) return true;
    
    // Get absolute track position and check against safe spots
    const absolutePos = this.getAbsoluteTrackPosition(piece);
    return this.SAFE_SPOT_POSITIONS.includes(absolutePos);
  }

  // Convert a piece's relative position to absolute track position (0-51)
  private getAbsoluteTrackPosition(piece: GamePiece): number {
    if (piece.position < 0 || piece.position > 50) {
      return -1; // Not on main track (base, home path, or finished)
    }
    const offset = this.PLAYER_START_OFFSETS[piece.color];
    return (piece.position + offset) % 52;
  }

  // Check if two pieces are on the same track position
  private arePiecesOnSamePosition(piece1: GamePiece, piece2: GamePiece): boolean {
    // Both must be on the main track (position 0-50)
    if (piece1.position < 0 || piece1.position > 50) return false;
    if (piece2.position < 0 || piece2.position > 50) return false;
    
    const pos1 = this.getAbsoluteTrackPosition(piece1);
    const pos2 = this.getAbsoluteTrackPosition(piece2);
    
    return pos1 === pos2;
  }

  movePiece(playerId: string, pieceId: string): { room: GameRoom; captured: GamePiece | null } | null {
    const roomCode = this.playerToRoom.get(playerId);
    if (!roomCode) return null;

    const room = this.rooms.get(roomCode);
    if (!room || !room.gameState.started) return null;

    const currentPlayer = room.players[room.gameState.currentTurnIndex];
    if (currentPlayer.id !== playerId) {
      throw new Error('Not your turn');
    }

    if (!room.gameState.waitingForMove || !room.gameState.diceValue) {
      throw new Error('Roll the dice first');
    }

    const piece = room.gameState.pieces.find(p => p.id === pieceId);
    if (!piece || piece.color !== currentPlayer.color) {
      throw new Error('Invalid piece');
    }

    if (!this.canMovePiece(piece, room.gameState.diceValue, room)) {
      throw new Error('Invalid move');
    }

    // Execute move
    const roll = room.gameState.diceValue;
    const previousPosition = piece.position;
    
    if (piece.position === -1) {
      piece.position = 0;
    } else {
      piece.position += roll;
    }

    // Update isSafe status
    piece.isSafe = this.isPieceOnSafeSpot(piece);

    // Check for capture (only on main track, positions 0-50)
    let capturedPiece: GamePiece | null = null;
    
    // Only check for captures on main track (positions 0-50, not home path 51+)
    if (piece.position >= 0 && piece.position <= 50) {
      // Find opponent pieces on the same absolute track position
      const absolutePos = this.getAbsoluteTrackPosition(piece);
      
      // Check if the landing spot is a safe spot
      const isLandingSpotSafe = this.SAFE_SPOT_POSITIONS.includes(absolutePos);
      
      // Only attempt capture if NOT on a safe spot
      if (!isLandingSpotSafe) {
        for (const otherPiece of room.gameState.pieces) {
          // Skip the piece that just moved
          if (otherPiece.id === piece.id) continue;
          // Skip same color pieces
          if (otherPiece.color === piece.color) continue;
          // Skip pieces not on main track (in base, home path, or finished)
          if (otherPiece.position < 0 || otherPiece.position > 50) continue;
          
          const otherAbsolutePos = this.getAbsoluteTrackPosition(otherPiece);
                    
          if (absolutePos === otherAbsolutePos) {
            // Capture! Send the piece back to base
            capturedPiece = { ...otherPiece };
            otherPiece.position = -1;
            otherPiece.isSafe = true;
            break; // Only capture one piece
          }
        }
      }
      
    }

    // Check for finish
    if (piece.position === 57) {
      piece.position = 99;
      piece.isSafe = true;
    }

    // Check for winner
    const playerPieces = room.gameState.pieces.filter(p => p.color === currentPlayer.color);
    if (playerPieces.every(p => p.position === 99)) {
      room.gameState.winner = currentPlayer.color;
    }

    room.gameState.waitingForMove = false;
    
    // Next turn rules:
    // - Get another turn if rolled a 6
    // - Get another turn if captured a piece
    const getAnotherTurn = roll === 6 || capturedPiece !== null;
    
    if (!getAnotherTurn && !room.gameState.winner) {
      // Turn is changing to next player - save last roll for probability calculation
      room.gameState.lastDiceValue = roll;
      room.gameState.isFirstRollOfTurn = true; // Reset for next player
      room.gameState.currentTurnIndex = (room.gameState.currentTurnIndex + 1) % room.players.length;
    }
    room.gameState.diceValue = null;

    return { room, captured: capturedPiece };
  }

  leaveRoom(playerId: string): string | null {
    const roomCode = this.playerToRoom.get(playerId);
    if (!roomCode) return null;

    const room = this.rooms.get(roomCode);
    if (!room) return null;

    room.players = room.players.filter(p => p.id !== playerId);
    this.playerToRoom.delete(playerId);

    // Delete room if empty
    if (room.players.length === 0) {
      this.rooms.delete(roomCode);
    }

    return roomCode;
  }

  getRoom(playerId: string): GameRoom | null {
    const roomCode = this.playerToRoom.get(playerId);
    if (!roomCode) return null;
    return this.rooms.get(roomCode) || null;
  }

  getRoomByCode(code: string): GameRoom | null {
    return this.rooms.get(code) || null;
  }
}
