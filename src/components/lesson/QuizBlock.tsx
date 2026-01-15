import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import {
  CheckCircle2,
  XCircle,
  HelpCircle,
  Trophy,
  RotateCcw,
  Loader2,
} from 'lucide-react';

interface QuizQuestion {
  id: string;
  question: string;
  options: { id: string; text: string }[];
  correctOptionId?: string;
  explanation: string;
  points: number;
}

interface QuizContent {
  questions: QuizQuestion[];
}

interface QuizBlockProps {
  blockId: string;
  content: QuizContent;
  lessonId: string;
  programId: string;
}

interface QuizProgress {
  lessonId: string;
  blockId: string;
  answers: Record<string, string>;
  results: Record<string, boolean>;
  score: number;
  maxScore: number;
  completedAt: string;
}

export function QuizBlock({ blockId, content, lessonId }: QuizBlockProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const questions = content?.questions || [];

  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [results, setResults] = useState<Record<string, boolean>>({});
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [score, setScore] = useState(0);
  const [maxScore, setMaxScore] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [previousResult, setPreviousResult] = useState<QuizProgress | null>(null);

  useEffect(() => {
    if (!user) return;
    
    const stored = localStorage.getItem(`quiz-${user.id}-${blockId}`);
    if (!stored) return;

    const parsed = JSON.parse(stored) as Partial<QuizProgress>;
    if (!parsed.answers || typeof parsed.score !== 'number' || typeof parsed.maxScore !== 'number') return;

    setPreviousResult(parsed as QuizProgress);
    setAnswers(parsed.answers);
    setResults(parsed.results || {});
    setScore(parsed.score);
    setMaxScore(parsed.maxScore);
    setIsSubmitted(true);
  }, [blockId, lessonId, user]);

  if (questions.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center justify-center py-12">
          <HelpCircle className="h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-muted-foreground">No quiz questions available</p>
        </CardContent>
      </Card>
    );
  }

  const handleAnswerChange = (questionId: string, optionId: string) => {
    if (isSubmitted) return;
    setAnswers((prev) => ({ ...prev, [questionId]: optionId }));
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);

    try {
      const grading = await Promise.all(
        questions.map(async (q) => {
          const selectedOptionId = answers[q.id];
          const max = q.points;

          if (!selectedOptionId) {
            return { questionId: q.id, isCorrect: false, points: 0, max };
          }

          const { data: isCorrect, error } = await supabase.rpc('validate_quiz_answer', {
            p_block_id: blockId,
            p_question_id: q.id,
            p_selected_option_id: selectedOptionId,
          });

          if (error) throw error;

          return {
            questionId: q.id,
            isCorrect: !!isCorrect,
            points: isCorrect ? q.points : 0,
            max,
          };
        })
      );

      const newResults: Record<string, boolean> = {};
      let totalScore = 0;
      let totalMax = 0;

      grading.forEach((r) => {
        newResults[r.questionId] = r.isCorrect;
        totalScore += r.points;
        totalMax += r.max;
      });

      setResults(newResults);
      setScore(totalScore);
      setMaxScore(totalMax);
      setIsSubmitted(true);

      const quizProgress: QuizProgress = {
        lessonId,
        blockId,
        answers,
        results: newResults,
        score: totalScore,
        maxScore: totalMax,
        completedAt: new Date().toISOString(),
      };
      
      if (user) {
        localStorage.setItem(`quiz-${user.id}-${blockId}`, JSON.stringify(quizProgress));
      }

      const percentage = totalMax > 0 ? Math.round((totalScore / totalMax) * 100) : 0;
      toast({
        title: 'Quiz submitted!',
        description: `You scored ${totalScore}/${totalMax} (${percentage}%)`,
      });
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Quiz submission failed',
        description: error?.message || 'Please try again.',
      });
      setIsSubmitted(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRetry = () => {
    if (user) {
      localStorage.removeItem(`quiz-${user.id}-${blockId}`);
    }
    setAnswers({});
    setResults({});
    setIsSubmitted(false);
    setScore(0);
    setMaxScore(0);
    setPreviousResult(null);
  };

  const answeredCount = Object.keys(answers).length;
  const allAnswered = answeredCount === questions.length;
  const scorePercentage = maxScore > 0 ? Math.round((score / maxScore) * 100) : 0;
  const passed = scorePercentage >= 70;

  return (
    <div className="space-y-6">
      {/* Quiz Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <HelpCircle className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold">Quiz</h3>
            <p className="text-sm text-muted-foreground">
              {questions.length} question{questions.length !== 1 ? 's' : ''}
            </p>
          </div>
        </div>
        {isSubmitted && (
          <Button variant="outline" size="sm" onClick={handleRetry}>
            <RotateCcw className="h-4 w-4 mr-2" />
            Retry
          </Button>
        )}
      </div>

      {/* Progress (before submission) */}
      {!isSubmitted && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span>
              {answeredCount} of {questions.length} answered
            </span>
            <span>{Math.round((answeredCount / questions.length) * 100)}%</span>
          </div>
          <Progress value={(answeredCount / questions.length) * 100} className="h-2" />
        </div>
      )}

      {/* Score Card (after submission) */}
      {isSubmitted && (
        <Card className={`${passed ? 'border-success bg-success/5' : 'border-warning bg-warning/5'}`}>
          <CardContent className="flex items-center justify-between py-4">
            <div className="flex items-center gap-3">
              {passed ? (
                <Trophy className="h-8 w-8 text-success" />
              ) : (
                <XCircle className="h-8 w-8 text-warning" />
              )}
              <div>
                <p className="font-semibold">{passed ? 'Great job!' : 'Keep practicing!'}</p>
                <p className="text-sm text-muted-foreground">
                  {passed ? 'You passed the quiz' : 'Review your answers below'}
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold">
                {score}/{maxScore}
              </p>
              <p className="text-sm text-muted-foreground">{scorePercentage}%</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Questions */}
      <div className="space-y-4">
        {questions.map((question, idx) => {
          const userAnswer = answers[question.id];
          const isCorrect = results[question.id] === true;
          const showResult = isSubmitted;

          return (
            <Card key={question.id} className={showResult ? (isCorrect ? 'border-success' : 'border-destructive') : ''}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">Q{idx + 1}</Badge>
                      <Badge variant="secondary">{question.points} pts</Badge>
                      {showResult && (
                        isCorrect ? (
                          <Badge className="bg-success text-success-foreground">
                            <CheckCircle2 className="h-3 w-3 mr-1" />
                            Correct
                          </Badge>
                        ) : (
                          <Badge variant="destructive">
                            <XCircle className="h-3 w-3 mr-1" />
                            Incorrect
                          </Badge>
                        )
                      )}
                    </div>
                    <CardTitle className="text-base font-medium">{question.question}</CardTitle>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <RadioGroup value={userAnswer || ''} onValueChange={(value) => handleAnswerChange(question.id, value)} disabled={isSubmitted}>
                  {question.options.map((option) => {
                    const isThisSelected = userAnswer === option.id;

                    let optionClass = 'border hover:bg-muted/50';
                    if (showResult && isThisSelected) {
                      optionClass = isCorrect ? 'border-success bg-success/10' : 'border-destructive bg-destructive/10';
                    } else if (!showResult && isThisSelected) {
                      optionClass = 'border-primary bg-primary/5';
                    }

                    return (
                      <div key={option.id} className={`flex items-center space-x-3 p-3 rounded-lg transition-colors ${optionClass}`}>
                        <RadioGroupItem value={option.id} id={`${question.id}-${option.id}`} disabled={isSubmitted} />
                        <Label htmlFor={`${question.id}-${option.id}`} className="flex-1 cursor-pointer">
                          {option.text}
                        </Label>
                        {showResult && isThisSelected && isCorrect && (
                          <CheckCircle2 className="h-5 w-5 text-success" />
                        )}
                        {showResult && isThisSelected && !isCorrect && (
                          <XCircle className="h-5 w-5 text-destructive" />
                        )}
                      </div>
                    );
                  })}
                </RadioGroup>

                {/* Explanation */}
                {showResult && question.explanation && (
                  <div className="p-3 rounded-lg bg-muted/50 border-l-4 border-primary">
                    <p className="text-sm font-medium mb-1">Explanation:</p>
                    <p className="text-sm text-muted-foreground">{question.explanation}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Submit Button */}
      {!isSubmitted && (
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="flex items-center justify-between py-4">
            <div>
              <p className="font-semibold">Ready to submit?</p>
              <p className="text-sm text-muted-foreground">
                {allAnswered
                  ? 'All questions answered'
                  : `${questions.length - answeredCount} question${questions.length - answeredCount !== 1 ? 's' : ''} remaining`}
              </p>
            </div>
            <Button onClick={handleSubmit} disabled={!allAnswered || isSubmitting} size="lg">
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                  Submit Quiz
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
