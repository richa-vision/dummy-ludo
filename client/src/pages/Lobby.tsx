import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { motion } from 'framer-motion';
import { Users, Dices, ArrowRight } from 'lucide-react';
import generatedImage from '@assets/generated_images/light_wooden_table_texture_for_game_background.png';
import { wsClient } from '@/lib/websocket';
import { WSResponse, GameRoom, GameMode } from '@shared/schema';
import { useToast } from '@/hooks/use-toast';

interface LobbyProps {
  onJoinedRoom: (room: GameRoom, playerId: string) => void;
}

export default function Lobby({ onJoinedRoom }: LobbyProps) {
  const { toast } = useToast();
  const [playerName, setPlayerName] = useState('');
  const [roomCode, setRoomCode] = useState('');
  const [mode, setMode] = useState<'menu' | 'create' | 'join'>('menu');
  const [gameMode, setGameMode] = useState<'2-player' | '4-player'>('4-player');

  useEffect(() => {
    wsClient.connect();

    const unsubscribe = wsClient.onMessage((message: WSResponse) => {
      if (message.type === 'room_created' || message.type === 'room_joined') {
        onJoinedRoom(message.payload.room, message.payload.playerId);
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
  }, [onJoinedRoom, toast]);

  const handleCreateRoom = () => {
    if (!playerName.trim()) {
      toast({
        title: 'Name Required',
        description: 'Please enter your name',
        variant: 'destructive',
      });
      return;
    }

    wsClient.send({
      type: 'create',
      payload: { 
        playerName: playerName.trim(),
        gameMode: gameMode
      }
    });
  };

  const handleJoinRoom = () => {
    if (!playerName.trim() || !roomCode.trim()) {
      toast({
        title: 'Missing Info',
        description: 'Please enter your name and room code',
        variant: 'destructive',
      });
      return;
    }

    wsClient.send({
      type: 'join',
      payload: {
        roomCode: roomCode.trim().toUpperCase(),
        playerName: playerName.trim()
      }
    });
  };

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
      <div className="relative z-10 w-full max-w-md">
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.3 }}
        >
          <Card className="p-8 bg-white/90 backdrop-blur-md shadow-2xl border-0 rounded-3xl">
            {/* Logo */}
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl mb-4 shadow-lg">
                <Dices className="w-10 h-10 text-white" />
              </div>
              <h1 className="text-4xl font-display font-bold text-slate-800 mb-2">Ludo Friends</h1>
              <p className="text-slate-500 font-body">Play online with friends</p>
            </div>

            {/* Menu */}
            {mode === 'menu' && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="space-y-4"
              >
                <Button
                  size="lg"
                  className="w-full bg-ludo-green hover:bg-ludo-green/90 text-white font-display text-lg h-14 rounded-xl shadow-lg"
                  onClick={() => setMode('create')}
                  data-testid="button-create-room"
                >
                  <Users className="w-5 h-5 mr-2" />
                  Create Room
                </Button>

                <Button
                  size="lg"
                  variant="outline"
                  className="w-full font-display text-lg h-14 rounded-xl border-2"
                  onClick={() => setMode('join')}
                  data-testid="button-join-room"
                >
                  <ArrowRight className="w-5 h-5 mr-2" />
                  Join Room
                </Button>
              </motion.div>
            )}

            {/* Create Room */}
            {mode === 'create' && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="space-y-4"
              >
                <div>
                  <label className="block text-sm font-bold text-slate-600 mb-2 uppercase tracking-wide">
                    Your Name
                  </label>
                  <Input
                    placeholder="Enter your name"
                    value={playerName}
                    onChange={(e) => setPlayerName(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleCreateRoom()}
                    maxLength={20}
                    className="h-12 rounded-xl text-lg"
                    data-testid="input-player-name"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-600 mb-2 uppercase tracking-wide">
                    Game Mode
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <Button
                      variant={gameMode === '2-player' ? 'default' : 'outline'}
                      onClick={() => setGameMode('2-player')}
                      className="h-12 rounded-xl font-display"
                      data-testid="button-2-player"
                    >
                      2 Players
                    </Button>
                    <Button
                      variant={gameMode === '4-player' ? 'default' : 'outline'}
                      onClick={() => setGameMode('4-player')}
                      className="h-12 rounded-xl font-display"
                      data-testid="button-4-player"
                    >
                      4 Players
                    </Button>
                  </div>
                </div>

                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    onClick={() => setMode('menu')}
                    className="flex-1 h-12 rounded-xl"
                    data-testid="button-back"
                  >
                    Back
                  </Button>
                  <Button
                    onClick={handleCreateRoom}
                    className="flex-1 bg-ludo-green hover:bg-ludo-green/90 text-white h-12 rounded-xl font-display"
                    data-testid="button-create"
                  >
                    Create
                  </Button>
                </div>
              </motion.div>
            )}

            {/* Join Room */}
            {mode === 'join' && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="space-y-4"
              >
                <div>
                  <label className="block text-sm font-bold text-slate-600 mb-2 uppercase tracking-wide">
                    Your Name
                  </label>
                  <Input
                    placeholder="Enter your name"
                    value={playerName}
                    onChange={(e) => setPlayerName(e.target.value)}
                    maxLength={20}
                    className="h-12 rounded-xl text-lg"
                    data-testid="input-player-name-join"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-600 mb-2 uppercase tracking-wide">
                    Room Code
                  </label>
                  <Input
                    placeholder="XXXXXX"
                    value={roomCode}
                    onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                    onKeyDown={(e) => e.key === 'Enter' && handleJoinRoom()}
                    maxLength={6}
                    className="h-12 rounded-xl text-lg font-mono tracking-widest text-center uppercase"
                    data-testid="input-room-code"
                  />
                </div>

                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    onClick={() => setMode('menu')}
                    className="flex-1 h-12 rounded-xl"
                    data-testid="button-back-join"
                  >
                    Back
                  </Button>
                  <Button
                    onClick={handleJoinRoom}
                    className="flex-1 bg-ludo-blue hover:bg-ludo-blue/90 text-white h-12 rounded-xl font-display"
                    data-testid="button-join"
                  >
                    Join
                  </Button>
                </div>
              </motion.div>
            )}
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
