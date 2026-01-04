import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { RocketAnimation } from '@/components/landing/RocketAnimation';
import { LearningPathways } from '@/components/landing/LearningPathways';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowRight, BookOpen, Trophy, Award } from 'lucide-react';
import boldpeaksLogo from '@/assets/boldpeaks-logo.png';

type AnimationPhase = 'rocket' | 'pathways' | 'welcome';

export default function LandingPage() {
  const navigate = useNavigate();
  const [phase, setPhase] = useState<AnimationPhase>('rocket');

  const handleRocketComplete = () => {
    setPhase('pathways');
  };

  const handlePathwaysComplete = () => {
    setPhase('welcome');
  };

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

        {phase === 'welcome' && (
          <motion.div
            key="welcome"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
            className="min-h-screen flex flex-col items-center justify-center bg-background p-4"
          >
            <div className="w-full max-w-4xl text-center space-y-8">
              {/* Logo */}
              <motion.div
                initial={{ y: -20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.2 }}
              >
                <img src={boldpeaksLogo} alt="BoldPeaks" className="h-24 mx-auto" />
              </motion.div>

              {/* Welcome Text */}
              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="space-y-4"
              >
                <h1 className="text-4xl md:text-5xl font-heading font-bold text-foreground">
                  Welcome to BoldPeaks Hub
                </h1>
                <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                  Your journey to mastering communication starts here. Explore our programs and unlock your potential.
                </p>
              </motion.div>

              {/* Feature Cards */}
              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.4 }}
                className="grid gap-4 md:grid-cols-3 mt-8"
              >
                <Card className="card-elevated">
                  <CardHeader>
                    <BookOpen className="h-8 w-8 text-primary mb-2" />
                    <CardTitle>Expert Programs</CardTitle>
                    <CardDescription>Learn from industry-leading content</CardDescription>
                  </CardHeader>
                </Card>
                <Card className="card-elevated">
                  <CardHeader>
                    <Trophy className="h-8 w-8 text-accent mb-2" />
                    <CardTitle>Track Progress</CardTitle>
                    <CardDescription>Monitor your learning journey</CardDescription>
                  </CardHeader>
                </Card>
                <Card className="card-elevated">
                  <CardHeader>
                    <Award className="h-8 w-8 text-primary mb-2" />
                    <CardTitle>Earn Certificates</CardTitle>
                    <CardDescription>Get recognized for your achievements</CardDescription>
                  </CardHeader>
                </Card>
              </motion.div>

              {/* CTA Button */}
              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.5 }}
              >
                <Button
                  size="lg"
                  onClick={() => navigate('/dashboard')}
                  className="text-lg px-8"
                >
                  Get Started
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}