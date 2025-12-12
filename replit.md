# Ludo Friends

## Overview

Ludo Friends is a real-time multiplayer Ludo board game built as a web application. Players can create or join game rooms using room codes, choose their colors, and play the classic Ludo game with friends. The game features a modern UI with animations, WebSocket-based real-time communication, and supports 2-4 players per game session.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React with TypeScript, using Vite as the build tool
- **Styling**: Tailwind CSS with custom CSS variables for Ludo-specific colors (red, green, yellow, blue)
- **UI Components**: shadcn/ui component library with Radix UI primitives
- **State Management**: React Query for server state, React useState for local UI state
- **Animations**: Framer Motion for smooth piece movements and UI transitions
- **Fonts**: Fredoka (display) and Varela Round (body) for a playful game aesthetic

### Backend Architecture
- **Server**: Express.js running on Node.js with TypeScript
- **Real-time Communication**: WebSocket server (ws library) for game state synchronization
- **Game Logic**: GameManager class handles room creation, player management, and game state
- **Build**: esbuild for server bundling, Vite for client bundling

### Application Flow
1. **Lobby**: Players enter their name and create/join rooms using 6-character room codes
2. **Waiting Room**: Players select colors, mark ready, and wait for host to start
3. **Game**: Turn-based gameplay with dice rolling and piece movement via WebSocket messages

### Key Design Patterns
- **Client-Server Message Protocol**: Typed WebSocket messages (WSMessage/WSResponse) for all game actions
- **Shared Schema**: Common type definitions in `/shared/schema.ts` used by both client and server
- **In-Memory State**: Game rooms stored in memory via GameManager (no persistent database for game state)
- **Component Separation**: Game components (Board, Dice, Piece) separated from page components

### Path Aliases
- `@/*` → `./client/src/*`
- `@shared/*` → `./shared/*`
- `@assets/*` → `./attached_assets/*`

## External Dependencies

### Database
- **PostgreSQL**: Configured via Drizzle ORM with `DATABASE_URL` environment variable
- **Drizzle Kit**: Used for schema migrations (`npm run db:push`)
- **Note**: Database schema exists but game state is currently managed in-memory via WebSocket server

### Real-time Communication
- **WebSocket (ws)**: Native WebSocket library for bidirectional real-time game updates
- **Connection Path**: `/ws` endpoint on the Express server

### UI Libraries
- **Radix UI**: Headless component primitives for accessible UI elements
- **Framer Motion**: Animation library for piece movements and UI transitions
- **Lucide React**: Icon library

### Build Tools
- **Vite**: Frontend development server and build tool
- **esbuild**: Server-side bundling for production
- **TypeScript**: Full TypeScript support across client, server, and shared code