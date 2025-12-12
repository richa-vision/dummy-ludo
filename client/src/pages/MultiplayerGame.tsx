import React, { useState, useEffect } from 'react';
import { Board } from '@/components/game/Board';
import { Dice } from '@/components/game/Dice';
import { GamePiece, PlayerColor, getCoordinates } from '@/lib/ludo-logic';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Trophy, LogOut, Users } from 'lucide-react';
import { motion } from 'framer-motion';
import generatedImage from '@assets/generated_images/light_wooden_table_texture_for_game_background.png';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { wsClient } from '@/lib/websocket';
import { GameRoom, WSResponse } from '@shared/schema';

interface MultiplayerGameProps {
  initialRoom: GameRoom;
  playerId: string;
  onLeave: () => void;
}

export default function MultiplayerGame({ initialRoom, playerId, onLeave }: MultiplayerGameProps) {
  const { toast } = useToast();
  const [room, setRoom] = useState<GameRoom>(initialRoom);
  const [isRolling, setIsRolling] = useState(false);
  const [isTurnTransition, setIsTurnTransition] = useState(false);
  const [previousTurnIndex, setPreviousTurnIndex] = useState<number>(initialRoom.gameState.currentTurnIndex);
  const [displayDiceValue, setDisplayDiceValue] = useState<number>(1);

  const currentPlayer = room.players[room.gameState.currentTurnIndex];
  const myPlayer = room.players.find(p => p.id === playerId);
  const isMyTurn = currentPlayer.id === playerId;

useEffect(() => {
  let transitionTimer: NodeJS.Timeout | null = null;

  const unsubscribe = wsClient.onMessage((message: WSResponse) => {
    if (message.type === 'room_updated') {
      const newRoom = message.payload.room;
      
      // Update displayed dice value when a new roll comes in
      if (newRoom.gameState.diceValue !== null) {
        setDisplayDiceValue(newRoom.gameState.diceValue);
      }

      // Check if turn changed
      if (newRoom.gameState.currentTurnIndex !== previousTurnIndex) {
        setPreviousTurnIndex(newRoom.gameState.currentTurnIndex);
        
        // Clear any existing timer
        if (transitionTimer) clearTimeout(transitionTimer);
        // Show turn transition for 1.5 seconds
        transitionTimer = setTimeout(() => {
          setIsTurnTransition(false);
        }, 1500);
      }

      setRoom(newRoom);
    } else if (message.type === 'piece_captured') {
      // Show capture notification
      const capturedPiece = message.payload.capturedPiece;
      const capturedPlayer = room.players.find(p => p.color === capturedPiece.color);
      const currentPlayerName = room.players[room.gameState.currentTurnIndex]?.name || 'Player';
      
      toast({
        title: '💥 Piece Captured!',
        description: `${currentPlayerName} captured ${capturedPlayer?.name || capturedPiece.color}'s piece!`,
        className: 'bg-red-500 text-white border-red-600',
        duration: 3000,
      });
      
      // Update room state
      setRoom(message.payload.room);
    } else if (message.type === 'error') {
      toast({
        title: 'Error',
        description: message.payload.message,
        variant: 'destructive',
      });
    }
  });

  return () => {
    unsubscribe();
    if (transitionTimer) clearTimeout(transitionTimer);  // Clear timer on cleanup
  };
}, [toast, previousTurnIndex, room.players, room.gameState.currentTurnIndex]);


  const rollDice = async () => {
    if (!isMyTurn || isRolling || room.gameState.waitingForMove) return;

    setIsRolling(true);
    setTimeout(() => setIsRolling(false), 800);

    wsClient.send({ type: 'roll_dice' });
  };

  const handlePieceClick = (piece: GamePiece) => {
    if (!isMyTurn || !canMovePiece(piece)) return;

    wsClient.send({
      type: 'move_piece',
      payload: { pieceId: piece.id }
    });
  };

  const canMovePiece = (piece: GamePiece): boolean => {
    if (!isMyTurn || !room.gameState.waitingForMove) return false;
    if (piece.color !== myPlayer?.color) return false;

    const roll = room.gameState.diceValue || 0;
    
    if (piece.position === -1) {
      return roll === 6;
    }
    
    if (piece.position + roll > 57) return false;

    return true;
  };

  const handleLeave = () => {
    wsClient.send({ type: 'leave' });
    onLeave();
  };

  return (
    <div className="h-screen w-full flex flex-col items-center justify-center p-2 relative overflow-hidden">
      {/* Background */}
      <div 
        className="absolute inset-0 z-0 opacity-40"
        style={{
          backgroundImage: `url(${generatedImage})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      />
      <div className="absolute inset-0 bg-white/60 backdrop-blur-[2px] z-0" />

      {/* Game Container */}
      <div className="relative z-10 w-full h-full max-w-[1600px] grid grid-cols-1 xl:grid-cols-[1fr_320px] gap-4 items-center">
        
        {/* Left: Board */}
        <div className="flex justify-center items-center h-full px-4 py-2">
          <Board 
            pieces={room.gameState.pieces} 
            onPieceClick={handlePieceClick}
            currentTurn={currentPlayer.color || 'red'}
            canMovePiece={canMovePiece}
            gameMode={room.gameMode}
            diceValue={displayDiceValue}
            isRolling={isRolling}
            onRollDice={rollDice}
            canRollDice={isMyTurn && !room.gameState.waitingForMove && !room.gameState.winner && !isTurnTransition}
            players={room.players}
          />
        </div>

        {/* Right: Controls */}
        <div className="flex flex-col gap-3 h-full justify-center">
          <Card className="p-4 bg-white/80 backdrop-blur-md shadow-xl border-0 rounded-2xl">
            <div className="flex items-center justify-between mb-3">
              <h1 className="text-xl font-display font-bold text-slate-800">Ludo Friends</h1>
              <Button variant="ghost" size="icon" onClick={handleLeave} data-testid="button-leave-game">
                <LogOut className="w-4 h-4 text-slate-500" />
              </Button>
            </div>

            {/* Winner */}
            {room.gameState.winner && (
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="mb-4 p-4 bg-gradient-to-r from-yellow-400 to-orange-400 rounded-xl text-center"
              >
                <Trophy className="w-8 h-8 text-white mx-auto mb-1" />
                <h2 className="text-lg font-display font-bold text-white capitalize">
                  {room.players.find(p => p.color === room.gameState.winner)?.name} Wins!
                </h2>
              </motion.div>
            )}

            {/* Current Player Status */}
            <div className="flex items-center justify-center mb-4">
              <div className="text-center">
                <p className="text-xs text-slate-500 font-medium mb-1 uppercase tracking-wide">Current Turn</p>
                <motion.div 
                  key={currentPlayer.id}
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className={cn(
                    "text-lg font-display font-bold px-4 py-1.5 rounded-full text-white shadow-lg",
                    isMyTurn && "ring-2 ring-slate-800 ring-offset-1"
                  )}
                  style={{ backgroundColor: `var(--color-ludo-${currentPlayer.color})` }}
                >
                  {currentPlayer.name}
                  {isMyTurn && " (You)"}
                </motion.div>
              </div>
            </div>

            {/* Turn Transition Overlay */}
            {isTurnTransition && (
              <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="mb-4 p-3 bg-gradient-to-r from-purple-500 to-indigo-500 rounded-xl text-center"
              >
                <p className="text-white font-display font-bold text-sm">
                  {isMyTurn ? "Your Turn!" : `${currentPlayer.name}'s Turn`}
                </p>
                <div className="mt-1 h-1 bg-white/30 rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-white"
                    initial={{ width: "100%" }}
                    animate={{ width: "0%" }}
                    transition={{ duration: 1.5, ease: "linear" }}
                  />
                </div>
              </motion.div>
            )}

            {/* Game Info */}
            <div className="grid grid-cols-2 gap-2 mb-4">
              <div className="bg-slate-100 p-2 rounded-lg flex items-center gap-2">
                <Users className="w-4 h-4 text-slate-400" />
                <div className="flex flex-col">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">
                    Mode
                  </span>
                  <span className="font-display font-bold text-slate-700 text-sm">
                    {room.gameMode === '2-player' ? '2P' : '4P'}
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

            {/* Players List */}
            <div className="space-y-1.5">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-2">Players</p>
              {room.players.map((player) => {
                const playerPieces = room.gameState.pieces.filter(p => p.color === player.color);
                const finishedPieces = playerPieces.filter(p => p.position === 99).length;
                
                return (
                  <div 
                    key={player.id} 
                    className={cn(
                      "flex items-center justify-between p-2 rounded-lg bg-slate-100",
                      player.id === playerId && "ring-2 ring-purple-400"
                    )}
                    data-testid={`player-info-${player.color}`}
                  >
                    <div className="flex items-center gap-2">
                      <div 
                        className="w-5 h-5 rounded-full border-2 border-white shadow-sm"
                        style={{ backgroundColor: `var(--color-ludo-${player.color})` }}
                      />
                      <span className="font-display font-bold text-slate-700 text-sm">
                        {player.name}
                        {player.id === playerId && " (You)"}
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
