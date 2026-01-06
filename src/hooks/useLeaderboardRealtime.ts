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
      // Step 1: Get all enrolled users for this program
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

      const enrolledUserIds = enrollments.map(e => e.user_id);

      // Step 2: Get leaderboard entries for this specific program
      const { data: leaderboardData, error: leaderboardError } = await supabase
        .from('leaderboard')
        .select('user_id, total_points, lessons_completed')
        .eq('program_id', programId)
        .in('user_id', enrolledUserIds);

      if (leaderboardError) throw leaderboardError;

      // Step 3: Get all profiles for enrolled users
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url')
        .in('id', enrolledUserIds);

      if (profilesError) throw profilesError;

      // Step 4: Create a map of leaderboard data by user_id
      const leaderboardMap = new Map<string, { total_points: number; lessons_completed: number }>();
      (leaderboardData || []).forEach(entry => {
        leaderboardMap.set(entry.user_id, {
          total_points: entry.total_points || 0,
          lessons_completed: entry.lessons_completed || 0,
        });
      });

      // Step 5: Create entries for ALL enrolled users
      const allEntries: LeaderboardEntry[] = enrolledUserIds.map(uid => {
        const leaderboardEntry = leaderboardMap.get(uid);
        const profile = profiles?.find(p => p.id === uid);
        
        return {
          user_id: uid,
          total_score: leaderboardEntry?.total_points || 0,
          lessons_completed: leaderboardEntry?.lessons_completed || 0,
          rank_position: 0, // Will be calculated after sorting
          profile: profile ? {
            full_name: profile.full_name,
            avatar_url: profile.avatar_url,
          } : null,
        };
      });

      // Step 6: Sort by total_score descending, then by lessons_completed
      allEntries.sort((a, b) => {
        if (b.total_score !== a.total_score) {
          return b.total_score - a.total_score;
        }
        return b.lessons_completed - a.lessons_completed;
      });

      // Step 7: Assign rank positions
      allEntries.forEach((entry, index) => {
        entry.rank_position = index + 1;
      });

      setRankings(allEntries);
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
