// Storage interface - currently not needed for real-time multiplayer
// Game state is managed in memory by the WebSocket server

export interface IStorage {
  // Add storage methods here if needed for persistent data
}

export class MemStorage implements IStorage {
  constructor() {
    // Empty for now
  }
}

export const storage = new MemStorage();
