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
import { renderInlineFormatted } from '@/lib/inlineFormat';

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

  // Always start at the top when opening a lesson
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  }, [lessonId]);

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
      case 'video': {
        const embedUrl = getEmbedUrl(content.url);
        const isDrive = typeof embedUrl === 'string' && embedUrl.includes('drive.google.com');
        return (
          <div className="space-y-3">
            {content.title && (
              <h3 className="font-semibold">{content.title}</h3>
            )}
            <div
              className="relative w-full overflow-hidden bg-black rounded-lg"
              style={
                isDrive
                  ? { paddingBottom: 'calc(56.25% + 44px)' }
                  : { aspectRatio: '16 / 9' }
              }
            >
              <iframe
                src={embedUrl}
                title={lesson?.title || 'Lesson video'}
                className="absolute inset-0 h-full w-full border-0"
                allowFullScreen
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              />
            </div>
          </div>
        );
      }

      case 'image':
        return (
          <figure className="space-y-3">
            {block.content.title && (
              <h3 className="font-semibold">{block.content.title}</h3>
            )}
            <img
              src={block.content.url}
              alt={block.content.alt || 'Lesson image'}
              className="rounded-lg w-full"
            />
            {block.content.caption && (
              <figcaption className="lesson-meta text-muted-foreground text-center">
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
      case 'hero':
        return (
          <div className="rounded-3xl p-8 text-center border border-[#0a1f44]" style={{ backgroundColor: '#0a1f44', color: '#ffffff' }}>
            {block.content?.title && (
              <h1 className="mb-3 text-white">
                {block.content.title}
              </h1>
            )}
            {block.content?.subtitle && (
              <p className="mb-4 text-white/80">
                {block.content.subtitle}
              </p>
            )}
            {block.content?.description && (
              <p className="max-w-3xl mx-auto text-white/70">
                {renderInlineFormatted(block.content.description)}
              </p>
            )}
          </div>
        );
      case 'callout':
        return (
          <div className={`rounded-2xl border p-5 ${
            block.content?.style === 'warning'
              ? 'border-orange-300/40 bg-orange-50 text-orange-950'
              : block.content?.style === 'definition'
              ? 'border-emerald-300/40 bg-emerald-50 text-emerald-950'
              : block.content?.style === 'keypoint'
              ? 'border-slate-300/40 bg-slate-100 text-slate-950'
              : 'border-sky-300/40 bg-sky-50 text-slate-950'
          }`}>
            <div className="lesson-meta mb-2 flex items-center gap-2 font-semibold uppercase tracking-[0.12em]">
              {block.content?.style === 'warning'
                ? '⚠️ Warning'
                : block.content?.style === 'definition'
                ? '📘 Definition'
                : block.content?.style === 'keypoint'
                ? '📌 Key Point'
                : '💡 Insight'}
            </div>
            <div className="whitespace-pre-wrap">
              {renderInlineFormatted(block.content?.text)}
            </div>
          </div>
        );
      case 'reflection':
        return (
          <div className="rounded-2xl border border-border bg-muted/5 p-5">
            <h3 className="mb-4 font-semibold">Reflection</h3>
            <div className="text-muted-foreground mb-4">{renderInlineFormatted(block.content?.prompt)}</div>
            <textarea
              className="w-full min-h-[160px] rounded-xl border border-border bg-background p-4 text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder={block.content?.placeholder || 'Write your reflection here...'}
            />
          </div>
        );
      case 'activity':
        return (
          <div className="rounded-2xl border border-border bg-slate-50 p-5">
            {block.content?.title && (
              <h3 className="font-semibold mb-3">{block.content.title}</h3>
            )}
            {block.content?.description && (
              <div className="text-muted-foreground mb-4 whitespace-pre-wrap">
                {renderInlineFormatted(block.content.description)}
              </div>
            )}
            {block.content?.instructions && (
              <div className="mb-3 whitespace-pre-wrap text-foreground">
                {renderInlineFormatted(block.content.instructions)}
              </div>
            )}
            {block.content?.externalLink && (
              <a
                className="text-primary font-medium"
                href={block.content.externalLink}
                target="_blank"
                rel="noreferrer"
              >
                Open activity resource
              </a>
            )}
          </div>
        );
      case 'summary': {
        const summaryText = block.content?.text || block.content?.html || '';
        return (
          <div className="prose prose-slate dark:prose-invert max-w-none">
            <h3 className="font-semibold mb-3">Summary</h3>
            {block.content?.html ? (
              <div className="whitespace-pre-wrap [&_p]:my-2 [&_ul]:list-disc [&_ul]:pl-6 [&_ol]:list-decimal [&_ol]:pl-6 [&_li]:my-1 [&_br]:block" dangerouslySetInnerHTML={{ __html: block.content.html }} />
            ) : (
              <div className="whitespace-pre-wrap text-slate-700">{summaryText}</div>
            )}
          </div>
        );
      }
      case 'image_grid': {
        const images = block.content?.images || [];
        const getGridLayout = () => {
          const count = images.length;
          if (count === 0) return '';
          if (count === 1) return 'grid-cols-1';
          if (count === 2) return 'grid-cols-2';
          if (count === 3) return 'grid-cols-2 grid-rows-2';
          if (count === 4) return 'grid-cols-2 grid-rows-2';
          if (count === 5 || count === 6) return 'grid-cols-3 grid-rows-2';
          return 'grid-cols-3';
        };

        const getImageSpan = (index: number, count: number) => {
          // Special handling for 3 images: first one spans 2 rows
          if (count === 3 && index === 0) return 'row-span-2';
          return '';
        };

        return (
          <div className="space-y-4">
            {block.content.title && (
              <h3 className="font-semibold">{block.content.title}</h3>
            )}
            <div className={`grid gap-4 ${getGridLayout()}`}>
              {images.map((image: any, index: number) => (
                <figure key={image.id || index} className={`overflow-hidden rounded-lg border border-border bg-slate-950/5 ${getImageSpan(index, images.length)}`}>
                  <img 
                    src={image.url} 
                    alt={image.alt || image.caption || `Grid image ${index + 1}`} 
                    className="h-full w-full object-cover"
                  />
                  {(image.caption || image.alt) && (
                    <figcaption className="p-3 text-sm text-muted-foreground bg-white">
                      {image.caption || image.alt}
                    </figcaption>
                  )}
                </figure>
              ))}
            </div>
          </div>
        );
      }
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
      
      <div className="lesson-content p-6 lg:p-8 space-y-8 max-w-3xl mx-auto bg-gradient-to-b from-slate-100 to-slate-50 min-h-screen text-slate-900">
        {/* Navigation Header */}
        <div className="flex items-center justify-between gap-2">
          <Button variant="ghost" onClick={() => navigate(-1)} className="gap-2 shrink-0 px-2 sm:px-4">
            <ArrowLeft className="h-4 w-4" />
            <span className="hidden sm:inline">Back</span>
            <span className="sm:hidden">Back</span>
          </Button>
          <div className="flex items-center gap-2 shrink-0">
            <span className="lesson-meta text-muted-foreground whitespace-nowrap">
              {getCurrentIndex() + 1}/{allLessons.length}
            </span>
            {isCompleted && (
              <Badge className="bg-success text-success-foreground gap-1 shrink-0 lesson-meta">
                <CheckCircle2 className="h-3 w-3" />
                <span className="hidden sm:inline">Completed</span>
              </Badge>
            )}
          </div>
        </div>

        {/* Progress Bar */}
        <Progress value={progressPercent} className="h-1" />

        {/* Lesson Header */}
        <header className="space-y-3">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="lesson-meta">
              Lesson
            </Badge>
          </div>
          <h1 className="break-words">
            {lesson.title}
          </h1>
          {lesson.description && (
            <p className="text-muted-foreground break-words">
              {lesson.description}
            </p>
          )}
        </header>

        {/* Content Blocks */}
        <div className="space-y-10">
          {contentBlocks.map((block) => (
            <section key={block.id} className="space-y-6">
              {renderContentBlock(block)}
            </section>
          ))}

          {contentBlocks.length === 0 && !assessment && (
            <div className="rounded-3xl border border-border bg-slate-50 p-10 text-center">
              <BookOpen className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No content yet</h3>
              <p className="text-muted-foreground">
                This lesson is still being prepared.
              </p>
            </div>
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
              <Link to={`/programs/${programId}/lessons/${prevLesson.id}`} className="no-prose-link no-underline">
                <ArrowLeft className="mr-2 h-4 w-4" />
                {prevLesson.title}
              </Link>
            </Button>
          ) : (
            <div />
          )}

          {nextLesson ? (
            <Button asChild>
              <Link to={`/programs/${programId}/lessons/${nextLesson.id}`} className="no-prose-link no-underline">
                {nextLesson.title}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          ) : (
            <Button asChild>
              <Link to={`/programs/${programId}`} className="no-prose-link no-underline">
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
