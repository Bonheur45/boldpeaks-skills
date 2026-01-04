import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useToast } from '@/hooks/use-toast';
import { Settings as SettingsIcon, User, Loader2 } from 'lucide-react';

export default function Settings() {
  const { toast } = useToast();
  const [fullName, setFullName] = useState('');
  const [email] = useState('user@example.com');
  const [isLoading, setIsLoading] = useState(false);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();

    setIsLoading(true);
    try {
      // Simulate profile update
      await new Promise(resolve => setTimeout(resolve, 500));
      
      toast({
        title: 'Profile updated',
        description: 'Your name has been updated successfully.',
      });
    } catch (error) {
      console.error('Error updating profile:', error);
      toast({
        title: 'Error',
        description: 'Failed to update profile. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getInitials = (name?: string | null, email?: string) => {
    if (name) {
      return name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);
    }
    return email?.charAt(0).toUpperCase() || 'U';
  };

  return (
    <DashboardLayout>
      <div className="p-6 lg:p-8 space-y-8 max-w-2xl mx-auto">
        {/* Header */}
        <div className="space-y-2">
          <h1 className="text-3xl font-heading font-bold text-foreground flex items-center gap-3">
            <SettingsIcon className="h-8 w-8 text-primary" />
            Settings
          </h1>
          <p className="text-muted-foreground">
            Manage your account settings and profile.
          </p>
        </div>

        {/* Profile Card */}
        <Card className="card-elevated">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Profile Information
            </CardTitle>
            <CardDescription>
              Update your personal information.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleUpdateProfile} className="space-y-6">
              {/* Avatar Preview */}
              <div className="flex items-center gap-4">
                <Avatar className="h-16 w-16">
                  <AvatarImage src={undefined} />
                  <AvatarFallback className="bg-primary text-primary-foreground text-xl">
                    {getInitials(fullName, email)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium">{fullName || 'Your Name'}</p>
                  <p className="text-sm text-muted-foreground">{email}</p>
                </div>
              </div>

              {/* Name Input */}
              <div className="space-y-2">
                <Label htmlFor="fullName">Full Name</Label>
                <Input
                  id="fullName"
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Enter your full name"
                />
              </div>

              {/* Email (Read-only) */}
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  disabled
                  className="bg-muted"
                />
                <p className="text-xs text-muted-foreground">
                  Email cannot be changed.
                </p>
              </div>

              <Button type="submit" disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Changes
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}