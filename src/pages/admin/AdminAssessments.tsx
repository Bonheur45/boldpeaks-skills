import { useEffect, useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { FileText, Clock, CheckCircle2, Loader2 } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';

interface Submission {
  id: string;
  assessment_id: string;
  user_id: string;
  answers: Record<string, any>;
  score: number | null;
  max_score: number | null;
  is_graded: boolean;
  admin_feedback: string | null;
  submitted_at: string;
  assessment: {
    title: string;
    lesson: {
      title: string;
      program: {
        title: string;
      };
    };
  };
  profile: {
    full_name: string | null;
    email?: string;
  };
}

export default function AdminAssessments() {
  const { toast } = useToast();
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedSubmission, setSelectedSubmission] = useState<Submission | null>(null);
  const [feedback, setFeedback] = useState('');
  const [score, setScore] = useState('');
  const [isGrading, setIsGrading] = useState(false);

  useEffect(() => {
    fetchSubmissions();
  }, []);

  const fetchSubmissions = async () => {
    try {
      const { data, error } = await supabase
        .from('assessment_submissions')
        .select(`
          *,
          assessment:assessments(
            title,
            lesson:lessons(
              title,
              program:programs(title)
            )
          ),
          profile:profiles(full_name)
        `)
        .order('submitted_at', { ascending: false });

      if (error) throw error;

      const formattedData = (data || []).map((s: any) => ({
        ...s,
        assessment: Array.isArray(s.assessment) ? s.assessment[0] : s.assessment,
        profile: Array.isArray(s.profile) ? s.profile[0] : s.profile,
      }));

      setSubmissions(formattedData);
    } catch (error) {
      console.error('Error fetching submissions:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenGrading = (submission: Submission) => {
    setSelectedSubmission(submission);
    setFeedback(submission.admin_feedback || '');
    setScore(submission.score?.toString() || '');
  };

  const handleGrade = async () => {
    if (!selectedSubmission) return;

    const scoreNum = parseInt(score);
    if (isNaN(scoreNum) || scoreNum < 0) {
      toast({ variant: 'destructive', title: 'Please enter a valid score' });
      return;
    }

    setIsGrading(true);
    try {
      const { error } = await supabase
        .from('assessment_submissions')
        .update({
          score: scoreNum,
          admin_feedback: feedback || null,
          is_graded: true,
          graded_at: new Date().toISOString(),
        })
        .eq('id', selectedSubmission.id);

      if (error) throw error;

      toast({ title: 'Assessment graded successfully' });
      setSelectedSubmission(null);
      fetchSubmissions();
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Error', description: error.message });
    } finally {
      setIsGrading(false);
    }
  };

  const getInitials = (name?: string | null, email?: string) => {
    if (name) {
      return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
    }
    return email?.charAt(0).toUpperCase() || '?';
  };

  const pendingSubmissions = submissions.filter((s) => !s.is_graded);
  const gradedSubmissions = submissions.filter((s) => s.is_graded);

  const renderSubmissionCard = (submission: Submission) => (
    <Card key={submission.id} className="card-elevated">
      <CardContent className="flex items-center gap-4 py-4">
        <Avatar>
          <AvatarFallback>
            {getInitials(submission.profile?.full_name, submission.user_id)}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <p className="font-medium truncate">
            {submission.profile?.full_name || `Student ${submission.user_id.slice(0, 8)}`}
          </p>
          <p className="text-sm text-muted-foreground truncate">
            {submission.assessment?.title} • {submission.assessment?.lesson?.program?.title}
          </p>
          <p className="text-xs text-muted-foreground">
            {format(new Date(submission.submitted_at), 'MMM d, yyyy h:mm a')}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {submission.is_graded ? (
            <Badge className="bg-success text-success-foreground">
              {submission.score}/{submission.max_score}
            </Badge>
          ) : (
            <Badge variant="secondary">
              <Clock className="mr-1 h-3 w-3" />
              Pending
            </Badge>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleOpenGrading(submission)}
          >
            {submission.is_graded ? 'View' : 'Grade'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <DashboardLayout>
      <div className="p-6 lg:p-8 space-y-8">
        {/* Header */}
        <div className="space-y-2">
          <h1 className="text-3xl font-heading font-bold text-foreground flex items-center gap-3">
            <FileText className="h-8 w-8 text-primary" />
            Assessment Submissions
          </h1>
          <p className="text-muted-foreground">
            Review and grade student assessments.
          </p>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="pending">
          <TabsList>
            <TabsTrigger value="pending" className="gap-2">
              <Clock className="h-4 w-4" />
              Pending ({pendingSubmissions.length})
            </TabsTrigger>
            <TabsTrigger value="graded" className="gap-2">
              <CheckCircle2 className="h-4 w-4" />
              Graded ({gradedSubmissions.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="pending" className="space-y-4 mt-6">
            {isLoading ? (
              [1, 2, 3].map((i) => (
                <Card key={i} className="card-elevated">
                  <CardContent className="flex items-center gap-4 py-4">
                    <Skeleton className="h-10 w-10 rounded-full" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-3 w-48" />
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : pendingSubmissions.length === 0 ? (
              <Card className="card-elevated">
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <CheckCircle2 className="h-12 w-12 text-success mb-4" />
                  <h3 className="text-lg font-medium mb-2">All caught up!</h3>
                  <p className="text-muted-foreground">No pending submissions to review.</p>
                </CardContent>
              </Card>
            ) : (
              pendingSubmissions.map(renderSubmissionCard)
            )}
          </TabsContent>

          <TabsContent value="graded" className="space-y-4 mt-6">
            {isLoading ? (
              [1, 2, 3].map((i) => (
                <Card key={i} className="card-elevated">
                  <CardContent className="flex items-center gap-4 py-4">
                    <Skeleton className="h-10 w-10 rounded-full" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-3 w-48" />
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : gradedSubmissions.length === 0 ? (
              <Card className="card-elevated">
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <FileText className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2">No graded submissions</h3>
                  <p className="text-muted-foreground">Graded submissions will appear here.</p>
                </CardContent>
              </Card>
            ) : (
              gradedSubmissions.map(renderSubmissionCard)
            )}
          </TabsContent>
        </Tabs>

        {/* Grading Dialog */}
        <Dialog open={!!selectedSubmission} onOpenChange={() => setSelectedSubmission(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {selectedSubmission?.is_graded ? 'View Submission' : 'Grade Submission'}
              </DialogTitle>
            </DialogHeader>

            {selectedSubmission && (
              <div className="space-y-6">
                {/* Student Info */}
                <div className="flex items-center gap-3 p-4 bg-muted rounded-lg">
                  <Avatar>
                    <AvatarFallback>
                      {getInitials(selectedSubmission.profile?.full_name, selectedSubmission.user_id)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium">
                      {selectedSubmission.profile?.full_name || `Student ${selectedSubmission.user_id.slice(0, 8)}`}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {selectedSubmission.assessment?.title}
                    </p>
                  </div>
                </div>

                {/* Answers */}
                <div className="space-y-4">
                  <h4 className="font-semibold">Submitted Answers</h4>
                  <div className="space-y-3 max-h-60 overflow-y-auto">
                    {Object.entries(selectedSubmission.answers || {}).map(([questionId, answer], idx) => (
                      <div key={questionId} className="p-3 border rounded-lg">
                        <p className="text-sm text-muted-foreground mb-1">Question {idx + 1}</p>
                        <p className="font-medium">{String(answer)}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Grading */}
                <div className="space-y-4">
                  <div className="flex gap-4">
                    <div className="space-y-2 flex-1">
                      <Label htmlFor="score">Score</Label>
                      <Input
                        id="score"
                        type="number"
                        min="0"
                        max={selectedSubmission.max_score || 100}
                        value={score}
                        onChange={(e) => setScore(e.target.value)}
                        disabled={selectedSubmission.is_graded}
                      />
                      <p className="text-xs text-muted-foreground">
                        Max score: {selectedSubmission.max_score}
                      </p>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="feedback">Feedback (optional)</Label>
                    <Textarea
                      id="feedback"
                      value={feedback}
                      onChange={(e) => setFeedback(e.target.value)}
                      placeholder="Provide feedback to the student..."
                      rows={3}
                      disabled={selectedSubmission.is_graded}
                    />
                  </div>
                </div>
              </div>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={() => setSelectedSubmission(null)}>
                Close
              </Button>
              {selectedSubmission && !selectedSubmission.is_graded && (
                <Button onClick={handleGrade} disabled={isGrading}>
                  {isGrading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Submit Grade
                </Button>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
