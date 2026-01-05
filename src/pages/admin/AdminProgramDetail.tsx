import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { 
  Plus, 
  MoreVertical, 
  Edit, 
  Trash2, 
  Eye, 
  EyeOff,
  ArrowLeft,
  GripVertical,
  FileText,
  Loader2
} from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

interface Lesson {
  id: string;
  title: string;
  description: string | null;
  is_published: boolean;
  sort_order: number;
  grouping_id: string | null;
}

interface Grouping {
  id: string;
  title: string;
  description: string | null;
  sort_order: number;
}

interface Program {
  id: string;
  title: string;
}

export default function AdminProgramDetail() {
  const { programId } = useParams<{ programId: string }>();
  const { toast } = useToast();
  
  const [program, setProgram] = useState<Program | null>(null);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [groupings, setGroupings] = useState<Grouping[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLessonDialogOpen, setIsLessonDialogOpen] = useState(false);
  const [isGroupingDialogOpen, setIsGroupingDialogOpen] = useState(false);
  const [editingLesson, setEditingLesson] = useState<Lesson | null>(null);
  const [editingGrouping, setEditingGrouping] = useState<Grouping | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const [lessonFormData, setLessonFormData] = useState({
    title: '',
    description: '',
    grouping_id: '',
    is_published: false,
  });

  const [groupingFormData, setGroupingFormData] = useState({
    title: '',
    description: '',
  });

  useEffect(() => {
    if (programId) {
      fetchProgramData();
    }
  }, [programId]);

  const fetchProgramData = async () => {
    try {
      const [programRes, lessonsRes, groupingsRes] = await Promise.all([
        supabase.from('programs').select('id, title').eq('id', programId).single(),
        supabase.from('lessons').select('id, title, description, is_published, sort_order, grouping_id').eq('program_id', programId).order('sort_order'),
        supabase.from('groupings').select('*').eq('program_id', programId).order('sort_order'),
      ]);

      if (programRes.error) throw programRes.error;
      
      setProgram(programRes.data);
      setLessons((lessonsRes.data as Lesson[]) || []);
      setGroupings(groupingsRes.data || []);
    } catch (error) {
      console.error('Error fetching program:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Lesson handlers
  const handleOpenLessonDialog = (lesson?: Lesson) => {
    if (lesson) {
      setEditingLesson(lesson);
      setLessonFormData({
        title: lesson.title,
        description: lesson.description || '',
        grouping_id: lesson.grouping_id || '',
        is_published: lesson.is_published,
      });
    } else {
      setEditingLesson(null);
      setLessonFormData({
        title: '',
        description: '',
        grouping_id: '',
        is_published: false,
      });
    }
    setIsLessonDialogOpen(true);
  };

  const handleSaveLesson = async () => {
    if (!lessonFormData.title.trim()) {
      toast({ variant: 'destructive', title: 'Title is required' });
      return;
    }

    setIsSaving(true);
    try {
      if (editingLesson) {
        const { error } = await supabase
          .from('lessons')
          .update({
            title: lessonFormData.title,
            description: lessonFormData.description || null,
            grouping_id: lessonFormData.grouping_id || null,
            is_published: lessonFormData.is_published,
          })
          .eq('id', editingLesson.id);

        if (error) throw error;
        toast({ title: 'Lesson updated' });
      } else {
        const maxOrder = Math.max(0, ...lessons.map(l => l.sort_order));
        const { error } = await supabase.from('lessons').insert({
          program_id: programId,
          title: lessonFormData.title,
          description: lessonFormData.description || null,
          grouping_id: lessonFormData.grouping_id || null,
          is_published: lessonFormData.is_published,
          sort_order: maxOrder + 1,
        });

        if (error) throw error;
        toast({ title: 'Lesson created' });
      }

      setIsLessonDialogOpen(false);
      fetchProgramData();
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Error', description: error.message });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteLesson = async (lessonId: string) => {
    if (!confirm('Delete this lesson?')) return;
    
    try {
      const { error } = await supabase.from('lessons').delete().eq('id', lessonId);
      if (error) throw error;
      toast({ title: 'Lesson deleted' });
      fetchProgramData();
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Error', description: error.message });
    }
  };

  const handleToggleLessonPublish = async (lesson: Lesson) => {
    try {
      const { error } = await supabase
        .from('lessons')
        .update({ is_published: !lesson.is_published })
        .eq('id', lesson.id);

      if (error) throw error;
      fetchProgramData();
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Error', description: error.message });
    }
  };

  // Grouping handlers
  const handleOpenGroupingDialog = (grouping?: Grouping) => {
    if (grouping) {
      setEditingGrouping(grouping);
      setGroupingFormData({
        title: grouping.title,
        description: grouping.description || '',
      });
    } else {
      setEditingGrouping(null);
      setGroupingFormData({ title: '', description: '' });
    }
    setIsGroupingDialogOpen(true);
  };

  const handleSaveGrouping = async () => {
    if (!groupingFormData.title.trim()) {
      toast({ variant: 'destructive', title: 'Title is required' });
      return;
    }

    setIsSaving(true);
    try {
      if (editingGrouping) {
        const { error } = await supabase
          .from('groupings')
          .update({
            title: groupingFormData.title,
            description: groupingFormData.description || null,
          })
          .eq('id', editingGrouping.id);

        if (error) throw error;
        toast({ title: 'Section updated' });
      } else {
        const maxOrder = Math.max(0, ...groupings.map(g => g.sort_order));
        const { error } = await supabase.from('groupings').insert({
          program_id: programId,
          title: groupingFormData.title,
          description: groupingFormData.description || null,
          sort_order: maxOrder + 1,
        });

        if (error) throw error;
        toast({ title: 'Section created' });
      }

      setIsGroupingDialogOpen(false);
      fetchProgramData();
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Error', description: error.message });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteGrouping = async (groupingId: string) => {
    if (!confirm('Delete this section? Lessons in this section will be ungrouped.')) return;

    try {
      // First, ungroup lessons
      await supabase.from('lessons').update({ grouping_id: null }).eq('grouping_id', groupingId);
      
      const { error } = await supabase.from('groupings').delete().eq('id', groupingId);
      if (error) throw error;
      toast({ title: 'Section deleted' });
      fetchProgramData();
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Error', description: error.message });
    }
  };

  const getLessonsForGrouping = (groupingId: string | null) => {
    return lessons.filter(l => l.grouping_id === groupingId);
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="p-6 lg:p-8 space-y-8">
          <Skeleton className="h-8 w-64" />
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-20 w-full" />
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
              <h3 className="text-xl font-medium mb-4">Program not found</h3>
              <Button asChild>
                <Link to="/admin/programs">Back to Programs</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  const ungroupedLessons = getLessonsForGrouping(null);

  return (
    <DashboardLayout>
      <div className="p-6 lg:p-8 space-y-8">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" asChild>
            <Link to="/admin/programs">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Link>
          </Button>
        </div>

        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-heading font-bold">{program.title}</h1>
            <p className="text-muted-foreground">Manage lessons and content</p>
          </div>

          <div className="flex gap-2">
            <Dialog open={isGroupingDialogOpen} onOpenChange={setIsGroupingDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" onClick={() => handleOpenGroupingDialog()}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Section
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{editingGrouping ? 'Edit Section' : 'New Section'}</DialogTitle>
                  <DialogDescription>Sections help organize lessons into modules.</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="grouping-title">Title</Label>
                    <Input
                      id="grouping-title"
                      value={groupingFormData.title}
                      onChange={(e) => setGroupingFormData({ ...groupingFormData, title: e.target.value })}
                      placeholder="Module 1: Introduction"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="grouping-description">Description (optional)</Label>
                    <Textarea
                      id="grouping-description"
                      value={groupingFormData.description}
                      onChange={(e) => setGroupingFormData({ ...groupingFormData, description: e.target.value })}
                      placeholder="Overview of this section..."
                      rows={2}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsGroupingDialogOpen(false)}>Cancel</Button>
                  <Button onClick={handleSaveGrouping} disabled={isSaving}>
                    {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Save
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            <Dialog open={isLessonDialogOpen} onOpenChange={setIsLessonDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={() => handleOpenLessonDialog()}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Lesson
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{editingLesson ? 'Edit Lesson' : 'New Lesson'}</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="lesson-title">Title</Label>
                    <Input
                      id="lesson-title"
                      value={lessonFormData.title}
                      onChange={(e) => setLessonFormData({ ...lessonFormData, title: e.target.value })}
                      placeholder="Lesson title"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lesson-description">Description</Label>
                    <Textarea
                      id="lesson-description"
                      value={lessonFormData.description}
                      onChange={(e) => setLessonFormData({ ...lessonFormData, description: e.target.value })}
                      placeholder="Brief description..."
                      rows={2}
                    />
                  </div>
                  {groupings.length > 0 && (
                    <div className="space-y-2">
                      <Label htmlFor="lesson-grouping">Section (optional)</Label>
                      <Select
                        value={lessonFormData.grouping_id || "none"}
                        onValueChange={(value) => setLessonFormData({ ...lessonFormData, grouping_id: value === "none" ? "" : value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="No section" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">No section</SelectItem>
                          {groupings.map((g) => (
                            <SelectItem key={g.id} value={g.id}>{g.title}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                  <div className="flex items-center justify-between">
                    <Label htmlFor="lesson-published">Published</Label>
                    <Switch
                      id="lesson-published"
                      checked={lessonFormData.is_published}
                      onCheckedChange={(checked) => setLessonFormData({ ...lessonFormData, is_published: checked })}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsLessonDialogOpen(false)}>Cancel</Button>
                  <Button onClick={handleSaveLesson} disabled={isSaving}>
                    {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Save
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Sections and Lessons */}
        <div className="space-y-6">
          {groupings.map((grouping) => (
            <Card key={grouping.id} className="card-elevated">
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>{grouping.title}</CardTitle>
                  {grouping.description && <CardDescription>{grouping.description}</CardDescription>}
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => handleOpenGroupingDialog(grouping)}>
                      <Edit className="mr-2 h-4 w-4" />
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleDeleteGrouping(grouping.id)} className="text-destructive">
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </CardHeader>
              <CardContent className="space-y-2">
                {getLessonsForGrouping(grouping.id).map((lesson) => (
                  <LessonRow
                    key={lesson.id}
                    lesson={lesson}
                    programId={programId!}
                    onEdit={() => handleOpenLessonDialog(lesson)}
                    onDelete={() => handleDeleteLesson(lesson.id)}
                    onTogglePublish={() => handleToggleLessonPublish(lesson)}
                  />
                ))}
                {getLessonsForGrouping(grouping.id).length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">No lessons in this section</p>
                )}
              </CardContent>
            </Card>
          ))}

          {/* Ungrouped Lessons */}
          {ungroupedLessons.length > 0 && (
            <Card className="card-elevated">
              <CardHeader>
                <CardTitle>Other Lessons</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {ungroupedLessons.map((lesson) => (
                  <LessonRow
                    key={lesson.id}
                    lesson={lesson}
                    programId={programId!}
                    onEdit={() => handleOpenLessonDialog(lesson)}
                    onDelete={() => handleDeleteLesson(lesson.id)}
                    onTogglePublish={() => handleToggleLessonPublish(lesson)}
                  />
                ))}
              </CardContent>
            </Card>
          )}

          {lessons.length === 0 && groupings.length === 0 && (
            <Card className="card-elevated">
              <CardContent className="flex flex-col items-center justify-center py-16">
                <FileText className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">No content yet</h3>
                <p className="text-muted-foreground text-center mb-4">
                  Start by adding sections and lessons to your program.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}

function LessonRow({ 
  lesson, 
  programId,
  onEdit, 
  onDelete, 
  onTogglePublish 
}: { 
  lesson: Lesson;
  programId: string;
  onEdit: () => void;
  onDelete: () => void;
  onTogglePublish: () => void;
}) {
  return (
    <div className="flex items-center gap-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors">
      <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab flex-shrink-0" />
      <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="font-medium truncate">{lesson.title}</p>
        {lesson.description && (
          <p className="text-sm text-muted-foreground line-clamp-1">{lesson.description}</p>
        )}
      </div>
      <div className="flex flex-col items-end gap-1 flex-shrink-0">
        <Badge variant={lesson.is_published ? 'default' : 'secondary'} className="text-xs">
          {lesson.is_published ? 'Published' : 'Draft'}
        </Badge>
        <Button variant="outline" size="sm" asChild className="text-xs h-7 px-2">
          <Link to={`/admin/programs/${programId}/lessons/${lesson.id}/edit`}>
            Edit Content
          </Link>
        </Button>
      </div>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="flex-shrink-0">
            <MoreVertical className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={onEdit}>
            <Edit className="mr-2 h-4 w-4" />
            Edit Details
          </DropdownMenuItem>
          <DropdownMenuItem onClick={onTogglePublish}>
            {lesson.is_published ? <EyeOff className="mr-2 h-4 w-4" /> : <Eye className="mr-2 h-4 w-4" />}
            {lesson.is_published ? 'Unpublish' : 'Publish'}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={onDelete} className="text-destructive">
            <Trash2 className="mr-2 h-4 w-4" />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
