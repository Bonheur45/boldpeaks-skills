import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { GraduationCap, BookOpen, Trophy, ArrowRight } from 'lucide-react';
import boldpeaksLogo from '@/assets/boldpeaks-logo.png';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card/80 backdrop-blur sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <img src={boldpeaksLogo} alt="BoldPeaks Hub" className="h-10 w-auto" />
          <div className="flex items-center gap-3">
            <Button variant="ghost" asChild>
              <Link to="/auth">Sign In</Link>
            </Button>
            <Button asChild>
              <Link to="/auth">Get Started</Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-20 md:py-32">
        <div className="max-w-3xl mx-auto text-center space-y-6">
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-heading font-bold tracking-tight">
            Elevate Your Learning Journey
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">
            Access world-class communication training programs designed to help you 
            achieve your professional goals and unlock your full potential.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <Button size="lg" asChild className="btn-gold">
              <Link to="/auth">
                Start Learning <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="container mx-auto px-4 py-16 border-t">
        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          <div className="text-center space-y-4 p-6">
            <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
              <BookOpen className="h-7 w-7 text-primary" />
            </div>
            <h3 className="text-xl font-heading font-semibold">Structured Programs</h3>
            <p className="text-muted-foreground">
              Follow carefully designed learning paths with engaging lessons and assessments.
            </p>
          </div>
          <div className="text-center space-y-4 p-6">
            <div className="w-14 h-14 rounded-full bg-accent/20 flex items-center justify-center mx-auto">
              <Trophy className="h-7 w-7 text-accent" />
            </div>
            <h3 className="text-xl font-heading font-semibold">Track Progress</h3>
            <p className="text-muted-foreground">
              Monitor your achievements and compete on the leaderboard with fellow learners.
            </p>
          </div>
          <div className="text-center space-y-4 p-6">
            <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
              <GraduationCap className="h-7 w-7 text-primary" />
            </div>
            <h3 className="text-xl font-heading font-semibold">Earn Certificates</h3>
            <p className="text-muted-foreground">
              Complete programs and receive certificates to showcase your accomplishments.
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-8 mt-12">
        <div className="container mx-auto px-4 text-center text-muted-foreground text-sm">
          © {new Date().getFullYear()} BoldPeaks Communication. All rights reserved.
        </div>
      </footer>
    </div>
  );
}
