import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { markLessonCompleted } from '@/lib/progressUtils';
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  BookOpen,
  FileText,
  Video,
  Image as ImageIcon,
  Loader2,
  PartyPopper
} from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { getEmbedUrl } from '@/lib/videoUtils';
import { QuizBlock } from '@/components/lesson/QuizBlock';
import { ConfettiCelebration } from '@/components/lesson/ConfettiCelebration';

interface Lesson {
  id: string;
  title: string;
  description: string | null;
  program_id: string;
  sort_order: number;
  grouping_id: string | null;
}

interface ContentBlock {
  id: string;
  block_type: string;
  content: any;
  sort_order: number;
}

interface Assessment {
  id: string;
  title: string;
  description: string | null;
}

interface Grouping {
  id: string;
  title: string;
}

export default function LessonViewer() {
  const { programId, lessonId } = useParams<{ programId: string; lessonId: string }>();
  const { toast } = useToast();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [contentBlocks, setContentBlocks] = useState<ContentBlock[]>([]);
  const [assessment, setAssessment] = useState<Assessment | null>(null);
  const [allLessons, setAllLessons] = useState<Lesson[]>([]);
  const [groupings, setGroupings] = useState<Grouping[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCompleting, setIsCompleting] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);
  const [isModuleComplete, setIsModuleComplete] = useState(false);

  useEffect(() => {
    if (lessonId && programId) {
      fetchLessonData();
    }
  }, [lessonId, programId, user?.id]);

  const fetchLessonData = async () => {
    try {
      // Fetch lesson
      const { data: lessonData, error: lessonError } = await supabase
        .from('lessons')
        .select('id, title, description, program_id, sort_order, grouping_id')
        .eq('id', lessonId)
        .single();

      if (lessonError) throw lessonError;
      setLesson(lessonData as Lesson);

      // Fetch all lessons for navigation
      const { data: allLessonsData } = await supabase
        .from('lessons')
        .select('id, title, description, program_id, sort_order, grouping_id')
        .eq('program_id', programId)
        .eq('is_published', true)
        .order('sort_order');

      setAllLessons((allLessonsData as Lesson[]) || []);

      // Fetch groupings
      const { data: groupingsData } = await supabase
        .from('groupings')
        .select('id, title')
        .eq('program_id', programId)
        .order('sort_order');

      setGroupings(groupingsData || []);

      // Fetch content blocks (using secure view that strips quiz answers)
      const { data: blocksData } = await supabase
        .from('content_blocks_student')
        .select('*')
        .eq('lesson_id', lessonId)
        .order('sort_order');

      setContentBlocks(blocksData || []);

      // Fetch assessment if exists
      const { data: assessmentData } = await supabase
        .from('assessments')
        .select('*')
        .eq('lesson_id', lessonId)
        .maybeSingle();

      setAssessment(assessmentData);

      // Check completion status (DB first, local fallback)
      const completionKey = `lesson-complete-${lessonId}`;
      const localComplete = localStorage.getItem(completionKey) === 'true';

      if (user?.id) {
        const { data: progressRow } = await supabase
          .from('lesson_progress')
          .select('completed')
          .eq('user_id', user.id)
          .eq('lesson_id', lessonId)
          .limit(1)
          .maybeSingle();

        const dbComplete = !!progressRow?.completed;

        // Only use DB completion status (don't auto-backfill local progress)
        setIsCompleted(dbComplete);

        // Sync localStorage with DB state
        if (dbComplete) {
          localStorage.setItem(completionKey, 'true');
        }
      } else {
        // For non-logged-in users, use localStorage
        setIsCompleted(localComplete);
      }
    } catch (error) {
      console.error('Error fetching lesson:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const checkModuleComplete = async (params: { currentLesson: Lesson; userId: string }) => {
    const { currentLesson, userId } = params;

    if (!programId) return false;
    if (!currentLesson.grouping_id) return false;

    // Prefer the already-fetched lesson list, but fall back to DB for reliability across devices/sessions.
    let moduleLessonIds = allLessons
      .filter((l) => l.grouping_id === currentLesson.grouping_id)
      .map((l) => l.id);

    if (moduleLessonIds.length === 0) {
      const { data, error } = await supabase
        .from('lessons')
        .select('id')
        .eq('program_id', programId)
        .eq('grouping_id', currentLesson.grouping_id)
        .eq('is_published', true);

      if (error) throw error;
      moduleLessonIds = (data || []).map((r) => r.id);
    }

    // Safety: never treat "no lessons" as "module complete".
    if (moduleLessonIds.length === 0) return false;

    const { data: progressRows, error: progressError } = await supabase
      .from('lesson_progress')
      .select('lesson_id, completed')
      .eq('user_id', userId)
      .in('lesson_id', moduleLessonIds);

    if (progressError) throw progressError;

    const completedIds = new Set(
      (progressRows || [])
        .filter((r) => r.completed)
        .map((r) => r.lesson_id)
    );

    // Include the current lesson we just marked complete.
    completedIds.add(currentLesson.id);

    return moduleLessonIds.every((id) => completedIds.has(id));
  };

  const handleMarkComplete = async () => {
    if (!lesson) return;

    if (!user?.id) {
      toast({
        variant: 'destructive',
        title: 'Sign in required',
        description: 'Please sign in to save your progress.',
      });
      navigate('/auth');
      return;
    }

    setIsCompleting(true);
    try {
      // Store completion locally for instant UI + module completion checks
      localStorage.setItem(`lesson-complete-${lesson.id}`, 'true');

      // Persist completion to backend progress table
      await markLessonCompleted({ userId: user.id, lessonId: lesson.id });

      // Check if this completes the module
      const moduleComplete = await checkModuleComplete({
        currentLesson: lesson,
        userId: user.id,
      });

      setIsCompleted(true);

      if (moduleComplete) {
        setIsModuleComplete(true);
        setShowCelebration(true);

        const grouping = groupings.find((g) => g.id === lesson.grouping_id);
        toast({
          title: '🎉 Module Complete!',
          description: `Congratulations! You have completed "${grouping?.title || 'this module'}"!`,
        });
      } else {
        toast({
          title: 'Lesson completed!',
          description: 'Great job! Keep up the good work.',
        });
      }

      // Navigate to next lesson after a delay
      const currentIndex = allLessons.findIndex((l) => l.id === lessonId);
      if (currentIndex < allLessons.length - 1) {
        const nextLesson = allLessons[currentIndex + 1];
        setTimeout(() => {
          navigate(`/programs/${programId}/lessons/${nextLesson.id}`);
        }, moduleComplete ? 3500 : 1500);
      }
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message,
      });
    } finally {
      setIsCompleting(false);
    }
  };

  const getCurrentIndex = () => allLessons.findIndex((l) => l.id === lessonId);
  const getPrevLesson = () => {
    const idx = getCurrentIndex();
    return idx > 0 ? allLessons[idx - 1] : null;
  };
  const getNextLesson = () => {
    const idx = getCurrentIndex();
    return idx < allLessons.length - 1 ? allLessons[idx + 1] : null;
  };

  const renderContentBlock = (block: ContentBlock) => {
    const content = block.content || {};
    switch (block.block_type) {
      case 'text':
      case 'rich_text':
        return (
          <div className="overflow-x-auto -mx-6 px-6">
            <div 
              className="prose prose-slate dark:prose-invert max-w-none prose-content [&_p]:whitespace-pre-wrap [&_p]:break-words [&_p]:mb-4 [&_table]:border-collapse [&_table]:table-auto [&_table]:min-w-[720px] [&_table]:w-full [&_th]:border [&_th]:border-border [&_th]:p-3 [&_th]:bg-muted [&_th]:font-semibold [&_th]:text-left [&_th]:whitespace-nowrap [&_th:first-child]:min-w-[7rem] [&_td]:border [&_td]:border-border [&_td]:p-3 [&_td]:break-normal [&_td:first-child]:min-w-[7rem] [&_td:first-child]:whitespace-nowrap [&_td:first-child]:font-medium [&_tr:nth-child(even)]:bg-muted/30 [&_span[style]]:!text-inherit"
              dangerouslySetInnerHTML={{ __html: content.html || content.text || '' }}
            />
          </div>
        );
      case 'video':
        return (
          <div className="w-full">
            <div className="relative w-full" style={{ paddingBottom: '56.25%' }}>
              <iframe
                src={getEmbedUrl(content.url)}
                className="absolute top-0 left-0 w-full h-full rounded-lg"
                allowFullScreen
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              />
            </div>
          </div>
        );
      case 'image':
        return (
          <figure className="space-y-2">
            <img
              src={block.content.url}
              alt={block.content.alt || 'Lesson image'}
              className="rounded-lg w-full"
            />
            {block.content.caption && (
              <figcaption className="text-sm text-muted-foreground text-center">
                {block.content.caption}
              </figcaption>
            )}
          </figure>
        );
      case 'quiz':
        return (
          <QuizBlock
            blockId={block.id}
            content={block.content}
            lessonId={lessonId || ''}
            programId={programId || ''}
          />
        );
      default:
        return null;
    }
  };

  const getBlockIcon = (type: string) => {
    switch (type) {
      case 'video':
        return <Video className="h-4 w-4" />;
      case 'image':
        return <ImageIcon className="h-4 w-4" />;
      default:
        return <FileText className="h-4 w-4" />;
    }
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="p-6 lg:p-8 space-y-8">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-12 w-full max-w-2xl" />
          <div className="space-y-6">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-48 w-full" />
            ))}
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (!lesson) {
    return (
      <DashboardLayout>
        <div className="p-6 lg:p-8">
          <Card className="card-elevated">
            <CardContent className="flex flex-col items-center justify-center py-16">
              <BookOpen className="h-16 w-16 text-muted-foreground mb-4" />
              <h3 className="text-xl font-medium mb-2">Lesson not found</h3>
              <Button asChild className="mt-4">
                <Link to={`/programs/${programId}`}>Back to Program</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  const prevLesson = getPrevLesson();
  const nextLesson = getNextLesson();
  const progressPercent = ((getCurrentIndex() + 1) / allLessons.length) * 100;

  return (
    <DashboardLayout>
      <ConfettiCelebration 
        trigger={showCelebration} 
        onComplete={() => setShowCelebration(false)} 
      />
      
      <div className="p-6 lg:p-8 space-y-8 max-w-4xl mx-auto">
        {/* Navigation Header */}
        <div className="flex items-center justify-between gap-4">
          <Button variant="ghost" asChild className="gap-2">
            <Link to={`/programs/${programId}`}>
              <ArrowLeft className="h-4 w-4" />
              Back to Course
            </Link>
          </Button>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">
              Lesson {getCurrentIndex() + 1} of {allLessons.length}
            </span>
            {isCompleted && (
              <Badge className="bg-success text-success-foreground gap-1 font-body">
                <CheckCircle2 className="h-3 w-3" />
                Completed
              </Badge>
            )}
          </div>
        </div>

        {/* Progress Bar */}
        <Progress value={progressPercent} className="h-1" />

        {/* Lesson Header */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Badge variant="outline">
              Lesson
            </Badge>
          </div>
          <h1 className="text-2xl sm:text-3xl font-body font-bold break-words">
            {lesson.title}
          </h1>
          {lesson.description && (
            <p className="text-muted-foreground text-base sm:text-lg break-words font-body">
              {lesson.description}
            </p>
          )}
        </div>

        {/* Content Blocks */}
        <div className="space-y-8">
          {contentBlocks.map((block) => (
            <Card key={block.id} className="card-elevated overflow-hidden">
              <CardContent className="p-6">
                {renderContentBlock(block)}
              </CardContent>
            </Card>
          ))}

          {contentBlocks.length === 0 && !assessment && (
            <Card className="card-elevated">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <BookOpen className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">No content yet</h3>
                <p className="text-muted-foreground text-center">
                  This lesson is still being prepared.
                </p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Assessment Link */}
        {assessment && (
          <Card className="card-elevated border-accent">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-accent" />
                Assessment: {assessment.title}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground mb-4">{assessment.description}</p>
              <Button asChild>
                <Link to={`/programs/${programId}/lessons/${lessonId}/assessment`}>
                  Take Assessment
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Complete Button - Always visible if not completed */}
        {!isCompleted && contentBlocks.length > 0 && (
          <Card className="card-elevated bg-gradient-to-r from-primary/5 to-accent/5 border-primary/20">
            <CardContent className="flex flex-col sm:flex-row items-center justify-between gap-4 py-6">
              <div className="text-center sm:text-left">
                <h3 className="font-semibold text-lg flex items-center gap-2 justify-center sm:justify-start">
                  <PartyPopper className="h-5 w-5 text-accent" />
                  Finished this lesson?
                </h3>
                <p className="text-sm text-muted-foreground">Mark it as complete to track your progress and unlock achievements</p>
              </div>
              <Button 
                onClick={handleMarkComplete} 
                disabled={isCompleting}
                size="lg"
                className="w-full sm:w-auto bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70"
              >
                {isCompleting ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Completing...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="mr-2 h-5 w-5" />
                    Mark as Complete
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Already completed message */}
        {isCompleted && (
          <Card className="card-elevated bg-success/5 border-success/20">
            <CardContent className="flex items-center gap-4 py-4">
              <div className="flex items-center justify-center w-12 h-12 rounded-full bg-success/10">
                <CheckCircle2 className="h-6 w-6 text-success" />
              </div>
              <div>
                <h3 className="font-semibold text-success">Lesson Completed!</h3>
                <p className="text-sm text-muted-foreground">Great job! Continue to the next lesson below.</p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Navigation Buttons */}
        <div className="flex items-center justify-between pt-8 border-t">
          {prevLesson ? (
            <Button variant="outline" asChild>
              <Link to={`/programs/${programId}/lessons/${prevLesson.id}`}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                {prevLesson.title}
              </Link>
            </Button>
          ) : (
            <div />
          )}

          {nextLesson ? (
            <Button asChild>
              <Link to={`/programs/${programId}/lessons/${nextLesson.id}`}>
                {nextLesson.title}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          ) : (
            <Button asChild>
              <Link to={`/programs/${programId}`}>
                Back to Course
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
