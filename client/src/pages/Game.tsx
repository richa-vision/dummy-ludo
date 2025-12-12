import React, { useState, useEffect } from "react";
import { Board } from "@/components/game/Board";
import { Dice } from "@/components/game/Dice";
import { GamePiece, PlayerColor, getCoordinates } from "@/lib/ludo-logic";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Trophy, RefreshCw, Users } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import generatedImage from "@assets/generated_images/light_wooden_table_texture_for_game_background.png";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

const PLAYERS: PlayerColor[] = ["red", "blue", "yellow", "green"]; // Clockwise: red → blue → yellow → green

export default function Game() {
  const { toast } = useToast();

  const [pieces, setPieces] = useState<GamePiece[]>(() => {
    const initialPieces: GamePiece[] = [];
    PLAYERS.forEach((color) => {
      for (let i = 0; i < 4; i++) {
        initialPieces.push({
          id: `${color}-${i}`,
          color,
          position: -1, // -1 means in base
          isSafe: true,
        });
      }
    });
    return initialPieces;
  });

  const [turnIndex, setTurnIndex] = useState(0);
  const [diceValue, setDiceValue] = useState<number | null>(null);
  const [previousPlayerLastRoll, setPreviousPlayerLastRoll] = useState<number | null>(null); // Last roll from PREVIOUS player
  const [currentPlayerRolls, setCurrentPlayerRolls] = useState<number[]>([]); // Track current player's rolls this turn
  const [isRolling, setIsRolling] = useState(false);
  const [waitingForMove, setWaitingForMove] = useState(false);
  const [winner, setWinner] = useState<PlayerColor | null>(null);

  const currentTurnColor = PLAYERS[turnIndex];

  // Enhanced weighted dice roll with increased 6 probability and better previous number avoidance
  const rollWeightedDice = (): number => {
    const playerPieces = pieces.filter((p) => p.color === currentTurnColor);
    const allPiecesInBase = playerPieces.every((p) => p.position === -1);
    
    // Base probabilities - boost 6 to 25% (was 16.67%)
    const weights = [15, 15, 15, 15, 15, 25]; // 6 gets 25% chance
    
    // If all pieces in base, prioritize getting 6 over avoiding previous number
    if (allPiecesInBase) {
      weights[0] = 10; weights[1] = 10; weights[2] = 10; 
      weights[3] = 10; weights[4] = 10; weights[5] = 50; // 50% chance for 6!
    } else {
      // Only apply previous number reduction if NOT all pieces in base
      // Reduce probability of getting same number as previous PLAYER's last roll to 2%
      // Only apply if this is the first roll of current player's turn
      if (previousPlayerLastRoll !== null && currentPlayerRolls.length === 0) {
        const lastRollIndex = previousPlayerLastRoll - 1;
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
  };

  const rollDice = async () => {
    if (isRolling || waitingForMove || winner) return;

    setIsRolling(true);
    // Simulate roll duration
    await new Promise((resolve) => setTimeout(resolve, 800));

    const roll = rollWeightedDice();
    setDiceValue(roll);
    setCurrentPlayerRolls(prev => [...prev, roll]); // Track this roll
    setIsRolling(false);

    // Check if player has valid moves
    if (!hasValidMoves(currentTurnColor, roll)) {
      toast({
        title: "No Moves",
        description: `You rolled a ${roll} but can't move any pieces.`,
        duration: 2000,
      });
      setTimeout(nextTurn, 1000);
    } else {
      setWaitingForMove(true);
    }
  };

  const hasValidMoves = (color: PlayerColor, roll: number) => {
    const playerPieces = pieces.filter((p) => p.color === color);
    return playerPieces.some((p) => canMovePiece(p, roll));
  };

  const canMovePiece = (
    piece: GamePiece,
    roll: number = diceValue || 0,
  ): boolean => {
    if (piece.color !== currentTurnColor) return false;
    if (!waitingForMove) return false;

    // Rule: Need a 6 to leave base
    if (piece.position === -1) {
      return roll === 6;
    }

    // Rule: Cannot overshoot 99 (finish)
    if (piece.position + roll > 57) return false;

    return true;
  };

  // Safe spots on the main track (ABSOLUTE positions where pieces cannot be captured)
  // Start positions: Red=0, Green=13, Yellow=26, Blue=39
  // Star positions: 8, 21, 34, 47
  const SAFE_SPOT_POSITIONS = [0, 8, 13, 21, 26, 34, 39, 47];
  
  // Player start offsets on the 52-cell track
  const PLAYER_START_OFFSETS: Record<PlayerColor, number> = {
    red: 0,
    green: 13,
    yellow: 26,
    blue: 39
  };

  // Get absolute track position (0-51) from piece's relative position
  const getAbsoluteTrackPosition = (piece: GamePiece): number => {
    if (piece.position < 0 || piece.position > 50) return -1; // Not on main track
    const offset = PLAYER_START_OFFSETS[piece.color];
    return (piece.position + offset) % 52;
  };

  // Check if a piece is on a safe spot (using absolute track position)
  const isPieceOnSafeSpot = (piece: GamePiece): boolean => {
    if (piece.position >= 51) return true; // Home path is always safe
    if (piece.position < 0) return true; // Base is always safe
    if (piece.position === 99) return true; // Finished is always safe
    const absolutePos = getAbsoluteTrackPosition(piece);
    return SAFE_SPOT_POSITIONS.includes(absolutePos);
  };

  const handlePieceClick = (piece: GamePiece) => {
    if (!diceValue || !canMovePiece(piece, diceValue)) return;

    const newPieces = [...pieces];
    const pIndex = newPieces.findIndex((p) => p.id === piece.id);
    const p = newPieces[pIndex];

    // Move Logic
    if (p.position === -1) {
      p.position = 0; // Start position
    } else {
      p.position += diceValue;
    }

    // Update isSafe status using absolute position
    p.isSafe = isPieceOnSafeSpot(p);

    // Check for capture (only on main track, positions 0-50)
    let captured = false;
    
    if (p.position >= 0 && p.position <= 50) {
      const absolutePos = getAbsoluteTrackPosition(p);
      
      // Check if landing spot is a safe spot
      const isLandingSpotSafe = SAFE_SPOT_POSITIONS.includes(absolutePos);
      
      if (!isLandingSpotSafe) {
        const collisionIndex = newPieces.findIndex(
          (other) =>
            other.color !== p.color &&
            other.position >= 0 &&
            other.position <= 50 &&
            getAbsoluteTrackPosition(other) === absolutePos
        );

        if (collisionIndex !== -1) {
          // Capture!
          const capturedPiece = newPieces[collisionIndex];
          toast({
            title: "💥 Captured!",
            description: `${currentTurnColor} sent ${capturedPiece.color} back to base!`,
            className: "bg-red-500 text-white border-red-600",
            duration: 3000,
          });
          newPieces[collisionIndex].position = -1; // Send back to base
          newPieces[collisionIndex].isSafe = true;
          captured = true;
        }
      }
    }

    if (p.position === 57) {
      p.position = 99; // Marked as finished
      p.isSafe = true;
      toast({
        title: "🏠 Home!",
        description: "A piece made it home!",
        className: "bg-green-500 text-white",
      });
    }

    setPieces(newPieces);
    setWaitingForMove(false);

    // Rule: Rolling a 6 or capturing gives another turn
    if (diceValue === 6 || captured) {
      setDiceValue(null);
    } else {
      nextTurn();
    }
  };

  const nextTurn = () => {
    // Save the last roll from current player for the next player's probability
    const lastRoll = currentPlayerRolls.length > 0 ? currentPlayerRolls[currentPlayerRolls.length - 1] : null;
    setPreviousPlayerLastRoll(lastRoll);
    setCurrentPlayerRolls([]); // Reset for next player
    setDiceValue(null);
    setWaitingForMove(false);
    setTurnIndex((prev) => (prev + 1) % 4);
  };

  const resetGame = () => {
    setPieces((prev) => prev.map((p) => ({ ...p, position: -1 })));
    setTurnIndex(0);
    setDiceValue(null);
    setPreviousPlayerLastRoll(null);
    setCurrentPlayerRolls([]);
    setWinner(null);
    setIsRolling(false);
    setWaitingForMove(false);
  };

  return (
    <div className="h-screen w-full flex flex-col items-center justify-center p-2 relative overflow-hidden">
      {/* Background */}
      <div
        className="absolute inset-0 z-0 opacity-40"
        style={{
          backgroundImage: `url(${generatedImage})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      />
      <div className="absolute inset-0 bg-white/60 backdrop-blur-[2px] z-0" />

      {/* Game Container */}
      <div className="relative z-10 w-full h-full max-w-[1600px] grid grid-cols-1 xl:grid-cols-[1fr_320px] gap-4 items-center">
        {/* Left: Board */}
        <div className="flex justify-center items-center h-full px-4 py-2">
          <Board
            pieces={pieces}
            onPieceClick={handlePieceClick}
            currentTurn={currentTurnColor}
            canMovePiece={(p) =>
              hasValidMoves(currentTurnColor, diceValue || 0) && canMovePiece(p)
            }
            gameMode="4-player"
            diceValue={diceValue || 1}
            isRolling={isRolling}
            onRollDice={rollDice}
            canRollDice={!isRolling && !waitingForMove && !winner}
          />
        </div>

        {/* Right: Controls */}
        <div className="flex flex-col gap-3 h-full justify-center">
          <Card className="p-4 bg-white/80 backdrop-blur-md shadow-xl border-0 rounded-2xl">
            <div className="flex items-center justify-between mb-3">
              <h1 className="text-xl font-display font-bold text-slate-800">
                Ludo Friends
              </h1>
              <Button variant="ghost" size="icon" onClick={resetGame}>
                <RefreshCw className="w-4 h-4 text-slate-500" />
              </Button>
            </div>

            {/* Current Player Status */}
            <div className="flex items-center justify-center mb-4">
              <div className="text-center">
                <p className="text-xs text-slate-500 font-medium mb-1 uppercase tracking-wide">
                  Current Turn
                </p>
                <motion.div
                  key={currentTurnColor}
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className={cn(
                    "text-lg font-display font-bold px-4 py-1.5 rounded-full capitalize text-white shadow-lg",
                    `bg-ludo-${currentTurnColor}`,
                  )}
                >
                  {currentTurnColor} Player
                </motion.div>
              </div>
            </div>

            {/* Game Info */}
            <div className="grid grid-cols-2 gap-2 mb-4">
              <div className="bg-slate-100 p-2 rounded-lg flex items-center gap-2">
                <Users className="w-4 h-4 text-slate-400" />
                <div className="flex flex-col">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">
                    Players
                  </span>
                  <span className="font-display font-bold text-slate-700 text-sm">
                    4 Player
                  </span>
                </div>
              </div>
              <div className="bg-slate-100 p-2 rounded-lg flex items-center gap-2">
                <Trophy className="w-4 h-4 text-slate-400" />
                <div className="flex flex-col">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">
                    To Win
                  </span>
                  <span className="font-display font-bold text-slate-700 text-sm">
                    All Home
                  </span>
                </div>
              </div>
            </div>

            {/* Players List with Home Count */}
            <div className="space-y-1.5">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-2">Players Progress</p>
              {PLAYERS.map((color) => {
                const playerPieces = pieces.filter(p => p.color === color);
                const finishedPieces = playerPieces.filter(p => p.position === 99).length;
                
                return (
                  <div 
                    key={color} 
                    className={cn(
                      "flex items-center justify-between p-2 rounded-lg bg-slate-100",
                      currentTurnColor === color && "ring-2 ring-yellow-400"
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <div 
                        className="w-5 h-5 rounded-full border-2 border-white shadow-sm"
                        style={{ backgroundColor: `var(--color-ludo-${color})` }}
                      />
                      <span className="font-display font-bold text-slate-700 capitalize text-sm">
                        {color}
                      </span>
                    </div>
                    <span className="text-xs text-slate-500 font-mono">
                      {finishedPieces}/4
                    </span>
                  </div>
                );
              })}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
