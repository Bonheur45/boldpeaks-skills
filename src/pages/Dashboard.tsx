import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { BookOpen, Trophy, Award, ArrowRight, PlayCircle, CheckCircle2 } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/contexts/AuthContext';

interface EnrolledProgram {
  id: string;
  program: {
    id: string;
    title: string;
    description: string | null;
    cover_image: string | null;
  };
  enrolled_at: string;
  completed_at: string | null;
}

export default function Dashboard() {
  const { user } = useAuth();
  const [enrolledPrograms, setEnrolledPrograms] = useState<EnrolledProgram[]>([]);
  const [progressData, setProgressData] = useState<Record<string, { total: number; completed: number }>>({});
  const [isLoading, setIsLoading] = useState(true);

  const firstName = user?.user_metadata?.full_name?.split(' ')[0] || '';

  useEffect(() => {
    fetchEnrollments();
  }, []);

  const fetchEnrollments = async () => {
    try {
      const { data: enrollments, error } = await supabase
        .from('enrollments')
        .select(`
          id,
          enrolled_at,
          completed_at,
          program:programs(id, title, description, cover_image)
        `)
        .eq('status', 'active');

      if (error) throw error;

      // Fetch progress for each program
      const progressPromises = (enrollments || []).map(async (enrollment: any) => {
        const { data: lessons } = await supabase
          .from('lessons')
          .select('id')
          .eq('program_id', enrollment.program.id)
          .eq('is_published', true);

        const { data: progress } = await supabase
          .from('lesson_progress')
          .select('lesson_id, completed_at')
          .in('lesson_id', (lessons || []).map((l: any) => l.id));

        return {
          programId: enrollment.program.id,
          total: lessons?.length || 0,
          completed: (progress || []).filter((p: any) => p.completed_at).length,
        };
      });

      const progressResults = await Promise.all(progressPromises);
      const progressMap: Record<string, { total: number; completed: number }> = {};
      progressResults.forEach((p) => {
        progressMap[p.programId] = { total: p.total, completed: p.completed };
      });

      setEnrolledPrograms(enrollments as EnrolledProgram[] || []);
      setProgressData(progressMap);
    } catch (error) {
      console.error('Error fetching enrollments:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getProgressPercentage = (programId: string) => {
    const data = progressData[programId];
    if (!data || data.total === 0) return 0;
    return Math.round((data.completed / data.total) * 100);
  };

  return (
    <DashboardLayout>
      <div className="p-6 lg:p-8 space-y-8">
        {/* Welcome Section */}
        <div className="space-y-2">
          <h1 className="text-3xl font-body font-bold text-foreground">
            Welcome back{firstName ? `, ${firstName}` : ''}!
          </h1>
        </div>

        {/* Quick Stats */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card className="card-elevated">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium font-body">Programs Enrolled</CardTitle>
              <BookOpen className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{enrolledPrograms.length}</div>
            </CardContent>
          </Card>

          <Card className="card-elevated">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium font-body">Lessons Completed</CardTitle>
              <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {Object.values(progressData).reduce((sum, p) => sum + p.completed, 0)}
              </div>
            </CardContent>
          </Card>

          <Card className="card-elevated">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium font-body">Certificates Earned</CardTitle>
              <Award className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {enrolledPrograms.filter((e) => e.completed_at).length}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Continue Learning */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-body font-semibold">Continue Learning</h2>
            <Button variant="ghost" asChild>
              <Link to="/programs">
                View All Programs <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>

          {isLoading ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3].map((i) => (
                <Card key={i} className="card-elevated">
                  <CardHeader>
                    <Skeleton className="h-32 w-full rounded-md" />
                    <Skeleton className="h-6 w-3/4 mt-4" />
                    <Skeleton className="h-4 w-full mt-2" />
                  </CardHeader>
                  <CardContent>
                    <Skeleton className="h-2 w-full" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : enrolledPrograms.length === 0 ? (
            <Card className="card-elevated">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <BookOpen className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium font-body mb-2">No programs yet</h3>
                <p className="text-muted-foreground text-center mb-4">
                  Explore our programs and start your learning journey today.
                </p>
                <Button asChild>
                  <Link to="/programs">Browse Programs</Link>
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {enrolledPrograms.map((enrollment) => {
                const progress = getProgressPercentage(enrollment.program.id);
                const isCompleted = enrollment.completed_at !== null;

                return (
                  <Card key={enrollment.id} className="card-elevated overflow-hidden group">
                    <div className="relative h-32 bg-gradient-to-br from-primary to-primary/70">
                      {enrollment.program.cover_image && (
                        <img
                          src={enrollment.program.cover_image}
                          alt={enrollment.program.title}
                          className="absolute inset-0 w-full h-full object-cover"
                        />
                      )}
                      <div className="absolute inset-0 bg-primary/40" />
                      <div className="absolute top-3 right-3">
                        {isCompleted ? (
                          <Badge className="bg-success text-success-foreground">Completed</Badge>
                        ) : (
                          <Badge variant="secondary">{progress}% Complete</Badge>
                        )}
                      </div>
                    </div>
                    <CardHeader>
                      <CardTitle className="line-clamp-1 font-body">{enrollment.program.title}</CardTitle>
                      <CardDescription className="line-clamp-2">
                        {enrollment.program.description || 'No description available'}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <Progress value={progress} className="h-2" />
                      <div className="flex items-center justify-between text-sm text-muted-foreground">
                        <span>
                          {progressData[enrollment.program.id]?.completed || 0} /{' '}
                          {progressData[enrollment.program.id]?.total || 0} lessons
                        </span>
                      </div>
                      <Button asChild className="w-full group-hover:bg-accent group-hover:text-accent-foreground transition-colors">
                        <Link to={`/programs/${enrollment.program.id}`}>
                          <PlayCircle className="mr-2 h-4 w-4" />
                          {isCompleted ? 'Review' : 'Continue'}
                        </Link>
                      </Button>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>

        {/* Quick Links */}
        <div className="grid gap-4 md:grid-cols-2">
          <Card className="card-elevated">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 font-body">
                <Trophy className="h-5 w-5 text-accent" />
                Weekly Leaderboard
              </CardTitle>
              <CardDescription>See how you rank among other students</CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="outline" asChild>
                <Link to="/leaderboard">View Rankings</Link>
              </Button>
            </CardContent>
          </Card>

          <Card className="card-elevated">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 font-body">
                <Award className="h-5 w-5 text-accent" />
                Your Certificates
              </CardTitle>
              <CardDescription>Download your earned certificates</CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="outline" asChild>
                <Link to="/certificates">View Certificates</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}