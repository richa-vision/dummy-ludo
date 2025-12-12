import { WebSocketServer, WebSocket } from 'ws';
import { Server as HTTPServer } from 'http';
import { GameManager } from './game-manager';
import { WSMessage, WSResponse } from '@shared/schema';
import { randomUUID } from 'crypto';
import { log } from './index';

const gameManager = new GameManager();
const clients = new Map<string, WebSocket>();

export function setupWebSocket(server: HTTPServer) {
  const wss = new WebSocketServer({ server, path: '/ws' });

  wss.on('connection', (ws: WebSocket) => {
    const clientId = randomUUID();
    clients.set(clientId, ws);
    
    log(`Client connected: ${clientId}`, 'websocket');

    ws.on('message', async (data: Buffer) => {
      try {
        const message: WSMessage = JSON.parse(data.toString());
        log(`Message from ${clientId}: ${message.type}`, 'websocket');
        
        await handleMessage(clientId, message, ws);
      } catch (error) {
        log(`Error handling message: ${error}`, 'websocket');
        sendError(ws, 'Invalid message format');
      }
    });

    ws.on('close', () => {
      log(`Client disconnected: ${clientId}`, 'websocket');
      
      // Handle player leaving
      const roomCode = gameManager.leaveRoom(clientId);
      if (roomCode) {
        const room = gameManager.getRoomByCode(roomCode);
        if (room) {
          broadcastToRoom(roomCode, {
            type: 'room_updated',
            payload: { room }
          });
        }
      }
      
      clients.delete(clientId);
    });

    ws.on('error', (error) => {
      log(`WebSocket error for ${clientId}: ${error}`, 'websocket');
    });
  });

  log('WebSocket server initialized', 'websocket');
}

async function handleMessage(clientId: string, message: WSMessage, ws: WebSocket) {
  try {
    switch (message.type) {
      case 'create': {
        const room = gameManager.createRoom(clientId, message.payload.playerName, message.payload.gameMode);
        const response: WSResponse = {
          type: 'room_created',
          payload: { room, playerId: clientId }
        };
        send(ws, response);
        break;
      }

      case 'join': {
        const room = gameManager.joinRoom(
          message.payload.roomCode,
          clientId,
          message.payload.playerName
        );
        
        if (!room) {
          sendError(ws, 'Room not found');
          return;
        }

        const response: WSResponse = {
          type: 'room_joined',
          payload: { room, playerId: clientId }
        };
        send(ws, response);
        
        // Notify other players
        broadcastToRoom(room.code, {
          type: 'room_updated',
          payload: { room }
        }, clientId);
        break;
      }

      case 'choose_color': {
        const room = gameManager.chooseColor(clientId, message.payload.color);
        if (room) {
          broadcastToRoom(room.code, {
            type: 'room_updated',
            payload: { room }
          });
        }
        break;
      }

      case 'ready': {
        const room = gameManager.setReady(clientId);
        if (room) {
          broadcastToRoom(room.code, {
            type: 'room_updated',
            payload: { room }
          });
        }
        break;
      }

      case 'start_game': {
        const room = gameManager.startGame(clientId);
        if (room) {
          broadcastToRoom(room.code, {
            type: 'game_started',
            payload: { room }
          });
        }
        break;
      }

      case 'roll_dice': {
        const result = gameManager.rollDice(clientId);
        if (result) {
          broadcastToRoom(result.room.code, {
            type: 'room_updated',
            payload: { room: result.room }
          });
        }
        break;
      }

      case 'move_piece': {
        const result = gameManager.movePiece(clientId, message.payload.pieceId);
        if (result) {
          // Broadcast room update
          broadcastToRoom(result.room.code, {
            type: 'room_updated',
            payload: { room: result.room }
          });
          
          // If a piece was captured, broadcast a capture event
          if (result.captured) {
            broadcastToRoom(result.room.code, {
              type: 'piece_captured',
              payload: { 
                capturedPiece: result.captured,
                room: result.room
              }
            });
          }
        }
        break;
      }

      case 'leave': {
        const roomCode = gameManager.leaveRoom(clientId);
        if (roomCode) {
          const room = gameManager.getRoomByCode(roomCode);
          if (room) {
            broadcastToRoom(roomCode, {
              type: 'room_updated',
              payload: { room }
            });
          }
        }
        break;
      }
    }
  } catch (error: any) {
    log(`Error in message handler: ${error.message}`, 'websocket');
    sendError(ws, error.message);
  }
}

function send(ws: WebSocket, message: WSResponse) {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(message));
  }
}

function sendError(ws: WebSocket, message: string) {
  send(ws, {
    type: 'error',
    payload: { message }
  });
}

function broadcastToRoom(roomCode: string, message: WSResponse, excludeClientId?: string) {
  const room = gameManager.getRoomByCode(roomCode);
  if (!room) return;

  room.players.forEach(player => {
    if (player.id !== excludeClientId) {
      const client = clients.get(player.id);
      if (client) {
        send(client, message);
      }
    }
  });
}
