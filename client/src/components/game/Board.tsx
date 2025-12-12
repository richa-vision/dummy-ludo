import React from 'react';
import { cn } from '@/lib/utils';
import { GamePiece, SAFE_SPOTS, getCoordinates } from '@/lib/ludo-logic';
import { Piece } from './Piece';
import { Dice } from './Dice';
import { Star, Home } from 'lucide-react';
import { GameMode } from '@shared/schema';

interface BoardProps {
  pieces: GamePiece[];
  onPieceClick: (piece: GamePiece) => void;
  currentTurn: string;
  canMovePiece: (piece: GamePiece) => boolean;
  gameMode?: GameMode;
  // Dice props
  diceValue?: number | null;
  isRolling?: boolean;
  onRollDice?: () => void;
  canRollDice?: boolean;
  players?: Array<{ color: string | null; name: string }>;
}

export function Board({ 
  pieces, 
  onPieceClick, 
  currentTurn, 
  canMovePiece, 
  gameMode = '4-player',
  diceValue = 1,
  isRolling = false,
  onRollDice,
  canRollDice = false,
  players = []
}: BoardProps) {
  
  // Render enhanced base areas with Ludo King style
  const renderBase = (color: string, rowStart: number, colStart: number, isActive: boolean = true) => (
    <div 
      className={cn(
        "relative rounded-2xl border-4 shadow-lg flex items-center justify-center transition-all duration-300",
        `border-ludo-${color}`,
        isActive ? `bg-ludo-${color}` : `bg-ludo-${color}/30`,
        !isActive && "opacity-60"
      )}
      style={{
        gridRow: `${rowStart} / span 6`,
        gridColumn: `${colStart} / span 6`,
      }}
    >
      {/* Base background with gradient */}
      <div className={cn(
        "w-full h-full rounded-xl relative overflow-hidden",
        `bg-gradient-to-br from-ludo-${color}/90 to-ludo-${color}`
      )}>
        {/* Inner white area for pieces */}
        <div className="absolute inset-4 bg-white rounded-lg shadow-inner">
          {/* Piece positions - 2x2 grid */}
          <div className="grid grid-cols-2 gap-1 p-2 h-full">
            {[0, 1, 2, 3].map((i) => (
              <div
                key={i}
                className={cn(
                  "rounded-full border-2 shadow-inner flex items-center justify-center relative aspect-square",
                  `border-ludo-${color}/30`,
                  "bg-gradient-to-br from-white to-gray-50"
                )}
              >
                {/* Piece slot indicator - subtle circle */}
                <div className={cn(
                  "w-3 h-3 rounded-full opacity-20 border",
                  `bg-ludo-${color} border-ludo-${color}`
                )} />
              </div>
            ))}
          </div>
        </div>
        
        {/* Color indicator triangle */}
        <div className={cn(
          "absolute top-2 left-2 w-6 h-6 rounded-full border-2 border-white shadow-md",
          `bg-ludo-${color}`
        )} />
        
        {/* Active player indicator */}
        {isActive && currentTurn === color && (
          <div className="absolute -top-2 -right-2 w-8 h-8 bg-yellow-400 rounded-full border-2 border-white shadow-lg flex items-center justify-center animate-pulse">
            <Star className="w-4 h-4 text-white fill-white" />
          </div>
        )}
      </div>
    </div>
  );

  // Enhanced center home with triangular design
  const renderCenter = () => (
    <div 
      className="relative bg-white rounded-xl shadow-lg border-4 border-gray-300 overflow-hidden"
      style={{
        gridRow: "7 / span 3",
        gridColumn: "7 / span 3",
      }}
    >
      {/* Four triangular sections */}
      <div className="absolute inset-0">
        {/* Red triangle (bottom-left) */}
        <div 
          className="absolute bg-ludo-red/80"
          style={{
            clipPath: 'polygon(0% 100%, 50% 50%, 100% 100%)',
            width: '100%',
            height: '100%'
          }}
        />
        
        {/* Green triangle (top-left) */}
        <div 
          className="absolute bg-ludo-green/80"
          style={{
            clipPath: 'polygon(0% 0%, 50% 50%, 0% 100%)',
            width: '100%',
            height: '100%'
          }}
        />
        
        {/* Yellow triangle (top-right) */}
        <div 
          className="absolute bg-ludo-yellow/80"
          style={{
            clipPath: 'polygon(0% 0%, 100% 0%, 50% 50%)',
            width: '100%',
            height: '100%'
          }}
        />
        
        {/* Blue triangle (bottom-right) */}
        <div 
          className="absolute bg-ludo-blue/80"
          style={{
            clipPath: 'polygon(50% 50%, 100% 0%, 100% 100%)',
            width: '100%',
            height: '100%'
          }}
        />
      </div>
      
      {/* Center home icon */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="w-8 h-8 bg-white rounded-full shadow-lg flex items-center justify-center border-2 border-gray-300">
          <Home className="w-4 h-4 text-gray-600" />
        </div>
      </div>
    </div>
  );

  // Enhanced track cells with Ludo King styling
  const renderTrackCells = () => {
    const cells = [];
    
    for (let y = 0; y < 15; y++) {
      for (let x = 0; x < 15; x++) {
        // Skip base areas
        if ((x < 6 && y < 6) || (x > 8 && y < 6) || (x < 6 && y > 8) || (x > 8 && y > 8)) continue;
        // Skip center
        if (x > 5 && x < 9 && y > 5 && y < 9) continue;

        let cellClass = '';
        let content = null;
        let isSpecial = false;

        // --- COLORED PATHS & START SPOTS ---

        // Red Home Path (Horizontal Left, Middle Row)
        if (y === 7 && x > 0 && x < 6) {
          cellClass = 'bg-ludo-red border-2 border-ludo-red/50';
          isSpecial = true;
        }
        
        // Red Start Spot (Arrow entrance)
        if (x === 1 && y === 6) { 
          cellClass = 'bg-ludo-red border-2 border-ludo-red shadow-lg'; 
          content = (
            <div className="relative w-full h-full flex items-center justify-center">
              <div className="w-5 h-5 bg-white rounded-full shadow-md border border-ludo-red" />
              <div className="absolute -right-0.5 top-1/2 transform -translate-y-1/2">
                <div className="w-0 h-0 border-l-3 border-l-white border-t-2 border-t-transparent border-b-2 border-b-transparent" />
              </div>
            </div>
          );
          isSpecial = true;
        }

        // Green Home Path (Vertical Top, Middle Col)
        if (x === 7 && y > 0 && y < 6) {
          cellClass = 'bg-ludo-green border-2 border-ludo-green/50';
          isSpecial = true;
        }
        
        // Green Start Spot (Arrow entrance)
        if (x === 8 && y === 1) { 
          cellClass = 'bg-ludo-green border-2 border-ludo-green shadow-lg'; 
          content = (
            <div className="relative w-full h-full flex items-center justify-center">
              <div className="w-5 h-5 bg-white rounded-full shadow-md border border-ludo-green" />
              <div className="absolute -bottom-0.5 left-1/2 transform -translate-x-1/2">
                <div className="w-0 h-0 border-t-3 border-t-white border-l-2 border-l-transparent border-r-2 border-r-transparent" />
              </div>
            </div>
          );
          isSpecial = true;
        }
        
        // Yellow Home Path (Horizontal Right, Middle Row)
        if (y === 7 && x > 8 && x < 14) {
          cellClass = 'bg-ludo-yellow border-2 border-ludo-yellow/50';
          isSpecial = true;
        }
        
        // Yellow Start Spot (Arrow entrance)
        if (x === 13 && y === 8) { 
          cellClass = 'bg-ludo-yellow border-2 border-ludo-yellow shadow-lg'; 
          content = (
            <div className="relative w-full h-full flex items-center justify-center">
              <div className="w-5 h-5 bg-white rounded-full shadow-md border border-ludo-yellow" />
              <div className="absolute -left-0.5 top-1/2 transform -translate-y-1/2">
                <div className="w-0 h-0 border-r-3 border-r-white border-t-2 border-t-transparent border-b-2 border-b-transparent" />
              </div>
            </div>
          );
          isSpecial = true;
        }

        // Blue Home Path (Vertical Bottom, Middle Col)
        if (x === 7 && y > 8 && y < 14) {
          cellClass = 'bg-ludo-blue border-2 border-ludo-blue/50';
          isSpecial = true;
        }
        
        // Blue Start Spot (Arrow entrance)
        if (x === 6 && y === 13) { 
          cellClass = 'bg-ludo-blue border-2 border-ludo-blue shadow-lg'; 
          content = (
            <div className="relative w-full h-full flex items-center justify-center">
              <div className="w-5 h-5 bg-white rounded-full shadow-md border border-ludo-blue" />
              <div className="absolute -top-0.5 left-1/2 transform -translate-x-1/2">
                <div className="w-0 h-0 border-b-3 border-b-white border-l-2 border-l-transparent border-r-2 border-r-transparent" />
              </div>
            </div>
          );
          isSpecial = true;
        }

        // --- SAFE SPOTS (STARS) ---
        const isSafeSpot = 
          (x === 6 && y === 2) || 
          (x === 12 && y === 6) || 
          (x === 8 && y === 12) || 
          (x === 2 && y === 8);

        if (isSafeSpot) {
          cellClass = 'bg-white border-2 border-gray-300 shadow-inner';
          content = (
            <div className="w-full h-full flex items-center justify-center">
              <Star className="w-5 h-5 text-yellow-500 fill-yellow-400 drop-shadow-sm" />
            </div>
          );
          isSpecial = true;
        }

        // Regular track cells - Ludo King style with subtle pattern
        if (!isSpecial) {
          cellClass = 'bg-white border border-gray-200 shadow-inner relative';
          content = (
            <div className="absolute inset-0 bg-gradient-to-br from-gray-50 to-white opacity-50" />
          );
        }

        cells.push(
          <div
            key={`${x}-${y}`}
            className={cn(
              "relative flex items-center justify-center transition-all duration-200",
              cellClass
            )}
            style={{ 
              gridColumn: x + 1, 
              gridRow: y + 1,
              aspectRatio: '1'
            }}
          >
            {content}
          </div>
        );
      }
    }
    return cells;
  };

  // Render dice box for each player - always visible but only contains dice when it's their turn
  const renderDiceBox = (color: string, position: string) => {
    const isCurrentPlayer = currentTurn === color;
    const shouldShow = gameMode === '4-player' || (gameMode === '2-player' && (color === 'red' || color === 'yellow'));
    
    if (!shouldShow) return null;

    const positionClasses = {
      'left': 'absolute left-0 top-1/2 transform -translate-y-1/2 -translate-x-full -ml-2',
      'top': 'absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-full -mt-2',
      'right': 'absolute right-0 top-1/2 transform -translate-y-1/2 translate-x-full ml-2',
      'bottom': 'absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-full mt-2'
    };

    return (
      <div className={cn(positionClasses[position as keyof typeof positionClasses], "z-50")}>
        <div className={cn(
          "bg-white/95 backdrop-blur-sm rounded-lg m-5 p-2 shadow-xl border-2 min-w-[80px] min-h-[90px] flex flex-col items-center justify-center",
          `border-ludo-${color}`,
          isCurrentPlayer ? `bg-ludo-${color}/10` : "bg-gray-50/80"
        )}>
          <div className="text-center mb-1">
            <span className={cn(
              "text-[10px] font-bold uppercase tracking-wide",
              `text-ludo-${color}`
            )}>
              {color}
            </span>
          </div>
          
          {/* Dice area - only show dice when it's this player's turn */}
          <div className="flex items-center justify-center min-h-[60px]">
            {isCurrentPlayer ? (
              <Dice
                value={diceValue || 1}
                rolling={isRolling}
                onRoll={onRollDice || (() => {})}
                disabled={!canRollDice}
                color={color as 'red' | 'green' | 'yellow' | 'blue'}
                size="small"
              />
            ) : (
              <div className="w-12 h-12 rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center">
                <span className="text-[10px] text-gray-400 font-medium">Wait</span>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="relative flex items-center justify-center h-full w-full">
      {/* Main board container - responsive sizing */}
      <div className="relative p-3 md:p-4 lg:p-6 bg-gradient-to-br from-blue-900 via-blue-800 to-blue-900 rounded-2xl md:rounded-3xl shadow-2xl border-2 md:border-4 border-yellow-400 z-10">
        {/* Dice boxes for all players - positioned relative to board */}
        {renderDiceBox('red', 'left')}
        {renderDiceBox('green', 'top')}
        {renderDiceBox('yellow', 'right')}
        {renderDiceBox('blue', 'bottom')}
        {/* Board background pattern */}
        <div className="absolute inset-0 opacity-20">
          <div className="w-full h-full bg-gradient-to-br from-yellow-400 via-orange-300 to-red-400 rounded-2xl md:rounded-3xl" />
        </div>
        
        <div 
          className="relative grid gap-0.5 bg-white rounded-xl md:rounded-2xl p-1.5 md:p-2 shadow-inner border-2 border-gray-300"
          style={{
            gridTemplateColumns: 'repeat(15, minmax(0, 1fr))',
            gridTemplateRows: 'repeat(15, minmax(0, 1fr))',
            aspectRatio: '1',
            width: 'min(calc(100vh - 200px), 550px)',
            height: 'min(calc(100vh - 200px), 550px)'
          }}
        >
          {/* All four bases - always visible */}
          {renderBase('red', 1, 1, gameMode === '4-player' || gameMode === '2-player')}
          {renderBase('green', 1, 10, gameMode === '4-player')}
          {renderBase('blue', 10, 1, gameMode === '4-player')}
          {renderBase('yellow', 10, 10, gameMode === '4-player' || gameMode === '2-player')}
          
          {/* Enhanced Center Home */}
          {renderCenter()}

          {/* Enhanced Track Cells */}
          {renderTrackCells()}

          {/* Pieces Layer with enhanced positioning and stacking */}
          {pieces.map((piece) => {
            // Calculate stack info - find all pieces at the same position
            const { x, y } = getCoordinates(piece);
            const piecesAtSamePosition = pieces.filter(p => {
              const coords = getCoordinates(p);
              return coords.x === x && coords.y === y;
            });
            const stackSize = piecesAtSamePosition.length;
            const stackIndex = piecesAtSamePosition.findIndex(p => p.id === piece.id);
            
            return (
              <Piece
                key={piece.id}
                piece={piece}
                onClick={() => onPieceClick(piece)}
                canMove={canMovePiece(piece)}
                stackIndex={stackIndex}
                stackSize={stackSize}
              />
            );
          })}
          
          {/* Subtle board glow effect when waiting for move */}
          {diceValue && !isRolling && (
            <div className="absolute inset-0 pointer-events-none">
              <div className="absolute inset-0 bg-yellow-400/5 rounded-2xl animate-pulse" />
            </div>
          )}
        </div>
        
        {/* Game mode indicator - moved to top-right corner */}
        <div className="absolute top-2 right-2 bg-white/95 backdrop-blur-sm px-3 py-1.5 rounded-lg shadow-md border border-gray-300">
          <span className="text-xs font-bold text-gray-700">
            {gameMode === '2-player' ? '2P' : '4P'}
          </span>
        </div>
      </div>
    </div>
  );
}
