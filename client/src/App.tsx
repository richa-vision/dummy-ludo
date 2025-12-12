import { useState } from "react";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Lobby from "@/pages/Lobby";
import WaitingRoom from "@/pages/WaitingRoom";
import MultiplayerGame from "@/pages/MultiplayerGame";
import { GameRoom } from "@shared/schema";

type AppState = 
  | { stage: 'lobby' }
  | { stage: 'waiting'; room: GameRoom; playerId: string }
  | { stage: 'playing'; room: GameRoom; playerId: string };

function App() {
  const [state, setState] = useState<AppState>({ stage: 'lobby' });

  const handleJoinedRoom = (room: GameRoom, playerId: string) => {
    setState({ stage: 'waiting', room, playerId });
  };

  const handleGameStart = (room: GameRoom) => {
    if (state.stage === 'waiting') {
      setState({ stage: 'playing', room, playerId: state.playerId });
    }
  };

  const handleLeave = () => {
    setState({ stage: 'lobby' });
  };

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        {state.stage === 'lobby' && (
          <Lobby onJoinedRoom={handleJoinedRoom} />
        )}
        {state.stage === 'waiting' && (
          <WaitingRoom 
            initialRoom={state.room} 
            playerId={state.playerId}
            onGameStart={handleGameStart}
            onLeave={handleLeave}
          />
        )}
        {state.stage === 'playing' && (
          <MultiplayerGame 
            initialRoom={state.room}
            playerId={state.playerId}
            onLeave={handleLeave}
          />
        )}
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
