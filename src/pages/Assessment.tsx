import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { 
  ArrowLeft, 
  ArrowRight, 
  CheckCircle2, 
  FileText,
  Clock,
  AlertCircle,
  Loader2,
  Trophy
} from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

interface Assessment {
  id: string;
  title: string;
  description: string | null;
  passing_score: number;
  time_limit: number | null;
}

interface Question {
  id: string;
  question_text: string;
  question_type: string;
  options: any;
  correct_answer: string | null;
  points: number;
  sort_order: number;
}

interface Submission {
  id: string;
  score: number | null;
  feedback: string | null;
  submitted_at: string;
}

export default function AssessmentPage() {
  const { programId, lessonId } = useParams<{ programId: string; lessonId: string }>();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [assessment, setAssessment] = useState<Assessment | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Record<string, string | string[]>>({});
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [previousSubmission, setPreviousSubmission] = useState<Submission | null>(null);
  const [showResults, setShowResults] = useState(false);

  useEffect(() => {
    if (lessonId) {
      fetchAssessmentData();
    }
  }, [lessonId]);

  const fetchAssessmentData = async () => {
    try {
      // Fetch assessment
      const { data: assessmentData, error: assessmentError } = await supabase
        .from('assessments')
        .select('*')
        .eq('lesson_id', lessonId)
        .single();

      if (assessmentError) throw assessmentError;
      setAssessment(assessmentData as Assessment);

      // Fetch questions
      const { data: questionsData } = await supabase
        .from('assessment_questions')
        .select('*')
        .eq('assessment_id', assessmentData.id)
        .order('sort_order');

      setQuestions(questionsData || []);

      // Check for previous submission in localStorage
      const storedSubmission = localStorage.getItem(`assessment-${assessmentData.id}`);
      if (storedSubmission) {
        setPreviousSubmission(JSON.parse(storedSubmission));
        setShowResults(true);
      }
    } catch (error) {
      console.error('Error fetching assessment:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAnswerChange = (questionId: string, value: string | string[]) => {
    setAnswers((prev) => ({
      ...prev,
      [questionId]: value,
    }));
  };

  const handleSubmit = async () => {
    if (!assessment) return;

    setIsSubmitting(true);
    try {
      // Calculate score for auto-graded questions
      let score = 0;
      let maxScore = 0;

      questions.forEach((q) => {
        maxScore += q.points;
        if (q.question_type !== 'essay') {
          const correctAnswer = (q as any).correct_answer;
          const userAnswer = answers[q.id];
          
          if (q.question_type === 'multiple_choice' && userAnswer === correctAnswer) {
            score += q.points;
          }
          if (q.question_type === 'true_false' && userAnswer === correctAnswer) {
            score += q.points;
          }
        }
      });

      const hasEssay = questions.some((q) => q.question_type === 'essay');

      // Store submission in localStorage
      const submission: Submission = {
        id: crypto.randomUUID(),
        score: hasEssay ? null : score,
        feedback: null,
        submitted_at: new Date().toISOString(),
      };
      
      localStorage.setItem(`assessment-${assessment.id}`, JSON.stringify(submission));

      // Mark lesson as complete in localStorage
      localStorage.setItem(`lesson-complete-${lessonId}`, 'true');

      setPreviousSubmission(submission);
      setShowResults(true);

      toast({
        title: 'Assessment submitted!',
        description: hasEssay 
          ? 'Your responses will be reviewed by an instructor.'
          : `You scored ${score} out of ${maxScore} points.`,
      });
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Submission failed',
        description: error.message,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderQuestion = (question: Question, index: number) => {
    const answer = answers[question.id];

    return (
      <Card key={question.id} className="card-elevated">
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <Badge variant="outline" className="mb-2">
                Question {index + 1} of {questions.length}
              </Badge>
              <CardTitle className="text-lg">{question.question_text}</CardTitle>
            </div>
            <Badge variant="secondary">{question.points} pts</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {question.question_type === 'multiple_choice' && question.options && (
            <RadioGroup
              value={answer as string || ''}
              onValueChange={(value) => handleAnswerChange(question.id, value)}
            >
              {question.options.map((option: any, i: number) => (
                <div key={i} className="flex items-center space-x-3 p-3 rounded-lg border hover:bg-muted/50">
                  <RadioGroupItem value={option.value || option} id={`${question.id}-${i}`} />
                  <Label htmlFor={`${question.id}-${i}`} className="flex-1 cursor-pointer">
                    {option.label || option}
                  </Label>
                </div>
              ))}
            </RadioGroup>
          )}

          {question.question_type === 'true_false' && (
            <RadioGroup
              value={answer as string || ''}
              onValueChange={(value) => handleAnswerChange(question.id, value)}
            >
              {['True', 'False'].map((option) => (
                <div key={option} className="flex items-center space-x-3 p-3 rounded-lg border hover:bg-muted/50">
                  <RadioGroupItem value={option.toLowerCase()} id={`${question.id}-${option}`} />
                  <Label htmlFor={`${question.id}-${option}`} className="flex-1 cursor-pointer">
                    {option}
                  </Label>
                </div>
              ))}
            </RadioGroup>
          )}

          {question.question_type === 'essay' && (
            <Textarea
              value={answer as string || ''}
              onChange={(e) => handleAnswerChange(question.id, e.target.value)}
              placeholder="Write your answer here..."
              rows={6}
            />
          )}
        </CardContent>
      </Card>
    );
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="p-6 lg:p-8 space-y-8 max-w-3xl mx-auto">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-64 w-full" />
        </div>
      </DashboardLayout>
    );
  }

  if (!assessment) {
    return (
      <DashboardLayout>
        <div className="p-6 lg:p-8">
          <Card className="card-elevated">
            <CardContent className="flex flex-col items-center justify-center py-16">
              <FileText className="h-16 w-16 text-muted-foreground mb-4" />
              <h3 className="text-xl font-medium mb-2">Assessment not found</h3>
              <Button asChild className="mt-4">
                <Link to={`/programs/${programId}/lessons/${lessonId}`}>Back to Lesson</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  // Show results if already submitted
  if (showResults && previousSubmission) {
    const passed = previousSubmission.score !== null && 
      previousSubmission.score >= assessment.passing_score;
    const maxScore = questions.reduce((sum, q) => sum + q.points, 0);

    return (
      <DashboardLayout>
        <div className="p-6 lg:p-8 space-y-8 max-w-3xl mx-auto">
          <Button variant="ghost" asChild className="gap-2">
            <Link to={`/programs/${programId}/lessons/${lessonId}`}>
              <ArrowLeft className="h-4 w-4" />
              Back to Lesson
            </Link>
          </Button>

          <Card className={`card-elevated ${passed ? 'border-success' : 'border-destructive'}`}>
            <CardHeader className="text-center">
              <div className="mx-auto mb-4">
                {passed ? (
                  <div className="w-20 h-20 rounded-full bg-success/10 flex items-center justify-center">
                    <Trophy className="h-10 w-10 text-success" />
                  </div>
                ) : (
                  <div className="w-20 h-20 rounded-full bg-destructive/10 flex items-center justify-center">
                    <AlertCircle className="h-10 w-10 text-destructive" />
                  </div>
                )}
              </div>
              <CardTitle className="text-2xl">
                {previousSubmission.score !== null 
                  ? (passed ? 'Congratulations!' : 'Keep Practicing')
                  : 'Submission Received'}
              </CardTitle>
              <CardDescription>
                {previousSubmission.score !== null 
                  ? (passed 
                      ? 'You have successfully passed this assessment.'
                      : `You need ${assessment.passing_score} points to pass. Try again!`)
                  : 'Your responses are being reviewed by an instructor.'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {previousSubmission.score !== null && (
                <div className="text-center">
                  <p className="text-4xl font-bold">
                    {previousSubmission.score} / {maxScore}
                  </p>
                  <p className="text-muted-foreground">points scored</p>
                </div>
              )}

              {previousSubmission.feedback && (
                <div className="p-4 bg-muted rounded-lg">
                  <p className="font-semibold mb-2">Instructor Feedback:</p>
                  <p className="text-muted-foreground">{previousSubmission.feedback}</p>
                </div>
              )}

              <div className="flex gap-4 justify-center">
                {!passed && previousSubmission.score !== null && (
                  <Button 
                    variant="outline"
                    onClick={() => {
                      setShowResults(false);
                      setPreviousSubmission(null);
                      setAnswers({});
                      setCurrentQuestion(0);
                    }}
                  >
                    Try Again
                  </Button>
                )}
                <Button asChild>
                  <Link to={`/programs/${programId}`}>
                    Continue to Course
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  const progress = ((currentQuestion + 1) / questions.length) * 100;
  const answeredCount = Object.keys(answers).length;

  return (
    <DashboardLayout>
      <div className="p-6 lg:p-8 space-y-8 max-w-3xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between">
          <Button variant="ghost" asChild className="gap-2">
            <Link to={`/programs/${programId}/lessons/${lessonId}`}>
              <ArrowLeft className="h-4 w-4" />
              Back
            </Link>
          </Button>
          
          {assessment.time_limit && (
            <Badge variant="outline" className="gap-1">
              <Clock className="h-3 w-3" />
              {assessment.time_limit} min
            </Badge>
          )}
        </div>

        {/* Assessment Info */}
        <div className="space-y-2">
          <h1 className="text-2xl font-heading font-bold">{assessment.title}</h1>
          {assessment.description && (
            <p className="text-muted-foreground">{assessment.description}</p>
          )}
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <span>{questions.length} questions</span>
            <span>•</span>
            <span>Passing score: {assessment.passing_score} pts</span>
          </div>
        </div>

        {/* Progress */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span>{answeredCount} of {questions.length} answered</span>
            <span>{Math.round(progress)}%</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        {/* Questions */}
        <div className="space-y-6">
          {questions.map((q, idx) => renderQuestion(q, idx))}
        </div>

        {/* Submit Button */}
        <Card className="card-elevated">
          <CardContent className="flex items-center justify-between py-6">
            <div>
              <p className="font-semibold">Ready to submit?</p>
              <p className="text-sm text-muted-foreground">
                {answeredCount === questions.length 
                  ? 'All questions answered'
                  : `${questions.length - answeredCount} questions remaining`}
              </p>
            </div>
            <Button 
              onClick={handleSubmit} 
              disabled={isSubmitting || answeredCount < questions.length}
              size="lg"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                  Submit Assessment
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
