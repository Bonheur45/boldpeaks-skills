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
      // Query leaderboard directly - it has public read access via RLS
      // Filter by program_id to get all users in this program
      const { data: leaderboardData, error: leaderboardError } = await supabase
        .from('leaderboard')
        .select('user_id, total_points, lessons_completed')
        .eq('program_id', programId);

      if (leaderboardError) throw leaderboardError;

      if (!leaderboardData || leaderboardData.length === 0) {
        setRankings([]);
        setIsLoading(false);
        return;
      }

      // Get unique user IDs from leaderboard
      const userIds = leaderboardData.map(e => e.user_id);

      // Fetch profiles for all users (profiles are publicly readable)
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url')
        .in('id', userIds);

      if (profilesError) throw profilesError;

      // Build entries with profile data
      const entries: LeaderboardEntry[] = leaderboardData.map(entry => {
        const profile = profiles?.find(p => p.id === entry.user_id);
        return {
          user_id: entry.user_id,
          total_score: entry.total_points || 0,
          lessons_completed: entry.lessons_completed || 0,
          rank_position: 0, // Will be calculated after sorting
          profile: profile ? {
            full_name: profile.full_name,
            avatar_url: profile.avatar_url,
          } : null,
        };
      });

      // Sort by total_score descending, then by lessons_completed
      entries.sort((a, b) => {
        if (b.total_score !== a.total_score) {
          return b.total_score - a.total_score;
        }
        return b.lessons_completed - a.lessons_completed;
      });

      // Assign rank positions
      entries.forEach((entry, index) => {
        entry.rank_position = index + 1;
      });

      setRankings(entries);
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
