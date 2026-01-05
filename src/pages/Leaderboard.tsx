import { useEffect, useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Trophy, Medal, Crown, TrendingUp, Zap } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { useLeaderboardRealtime } from '@/hooks/useLeaderboardRealtime';

interface Program {
  id: string;
  title: string;
}

export default function Leaderboard() {
  const { user } = useAuth();
  const [programs, setPrograms] = useState<Program[]>([]);
  const [selectedProgram, setSelectedProgram] = useState<string>('');
  const [isLoadingPrograms, setIsLoadingPrograms] = useState(true);

  const { rankings, isLoading, userRank, refresh } = useLeaderboardRealtime(selectedProgram, user?.id);

  useEffect(() => {
    fetchPrograms();
  }, [user]);

  const fetchPrograms = async () => {
    if (!user) return;
    
    setIsLoadingPrograms(true);
    try {
      const { data, error } = await supabase
        .from('enrollments')
        .select('program_id, programs(id, title)')
        .eq('user_id', user.id)
        .eq('status', 'active');

      if (error) throw error;

      const uniquePrograms = (data || [])
        .map((e: any) => e.programs)
        .filter((p: Program | null): p is Program => p !== null);

      setPrograms(uniquePrograms);
      if (uniquePrograms.length > 0) {
        setSelectedProgram(uniquePrograms[0].id);
      }
    } catch (error) {
      console.error('Error fetching programs:', error);
    } finally {
      setIsLoadingPrograms(false);
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
    return email?.charAt(0).toUpperCase() || '?';
  };

  const getRankIcon = (position: number) => {
    switch (position) {
      case 1:
        return <Crown className="h-6 w-6 text-yellow-500" />;
      case 2:
        return <Medal className="h-6 w-6 text-gray-400" />;
      case 3:
        return <Medal className="h-6 w-6 text-amber-600" />;
      default:
        return <span className="text-lg font-bold text-muted-foreground">#{position}</span>;
    }
  };

  const getRankBackground = (position: number) => {
    switch (position) {
      case 1:
        return 'bg-gradient-to-r from-yellow-500/10 to-yellow-600/5 border-yellow-500/20';
      case 2:
        return 'bg-gradient-to-r from-gray-400/10 to-gray-500/5 border-gray-400/20';
      case 3:
        return 'bg-gradient-to-r from-amber-600/10 to-amber-700/5 border-amber-600/20';
      default:
        return '';
    }
  };

  return (
    <DashboardLayout>
      <div className="p-6 lg:p-8 space-y-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="space-y-2">
            <h1 className="text-3xl font-heading font-bold text-foreground flex items-center gap-3">
              <Trophy className="h-8 w-8 text-accent" />
              Live Leaderboard
            </h1>
            <p className="text-muted-foreground flex items-center gap-2">
              <Zap className="h-4 w-4 text-accent" />
              Rankings update instantly as students complete lessons and assessments.
            </p>
          </div>

          {programs.length > 0 && (
            <Select value={selectedProgram} onValueChange={setSelectedProgram}>
              <SelectTrigger className="w-64">
                <SelectValue placeholder="Select a program" />
              </SelectTrigger>
              <SelectContent>
                {programs.map((program) => (
                  <SelectItem key={program.id} value={program.id}>
                    {program.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>

        {/* User's Rank Card */}
        {userRank && (
          <Card className="card-elevated border-primary/20 bg-primary/5">
            <CardContent className="flex items-center gap-4 py-6">
              <div className="flex items-center justify-center w-16 h-16 rounded-full bg-primary/10">
                {getRankIcon(userRank.rank_position)}
              </div>
              <div className="flex-1">
                <p className="text-sm text-muted-foreground">Your Current Rank</p>
                <p className="text-2xl font-bold">#{userRank.rank_position}</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-muted-foreground">Score</p>
                <p className="text-xl font-semibold">{userRank.total_score} pts</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-muted-foreground">Lessons</p>
                <p className="text-xl font-semibold">{userRank.lessons_completed}</p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Rankings List */}
        <Card className="card-elevated">
          <CardHeader>
            <CardTitle>Top Students</CardTitle>
            <CardDescription>
              Rankings update in real-time based on lesson completions and assessment scores
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading || isLoadingPrograms ? (
              <div className="space-y-4">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="flex items-center gap-4 p-4">
                    <Skeleton className="h-12 w-12 rounded-full" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-3 w-24" />
                    </div>
                    <Skeleton className="h-6 w-16" />
                  </div>
                ))}
              </div>
            ) : rankings.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12">
                <TrendingUp className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">No rankings yet</h3>
                <p className="text-muted-foreground text-center">
                  Complete lessons to appear on the leaderboard.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {rankings.map((entry) => {
                  const isCurrentUser = entry.user_id === user?.id;
                  
                  return (
                    <div
                      key={entry.user_id}
                      className={`flex items-center gap-4 p-4 rounded-lg border transition-colors ${
                        isCurrentUser 
                          ? 'bg-primary/5 border-primary/20' 
                          : getRankBackground(entry.rank_position) || 'hover:bg-muted/50'
                      }`}
                    >
                      <div className="w-12 flex justify-center">
                        {getRankIcon(entry.rank_position)}
                      </div>
                      
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={entry.profile?.avatar_url || undefined} />
                        <AvatarFallback className="bg-primary/10 text-primary">
                          {getInitials(entry.profile?.full_name, entry.profile?.email)}
                        </AvatarFallback>
                      </Avatar>

                      <div className="flex-1">
                        <p className="font-medium flex items-center gap-2">
                          {entry.profile?.full_name || entry.profile?.email?.split('@')[0] || 'Anonymous'}
                          {isCurrentUser && (
                            <Badge variant="secondary" className="text-xs">You</Badge>
                          )}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {entry.lessons_completed} lessons completed
                        </p>
                      </div>

                      <div className="text-right">
                        <p className="font-semibold">{entry.total_score} pts</p>
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
