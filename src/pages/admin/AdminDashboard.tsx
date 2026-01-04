import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { 
  Users, 
  GraduationCap, 
  BookOpen, 
  Award, 
  TrendingUp,
  ArrowRight,
  Clock,
  Route
} from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

interface Stats {
  totalPathways: number;
  totalStudents: number;
  totalPrograms: number;
  totalLessons: number;
  totalCertificates: number;
  recentEnrollments: number;
  pendingAssessments: number;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats>({
    totalPathways: 0,
    totalStudents: 0,
    totalPrograms: 0,
    totalLessons: 0,
    totalCertificates: 0,
    recentEnrollments: 0,
    pendingAssessments: 0,
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const [
        { count: pathwaysCount },
        { count: studentsCount },
        { count: programsCount },
        { count: lessonsCount },
        { count: certificatesCount },
        { count: pendingCount },
      ] = await Promise.all([
        supabase.from('learning_pathways').select('*', { count: 'exact', head: true }),
        supabase.from('profiles').select('*', { count: 'exact', head: true }),
        supabase.from('programs').select('*', { count: 'exact', head: true }),
        supabase.from('lessons').select('*', { count: 'exact', head: true }),
        supabase.from('certificates').select('*', { count: 'exact', head: true }),
        supabase.from('assessment_submissions').select('*', { count: 'exact', head: true }).is('score', null),
      ]);

      setStats({
        totalPathways: pathwaysCount || 0,
        totalStudents: studentsCount || 0,
        totalPrograms: programsCount || 0,
        totalLessons: lessonsCount || 0,
        totalCertificates: certificatesCount || 0,
        recentEnrollments: 0,
        pendingAssessments: pendingCount || 0,
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const statCards = [
    { label: 'Learning Pathways', value: stats.totalPathways, icon: Route, color: 'text-primary' },
    { label: 'Total Programs', value: stats.totalPrograms, icon: GraduationCap, color: 'text-green-500' },
    { label: 'Total Students', value: stats.totalStudents, icon: Users, color: 'text-blue-500' },
    { label: 'Total Lessons', value: stats.totalLessons, icon: BookOpen, color: 'text-purple-500' },
  ];

  return (
    <DashboardLayout>
      <div className="p-6 lg:p-8 space-y-8">
        {/* Header */}
        <div className="space-y-2">
          <h1 className="text-3xl font-heading font-bold text-foreground">Admin Dashboard</h1>
          <p className="text-muted-foreground">
            Manage your training programs and monitor student progress.
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {statCards.map((stat) => (
            <Card key={stat.label} className="card-elevated">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {stat.label}
                </CardTitle>
                <stat.icon className={`h-5 w-5 ${stat.color}`} />
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <Skeleton className="h-8 w-16" />
                ) : (
                  <div className="text-3xl font-bold">{stat.value}</div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Quick Actions */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <Card className="card-elevated">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Route className="h-5 w-5 text-primary" />
                Learning Pathways
              </CardTitle>
              <CardDescription>Create pathways and organize programs</CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild className="w-full">
                <Link to="/admin/pathways">
                  Manage Pathways
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </CardContent>
          </Card>

          <Card className="card-elevated">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                Student Management
              </CardTitle>
              <CardDescription>View enrollments and progress</CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild variant="outline" className="w-full">
                <Link to="/admin/students">
                  View Students
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </CardContent>
          </Card>

          <Card className="card-elevated">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-accent" />
                Pending Reviews
              </CardTitle>
              <CardDescription>
                {stats.pendingAssessments} assessments need grading
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild variant="outline" className="w-full">
                <Link to="/admin/assessments">
                  Review Submissions
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Recent Activity */}
        <Card className="card-elevated">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Platform Overview
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-4">
              <div className="text-center p-4 rounded-lg bg-muted/50">
                <p className="text-2xl font-bold text-primary">{stats.totalPathways}</p>
                <p className="text-sm text-muted-foreground">Pathways</p>
              </div>
              <div className="text-center p-4 rounded-lg bg-muted/50">
                <p className="text-2xl font-bold text-primary">{stats.totalPrograms}</p>
                <p className="text-sm text-muted-foreground">Programs</p>
              </div>
              <div className="text-center p-4 rounded-lg bg-muted/50">
                <p className="text-2xl font-bold text-primary">{stats.totalLessons}</p>
                <p className="text-sm text-muted-foreground">Lessons</p>
              </div>
              <div className="text-center p-4 rounded-lg bg-muted/50">
                <p className="text-2xl font-bold text-primary">{stats.pendingAssessments}</p>
                <p className="text-sm text-muted-foreground">Pending Reviews</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
