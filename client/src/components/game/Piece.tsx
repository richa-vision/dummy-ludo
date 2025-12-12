import { motion } from 'framer-motion';
import { GamePiece, getCoordinates } from '@/lib/ludo-logic';
import { cn } from '@/lib/utils';
import { useEffect, useState } from 'react';

interface PieceProps {
  piece: GamePiece;
  onClick: () => void;
  canMove: boolean;
  stackIndex?: number; // Index within a stack of pieces on the same cell
  stackSize?: number;  // Total pieces on the same cell
}

export function Piece({ piece, onClick, canMove, stackIndex = 0, stackSize = 1 }: PieceProps) {
  const { x, y } = getCoordinates(piece);
  const [justBecameMoveable, setJustBecameMoveable] = useState(false);
  
  // Track when piece becomes moveable to trigger special animation
  useEffect(() => {
    if (canMove) {
      setJustBecameMoveable(true);
      const timer = setTimeout(() => setJustBecameMoveable(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [canMove]);
  
  // Convert grid coordinates to percentages for the enhanced board
  const cellSize = 100 / 15;
  
  // Adjust piece size based on stack size - smaller when stacked
  const basePieceSize = cellSize * 0.6;
  const pieceSize = stackSize > 1 ? basePieceSize * 0.7 : basePieceSize;
  
  // Calculate offset for stacked pieces (arrange in a 2x2 grid pattern within the cell)
  const getStackOffset = (index: number, total: number): { offsetX: number; offsetY: number } => {
    if (total === 1) return { offsetX: 0, offsetY: 0 };
    
    // Offset patterns for different stack sizes
    const offsetAmount = cellSize * 0.25; // 25% of cell size offset
    
    if (total === 2) {
      // Two pieces: side by side
      const offsets = [
        { offsetX: -offsetAmount * 0.5, offsetY: 0 },
        { offsetX: offsetAmount * 0.5, offsetY: 0 }
      ];
      return offsets[index] || { offsetX: 0, offsetY: 0 };
    }
    
    if (total === 3) {
      // Three pieces: triangle pattern
      const offsets = [
        { offsetX: 0, offsetY: -offsetAmount * 0.5 },
        { offsetX: -offsetAmount * 0.5, offsetY: offsetAmount * 0.4 },
        { offsetX: offsetAmount * 0.5, offsetY: offsetAmount * 0.4 }
      ];
      return offsets[index] || { offsetX: 0, offsetY: 0 };
    }
    
    // 4+ pieces: 2x2 grid pattern
    const offsets = [
      { offsetX: -offsetAmount * 0.5, offsetY: -offsetAmount * 0.5 },
      { offsetX: offsetAmount * 0.5, offsetY: -offsetAmount * 0.5 },
      { offsetX: -offsetAmount * 0.5, offsetY: offsetAmount * 0.5 },
      { offsetX: offsetAmount * 0.5, offsetY: offsetAmount * 0.5 }
    ];
    return offsets[index % 4] || { offsetX: 0, offsetY: 0 };
  };
  
  const { offsetX, offsetY } = getStackOffset(stackIndex, stackSize);
  
  // Calculate position to center the piece in the cell with stack offset
  const leftPos = (x * cellSize) + (cellSize / 2) - (pieceSize / 2) + offsetX;
  const topPos = (y * cellSize) + (cellSize / 2) - (pieceSize / 2) + offsetY;

  return (
    <motion.div
      className={cn(
        "absolute flex items-center justify-center",
        canMove ? "cursor-pointer z-30" : "cursor-default z-10"
      )}
      style={{
        width: `${pieceSize}%`,
        height: `${pieceSize}%`,
      }}
      initial={false}
      animate={{
        left: `${leftPos}%`,
        top: `${topPos}%`,
        scale: canMove ? 1.05 : 1,
      }}
      transition={{
        left: {
          type: "spring",
          stiffness: 250,
          damping: 25,
          mass: 0.6
        },
        top: {
          type: "spring", 
          stiffness: 250,
          damping: 25,
          mass: 0.6
        },
        scale: {
          type: "spring",
          stiffness: 300,
          damping: 15,
          mass: 0.5
        }
      }}
      onClick={canMove ? onClick : undefined}
    >
      <div className="relative w-full h-full">
        {/* Simple Ludo King Style Shadow */}
        <div 
          className={cn(
            "absolute bottom-0 w-full h-[20%] bg-black/40 rounded-full blur-md translate-y-1",
            canMove && "bg-black/50 translate-y-2"
          )}
        />
        
        {/* Authentic Ludo King Style Piece - Simple Dome Design */}
        <motion.div
          className={cn(
            "w-full h-full flex items-center justify-center relative",
            canMove ? "cursor-pointer z-30" : "cursor-default z-10"
          )}
          whileHover={canMove ? { 
            scale: 1.05,
            transition: { duration: 0.2 }
          } : {}}
          whileTap={canMove ? { 
            scale: 0.95,
            transition: { duration: 0.1 }
          } : {}}
          animate={canMove ? {
            y: [0, -1, 0],
            transition: {
              duration: 2,
              repeat: Infinity,
              ease: "easeInOut"
            }
          } : {}}
          initial={justBecameMoveable ? { scale: 0.9, rotate: -3 } : false}
          whileInView={justBecameMoveable ? {
            scale: [0.9, 1.1, 1],
            rotate: [-3, 3, 0],
            transition: {
              duration: 0.4,
              ease: "backOut"
            }
          } : {}}
        >
          {/* Main Piece Body - Simple Dome Shape like Ludo King */}
          <div 
            className="w-full h-full rounded-full border-2 border-white/90 shadow-lg relative overflow-hidden"
            style={{
              backgroundColor: `var(--color-ludo-${piece.color})`,
              background: `
                radial-gradient(ellipse at 30% 25%, rgba(255,255,255,0.6) 0%, transparent 50%),
                radial-gradient(ellipse at 70% 75%, rgba(0,0,0,0.15) 0%, transparent 60%),
                var(--color-ludo-${piece.color})
              `,
              boxShadow: `
                inset 0 2px 4px rgba(255,255,255,0.4),
                inset 0 -1px 3px rgba(0,0,0,0.2),
                0 3px 8px rgba(0,0,0,0.3)
              `
            }}
          >
            {/* Main highlight - simple and clean */}
            <div className="absolute top-[20%] left-[25%] w-[30%] h-[30%] bg-white/70 rounded-full blur-[1px]" />
            <div className="absolute top-[25%] left-[30%] w-[15%] h-[15%] bg-white/90 rounded-full" />
            
            {/* Simple inner rim */}
            <div className="absolute inset-1 rounded-full border border-white/40" />
            
            {/* Bottom shadow for depth */}
            <div className="absolute bottom-1 left-1/2 transform -translate-x-1/2 w-[70%] h-[15%] bg-black/10 rounded-full blur-sm" />
          </div>

          {/* Simple Ludo King style moveable indicators */}
          {canMove && (
            <>
              {/* Clean pulsing ring */}
              <motion.div
                className="absolute -inset-1 rounded-full border-2 border-yellow-400"
                style={{
                  boxShadow: "0 0 15px rgba(255, 215, 0, 0.6)"
                }}
                animate={{
                  scale: [1, 1.1, 1],
                  opacity: [0.8, 1, 0.8]
                }}
                transition={{
                  duration: 1.5,
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
              />
              
              {/* Subtle inner glow */}
              <motion.div
                className="absolute inset-1 rounded-full bg-yellow-300/15"
                animate={{
                  opacity: [0.1, 0.3, 0.1]
                }}
                transition={{
                  duration: 1.2,
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
              />
              
              {/* Simple corner dots */}
              {[...Array(4)].map((_, i) => (
                <motion.div
                  key={i}
                  className="absolute w-1 h-1 bg-yellow-400 rounded-full"
                  style={{
                    top: i < 2 ? "15%" : "85%",
                    left: i % 2 === 0 ? "15%" : "85%",
                    transform: "translate(-50%, -50%)"
                  }}
                  animate={{
                    scale: [0, 1.2, 0],
                    opacity: [0, 1, 0]
                  }}
                  transition={{
                    duration: 1.5,
                    repeat: Infinity,
                    delay: i * 0.3,
                    ease: "easeInOut"
                  }}
                />
              ))}
            </>
          )}
        </motion.div>
        
        {/* Authentic Ludo King style popup */}
        {canMove && (
          <motion.div
            className="absolute -top-5 left-1/2 transform -translate-x-1/2 bg-white text-black text-xs font-bold px-2 py-0.5 rounded shadow-md border border-gray-200"
            initial={{ opacity: 0, y: 3, scale: 0.9 }}
            animate={{ 
              opacity: [0, 1, 1, 0],
              y: [3, -1, -1, -5],
              scale: [0.9, 1, 1, 0.95]
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          >
            TAP
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}
