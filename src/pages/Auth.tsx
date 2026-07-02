import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useIsAdmin } from '@/hooks/useUserRoles';
import { Mail, Lock, User, ArrowLeft, Loader2 } from 'lucide-react';
import boldpeaksLogo from '@/assets/boldpeaks-logo.png';
import { z } from 'zod';

type AuthMode = 'signin' | 'signup' | 'forgot';

// Validation schemas
const emailSchema = z.string().trim().email('Please enter a valid email address').max(255);
const passwordSchema = z.string().min(6, 'Password must be at least 6 characters').max(72);
const fullNameSchema = z.string().trim().min(2, 'Name must be at least 2 characters').max(100);

const Auth: React.FC = () => {
  const [mode, setMode] = useState<AuthMode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  
  const { signIn, signUp, resetPassword, user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const { isAdmin, isLoading: rolesLoading } = useIsAdmin();

  // Redirect if already logged in
  useEffect(() => {
    if (authLoading || !user) return;

    const from = (location.state as { from?: { pathname: string } })?.from?.pathname;
    if (from && from !== '/auth') {
      navigate(from, { replace: true });
      return;
    }

    if (rolesLoading) return;
    navigate(isAdmin ? '/admin' : '/dashboard', { replace: true });
  }, [user, authLoading, navigate, location, rolesLoading, isAdmin]);

  const validateEmail = (email: string): string | null => {
    const result = emailSchema.safeParse(email);
    return result.success ? null : result.error.errors[0].message;
  };

  const validatePassword = (password: string): string | null => {
    const result = passwordSchema.safeParse(password);
    return result.success ? null : result.error.errors[0].message;
  };

  const validateFullName = (name: string): string | null => {
    const result = fullNameSchema.safeParse(name);
    return result.success ? null : result.error.errors[0].message;
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const emailError = validateEmail(email);
    if (emailError) {
      toast({ title: 'Validation Error', description: emailError, variant: 'destructive' });
      return;
    }
    
    if (!password) {
      toast({ title: 'Validation Error', description: 'Please enter your password', variant: 'destructive' });
      return;
    }
    
    setLoading(true);
    const { error } = await signIn(email, password);
    setLoading(false);
    
    if (error) {
      let message = error.message;
      if (message.includes('Invalid login credentials')) {
        message = 'Invalid email or password. Please try again.';
      }
      toast({ title: 'Sign in failed', description: message, variant: 'destructive' });
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const nameError = validateFullName(fullName);
    if (nameError) {
      toast({ title: 'Validation Error', description: nameError, variant: 'destructive' });
      return;
    }
    
    const emailError = validateEmail(email);
    if (emailError) {
      toast({ title: 'Validation Error', description: emailError, variant: 'destructive' });
      return;
    }
    
    const passwordError = validatePassword(password);
    if (passwordError) {
      toast({ title: 'Validation Error', description: passwordError, variant: 'destructive' });
      return;
    }
    
    setLoading(true);
    const { error } = await signUp(email, password, fullName);
    setLoading(false);
    
    if (error) {
      let message = error.message;
      if (message.includes('already registered')) {
        message = 'An account with this email already exists. Please sign in instead.';
      }
      toast({ title: 'Sign up failed', description: message, variant: 'destructive' });
    } else {
      toast({ 
        title: 'Account created!', 
        description: 'Please check your email to confirm your account before signing in.' 
      });
      setMode('signin');
      setPassword('');
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const emailError = validateEmail(email);
    if (emailError) {
      toast({ title: 'Validation Error', description: emailError, variant: 'destructive' });
      return;
    }
    
    setLoading(true);
    const { error } = await resetPassword(email);
    setLoading(false);
    
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ 
        title: 'Reset link sent', 
        description: 'Check your email for password reset instructions.' 
      });
      setMode('signin');
    }
  };

  const renderSignUpForm = () => (
    <form onSubmit={handleSignUp} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="fullName">Full Name</Label>
        <div className="relative">
          <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            id="fullName"
            type="text"
            placeholder="John Doe"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className="pl-10"
            maxLength={100}
            autoComplete="name"
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <div className="relative">
          <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            id="email"
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="pl-10"
            maxLength={255}
            autoComplete="email"
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="password">Password</Label>
        <div className="relative">
          <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            id="password"
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="pl-10"
            maxLength={72}
            autoComplete="new-password"
          />
        </div>
        <p className="text-xs text-muted-foreground">Minimum 6 characters</p>
      </div>
      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Creating account...</> : 'Sign Up'}
      </Button>
      <p className="text-center text-sm text-muted-foreground">
        Already have an account?{' '}
        <button type="button" onClick={() => setMode('signin')} className="text-primary hover:underline font-medium">
          Sign in
        </button>
      </p>
    </form>
  );

  const renderSignInForm = () => (
    <form onSubmit={handleSignIn} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <div className="relative">
          <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            id="email"
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="pl-10"
            maxLength={255}
            autoComplete="email"
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="password">Password</Label>
        <div className="relative">
          <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            id="password"
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="pl-10"
            maxLength={72}
            autoComplete="current-password"
          />
        </div>
      </div>
      <div className="text-right">
        <button
          type="button"
          onClick={() => setMode('forgot')}
          className="text-sm text-primary hover:underline"
        >
          Forgot password?
        </button>
      </div>
      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Signing in...</> : 'Sign In'}
      </Button>
      <p className="text-center text-sm text-muted-foreground">
        Don't have an account?{' '}
        <button type="button" onClick={() => setMode('signup')} className="text-primary hover:underline font-medium">
          Sign up
        </button>
      </p>
    </form>
  );

  const renderForgotForm = () => (
    <form onSubmit={handleResetPassword} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <div className="relative">
          <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            id="email"
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="pl-10"
            maxLength={255}
            autoComplete="email"
          />
        </div>
      </div>
      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Sending...</> : 'Send Reset Link'}
      </Button>
      <button
        type="button"
        onClick={() => setMode('signin')}
        className="flex items-center justify-center gap-2 w-full text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Back to sign in
      </button>
    </form>
  );

  const getTitle = () => {
    switch (mode) {
      case 'signup': return 'Create an account';
      case 'forgot': return 'Reset password';
      default: return 'Welcome back';
    }
  };

  const getDescription = () => {
    switch (mode) {
      case 'signup': return 'Enter your details to get started';
      case 'forgot': return 'Enter your email to receive a reset link';
      default: return 'Sign in to your account';
    }
  };

  // Show loading while checking auth state
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4">
      {/* Logo */}
      <img src={boldpeaksLogo} alt="BoldPeaks" className="h-20 mb-6" />
      
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">{getTitle()}</CardTitle>
          <CardDescription>{getDescription()}</CardDescription>
        </CardHeader>
        <CardContent>
          {mode === 'signup' && renderSignUpForm()}
          {mode === 'signin' && renderSignInForm()}
          {mode === 'forgot' && renderForgotForm()}
        </CardContent>
      </Card>
    </div>
  );
};

export default Auth;
