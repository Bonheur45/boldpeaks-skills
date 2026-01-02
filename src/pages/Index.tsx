import { Button } from "@/components/ui/button";
import FloatingShape from "@/components/FloatingShape";
import { Heart, Sparkles, Sun, Coffee, Star } from "lucide-react";

const Index = () => {
  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-hero">
      {/* Floating decorative shapes */}
      <FloatingShape 
        variant="blob" 
        size="xl" 
        className="animate-float -top-20 -right-20" 
      />
      <FloatingShape 
        variant="circle" 
        size="lg" 
        className="animate-float-delayed top-1/4 -left-16" 
      />
      <FloatingShape 
        variant="blob" 
        size="lg" 
        className="animate-float bottom-20 right-10" 
      />
      <FloatingShape 
        variant="ring" 
        size="md" 
        className="animate-pulse-warm top-1/3 right-1/4" 
      />
      <FloatingShape 
        variant="ring" 
        size="sm" 
        className="animate-pulse-warm bottom-1/3 left-1/4 animation-delay-400" 
      />

      {/* Main content */}
      <div className="relative z-10 flex min-h-screen flex-col items-center justify-center px-4">
        {/* Waving hand emoji */}
        <div className="mb-6 animate-fade-in-up">
          <span className="inline-block animate-wave text-6xl md:text-7xl">
            👋
          </span>
        </div>

        {/* Main heading */}
        <h1 className="animate-fade-in-up animation-delay-200 mb-4 text-center font-display text-5xl font-bold tracking-tight md:text-7xl lg:text-8xl">
          <span className="text-gradient-warm">You Are</span>
          <br />
          <span className="text-foreground">Welcome</span>
        </h1>

        {/* Subtitle */}
        <p className="animate-fade-in-up animation-delay-400 mb-8 max-w-xl text-center font-body text-lg text-muted-foreground md:text-xl">
          We're so glad you're here. Make yourself at home, 
          explore freely, and know that you belong.
        </p>

        {/* Decorative icons row */}
        <div className="animate-fade-in-up animation-delay-600 mb-10 flex items-center gap-6">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-card shadow-soft">
            <Heart className="h-6 w-6 text-primary" />
          </div>
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-card shadow-soft">
            <Sparkles className="h-6 w-6 text-accent" />
          </div>
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-card shadow-soft">
            <Sun className="h-6 w-6 text-warm-glow" />
          </div>
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-card shadow-soft">
            <Coffee className="h-6 w-6 text-warm-terracotta" />
          </div>
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-card shadow-soft">
            <Star className="h-6 w-6 text-primary" />
          </div>
        </div>

        {/* CTA Buttons */}
        <div className="animate-fade-in-up animation-delay-600 flex flex-col gap-4 sm:flex-row">
          <Button variant="warm" size="xl">
            Get Started
          </Button>
          <Button variant="soft" size="xl">
            Learn More
          </Button>
        </div>

        {/* Bottom decorative text */}
        <p className="animate-fade-in-up animation-delay-600 mt-16 font-body text-sm text-muted-foreground">
          Warmth • Kindness • Community
        </p>
      </div>

      {/* Corner decorations */}
      <div className="absolute bottom-0 left-0 h-32 w-32 rounded-tr-full bg-primary/5" />
      <div className="absolute right-0 top-0 h-48 w-48 rounded-bl-full bg-accent/5" />
    </div>
  );
};

export default Index;
