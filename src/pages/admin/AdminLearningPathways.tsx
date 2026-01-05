import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
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
  Route,
  GraduationCap,
  Loader2
} from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

interface LearningPathway {
  id: string;
  title: string;
  description: string | null;
  cover_image: string | null;
  is_published: boolean;
  sort_order: number;
  created_at: string;
  _count?: {
    programs: number;
  };
}

export default function AdminLearningPathways() {
  const { toast } = useToast();
  const [pathways, setPathways] = useState<LearningPathway[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingPathway, setEditingPathway] = useState<LearningPathway | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    cover_image: '',
    is_published: false,
  });

  useEffect(() => {
    fetchPathways();
  }, []);

  const fetchPathways = async () => {
    try {
      const { data, error } = await supabase
        .from('learning_pathways')
        .select('*')
        .order('sort_order', { ascending: true });

      if (error) throw error;

      // Fetch program counts for each pathway
      const pathwaysWithCounts = await Promise.all(
        (data || []).map(async (pathway) => {
          const { count: programsCount } = await supabase
            .from('programs')
            .select('*', { count: 'exact', head: true })
            .eq('learning_pathway_id', pathway.id);

          return {
            ...pathway,
            _count: {
              programs: programsCount || 0,
            },
          };
        })
      );

      setPathways(pathwaysWithCounts);
    } catch (error) {
      console.error('Error fetching pathways:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenDialog = (pathway?: LearningPathway) => {
    if (pathway) {
      setEditingPathway(pathway);
      setFormData({
        title: pathway.title,
        description: pathway.description || '',
        cover_image: pathway.cover_image || '',
        is_published: pathway.is_published,
      });
    } else {
      setEditingPathway(null);
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
      if (editingPathway) {
        const { error } = await supabase
          .from('learning_pathways')
          .update({
            title: formData.title,
            description: formData.description || null,
            cover_image: formData.cover_image || null,
            is_published: formData.is_published,
          })
          .eq('id', editingPathway.id);

        if (error) throw error;
        toast({ title: 'Learning pathway updated successfully' });
      } else {
        // Get max sort_order
        const { data: maxOrder } = await supabase
          .from('learning_pathways')
          .select('sort_order')
          .order('sort_order', { ascending: false })
          .limit(1)
          .single();

        const { error } = await supabase.from('learning_pathways').insert({
          title: formData.title,
          description: formData.description || null,
          cover_image: formData.cover_image || null,
          is_published: formData.is_published,
          sort_order: (maxOrder?.sort_order || 0) + 1,
        });

        if (error) throw error;
        toast({ title: 'Learning pathway created successfully' });
      }

      setIsDialogOpen(false);
      fetchPathways();
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Error', description: error.message });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (pathwayId: string) => {
    if (!confirm('Are you sure you want to delete this learning pathway? All programs within it will also be deleted.')) {
      return;
    }

    try {
      const { error } = await supabase.from('learning_pathways').delete().eq('id', pathwayId);
      if (error) throw error;
      toast({ title: 'Learning pathway deleted' });
      fetchPathways();
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Error', description: error.message });
    }
  };

  const handleTogglePublish = async (pathway: LearningPathway) => {
    try {
      const { error } = await supabase
        .from('learning_pathways')
        .update({ is_published: !pathway.is_published })
        .eq('id', pathway.id);

      if (error) throw error;
      toast({ title: pathway.is_published ? 'Learning pathway unpublished' : 'Learning pathway published' });
      fetchPathways();
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Error', description: error.message });
    }
  };

  return (
    <DashboardLayout>
      <div className="p-6 lg:p-8 space-y-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="space-y-2">
            <h1 className="text-3xl font-heading font-bold text-foreground">Learning Pathways</h1>
            <p className="text-muted-foreground">
              Create and organize your learning pathways. Each pathway contains multiple programs.
            </p>
          </div>

          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => handleOpenDialog()}>
                <Plus className="mr-2 h-4 w-4" />
                New Pathway
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-lg">
              <DialogHeader>
                <DialogTitle>{editingPathway ? 'Edit Learning Pathway' : 'Create Learning Pathway'}</DialogTitle>
                <DialogDescription>
                  {editingPathway ? 'Update the pathway details.' : 'Add a new learning pathway to organize your programs.'}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Title</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="Leadership Development"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="A comprehensive pathway covering leadership skills..."
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
                      Make this pathway visible to students
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
                  {editingPathway ? 'Save Changes' : 'Create Pathway'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Pathways Grid */}
        {isLoading ? (
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
        ) : pathways.length === 0 ? (
          <Card className="card-elevated">
            <CardContent className="flex flex-col items-center justify-center py-16">
              <Route className="h-16 w-16 text-muted-foreground mb-4" />
              <h3 className="text-xl font-medium mb-2">No learning pathways yet</h3>
              <p className="text-muted-foreground text-center mb-4">
                Create your first learning pathway to organize your programs.
              </p>
              <Button onClick={() => handleOpenDialog()}>
                <Plus className="mr-2 h-4 w-4" />
                Create Pathway
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {pathways.map((pathway) => (
              <Card key={pathway.id} className="card-elevated overflow-hidden">
                <div className="relative h-40 bg-gradient-to-br from-accent to-accent/70">
                  {pathway.cover_image && (
                    <img
                      src={pathway.cover_image}
                      alt={pathway.title}
                      className="absolute inset-0 w-full h-full object-cover"
                    />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                  <div className="absolute top-3 left-3">
                    <Badge variant={pathway.is_published ? 'default' : 'secondary'}>
                      {pathway.is_published ? 'Published' : 'Draft'}
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
                        <DropdownMenuItem onClick={() => handleOpenDialog(pathway)}>
                          <Edit className="mr-2 h-4 w-4" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleTogglePublish(pathway)}>
                          {pathway.is_published ? (
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
                          onClick={() => handleDelete(pathway.id)}
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
                  <CardTitle className="line-clamp-1">{pathway.title}</CardTitle>
                  <CardDescription className="line-clamp-2">
                    {pathway.description || 'No description'}
                  </CardDescription>
                </CardHeader>

                <CardContent className="space-y-4">
                  <div className="flex items-center text-sm text-muted-foreground">
                    <GraduationCap className="h-4 w-4 mr-1" />
                    {pathway._count?.programs || 0} programs
                  </div>

                  <Button asChild className="w-full">
                    <Link to={`/admin/pathways/${pathway.id}`}>
                      Manage Programs
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
