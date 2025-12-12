import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { motion } from 'framer-motion';
import { Copy, Check, Crown, LogOut } from 'lucide-react';
import generatedImage from '@assets/generated_images/light_wooden_table_texture_for_game_background.png';
import { wsClient } from '@/lib/websocket';
import { GameRoom, PlayerColor, WSResponse } from '@shared/schema';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

const COLORS_4P: PlayerColor[] = ['red', 'green', 'yellow', 'blue'];
const COLORS_2P: PlayerColor[] = ['red', 'yellow'];

interface WaitingRoomProps {
  initialRoom: GameRoom;
  playerId: string;
  onGameStart: (room: GameRoom) => void;
  onLeave: () => void;
}

export default function WaitingRoom({ initialRoom, playerId, onGameStart, onLeave }: WaitingRoomProps) {
  const { toast } = useToast();
  const [room, setRoom] = useState<GameRoom>(initialRoom);
  const [copied, setCopied] = useState(false);

  const currentPlayer = room.players.find(p => p.id === playerId);
  const isHost = room.players[0]?.id === playerId;
  const availableColors = room.gameMode === '2-player' ? COLORS_2P : COLORS_4P;
  const maxPlayers = room.gameMode === '2-player' ? 2 : 4;

  useEffect(() => {
    const unsubscribe = wsClient.onMessage((message: WSResponse) => {
      if (message.type === 'room_updated') {
        setRoom(message.payload.room);
      } else if (message.type === 'game_started') {
        onGameStart(message.payload.room);
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
    };
  }, [onGameStart, toast]);

  const handleCopyCode = () => {
    navigator.clipboard.writeText(room.code);
    setCopied(true);
    toast({
      title: 'Copied!',
      description: 'Room code copied to clipboard',
    });
    setTimeout(() => setCopied(false), 2000);
  };

  const handleChooseColor = (color: PlayerColor) => {
    wsClient.send({
      type: 'choose_color',
      payload: { color }
    });
  };

  const handleReady = () => {
    wsClient.send({ type: 'ready' });
  };

  const handleStart = () => {
    wsClient.send({ type: 'start_game' });
  };

  const handleLeave = () => {
    wsClient.send({ type: 'leave' });
    onLeave();
  };

  const canStart = room.players.length >= 2 && room.players.every(p => p.color && p.ready);

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center p-4 relative overflow-hidden">
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

      {/* Content */}
      <div className="relative z-10 w-full max-w-2xl">
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
        >
          <Card className="p-8 bg-white/90 backdrop-blur-md shadow-2xl border-0 rounded-3xl">
            {/* Header */}
            <div className="text-center mb-8">
              <h1 className="text-3xl font-display font-bold text-slate-800 mb-2">Waiting Room</h1>
              <div className="flex items-center justify-center gap-2">
                <div className="bg-slate-100 px-6 py-3 rounded-xl">
                  <span className="text-2xl font-mono font-bold text-slate-800 tracking-widest">
                    {room.code}
                  </span>
                </div>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handleCopyCode}
                  className="h-12 w-12 rounded-xl"
                  data-testid="button-copy-code"
                >
                  {copied ? <Check className="w-5 h-5 text-green-500" /> : <Copy className="w-5 h-5" />}
                </Button>
              </div>
              <p className="text-sm text-slate-500 mt-2">
                {room.gameMode === '2-player' ? '2-Player Mode' : '4-Player Mode'} • Share this code with your friends!
              </p>
            </div>

            {/* Players */}
            <div className="space-y-3 mb-8">
              {room.players.map((player, index) => (
                <motion.div
                  key={player.id}
                  initial={{ x: -20, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: index * 0.1 }}
                  className="bg-slate-50 p-4 rounded-xl flex items-center justify-between"
                  data-testid={`player-${index}`}
                >
                  <div className="flex items-center gap-3">
                    {index === 0 && <Crown className="w-5 h-5 text-yellow-500" />}
                    <span className="font-display font-bold text-slate-800">{player.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {player.color && (
                      <div 
                        className="w-8 h-8 rounded-full border-2 border-white shadow-md"
                        style={{ backgroundColor: `var(--color-ludo-${player.color})` }}
                      />
                    )}
                    {player.ready && <Check className="w-5 h-5 text-green-500" />}
                  </div>
                </motion.div>
              ))}
              {Array.from({ length: maxPlayers - room.players.length }).map((_, i) => (
                <div key={`empty-${i}`} className="bg-slate-50/50 p-4 rounded-xl flex items-center justify-center border-2 border-dashed border-slate-200">
                  <span className="text-slate-400 font-body">Waiting for player...</span>
                </div>
              ))}
            </div>

            {/* Color Selection */}
            {!currentPlayer?.color && (
              <div className="mb-6">
                <label className="block text-sm font-bold text-slate-600 mb-3 uppercase tracking-wide text-center">
                  Choose Your Color
                </label>
                <div className={cn("grid gap-3", room.gameMode === '2-player' ? 'grid-cols-2' : 'grid-cols-4')}>
                  {availableColors.map(color => {
                    const taken = room.players.some(p => p.color === color && p.id !== playerId);
                    return (
                      <button
                        key={color}
                        onClick={() => !taken && handleChooseColor(color)}
                        disabled={taken}
                        className={cn(
                          "aspect-square rounded-2xl border-4 transition-all shadow-md relative",
                          taken ? "opacity-30 cursor-not-allowed" : "hover:scale-110 cursor-pointer border-white",
                          currentPlayer?.color === color && "ring-4 ring-slate-800 ring-offset-2"
                        )}
                        style={{ backgroundColor: `var(--color-ludo-${color})` }}
                        data-testid={`button-color-${color}`}
                      >
                        {taken && (
                          <div className="absolute inset-0 flex items-center justify-center">
                            <div className="w-1 h-full bg-slate-800 rotate-45" />
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Ready Button */}
            {currentPlayer?.color && !currentPlayer.ready && (
              <Button
                onClick={handleReady}
                className="w-full bg-ludo-green hover:bg-ludo-green/90 text-white h-14 rounded-xl font-display text-lg mb-4"
                data-testid="button-ready"
              >
                Ready!
              </Button>
            )}

            {/* Start Button (Host Only) */}
            {isHost && (
              <Button
                onClick={handleStart}
                disabled={!canStart}
                className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white h-14 rounded-xl font-display text-lg mb-4 disabled:opacity-50 disabled:cursor-not-allowed"
                data-testid="button-start-game"
              >
                {canStart ? 'Start Game!' : 'Waiting for players...'}
              </Button>
            )}

            {/* Leave Button */}
            <Button
              variant="outline"
              onClick={handleLeave}
              className="w-full h-12 rounded-xl border-2"
              data-testid="button-leave"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Leave Room
            </Button>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
