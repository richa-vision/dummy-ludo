import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupWebSocket } from "./websocket";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // Initialize WebSocket server for real-time multiplayer
  setupWebSocket(httpServer);

  // API routes (if needed in the future)
  // prefix all routes with /api

  return httpServer;
}
