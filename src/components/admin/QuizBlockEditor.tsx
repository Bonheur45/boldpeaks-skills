import { useState } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import {
  GripVertical,
  Trash2,
  Plus,
  HelpCircle,
  CheckCircle2,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface QuizQuestion {
  id: string;
  type: 'multiple_choice' | 'multi_select' | 'true_false' | 'flashcard';
  question: string;
  options: { id: string; text: string }[];
  correctOptionId: string;
  correctOptionIds?: string[];
  explanation: string;
  answer?: string;
  points: number;
}

interface QuizContent {
  questions: QuizQuestion[];
}

interface QuizBlockEditorProps {
  content: QuizContent;
  onUpdate: (content: QuizContent) => void;
  onDelete: () => void;
}

export function QuizBlockEditor({ content, onUpdate, onDelete }: QuizBlockEditorProps) {
  const questions = content?.questions || [];

  const getDefaultOptions = (type: QuizQuestion['type']) => {
    if (type === 'true_false') {
      return [
        { id: `o-${Date.now()}-true`, text: 'True' },
        { id: `o-${Date.now()}-false`, text: 'False' },
      ];
    }
    return [
      { id: `o-${Date.now()}-1`, text: '' },
      { id: `o-${Date.now()}-2`, text: '' },
      { id: `o-${Date.now()}-3`, text: '' },
      { id: `o-${Date.now()}-4`, text: '' },
    ];
  };

  const addQuestion = () => {
    const newQuestion: QuizQuestion = {
      id: `q-${Date.now()}`,
      type: 'multiple_choice',
      question: '',
      options: getDefaultOptions('multiple_choice'),
      correctOptionId: '',
      explanation: '',
      answer: '',
      points: 1,
    };
    onUpdate({ questions: [...questions, newQuestion] });
  };

  const updateQuestion = (questionId: string, updates: Partial<QuizQuestion>) => {
    onUpdate({
      questions: questions.map((q) =>
        q.id === questionId ? { ...q, ...updates } : q
      ),
    });
  };

  const setQuestionType = (questionId: string, type: QuizQuestion['type']) => {
    onUpdate({
      questions: questions.map((q) =>
        q.id === questionId
          ? {
              ...q,
              type,
              options: type === 'flashcard' ? [] : getDefaultOptions(type),
              correctOptionId: '',
              correctOptionIds: type === 'multi_select' ? [] : undefined,
              answer: type === 'flashcard' ? q.answer || '' : undefined,
            }
          : q
      ),
    });
  };

  const toggleCorrectOption = (questionId: string, optionId: string) => {
    onUpdate({
      questions: questions.map((q) => {
        if (q.id !== questionId) return q;
        const current = q.correctOptionIds || [];
        const next = current.includes(optionId)
          ? current.filter((id) => id !== optionId)
          : [...current, optionId];
        return { ...q, correctOptionIds: next };
      }),
    });
  };

  const deleteQuestion = (questionId: string) => {
    onUpdate({ questions: questions.filter((q) => q.id !== questionId) });
  };

  const updateOption = (questionId: string, optionId: string, text: string) => {
    onUpdate({
      questions: questions.map((q) =>
        q.id === questionId
          ? {
              ...q,
              options: q.options.map((o) =>
                o.id === optionId ? { ...o, text } : o
              ),
            }
          : q
      ),
    });
  };

  return (
    <Card className="card-elevated">
      <CardHeader className="flex flex-row items-center justify-between py-3">
        <div className="flex items-center gap-2">
          <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab" />
          <HelpCircle className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">Quiz / Multiple Choice</span>
          <Badge variant="secondary" className="ml-2">
            {questions.length} question{questions.length !== 1 ? 's' : ''}
          </Badge>
        </div>
        <Button variant="ghost" size="icon" onClick={onDelete}>
          <Trash2 className="h-4 w-4 text-destructive" />
        </Button>
      </CardHeader>
      <CardContent className="space-y-6">
        {questions.length === 0 ? (
          <div className="text-center py-8 border-2 border-dashed rounded-lg">
            <HelpCircle className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground mb-4">No questions added yet</p>
            <Button onClick={addQuestion} variant="outline">
              <Plus className="h-4 w-4 mr-2" />
              Add First Question
            </Button>
          </div>
        ) : (
          <>
            {questions.map((question, qIdx) => (
              <Card key={question.id} className="border-2">
                <CardHeader className="py-3 bg-muted/50">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="outline">Q{qIdx + 1}</Badge>
                        <Input
                          type="number"
                          className="w-20 h-8"
                          value={question.points}
                          onChange={(e) =>
                            updateQuestion(question.id, {
                              points: parseInt(e.target.value) || 1,
                            })
                          }
                          min={1}
                          placeholder="Points"
                        />
                        <span className="text-xs text-muted-foreground">points</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Label className="text-xs">Type</Label>
                        <select
                          value={question.type}
                          onChange={(e) =>
                            setQuestionType(question.id, e.target.value as QuizQuestion['type'])
                          }
                          className="rounded-md border border-border bg-background px-2 py-1 text-sm"
                        >
                          <option value="multiple_choice">Multiple choice (single)</option>
                          <option value="multi_select">Multi-select (all that apply)</option>
                          <option value="true_false">True / False</option>
                          <option value="flashcard">Flashcard</option>
                        </select>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => deleteQuestion(question.id)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                      </div>
                    </div>
                </CardHeader>
                <CardContent className="pt-4 space-y-4">
                  {/* Question Text */}
                  <div className="space-y-2">
                    <Label>Question</Label>
                    <Textarea
                      value={question.question}
                      onChange={(e) =>
                        updateQuestion(question.id, { question: e.target.value })
                      }
                      placeholder="Enter your question here..."
                      rows={2}
                    />
                  </div>

                  {question.type !== 'flashcard' ? (
                    question.type === 'multi_select' ? (
                      <div className="space-y-3">
                        <Label>Answer Options (check all correct answers)</Label>
                        <div className="space-y-2">
                          {question.options.map((option, oIdx) => {
                            const checked = (question.correctOptionIds || []).includes(option.id);
                            return (
                              <div
                                key={option.id}
                                className={`flex items-center gap-3 p-3 rounded-lg border-2 transition-colors ${
                                  checked ? 'border-success bg-success/5' : 'border-border hover:border-muted-foreground/30'
                                }`}
                              >
                                <Checkbox
                                  checked={checked}
                                  onCheckedChange={() => toggleCorrectOption(question.id, option.id)}
                                  id={option.id}
                                />
                                <div className="flex-1">
                                  <Input
                                    value={option.text}
                                    onChange={(e) => updateOption(question.id, option.id, e.target.value)}
                                    placeholder={`Option ${oIdx + 1}`}
                                    className="border-0 bg-transparent p-0 h-auto focus-visible:ring-0"
                                  />
                                </div>
                                {checked && <CheckCircle2 className="h-5 w-5 text-success" />}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <Label>Answer Options (select the correct one)</Label>
                        <RadioGroup
                          value={question.correctOptionId}
                          onValueChange={(value) =>
                            updateQuestion(question.id, { correctOptionId: value })
                          }
                        >
                          {question.options.map((option, oIdx) => (
                            <div
                              key={option.id}
                              className={`flex items-center gap-3 p-3 rounded-lg border-2 transition-colors ${
                                question.correctOptionId === option.id
                                  ? 'border-success bg-success/5'
                                  : 'border-border hover:border-muted-foreground/30'
                              }`}
                            >
                              <RadioGroupItem value={option.id} id={option.id} />
                              <div className="flex-1">
                                <Input
                                  value={option.text}
                                  onChange={(e) =>
                                    updateOption(question.id, option.id, e.target.value)
                                  }
                                  placeholder={`Option ${oIdx + 1}`}
                                  className="border-0 bg-transparent p-0 h-auto focus-visible:ring-0"
                                />
                              </div>
                              {question.correctOptionId === option.id && (
                                <CheckCircle2 className="h-5 w-5 text-success" />
                              )}
                            </div>
                          ))}
                        </RadioGroup>
                      </div>
                    )
                  ) : (
                    <div className="space-y-2">
                      <Label>Flashcard answer</Label>
                      <Textarea
                        value={question.answer || ''}
                        onChange={(e) =>
                          updateQuestion(question.id, { answer: e.target.value })
                        }
                        placeholder="Provide the answer or explanation for this flashcard"
                        rows={3}
                      />
                    </div>
                  )}

                  {/* Explanation */}
                  <div className="space-y-2">
                    <Label>Explanation (shown after answering)</Label>
                    <Textarea
                      value={question.explanation}
                      onChange={(e) =>
                        updateQuestion(question.id, { explanation: e.target.value })
                      }
                      placeholder="Explain why this is the correct answer..."
                      rows={2}
                      className="text-sm"
                    />
                  </div>
                </CardContent>
              </Card>
            ))}

            <Button onClick={addQuestion} variant="outline" className="w-full">
              <Plus className="h-4 w-4 mr-2" />
              Add Another Question
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}
