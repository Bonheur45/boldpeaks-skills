import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import boldpeaksLogo from '@/assets/boldpeaks-logo.png';

// TODO: Rebuild authentication page with signup/signin forms

const Auth: React.FC = () => {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4">
      {/* Logo */}
      <img src={boldpeaksLogo} alt="BoldPeaks" className="h-20 mb-6" />
      
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Authentication Disabled</CardTitle>
          <CardDescription>
            The authentication system is being rebuilt. Please check back soon.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* TODO: Add signin/signup forms here */}
          <p className="text-center text-muted-foreground text-sm">
            This page will be rebuilt with a fresh authentication implementation.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default Auth;
