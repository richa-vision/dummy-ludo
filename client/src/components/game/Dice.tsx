import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface DiceProps {
  value: number;
  rolling: boolean;
  onRoll: () => void;
  disabled?: boolean;
  color: 'red' | 'green' | 'yellow' | 'blue';
  size?: 'small' | 'normal';
}

const DOT_POSITIONS: Record<number, number[][]> = {
  1: [[50, 50]],
  2: [[20, 20], [80, 80]],
  3: [[20, 20], [50, 50], [80, 80]],
  4: [[20, 20], [20, 80], [80, 20], [80, 80]],
  5: [[20, 20], [20, 80], [50, 50], [80, 20], [80, 80]],
  6: [[20, 20], [20, 50], [20, 80], [80, 20], [80, 50], [80, 80]],
};

export function Dice({ value, rolling, onRoll, disabled, color, size = 'normal' }: DiceProps) {
  const isSmall = size === 'small';
  const diceSize = isSmall ? 'w-16 h-16' : 'w-24 h-24';
  const dotSize = isSmall ? 'w-2.5 h-2.5' : 'w-4 h-4';
  const shadowSize = isSmall ? '0 4px 0' : '0 8px 0';
  
  return (
    <div className="flex flex-col items-center gap-2">
      <motion.button
        whileHover={{ scale: disabled ? 1 : 1.05 }}
        whileTap={{ scale: disabled ? 1 : 0.95 }}
        onClick={onRoll}
        disabled={disabled}
        className={cn(
          "relative rounded-xl bg-white shadow-xl flex items-center justify-center cursor-pointer transition-colors border-2",
          diceSize,
          disabled ? "opacity-50 cursor-not-allowed border-gray-200" : `border-${color}-500`
        )}
        style={{
          borderColor: disabled ? undefined : `var(--color-ludo-${color})`,
          boxShadow: disabled ? 'none' : `${shadowSize} var(--color-ludo-${color})`
        }}
        animate={rolling ? {
          rotate: [0, 90, 180, 270, 360],
          scale: [1, 1.1, 1],
        } : {
          rotate: 0,
          scale: 1,
        }}
        transition={rolling ? {
          duration: 0.5,
          repeat: Infinity,
          ease: "linear"
        } : {}}
      >
        <div className="relative w-full h-full">
          {DOT_POSITIONS[value]?.map(([top, left], i) => (
            <div
              key={i}
              className={cn("absolute rounded-full bg-slate-800", dotSize)}
              style={{
                top: `${top}%`,
                left: `${left}%`,
                transform: 'translate(-50%, -50%)'
              }}
            />
          ))}
        </div>
      </motion.button>
      
      {!disabled && !isSmall && (
        <span className="text-sm font-bold uppercase tracking-wider text-muted-foreground animate-pulse">
          Tap to Roll
        </span>
      )}
      
      {!disabled && isSmall && (
        <span className="text-xs font-bold text-muted-foreground animate-pulse">
          Roll
        </span>
      )}
    </div>
  );
}
