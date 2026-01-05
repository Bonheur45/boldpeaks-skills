import { motion } from 'framer-motion';
import { Code, MessageSquare, Lightbulb } from 'lucide-react';

interface LearningPathwaysProps {
  onComplete: () => void;
}

const pathways = [
  {
    id: 1,
    title: 'Digital Lab',
    description: 'Digital careers, coding, no-code solutions, AI learning.',
    icon: Code,
    color: 'hsl(199, 89%, 48%)',
    bgColor: 'bg-info/10',
    delay: 0,
  },
  {
    id: 2,
    title: 'Expressive Communication',
    description: 'Public speaking, strategic communication, world-class English, business English.',
    icon: MessageSquare,
    color: 'hsl(42, 85%, 55%)',
    bgColor: 'bg-accent/10',
    delay: 0.3,
  },
  {
    id: 3,
    title: 'Project Design',
    description: 'Transform ideas into actionable, impactful projects.',
    icon: Lightbulb,
    color: 'hsl(142, 71%, 45%)',
    bgColor: 'bg-success/10',
    delay: 0.6,
  },
];

export const LearningPathways = ({ onComplete }: LearningPathwaysProps) => {
  return (
    <motion.div
      className="flex flex-col items-center justify-center min-h-screen bg-primary px-4 py-8"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
    >
      {/* Title */}
      <motion.h2
        className="text-2xl md:text-3xl font-body font-semibold text-white text-center mb-8"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        Choose Your Learning Path
      </motion.h2>

      {/* Cards container */}
      <div className="flex flex-col md:flex-row gap-6 max-w-5xl w-full justify-center items-stretch">
        {pathways.map((pathway, index) => {
          const Icon = pathway.icon;
          return (
            <motion.div
              key={pathway.id}
              className="flex-1 max-w-sm"
              initial={{ opacity: 0, y: -100 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                duration: 2,
                delay: pathway.delay + 0.3,
                ease: [0.25, 0.46, 0.45, 0.94],
              }}
              onAnimationComplete={index === pathways.length - 1 ? () => {
                setTimeout(onComplete, 2000);
              } : undefined}
            >
              <div className="bg-white/95 backdrop-blur-sm rounded-xl p-6 h-full shadow-2xl border border-white/20 hover:scale-105 transition-transform duration-300">
                <div
                  className={`w-14 h-14 rounded-xl ${pathway.bgColor} flex items-center justify-center mb-4`}
                >
                  <Icon
                    size={28}
                    style={{ color: pathway.color }}
                  />
                </div>
                <h3 className="text-xl font-body font-semibold text-primary mb-2">
                  {pathway.title}
                </h3>
                <p className="text-muted-foreground font-body text-sm leading-relaxed">
                  {pathway.description}
                </p>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* CTA Text */}
      <motion.p
        className="text-white/90 font-body text-lg mt-8 text-center"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.2, duration: 0.5 }}
      >
        Choose a path… or enroll in all!
      </motion.p>
    </motion.div>
  );
};
