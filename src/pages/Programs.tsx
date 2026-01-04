import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { BookOpen, Users, ArrowRight, Loader2, Route } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';

interface LearningPathway {
  id: string;
  title: string;
  description: string | null;
  cover_image: string | null;
}

interface Program {
  id: string;
  title: string;
  description: string | null;
  cover_image: string | null;
  learning_pathway_id: string | null;
  sort_order: number | null;
}

export default function Programs() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();

  const [pathways, setPathways] = useState<LearningPathway[]>([]);
  const [programs, setPrograms] = useState<Program[]>([]);
  const [enrollments, setEnrollments] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [enrollingId, setEnrollingId] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (!authLoading && user?.id) {
      fetchEnrollments();
    }
  }, [authLoading, user?.id]);

  const fetchData = async () => {
    try {
      // Fetch pathways
      const { data: pathwaysData, error: pathwaysError } = await supabase
        .from('learning_pathways')
        .select('id, title, description, cover_image')
        .eq('is_published', true)
        .order('sort_order', { ascending: true });

      if (pathwaysError) throw pathwaysError;
      setPathways(pathwaysData || []);

      // Fetch programs
      const { data: programsData, error: programsError } = await supabase
        .from('programs')
        .select('id, title, description, cover_image, learning_pathway_id, sort_order')
        .eq('is_published', true)
        .order('sort_order', { ascending: true });

      if (programsError) throw programsError;
      setPrograms(programsData || []);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchEnrollments = async () => {
    if (!user?.id) return;

    try {
      const { data, error } = await supabase
        .from('enrollments')
        .select('program_id')
        .eq('user_id', user.id)
        .eq('status', 'active');

      if (error) throw error;
      setEnrollments((data || []).map((e) => e.program_id));
    } catch (error) {
      console.error('Error fetching enrollments:', error);
    }
  };

  const handleEnroll = async (programId: string) => {
    if (!user?.id) {
      toast({
        variant: 'destructive',
        title: 'Sign in required',
        description: 'Please sign in to enroll in a program.',
      });
      navigate('/auth');
      return;
    }

    if (enrollments.includes(programId)) {
      toast({
        title: 'Already enrolled',
        description: 'You are already enrolled in this program.',
      });
      return;
    }

    setEnrollingId(programId);

    try {
      const { data: existing, error: existingError } = await supabase
        .from('enrollments')
        .select('id')
        .eq('user_id', user.id)
        .eq('program_id', programId)
        .eq('status', 'active')
        .limit(1)
        .maybeSingle();

      if (existingError) throw existingError;

      if (!existing?.id) {
        const { error: insertError } = await supabase
          .from('enrollments')
          .insert({ user_id: user.id, program_id: programId });

        if (insertError) throw insertError;
      }

      setEnrollments((prev) => (prev.includes(programId) ? prev : [...prev, programId]));
      toast({
        title: 'Enrolled successfully!',
        description: 'You can now access the program lessons.',
      });
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Enrollment failed',
        description: error.message,
      });
    } finally {
      setEnrollingId(null);
    }
  };

  const isEnrolled = (programId: string) => enrollments.includes(programId);

  const getProgramsForPathway = (pathwayId: string) => 
    programs.filter((p) => p.learning_pathway_id === pathwayId);

  const ProgramCard = ({ program }: { program: Program }) => {
    const enrolled = isEnrolled(program.id);

    return (
      <Card className="card-elevated overflow-hidden flex flex-col">
        <div className="relative h-40 bg-gradient-to-br from-primary to-primary/70">
          {program.cover_image ? (
            <img
              src={program.cover_image}
              alt={program.title}
              className="absolute inset-0 w-full h-full object-cover"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <BookOpen className="h-12 w-12 text-primary-foreground/50" />
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
          {enrolled && (
            <Badge className="absolute top-3 right-3 bg-success text-success-foreground">
              Enrolled
            </Badge>
          )}
        </div>

        <CardHeader className="flex-1">
          <CardTitle className="line-clamp-2 text-lg">{program.title}</CardTitle>
          <CardDescription className="line-clamp-2">
            {program.description || 'No description available'}
          </CardDescription>
        </CardHeader>

        <CardContent className="pt-0">
          {enrolled ? (
            <Button asChild className="w-full">
              <Link to={`/programs/${program.id}`}>
                Continue Learning <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          ) : (
            <Button
              className="w-full"
              onClick={() => handleEnroll(program.id)}
              disabled={enrollingId === program.id}
            >
              {enrollingId === program.id ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Enrolling...
                </>
              ) : (
                <>
                  <Users className="mr-2 h-4 w-4" />
                  Enroll Now
                </>
              )}
            </Button>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <DashboardLayout>
      <div className="p-6 lg:p-8 space-y-8">
        <div className="space-y-2">
          <h1 className="text-3xl font-heading font-bold text-foreground">Learning Pathways</h1>
          <p className="text-muted-foreground">
            Explore our learning pathways and discover programs that interest you.
          </p>
        </div>

        {isLoading ? (
          <div className="space-y-6">
            {[1, 2].map((i) => (
              <Card key={i} className="card-elevated">
                <CardHeader>
                  <Skeleton className="h-6 w-1/3" />
                  <Skeleton className="h-4 w-2/3 mt-2" />
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {[1, 2, 3].map((j) => (
                      <div key={j}>
                        <Skeleton className="h-40 w-full" />
                        <Skeleton className="h-6 w-3/4 mt-4" />
                        <Skeleton className="h-4 w-full mt-2" />
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : pathways.length === 0 ? (
          <Card className="card-elevated">
            <CardContent className="flex flex-col items-center justify-center py-16">
              <Route className="h-16 w-16 text-muted-foreground mb-4" />
              <h3 className="text-xl font-medium mb-2">No learning pathways available</h3>
              <p className="text-muted-foreground text-center">
                Check back soon for new learning pathways and programs.
              </p>
            </CardContent>
          </Card>
        ) : (
          <Accordion type="multiple" defaultValue={pathways.map(p => p.id)} className="space-y-4">
            {pathways.map((pathway) => {
              const pathwayPrograms = getProgramsForPathway(pathway.id);
              
              return (
                <AccordionItem 
                  key={pathway.id} 
                  value={pathway.id}
                  className="border rounded-lg overflow-hidden bg-card"
                >
                  <AccordionTrigger className="px-6 py-4 hover:no-underline hover:bg-muted/50">
                    <div className="flex items-start gap-4 text-left">
                      <div className="h-12 w-12 rounded-lg bg-gradient-to-br from-accent to-accent/70 flex items-center justify-center flex-shrink-0">
                        {pathway.cover_image ? (
                          <img 
                            src={pathway.cover_image} 
                            alt="" 
                            className="h-full w-full object-cover rounded-lg"
                          />
                        ) : (
                          <Route className="h-6 w-6 text-accent-foreground" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h2 className="text-xl font-semibold text-foreground">{pathway.title}</h2>
                        {pathway.description && (
                          <p className="text-sm text-muted-foreground mt-1 line-clamp-1">
                            {pathway.description}
                          </p>
                        )}
                        <p className="text-sm text-muted-foreground mt-1">
                          {pathwayPrograms.length} program{pathwayPrograms.length !== 1 ? 's' : ''}
                        </p>
                      </div>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="px-6 pb-6">
                    {pathwayPrograms.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        <BookOpen className="h-10 w-10 mx-auto mb-2 opacity-50" />
                        <p>No programs available in this pathway yet.</p>
                      </div>
                    ) : (
                      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 pt-2">
                        {pathwayPrograms.map((program) => (
                          <ProgramCard key={program.id} program={program} />
                        ))}
                      </div>
                    )}
                  </AccordionContent>
                </AccordionItem>
              );
            })}
          </Accordion>
        )}
      </div>
    </DashboardLayout>
  );
}