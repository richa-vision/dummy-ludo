export type PlayerColor = 'red' | 'green' | 'yellow' | 'blue';

export interface Position {
  x: number;
  y: number;
}

export interface GamePiece {
  id: string;
  color: PlayerColor;
  position: number; // -1 for base, 0-51 for main track, 52-57 for home stretch, 99 for finished
  isSafe: boolean;
}

// Map logical path index (0-51) to grid coordinates (15x15)
// This is a simplified path mapping for a standard Ludo board
export const PATH_COORDINATES: Position[] = [
  // Red Start Path (starts at index 0 for Red)
  { x: 1, y: 6 }, { x: 2, y: 6 }, { x: 3, y: 6 }, { x: 4, y: 6 }, { x: 5, y: 6 },
  { x: 6, y: 5 }, { x: 6, y: 4 }, { x: 6, y: 3 }, { x: 6, y: 2 }, { x: 6, y: 1 }, { x: 6, y: 0 },
  { x: 7, y: 0 }, { x: 8, y: 0 },
  { x: 8, y: 1 }, { x: 8, y: 2 }, { x: 8, y: 3 }, { x: 8, y: 4 }, { x: 8, y: 5 },
  { x: 9, y: 6 }, { x: 10, y: 6 }, { x: 11, y: 6 }, { x: 12, y: 6 }, { x: 13, y: 6 }, { x: 14, y: 6 },
  { x: 14, y: 7 }, { x: 14, y: 8 },
  { x: 13, y: 8 }, { x: 12, y: 8 }, { x: 11, y: 8 }, { x: 10, y: 8 }, { x: 9, y: 8 },
  { x: 8, y: 9 }, { x: 8, y: 10 }, { x: 8, y: 11 }, { x: 8, y: 12 }, { x: 8, y: 13 }, { x: 8, y: 14 },
  { x: 7, y: 14 }, { x: 6, y: 14 },
  { x: 6, y: 13 }, { x: 6, y: 12 }, { x: 6, y: 11 }, { x: 6, y: 10 }, { x: 6, y: 9 },
  { x: 5, y: 8 }, { x: 4, y: 8 }, { x: 3, y: 8 }, { x: 2, y: 8 }, { x: 1, y: 8 }, { x: 0, y: 8 },
  { x: 0, y: 7 }, { x: 0, y: 6 } // Loop closes back to start - 1
];

// Start offsets for each player on the 52-cell track
export const PLAYER_START_OFFSETS: Record<PlayerColor, number> = {
  red: 0,
  green: 13,
  yellow: 26,
  blue: 39
};

// Home path coordinates for each player
export const HOME_PATH_COORDINATES: Record<PlayerColor, Position[]> = {
  red: [{ x: 1, y: 7 }, { x: 2, y: 7 }, { x: 3, y: 7 }, { x: 4, y: 7 }, { x: 5, y: 7 }, { x: 6, y: 7 }],
  green: [{ x: 7, y: 1 }, { x: 7, y: 2 }, { x: 7, y: 3 }, { x: 7, y: 4 }, { x: 7, y: 5 }, { x: 7, y: 6 }],
  yellow: [{ x: 13, y: 7 }, { x: 12, y: 7 }, { x: 11, y: 7 }, { x: 10, y: 7 }, { x: 9, y: 7 }, { x: 8, y: 7 }],
  blue: [{ x: 7, y: 13 }, { x: 7, y: 12 }, { x: 7, y: 11 }, { x: 7, y: 10 }, { x: 7, y: 9 }, { x: 7, y: 8 }]
};

// Base positions for waiting pieces - centered in the 2x2 grid within base areas
// Grid is 15x15 (0-14). Base areas span 6 cells each.
// Red base: columns 0-5, rows 0-5. Inner 2x2 circles at approximately (1.5, 1.5), (3.5, 1.5), (1.5, 3.5), (3.5, 3.5)
// Green base: columns 9-14, rows 0-5
// Blue base: columns 0-5, rows 9-14
// Yellow base: columns 9-14, rows 9-14
export const BASE_POSITIONS: Record<PlayerColor, Position[]> = {
  red: [{ x: 1.5, y: 1.5 }, { x: 3.5, y: 1.5 }, { x: 1.5, y: 3.5 }, { x: 3.5, y: 3.5 }],
  green: [{ x: 10.5, y: 1.5 }, { x: 12.5, y: 1.5 }, { x: 10.5, y: 3.5 }, { x: 12.5, y: 3.5 }],
  yellow: [{ x: 10.5, y: 10.5 }, { x: 12.5, y: 10.5 }, { x: 10.5, y: 12.5 }, { x: 12.5, y: 12.5 }],
  blue: [{ x: 1.5, y: 10.5 }, { x: 3.5, y: 10.5 }, { x: 1.5, y: 12.5 }, { x: 3.5, y: 12.5 }]
};

export const SAFE_SPOTS = [0, 8, 13, 21, 26, 34, 39, 47]; // Indices on the main track

export function getCoordinates(piece: GamePiece): Position {
  if (piece.position === -1) {
    // Determine which of the 4 base spots this piece occupies
    // We assume pieces have IDs like 'red-0', 'red-1'
    const index = parseInt(piece.id.split('-')[1]);
    return BASE_POSITIONS[piece.color][index];
  }

  if (piece.position === 99) {
    // Center finish
    return { x: 7, y: 7 };
  }

  const offset = PLAYER_START_OFFSETS[piece.color];
  
  // Normal track
  if (piece.position < 51) { // 0-50 logic, technically 0-51 is 52 steps. 
     // Wait, if track is 52 steps. 
     // Relative position from start.
     // Let's say position is relative to player start.
     // 0 = Start spot. 50 = last spot before home path.
     
     const actualIndex = (piece.position + offset) % 52;
     return PATH_COORDINATES[actualIndex];
  }

  // Home path (positions 51-56)
  const homeIndex = piece.position - 51; // 0 to 5
  if (homeIndex < 6) {
      return HOME_PATH_COORDINATES[piece.color][homeIndex];
  }
  
  return { x: 7, y: 7 };
}

// Colors for UI
export const COLORS = {
  red: 'var(--color-ludo-red)',
  green: 'var(--color-ludo-green)',
  yellow: 'var(--color-ludo-yellow)',
  blue: 'var(--color-ludo-blue)',
};
