import { useEffect, useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { UserCog, Plus, Copy, Trash2, Loader2, CheckCircle2 } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';

interface AdminInvite {
  id: string;
  email: string;
  invite_code: string;
  created_at: string;
  expires_at: string;
  used_at: string | null;
}

export default function AdminInvites() {
  const { toast } = useToast();
  const [invites, setInvites] = useState<AdminInvite[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    fetchInvites();
  }, []);

  const fetchInvites = async () => {
    try {
      const { data, error } = await supabase
        .from('invites')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      // Map invites data to AdminInvite interface
      const mappedInvites: AdminInvite[] = (data || []).map((inv: any) => ({
        id: inv.id,
        email: inv.email,
        invite_code: inv.id.substring(0, 8).toUpperCase(),
        created_at: inv.created_at,
        expires_at: new Date(new Date(inv.created_at).getTime() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        used_at: inv.accepted_at,
      }));
      setInvites(mappedInvites);
    } catch (error) {
      console.error('Error fetching invites:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const generateInviteCode = () => {
    return `ADM-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
  };

  const handleCreateInvite = async () => {
    if (!email.trim()) {
      toast({ variant: 'destructive', title: 'Email is required' });
      return;
    }

    setIsCreating(true);
    try {
      const { error } = await supabase.from('invites').insert({
        email: email.trim().toLowerCase(),
        status: 'pending',
      });

      if (error) throw error;

      toast({ title: 'Invite created successfully' });
      setEmail('');
      setIsDialogOpen(false);
      fetchInvites();
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Error', description: error.message });
    } finally {
      setIsCreating(false);
    }
  };

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast({ title: 'Invite code copied to clipboard' });
  };

  const handleDeleteInvite = async (id: string) => {
    if (!confirm('Delete this invite?')) return;

    try {
      const { error } = await supabase.from('invites').delete().eq('id', id);
      if (error) throw error;
      toast({ title: 'Invite deleted' });
      fetchInvites();
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Error', description: error.message });
    }
  };

  const getStatus = (invite: AdminInvite) => {
    if (invite.used_at) return 'used';
    if (new Date(invite.expires_at) < new Date()) return 'expired';
    return 'active';
  };

  return (
    <DashboardLayout>
      <div className="p-6 lg:p-8 space-y-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="space-y-2">
            <h1 className="text-3xl font-heading font-bold text-foreground flex items-center gap-3">
              <UserCog className="h-8 w-8 text-primary" />
              Admin Invites
            </h1>
            <p className="text-muted-foreground">
              Invite new administrators to the platform.
            </p>
          </div>

          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Create Invite
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create Admin Invite</DialogTitle>
                <DialogDescription>
                  Send an invite to grant admin access to a new user.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="admin@example.com"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleCreateInvite} disabled={isCreating}>
                  {isCreating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Create Invite
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Invites List */}
        <Card className="card-elevated">
          <CardHeader>
            <CardTitle>All Invites</CardTitle>
            <CardDescription>Manage admin invitation codes</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex items-center gap-4 p-4 border rounded-lg">
                    <Skeleton className="h-4 w-48" />
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-6 w-16" />
                  </div>
                ))}
              </div>
            ) : invites.length === 0 ? (
              <div className="text-center py-12">
                <UserCog className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">No invites yet</h3>
                <p className="text-muted-foreground">Create an invite to add new admins.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {invites.map((invite) => {
                  const status = getStatus(invite);
                  
                  return (
                    <div
                      key={invite.id}
                      className="flex items-center gap-4 p-4 border rounded-lg"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{invite.email}</p>
                        <p className="text-sm text-muted-foreground font-mono">
                          {invite.invite_code}
                        </p>
                      </div>
                      <div className="text-right text-sm text-muted-foreground">
                        <p>Expires: {format(new Date(invite.expires_at), 'MMM d, yyyy')}</p>
                      </div>
                      <Badge
                        variant={
                          status === 'active' ? 'default' :
                          status === 'used' ? 'secondary' : 'destructive'
                        }
                      >
                        {status === 'used' && <CheckCircle2 className="mr-1 h-3 w-3" />}
                        {status.charAt(0).toUpperCase() + status.slice(1)}
                      </Badge>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleCopyCode(invite.invite_code)}
                          disabled={status !== 'active'}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteInvite(invite.id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
