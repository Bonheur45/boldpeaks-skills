import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import {
  ArrowLeft,
  BookOpen,
  CheckCircle2,
  Trophy
} from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { LessonCard } from '@/components/lesson/LessonCard';

interface Grouping {
  id: string;
  title: string;
  description: string | null;
  sort_order: number;
}

interface Lesson {
  id: string;
  title: string;
  description: string | null;
  grouping_id: string | null;
  sort_order: number;
  hasVideo?: boolean;
}

interface LessonProgress {
  lesson_id: string;
  completed: boolean | null;
}

interface Program {
  id: string;
  title: string;
  description: string | null;
  cover_image: string | null;
}

export default function ProgramDetail() {
  const { programId } = useParams<{ programId: string }>();
  const { user } = useAuth();
  const [program, setProgram] = useState<Program | null>(null);
  const [groupings, setGroupings] = useState<Grouping[]>([]);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [progress, setProgress] = useState<Record<string, LessonProgress>>({});
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (programId) {
      fetchProgramData();
    }
  }, [programId, user?.id]);

  const fetchProgramData = async () => {
    try {
      // Fetch program details
      const { data: programData, error: programError } = await supabase
        .from('programs')
        .select('id, title, description, cover_image')
        .eq('id', programId)
        .single();

      if (programError) throw programError;
      setProgram(programData as Program);

      // Fetch groupings
      const { data: groupingsData } = await supabase
        .from('groupings')
        .select('*')
        .eq('program_id', programId)
        .order('sort_order');

      setGroupings(groupingsData || []);

      // Fetch lessons
      const { data: lessonsData } = await supabase
        .from('lessons')
        .select('id, title, description, grouping_id, sort_order')
        .eq('program_id', programId)
        .eq('is_published', true)
        .order('sort_order');

      // Fetch content blocks to check for video content
      if (lessonsData && lessonsData.length > 0) {
        const { data: contentBlocks, error: blocksError } = await supabase
          .from('content_blocks')
          .select('lesson_id, block_type')
          .in('lesson_id', lessonsData.map((l) => l.id));

        if (blocksError) {
          console.error('Error fetching content blocks:', blocksError);
        }

        const lessonsWithVideo = new Set<string>();
        (contentBlocks || []).forEach((cb) => {
          if (cb.block_type === 'video') {
            lessonsWithVideo.add(cb.lesson_id);
          }
        });

        const enrichedLessons = lessonsData.map((lesson) => ({
          ...lesson,
          hasVideo: lessonsWithVideo.has(lesson.id),
        }));
        setLessons(enrichedLessons);

        // Fetch completion status from backend progress table
        const progressMap: Record<string, LessonProgress> = {};

        if (user?.id) {
          const { data: progressRows, error: progressError } = await supabase
            .from('lesson_progress')
            .select('lesson_id, completed')
            .eq('user_id', user.id)
            .in('lesson_id', lessonsData.map((l) => l.id));

          if (progressError) {
            console.error('Error fetching lesson progress:', progressError);
          }

          (progressRows || []).forEach((p) => {
            progressMap[p.lesson_id] = { lesson_id: p.lesson_id, completed: p.completed };
          });
        }

        setProgress(progressMap);
      } else {
        setLessons(lessonsData || []);
      }
    } catch (error) {
      console.error('Error fetching program:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getLessonsForGrouping = (groupingId: string | null) => {
    return lessons.filter((l) => l.grouping_id === groupingId);
  };

  const getOverallProgress = () => {
    if (lessons.length === 0) return 0;
    const completedCount = Object.values(progress).filter((p) => p.completed).length;
    return Math.round((completedCount / lessons.length) * 100);
  };

  const isLessonCompleted = (lessonId: string) => {
    return !!progress[lessonId]?.completed;
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="p-6 lg:p-8 space-y-8">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-48 w-full" />
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (!program) {
    return (
      <DashboardLayout>
        <div className="p-6 lg:p-8">
          <Card className="card-elevated">
            <CardContent className="flex flex-col items-center justify-center py-16">
              <BookOpen className="h-16 w-16 text-muted-foreground mb-4" />
              <h3 className="text-xl font-medium mb-2">Program not found</h3>
              <Button asChild className="mt-4">
                <Link to="/programs">Back to Programs</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  const ungroupedLessons = getLessonsForGrouping(null);
  const overallProgress = getOverallProgress();

  return (
    <DashboardLayout>
      <div className="p-6 lg:px-16 xl:px-24 lg:py-8 space-y-8">
        {/* Back Button */}
        <Button variant="ghost" asChild className="gap-2">
          <Link to="/programs">
            <ArrowLeft className="h-4 w-4" />
            Back to Programs
          </Link>
        </Button>

        {/* Program Header */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary to-primary/70 lg:max-w-[75%]">
          {program.cover_image && (
            <img
              src={program.cover_image}
              alt={program.title}
              className="absolute inset-0 w-full h-full object-cover opacity-30"
            />
          )}
          <div className="relative p-8 lg:p-12">
            <Badge variant="secondary" className="mb-4">
              {lessons.length} Lessons
            </Badge>
            <h1 className="text-3xl lg:text-4xl font-heading font-bold text-primary-foreground mb-4">
              {program.title}
            </h1>
            <p className="text-primary-foreground/80 max-w-2xl mb-6">
              {program.description}
            </p>
            <div className="w-full">
              <div className="text-sm text-primary-foreground/80 mb-2">
                <span>Overall Progress</span>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex-1 relative">
                  <div 
                    className="absolute -top-5 text-sm font-medium text-primary-foreground"
                    style={{ left: `${Math.max(overallProgress, 5)}%`, transform: 'translateX(-100%)' }}
                  >
                    {overallProgress}%
                  </div>
                  <Progress value={overallProgress} className="h-2 bg-primary-foreground/20" />
                </div>
                {overallProgress === 100 && (
                  <Badge className="bg-success text-success-foreground gap-1 whitespace-nowrap">
                    <Trophy className="h-3 w-3" />
                    Completed
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Lessons */}
        <div className="space-y-6">
          <h2 className="text-xl font-heading font-semibold">Course Content</h2>

          {groupings.length > 0 ? (
            <Accordion type="multiple" defaultValue={groupings.map((g) => g.id)} className="space-y-4 lg:max-w-[75%]">
              {groupings.map((grouping) => {
                const groupLessons = getLessonsForGrouping(grouping.id);
                const completedInGroup = groupLessons.filter((l) => isLessonCompleted(l.id)).length;
                const isGroupComplete = completedInGroup === groupLessons.length && groupLessons.length > 0;

                return (
                  <AccordionItem
                    key={grouping.id}
                    value={grouping.id}
                    className="border rounded-xl overflow-hidden bg-card shadow-sm"
                  >
                    <AccordionTrigger className="px-6 py-4 hover:no-underline hover:bg-muted/50">
                      <div className="flex items-center justify-between w-full pr-4">
                        <div className="flex items-center gap-3">
                          {isGroupComplete && (
                            <div className="flex items-center justify-center w-6 h-6 rounded-full bg-success/10">
                              <CheckCircle2 className="h-4 w-4 text-success" />
                            </div>
                          )}
                          <div className="flex flex-col items-start text-left">
                            <span className="font-semibold font-body">{grouping.title}</span>
                            {grouping.description && (
                              <span className="text-sm text-muted-foreground font-body">{grouping.description}</span>
                            )}
                          </div>
                        </div>
                        <Badge variant={isGroupComplete ? 'default' : 'outline'} className={`font-body ${isGroupComplete ? 'bg-success text-success-foreground' : ''}`}>
                          {completedInGroup}/{groupLessons.length}
                        </Badge>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="px-4 pb-4 pt-6">
                      <div className="space-y-5 max-w-3xl mx-auto">
                        {groupLessons.map((lesson) => (
                          <LessonCard
                            key={lesson.id}
                            lesson={lesson}
                            programId={programId!}
                            isCompleted={isLessonCompleted(lesson.id)}
                          />
                        ))}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                );
              })}

              {ungroupedLessons.length > 0 && (
                <Card className="card-elevated">
                  <CardHeader>
                    <CardTitle>Additional Lessons</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3 max-w-3xl mx-auto">
                    {ungroupedLessons.map((lesson) => (
                      <LessonCard
                        key={lesson.id}
                        lesson={lesson}
                        programId={programId!}
                        isCompleted={isLessonCompleted(lesson.id)}
                      />
                    ))}
                  </CardContent>
                </Card>
              )}
            </Accordion>
          ) : (
            <div className="space-y-3 max-w-3xl mx-auto">
              {lessons.map((lesson) => (
                <LessonCard
                  key={lesson.id}
                  lesson={lesson}
                  programId={programId!}
                  isCompleted={isLessonCompleted(lesson.id)}
                />
              ))}
            </div>
          )}

          {lessons.length === 0 && (
            <Card className="card-elevated">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <BookOpen className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">No lessons available yet</h3>
                <p className="text-muted-foreground text-center">
                  Check back soon for new content.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
