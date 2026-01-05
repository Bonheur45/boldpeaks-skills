import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { RocketAnimation } from '@/components/landing/RocketAnimation';
import { LearningPathways } from '@/components/landing/LearningPathways';
import Auth from './Auth';

type AnimationPhase = 'rocket' | 'pathways' | 'auth';

export default function LandingPage() {
  const { user, isLoading } = useAuth();
  const navigate = useNavigate();
  const [phase, setPhase] = useState<AnimationPhase>('rocket');

  // Redirect authenticated users directly to dashboard
  useEffect(() => {
    if (!isLoading && user) {
      navigate('/dashboard', { replace: true });
    }
  }, [user, isLoading, navigate]);

  const handleRocketComplete = () => {
    setPhase('pathways');
  };

  const handlePathwaysComplete = () => {
    setPhase('auth');
  };

  // Don't render anything while checking auth
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-primary">
        <motion.div
          className="w-8 h-8 border-4 border-accent border-t-transparent rounded-full"
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
        />
      </div>
    );
  }

  // If user is authenticated, they'll be redirected
  if (user) {
    return null;
  }

  return (
    <div className="min-h-screen relative overflow-hidden">

      {/* Animation Phases */}
      <AnimatePresence mode="wait">
        {phase === 'rocket' && (
          <motion.div
            key="rocket"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            <RocketAnimation onComplete={handleRocketComplete} />
          </motion.div>
        )}

        {phase === 'pathways' && (
          <motion.div
            key="pathways"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            <LearningPathways onComplete={handlePathwaysComplete} />
          </motion.div>
        )}

        {phase === 'auth' && (
          <motion.div
            key="auth"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
          >
            <Auth />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
