import { useEffect } from 'react';
import { motion } from 'framer-motion';

interface RocketAnimationProps {
  onComplete: () => void;
}

export const RocketAnimation = ({ onComplete }: RocketAnimationProps) => {
  useEffect(() => {
    // Make the rocket phase deterministic (avoids premature phase switches)
    const t = window.setTimeout(() => onComplete(), 4200);
    return () => window.clearTimeout(t);
  }, [onComplete]);

  return (
    <motion.div
      className="flex flex-col items-center justify-center min-h-screen bg-primary relative overflow-hidden"
      initial={{ opacity: 1 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      {/* Stars background */}
      <div className="absolute inset-0">
        {[...Array(50)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-1 h-1 bg-white rounded-full"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
            }}
            animate={{
              opacity: [0.2, 1, 0.2],
              scale: [0.8, 1.2, 0.8],
            }}
            transition={{
              duration: 1.5 + Math.random() * 2,
              repeat: Infinity,
              delay: Math.random() * 2,
            }}
          />
        ))}
      </div>

      {/* Rocket */}
      <motion.div
        className="relative z-10"
        initial={{ y: 300, opacity: 0 }}
        animate={{ y: -400, opacity: [0, 1, 1, 0] }}
        transition={{
          duration: 4,
          ease: [0.25, 0.46, 0.45, 0.94],
          times: [0, 0.08, 0.85, 1],
        }}
      >
        {/* Rocket body */}
        <svg
          width="80"
          height="120"
          viewBox="0 0 80 120"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="drop-shadow-2xl"
        >
          {/* Main body */}
          <path
            d="M40 0C40 0 60 30 60 70C60 90 52 100 40 100C28 100 20 90 20 70C20 30 40 0 40 0Z"
            fill="hsl(220, 65%, 25%)"
          />
          {/* Highlight */}
          <path
            d="M40 5C40 5 50 30 50 65C50 80 46 88 40 88"
            stroke="hsl(220, 65%, 35%)"
            strokeWidth="6"
            strokeLinecap="round"
            fill="none"
          />
          {/* Window */}
          <circle
            cx="40"
            cy="45"
            r="12"
            fill="hsl(199, 89%, 48%)"
            stroke="hsl(42, 85%, 55%)"
            strokeWidth="3"
          />
          <circle cx="40" cy="45" r="6" fill="hsl(199, 89%, 70%)" />
          {/* Left fin */}
          <path
            d="M20 70L5 95L20 90Z"
            fill="hsl(42, 85%, 55%)"
          />
          {/* Right fin */}
          <path
            d="M60 70L75 95L60 90Z"
            fill="hsl(42, 85%, 55%)"
          />
          {/* Bottom fin */}
          <path
            d="M30 95L40 120L50 95Z"
            fill="hsl(42, 85%, 55%)"
          />
        </svg>

        {/* Flame */}
        <motion.div
          className="absolute -bottom-16 left-1/2 -translate-x-1/2"
          animate={{
            scaleY: [1, 1.3, 1],
            opacity: [0.8, 1, 0.8],
          }}
          transition={{
            duration: 0.15,
            repeat: Infinity,
          }}
        >
          <svg width="40" height="60" viewBox="0 0 40 60" fill="none">
            <ellipse cx="20" cy="10" rx="12" ry="20" fill="hsl(42, 85%, 55%)" />
            <ellipse cx="20" cy="15" rx="8" ry="25" fill="hsl(25, 95%, 53%)" />
            <ellipse cx="20" cy="20" rx="4" ry="30" fill="hsl(0, 0%, 95%)" />
          </svg>
        </motion.div>
      </motion.div>

      {/* Tagline */}
      <motion.h1
        className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 text-xl md:text-2xl font-body font-semibold text-white text-center px-4 z-20"
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: [0, 1, 1, 0], scale: [0.8, 1, 1, 1] }}
        transition={{
          duration: 4,
          times: [0, 0.15, 0.8, 1],
        }}
      >
        Skyrocket your potential with BoldPeaks Hub
      </motion.h1>
    </motion.div>
  );
};
