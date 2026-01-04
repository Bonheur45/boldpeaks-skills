import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface LeaderboardEntry {
  user_id: string;
  total_score: number;
  lessons_completed: number;
  profile: {
    full_name: string | null;
    avatar_url: string | null;
  } | null;
}

export function useLeaderboardRealtime(programId: string, userId?: string) {
  const [rankings, setRankings] = useState<LeaderboardEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchAndCalculateRankings = useCallback(async () => {
    if (!programId) return;
    
    setIsLoading(true);
    try {
      // Get all enrollments for the program
      const { data: enrollments, error: enrollError } = await supabase
        .from('enrollments')
        .select('user_id')
        .eq('program_id', programId)
        .eq('status', 'active');

      if (enrollError) throw enrollError;

      if (!enrollments || enrollments.length === 0) {
        setRankings([]);
        return;
      }

      const userIds = enrollments.map(e => e.user_id);

      // Get lesson progress for all enrolled users
      const { data: lessons } = await supabase
        .from('lessons')
        .select('id')
        .eq('program_id', programId)
        .eq('is_published', true);

      const lessonIds = lessons?.map(l => l.id) || [];

      // Get all progress entries
      const { data: progressData } = await supabase
        .from('lesson_progress')
        .select('user_id, lesson_id, completed_at')
        .in('user_id', userIds)
        .in('lesson_id', lessonIds)
        .not('completed_at', 'is', null);

      // Get assessment scores
      const { data: assessmentData } = await supabase
        .from('assessment_submissions')
        .select(`
          user_id,
          score
        `)
        .in('user_id', userIds)
        .not('score', 'is', null);

      // Get profiles
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url')
        .in('id', userIds);

      // Calculate scores for each user
      const userScores: Map<string, { score: number; lessons: number }> = new Map();

      // Count completed lessons
      progressData?.forEach(p => {
        const current = userScores.get(p.user_id) || { score: 0, lessons: 0 };
        current.lessons += 1;
        current.score += 10; // 10 points per lesson completion
        userScores.set(p.user_id, current);
      });

      // Add assessment scores
      assessmentData?.forEach((s: any) => {
        const current = userScores.get(s.user_id) || { score: 0, lessons: 0 };
        current.score += (s.score || 0);
        userScores.set(s.user_id, current);
      });

      // Build rankings - only include users with actual progress
      const rankingsData: LeaderboardEntry[] = userIds
        .filter(userId => {
          const scores = userScores.get(userId);
          return scores && (scores.score > 0 || scores.lessons > 0);
        })
        .map(userId => {
          const profile = profiles?.find(p => p.id === userId);
          const scores = userScores.get(userId) || { score: 0, lessons: 0 };
          
          return {
            user_id: userId,
            total_score: scores.score,
            lessons_completed: scores.lessons,
            profile: profile ? {
              full_name: profile.full_name,
              avatar_url: profile.avatar_url,
            } : null,
          };
        });

      // Sort by score, then by lessons completed
      rankingsData.sort((a, b) => {
        if (b.total_score !== a.total_score) return b.total_score - a.total_score;
        return b.lessons_completed - a.lessons_completed;
      });

      setRankings(rankingsData);
    } catch (error) {
      console.error('Error fetching leaderboard:', error);
    } finally {
      setIsLoading(false);
    }
  }, [programId]);

  useEffect(() => {
    fetchAndCalculateRankings();

    // Subscribe to lesson_progress changes
    const progressChannel = supabase
      .channel('leaderboard-progress')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'lesson_progress',
        },
        () => {
          fetchAndCalculateRankings();
        }
      )
      .subscribe();

    // Subscribe to assessment_submissions changes
    const assessmentChannel = supabase
      .channel('leaderboard-assessments')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'assessment_submissions',
        },
        () => {
          fetchAndCalculateRankings();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(progressChannel);
      supabase.removeChannel(assessmentChannel);
    };
  }, [fetchAndCalculateRankings]);

  const getUserRank = useCallback(() => {
    if (!userId) return null;
    const index = rankings.findIndex(r => r.user_id === userId);
    if (index === -1) return null;
    return {
      ...rankings[index],
      rank_position: index + 1,
    };
  }, [rankings, userId]);

  return {
    rankings: rankings.map((r, i) => ({ ...r, rank_position: i + 1 })),
    isLoading,
    userRank: getUserRank(),
    refresh: fetchAndCalculateRankings,
  };
}
