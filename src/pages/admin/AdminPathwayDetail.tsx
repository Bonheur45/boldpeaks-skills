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
  BookOpen,
  Users,
  Loader2,
  ArrowLeft,
  Route
} from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

interface LearningPathway {
  id: string;
  title: string;
  description: string | null;
  cover_image: string | null;
  is_published: boolean;
}

interface Program {
  id: string;
  title: string;
  description: string | null;
  cover_image: string | null;
  is_published: boolean;
  sort_order: number;
  created_at: string;
  _count?: {
    lessons: number;
    enrollments: number;
  };
}

export default function AdminPathwayDetail() {
  const { pathwayId } = useParams<{ pathwayId: string }>();
  const { toast } = useToast();
  const [pathway, setPathway] = useState<LearningPathway | null>(null);
  const [programs, setPrograms] = useState<Program[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingProgram, setEditingProgram] = useState<Program | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    cover_image: '',
    is_published: false,
  });

  useEffect(() => {
    if (pathwayId) {
      fetchData();
    }
  }, [pathwayId]);

  const fetchData = async () => {
    try {
      // Fetch pathway
      const { data: pathwayData, error: pathwayError } = await supabase
        .from('learning_pathways')
        .select('*')
        .eq('id', pathwayId)
        .single();

      if (pathwayError) throw pathwayError;
      setPathway(pathwayData);

      // Fetch programs
      const { data: programsData, error: programsError } = await supabase
        .from('programs')
        .select('*')
        .eq('learning_pathway_id', pathwayId)
        .order('sort_order', { ascending: true });

      if (programsError) throw programsError;

      // Fetch counts for each program
      const programsWithCounts = await Promise.all(
        (programsData || []).map(async (program) => {
          const [{ count: lessonsCount }, { count: enrollmentsCount }] = await Promise.all([
            supabase.from('lessons').select('*', { count: 'exact', head: true }).eq('program_id', program.id),
            supabase.from('enrollments').select('*', { count: 'exact', head: true }).eq('program_id', program.id),
          ]);

          return {
            ...program,
            _count: {
              lessons: lessonsCount || 0,
              enrollments: enrollmentsCount || 0,
            },
          };
        })
      );

      setPrograms(programsWithCounts);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenDialog = (program?: Program) => {
    if (program) {
      setEditingProgram(program);
      setFormData({
        title: program.title,
        description: program.description || '',
        cover_image: program.cover_image || '',
        is_published: program.is_published,
      });
    } else {
      setEditingProgram(null);
      setFormData({
        title: '',
        description: '',
        cover_image: '',
        is_published: false,
      });
    }
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.title.trim()) {
      toast({ variant: 'destructive', title: 'Title is required' });
      return;
    }

    setIsSaving(true);
    try {
      if (editingProgram) {
        const { error } = await supabase
          .from('programs')
          .update({
            title: formData.title,
            description: formData.description || null,
            cover_image: formData.cover_image || null,
            is_published: formData.is_published,
          })
          .eq('id', editingProgram.id);

        if (error) throw error;
        toast({ title: 'Program updated successfully' });
      } else {
        // Get max sort_order for this pathway
        const { data: maxOrder } = await supabase
          .from('programs')
          .select('sort_order')
          .eq('learning_pathway_id', pathwayId)
          .order('sort_order', { ascending: false })
          .limit(1)
          .single();

        const { error } = await supabase.from('programs').insert({
          title: formData.title,
          description: formData.description || null,
          cover_image: formData.cover_image || null,
          is_published: formData.is_published,
          learning_pathway_id: pathwayId,
          sort_order: (maxOrder?.sort_order || 0) + 1,
        });

        if (error) throw error;
        toast({ title: 'Program created successfully' });
      }

      setIsDialogOpen(false);
      fetchData();
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Error', description: error.message });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (programId: string) => {
    if (!confirm('Are you sure you want to delete this program? This action cannot be undone.')) {
      return;
    }

    try {
      const { error } = await supabase.from('programs').delete().eq('id', programId);
      if (error) throw error;
      toast({ title: 'Program deleted' });
      fetchData();
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Error', description: error.message });
    }
  };

  const handleTogglePublish = async (program: Program) => {
    try {
      const { error } = await supabase
        .from('programs')
        .update({ is_published: !program.is_published })
        .eq('id', program.id);

      if (error) throw error;
      toast({ title: program.is_published ? 'Program unpublished' : 'Program published' });
      fetchData();
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Error', description: error.message });
    }
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="p-6 lg:p-8 space-y-8">
          <Skeleton className="h-8 w-64" />
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="card-elevated">
                <Skeleton className="h-40 w-full" />
                <CardHeader>
                  <Skeleton className="h-6 w-3/4" />
                  <Skeleton className="h-4 w-full mt-2" />
                </CardHeader>
              </Card>
            ))}
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (!pathway) {
    return (
      <DashboardLayout>
        <div className="p-6 lg:p-8">
          <Card className="card-elevated">
            <CardContent className="flex flex-col items-center justify-center py-16">
              <Route className="h-16 w-16 text-muted-foreground mb-4" />
              <h3 className="text-xl font-medium mb-2">Pathway not found</h3>
              <Button asChild className="mt-4">
                <Link to="/admin/pathways">Back to Pathways</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="p-6 lg:p-8 space-y-8">
        {/* Header */}
        <div className="flex flex-col gap-4">
          <Button variant="ghost" asChild className="w-fit -ml-2">
            <Link to="/admin/pathways">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Pathways
            </Link>
          </Button>
          
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <h1 className="text-3xl font-heading font-bold text-foreground">{pathway.title}</h1>
                <Badge variant={pathway.is_published ? 'default' : 'secondary'}>
                  {pathway.is_published ? 'Published' : 'Draft'}
                </Badge>
              </div>
              <p className="text-muted-foreground">
                {pathway.description || 'Manage programs within this learning pathway.'}
              </p>
            </div>

            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={() => handleOpenDialog()}>
                  <Plus className="mr-2 h-4 w-4" />
                  New Program
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                  <DialogTitle>{editingProgram ? 'Edit Program' : 'Create Program'}</DialogTitle>
                  <DialogDescription>
                    {editingProgram ? 'Update the program details.' : 'Add a new program to this pathway.'}
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="title">Title</Label>
                    <Input
                      id="title"
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      placeholder="Communication Fundamentals"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      placeholder="Learn the essential skills for effective communication..."
                      rows={3}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="cover_image">Cover Image URL</Label>
                    <Input
                      id="cover_image"
                      value={formData.cover_image}
                      onChange={(e) => setFormData({ ...formData, cover_image: e.target.value })}
                      placeholder="https://example.com/image.jpg"
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="is_published">Published</Label>
                      <p className="text-sm text-muted-foreground">
                        Make this program visible to students
                      </p>
                    </div>
                    <Switch
                      id="is_published"
                      checked={formData.is_published}
                      onCheckedChange={(checked) => setFormData({ ...formData, is_published: checked })}
                    />
                  </div>
                </div>

                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleSave} disabled={isSaving}>
                    {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {editingProgram ? 'Save Changes' : 'Create Program'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Programs Grid */}
        {programs.length === 0 ? (
          <Card className="card-elevated">
            <CardContent className="flex flex-col items-center justify-center py-16">
              <BookOpen className="h-16 w-16 text-muted-foreground mb-4" />
              <h3 className="text-xl font-medium mb-2">No programs yet</h3>
              <p className="text-muted-foreground text-center mb-4">
                Create your first program in this pathway.
              </p>
              <Button onClick={() => handleOpenDialog()}>
                <Plus className="mr-2 h-4 w-4" />
                Create Program
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {programs.map((program) => (
              <Card key={program.id} className="card-elevated overflow-hidden">
                <div className="relative h-40 bg-gradient-to-br from-primary to-primary/70">
                  {program.cover_image && (
                    <img
                      src={program.cover_image}
                      alt={program.title}
                      className="absolute inset-0 w-full h-full object-cover"
                    />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                  <div className="absolute top-3 left-3">
                    <Badge variant={program.is_published ? 'default' : 'secondary'}>
                      {program.is_published ? 'Published' : 'Draft'}
                    </Badge>
                  </div>
                  <div className="absolute top-3 right-3">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 bg-black/20 hover:bg-black/40">
                          <MoreVertical className="h-4 w-4 text-white" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleOpenDialog(program)}>
                          <Edit className="mr-2 h-4 w-4" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleTogglePublish(program)}>
                          {program.is_published ? (
                            <>
                              <EyeOff className="mr-2 h-4 w-4" />
                              Unpublish
                            </>
                          ) : (
                            <>
                              <Eye className="mr-2 h-4 w-4" />
                              Publish
                            </>
                          )}
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={() => handleDelete(program.id)}
                          className="text-destructive"
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>

                <CardHeader>
                  <CardTitle className="line-clamp-1">{program.title}</CardTitle>
                  <CardDescription className="line-clamp-2">
                    {program.description || 'No description'}
                  </CardDescription>
                </CardHeader>

                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <BookOpen className="h-4 w-4" />
                      {program._count?.lessons || 0} lessons
                    </span>
                    <span className="flex items-center gap-1">
                      <Users className="h-4 w-4" />
                      {program._count?.enrollments || 0} enrolled
                    </span>
                  </div>

                  <Button asChild className="w-full">
                    <Link to={`/admin/programs/${program.id}`}>
                      Manage Lessons
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
