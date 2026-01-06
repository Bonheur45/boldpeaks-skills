import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface LeaderboardEntry {
  user_id: string;
  total_score: number;
  lessons_completed: number;
  rank_position: number;
  profile: {
    full_name: string | null;
    avatar_url: string | null;
  } | null;
}

export function useLeaderboardRealtime(programId: string, userId?: string) {
  const [rankings, setRankings] = useState<LeaderboardEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchRankings = useCallback(async () => {
    if (!programId) return;
    
    setIsLoading(true);
    try {
      // Get leaderboard entries for enrolled users in this program
      // The leaderboard table is publicly readable, so all users can see rankings
      const { data: enrollments, error: enrollError } = await supabase
        .from('enrollments')
        .select('user_id')
        .eq('program_id', programId)
        .eq('status', 'active');

      if (enrollError) throw enrollError;

      if (!enrollments || enrollments.length === 0) {
        setRankings([]);
        setIsLoading(false);
        return;
      }

      const userIds = enrollments.map(e => e.user_id);

      // Get leaderboard data - this table is publicly readable
      const { data: leaderboardData, error: leaderboardError } = await supabase
        .from('leaderboard')
        .select(`
          user_id,
          total_points,
          lessons_completed,
          profiles!leaderboard_user_id_fkey(full_name, avatar_url)
        `)
        .in('user_id', userIds)
        .order('total_points', { ascending: false });

      if (leaderboardError) {
        // Fallback: query without the join if foreign key doesn't exist
        const { data: fallbackData, error: fallbackError } = await supabase
          .from('leaderboard')
          .select('user_id, total_points, lessons_completed')
          .in('user_id', userIds)
          .order('total_points', { ascending: false });

        if (fallbackError) throw fallbackError;

        // Get profiles separately
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, full_name, avatar_url')
          .in('id', userIds);

        const rankingsData: LeaderboardEntry[] = (fallbackData || [])
          .filter(entry => entry.total_points > 0 || entry.lessons_completed > 0)
          .map((entry, index) => {
            const profile = profiles?.find(p => p.id === entry.user_id);
            return {
              user_id: entry.user_id,
              total_score: entry.total_points || 0,
              lessons_completed: entry.lessons_completed || 0,
              rank_position: index + 1,
              profile: profile ? {
                full_name: profile.full_name,
                avatar_url: profile.avatar_url,
              } : null,
            };
          });

        setRankings(rankingsData);
        setIsLoading(false);
        return;
      }

      // Process leaderboard data with joined profiles
      const rankingsData: LeaderboardEntry[] = (leaderboardData || [])
        .filter(entry => (entry.total_points || 0) > 0 || (entry.lessons_completed || 0) > 0)
        .map((entry: any, index) => ({
          user_id: entry.user_id,
          total_score: entry.total_points || 0,
          lessons_completed: entry.lessons_completed || 0,
          rank_position: index + 1,
          profile: entry.profiles ? {
            full_name: entry.profiles.full_name,
            avatar_url: entry.profiles.avatar_url,
          } : null,
        }));

      setRankings(rankingsData);
    } catch (error) {
      console.error('Error fetching leaderboard:', error);
    } finally {
      setIsLoading(false);
    }
  }, [programId]);

  useEffect(() => {
    fetchRankings();

    // Subscribe to leaderboard changes for real-time updates
    const leaderboardChannel = supabase
      .channel('leaderboard-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'leaderboard',
        },
        () => {
          fetchRankings();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(leaderboardChannel);
    };
  }, [fetchRankings]);

  const getUserRank = useCallback(() => {
    if (!userId) return null;
    const entry = rankings.find(r => r.user_id === userId);
    if (!entry) return null;
    return entry;
  }, [rankings, userId]);

  return {
    rankings,
    isLoading,
    userRank: getUserRank(),
    refresh: fetchRankings,
  };
}
