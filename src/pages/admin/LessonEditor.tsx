import { useEffect, useState, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import TiptapLink from '@tiptap/extension-link';
import TiptapImage from '@tiptap/extension-image';
import Underline from '@tiptap/extension-underline';
import TextAlign from '@tiptap/extension-text-align';
import { Table } from '@tiptap/extension-table';
import TableRow from '@tiptap/extension-table-row';
import TableCell from '@tiptap/extension-table-cell';
import TableHeader from '@tiptap/extension-table-header';
import { TextStyle } from '@tiptap/extension-text-style';
import Blockquote from '@tiptap/extension-blockquote';
import {
  ArrowLeft,
  ArrowUp,
  ArrowDown,
  Plus,
  Trash2,
  Save,
  GripVertical,
  FileText,
  Video,
  Image as ImageIcon,
  Bold,
  Italic,
  Underline as UnderlineIcon,
  List,
  ListOrdered,
  Link2,
  Quote,
  Code,
  Minus,
  Heading2,
  MessageSquare,
  Loader2,
  HelpCircle,
  Table as TableIcon,
  BookOpen,
  CheckCircle2,
} from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { getEmbedUrl } from '@/lib/videoUtils';
import { QuizBlockEditor } from '@/components/admin/QuizBlockEditor';
import { BoldableTextarea } from '@/components/admin/BoldableTextarea';
import { restoreWindowScroll } from '@/hooks/useScrollRestoration';

interface ContentBlock {
  id: string;
  block_type: string;
  content: any;
  sort_order: number;
  isNew?: boolean;
}

interface Lesson {
  id: string;
  title: string;
  program_id: string;
}

export default function LessonEditor() {
  const { programId, lessonId } = useParams<{ programId: string; lessonId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [blocks, setBlocks] = useState<ContentBlock[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
  const [isAddBlockOpen, setIsAddBlockOpen] = useState(false);
  const [newBlockType, setNewBlockType] = useState('rich_text');

  useEffect(() => {
    if (lessonId) {
      fetchLessonData();
    }
  }, [lessonId]);

  // Always start at the top when opening the lesson editor
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  }, [lessonId]);

  const fetchLessonData = async () => {
    try {
      const [lessonRes, blocksRes] = await Promise.all([
        supabase.from('lessons').select('id, title, program_id').eq('id', lessonId).single(),
        supabase.from('content_blocks').select('*').eq('lesson_id', lessonId).order('sort_order'),
      ]);

      if (lessonRes.error) throw lessonRes.error;
      setLesson(lessonRes.data);
      setBlocks(blocksRes.data || []);
    } catch (error) {
      console.error('Error fetching lesson:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddBlock = () => {
    const maxOrder = Math.max(0, ...blocks.map((b) => b.sort_order));
    
    let initialContent: any = { url: '' };
    if (newBlockType === 'rich_text') {
      initialContent = { html: '' };
    } else if (newBlockType === 'quiz') {
      initialContent = { questions: [] };
    } else if (newBlockType === 'video') {
      initialContent = { url: '', title: '', description: '', duration: '' };
    } else if (newBlockType === 'image') {
      initialContent = {
        url: '',
        caption: '',
        alt: '',
        display: { size: 'medium', alignment: 'center' },
      };
    } else if (newBlockType === 'hero') {
      initialContent = { title: '', subtitle: '', description: '' };
    } else if (newBlockType === 'callout') {
      initialContent = { style: 'insight', text: '' };
    } else if (newBlockType === 'reflection') {
      initialContent = { prompt: '', placeholder: 'Write your reflection here...' };
    } else if (newBlockType === 'activity') {
      initialContent = { title: '', description: '', instructions: '', externalLink: '' };
    } else if (newBlockType === 'summary') {
      initialContent = { html: '' };
    } else if (newBlockType === 'image_grid') {
      initialContent = { images: [] };
    }
    
    const newBlock: ContentBlock = {
      id: `new-${Date.now()}`,
      block_type: newBlockType,
      content: initialContent,
      sort_order: maxOrder + 1,
      isNew: true,
    };
    setBlocks([...blocks, newBlock]);
    setSelectedBlockId(newBlock.id);
    setIsAddBlockOpen(false);
  };

  const handleUpdateBlock = (blockId: string, content: any) => {
    setBlocks(blocks.map((b) => (b.id === blockId ? { ...b, content } : b)));
  };

  const handleDeleteBlock = (blockId: string) => {
    setBlocks(blocks.filter((b) => b.id !== blockId));
  };

  const moveBlock = (index: number, direction: 'up' | 'down') => {
    setBlocks((currentBlocks) => {
      const nextBlocks = [...currentBlocks];
      const targetIndex = direction === 'up' ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= nextBlocks.length) return currentBlocks;
      [nextBlocks[index], nextBlocks[targetIndex]] = [nextBlocks[targetIndex], nextBlocks[index]];
      return nextBlocks.map((block, idx) => ({ ...block, sort_order: idx + 1 }));
    });
  };

  const handleSave = async () => {
    if (!lesson) return;

    const savedScrollY = window.scrollY;
    setIsSaving(true);
    try {
      const orderedBlocks = blocks
        .slice()
        .sort((a, b) => a.sort_order - b.sort_order)
        .map((block, idx) => ({ ...block, sort_order: idx + 1 }));

      const currentBlockIds = orderedBlocks.filter((b) => !b.isNew).map((b) => b.id);
      const { data: dbBlocks, error: dbBlockError } = await supabase
        .from('content_blocks')
        .select('id')
        .eq('lesson_id', lessonId);

      if (dbBlockError) throw dbBlockError;

      const dbBlockIds = (dbBlocks || []).map((block) => block.id);
      const deletedIds = dbBlockIds.filter((id) => !currentBlockIds.includes(id));

      if (deletedIds.length > 0) {
        const { error } = await supabase.from('content_blocks').delete().in('id', deletedIds);
        if (error) throw error;
      }

      for (const block of orderedBlocks) {
        if (block.isNew) {
          const { error } = await supabase.from('content_blocks').insert({
            lesson_id: lessonId!,
            block_type: block.block_type as any,
            content: block.content,
            sort_order: block.sort_order,
          });
          if (error) throw error;
        } else {
          const { error } = await supabase
            .from('content_blocks')
            .update({ content: block.content, sort_order: block.sort_order })
            .eq('id', block.id);
          if (error) throw error;
        }
      }

      toast({ title: 'Content saved successfully' });
      await fetchLessonData();
      restoreWindowScroll(savedScrollY);
    } catch (error: any) {
      console.error('Save error:', error);
      toast({ variant: 'destructive', title: 'Error saving', description: error.message });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="p-6 lg:p-8 space-y-8">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-96 w-full" />
        </div>
      </DashboardLayout>
    );
  }

  if (!lesson) {
    return (
      <DashboardLayout>
        <div className="p-6 lg:p-8">
          <Card className="card-elevated">
            <CardContent className="flex flex-col items-center justify-center py-16">
              <h3 className="text-xl font-medium mb-4">Lesson not found</h3>
              <Button asChild>
                <Link to={`/admin/programs/${programId}`}>Back to Program</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="p-6 lg:p-8 space-y-6">
        {/* Header */}
        <div className="sticky top-16 z-20 rounded-3xl border border-border/70 bg-background/95 p-4 shadow-sm backdrop-blur-xl">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <Button variant="ghost" onClick={() => navigate(-1)}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
              <div>
                <h1 className="text-2xl font-heading font-bold">{lesson.title}</h1>
                <p className="text-sm text-muted-foreground">Edit lesson content</p>
              </div>
            </div>

            <div className="flex gap-2">
              <Dialog open={isAddBlockOpen} onOpenChange={setIsAddBlockOpen}>
                <Button variant="outline" onClick={() => setIsAddBlockOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Block
                </Button>
                <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add Content Block</DialogTitle>
                </DialogHeader>
                <div className="py-4">
                  <Label>Block Type</Label>
                  <Select value={newBlockType} onValueChange={setNewBlockType}>
                    <SelectTrigger className="mt-2">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="rich_text">
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4" />
                          Rich Text
                        </div>
                      </SelectItem>
                      <SelectItem value="hero">
                        <div className="flex items-center gap-2">
                          <BookOpen className="h-4 w-4" />
                          Hero
                        </div>
                      </SelectItem>
                      <SelectItem value="video">
                        <div className="flex items-center gap-2">
                          <Video className="h-4 w-4" />
                          Video
                        </div>
                      </SelectItem>
                      <SelectItem value="image">
                        <div className="flex items-center gap-2">
                          <ImageIcon className="h-4 w-4" />
                          Image
                        </div>
                      </SelectItem>
                      <SelectItem value="image_grid">
                        <div className="flex items-center gap-2">
                          <ImageIcon className="h-4 w-4" />
                          Image Grid
                        </div>
                      </SelectItem>
                      <SelectItem value="callout">
                        <div className="flex items-center gap-2">
                          <HelpCircle className="h-4 w-4" />
                          Callout
                        </div>
                      </SelectItem>
                      <SelectItem value="activity">
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="h-4 w-4" />
                          Activity
                        </div>
                      </SelectItem>
                      <SelectItem value="reflection">
                        <div className="flex items-center gap-2">
                          <MessageSquare className="h-4 w-4" />
                          Reflection
                        </div>
                      </SelectItem>
                      <SelectItem value="summary">
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4" />
                          Summary
                        </div>
                      </SelectItem>
                      <SelectItem value="quiz">
                        <div className="flex items-center gap-2">
                          <HelpCircle className="h-4 w-4" />
                          Quiz / Multiple Choice
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsAddBlockOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleAddBlock}>Add Block</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-2 h-4 w-4" />
              )}
              Save Changes
            </Button>
            </div>
          </div>
        </div>

        {/* Content Blocks */}
        <div className="space-y-4">
          {blocks.length === 0 ? (
            <Card className="card-elevated">
              <CardContent className="flex flex-col items-center justify-center py-16">
                <FileText className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">No content yet</h3>
                <p className="text-muted-foreground text-center mb-4">
                  Add content blocks to build your lesson.
                </p>
                <Button onClick={() => setIsAddBlockOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add First Block
                </Button>
              </CardContent>
            </Card>
          ) : (
            blocks.map((block, index) => (
              <div key={block.id} className="space-y-2">
                <div className="flex justify-end gap-2">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => moveBlock(index, 'up')}
                    disabled={index === 0}
                    aria-label="Move block up"
                  >
                    <ArrowUp className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => moveBlock(index, 'down')}
                    disabled={index === blocks.length - 1}
                    aria-label="Move block down"
                  >
                    <ArrowDown className="h-4 w-4" />
                  </Button>
                </div>
                <ContentBlockEditor
                  block={block}
                  onUpdate={(content) => handleUpdateBlock(block.id, content)}
                  onDelete={() => handleDeleteBlock(block.id)}
                />
              </div>
            ))
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}

function ContentBlockEditor({
  block,
  onUpdate,
  onDelete,
}: {
  block: ContentBlock;
  onUpdate: (content: any) => void;
  onDelete: () => void;
}) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3],
        },
      }),
      Underline,
      TiptapLink.configure({ openOnClick: false }),
      TiptapImage,
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      Table.configure({ resizable: true }),
      TableRow,
      TableCell,
      TableHeader,
      TextStyle,
      Blockquote,
    ],
    content: block.content?.html || '',
    onUpdate: ({ editor }) => {
      onUpdate({ html: editor.getHTML() });
    },
  });

  if (block.block_type === 'rich_text') {
    return (
      <Card className="card-elevated">
        <CardHeader className="flex flex-row items-center justify-between py-3">
          <div className="flex items-center gap-2">
            <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab" />
            <FileText className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">Rich Text</span>
          </div>
          <Button variant="ghost" size="icon" onClick={onDelete}>
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </CardHeader>
        <CardContent>
          {/* Toolbar - MVP Essentials */}
          <div className="flex flex-wrap gap-1 p-2 mb-3 items-center rounded-xl border border-input bg-muted/40 sticky top-0 z-10 backdrop-blur supports-[backdrop-filter]:bg-muted/60">
            {/* Headings */}
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 gap-1">
                  <Heading2 className="h-4 w-4" />
                  <span className="text-xs">Heading</span>
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-32 p-2">
                <div className="space-y-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full justify-start h-7 text-sm"
                    onClick={() => editor?.chain().focus().setHeading({ level: 1 }).run()}
                  >
                    H1
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full justify-start h-7 text-sm"
                    onClick={() => editor?.chain().focus().setHeading({ level: 2 }).run()}
                  >
                    H2
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full justify-start h-7 text-sm"
                    onClick={() => editor?.chain().focus().setHeading({ level: 3 }).run()}
                  >
                    H3
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full justify-start h-7"
                    onClick={() => editor?.chain().focus().setParagraph().run()}
                  >
                    Paragraph
                  </Button>
                </div>
              </PopoverContent>
            </Popover>

            <div className="w-px h-6 bg-border mx-1" />

            {/* Text Formatting */}
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => editor?.chain().focus().toggleBold().run()}
              data-active={editor?.isActive('bold')}
            >
              <Bold className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => editor?.chain().focus().toggleItalic().run()}
            >
              <Italic className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => editor?.chain().focus().toggleUnderline().run()}
            >
              <UnderlineIcon className="h-4 w-4" />
            </Button>

            <div className="w-px h-6 bg-border mx-1" />

            {/* Lists */}
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => editor?.chain().focus().toggleBulletList().run()}
            >
              <List className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => editor?.chain().focus().toggleOrderedList().run()}
            >
              <ListOrdered className="h-4 w-4" />
            </Button>

            <div className="w-px h-6 bg-border mx-1" />

            {/* Link */}
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => {
                const url = prompt('Enter URL:');
                if (url) {
                  editor?.chain().focus().setLink({ href: url }).run();
                }
              }}
            >
              <Link2 className="h-4 w-4" />
            </Button>

            {/* Blockquote */}
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => editor?.chain().focus().toggleBlockquote().run()}
            >
              <Quote className="h-4 w-4" />
            </Button>

            {/* Code Block */}
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => editor?.chain().focus().toggleCodeBlock().run()}
            >
              <Code className="h-4 w-4" />
            </Button>

            {/* Divider */}
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => editor?.chain().focus().setHorizontalRule().run()}
            >
              <Minus className="h-4 w-4" />
            </Button>

            <div className="w-px h-6 bg-border mx-1" />

            {/* Table Controls */}
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 gap-1">
                  <TableIcon className="h-4 w-4" />
                  <span className="text-xs">Table</span>
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-48 p-2">
                <div className="space-y-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full justify-start h-7"
                    onClick={() => editor?.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}
                  >
                    Insert Table
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full justify-start h-7"
                    onClick={() => editor?.chain().focus().addColumnAfter().run()}
                  >
                    Add Column
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full justify-start h-7"
                    onClick={() => editor?.chain().focus().addRowAfter().run()}
                  >
                    Add Row
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full justify-start h-7 text-destructive"
                    onClick={() => editor?.chain().focus().deleteTable().run()}
                  >
                    Delete Table
                  </Button>
                </div>
              </PopoverContent>
            </Popover>
          </div>

          <EditorContent
            editor={editor}
            className="tiptap-editor prose prose-slate dark:prose-invert max-w-none min-h-[260px] rounded-xl border border-input bg-background px-5 py-4 shadow-sm transition focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20 [&_.ProseMirror]:min-h-[220px] [&_.ProseMirror]:outline-none [&_.ProseMirror]:text-[16px] [&_.ProseMirror]:leading-[1.7] [&_.ProseMirror_p]:my-2 [&_.ProseMirror_h1]:text-[28px] [&_.ProseMirror_h1]:font-bold [&_.ProseMirror_h1]:mt-4 [&_.ProseMirror_h1]:mb-2 [&_.ProseMirror_h2]:text-[22px] [&_.ProseMirror_h2]:font-semibold [&_.ProseMirror_h2]:mt-4 [&_.ProseMirror_h2]:mb-2 [&_.ProseMirror_h3]:text-[18px] [&_.ProseMirror_h3]:font-semibold [&_.ProseMirror_h3]:mt-3 [&_.ProseMirror_h3]:mb-2 [&_.ProseMirror_ul]:list-disc [&_.ProseMirror_ul]:pl-6 [&_.ProseMirror_ol]:list-decimal [&_.ProseMirror_ol]:pl-6 [&_.ProseMirror_li]:my-1 [&_.ProseMirror_blockquote]:border-l-4 [&_.ProseMirror_blockquote]:border-slate-300 [&_.ProseMirror_blockquote]:bg-slate-50 [&_.ProseMirror_blockquote]:pl-4 [&_.ProseMirror_blockquote]:py-1 [&_.ProseMirror_blockquote]:text-slate-600 [&_.ProseMirror_blockquote]:rounded-r-md [&_.ProseMirror_blockquote]:my-3 [&_.ProseMirror_a]:text-blue-600 [&_.ProseMirror_a]:underline [&_.ProseMirror_a]:underline-offset-2 [&_.ProseMirror_code]:bg-slate-100 [&_.ProseMirror_code]:text-slate-900 [&_.ProseMirror_code]:px-1.5 [&_.ProseMirror_code]:py-0.5 [&_.ProseMirror_code]:rounded [&_.ProseMirror_code]:text-[0.9em] [&_.ProseMirror_code]:font-mono [&_.ProseMirror_pre]:bg-slate-900 [&_.ProseMirror_pre]:text-slate-100 [&_.ProseMirror_pre]:p-4 [&_.ProseMirror_pre]:rounded-lg [&_.ProseMirror_pre]:overflow-x-auto [&_.ProseMirror_pre]:my-3 [&_.ProseMirror_pre]:text-[14px] [&_.ProseMirror_pre_code]:bg-transparent [&_.ProseMirror_pre_code]:text-inherit [&_.ProseMirror_pre_code]:p-0 [&_.ProseMirror_hr]:my-6 [&_.ProseMirror_hr]:border-slate-200 [&_.ProseMirror_table]:w-full [&_.ProseMirror_table]:border-collapse [&_.ProseMirror_th]:border [&_.ProseMirror_th]:border-slate-300 [&_.ProseMirror_th]:bg-slate-100 [&_.ProseMirror_th]:p-2 [&_.ProseMirror_th]:text-left [&_.ProseMirror_td]:border [&_.ProseMirror_td]:border-slate-300 [&_.ProseMirror_td]:p-2 [&_.ProseMirror_p.is-editor-empty:first-child]:before:content-[attr(data-placeholder)] [&_.ProseMirror_p.is-editor-empty:first-child]:before:text-slate-400 [&_.ProseMirror_p.is-editor-empty:first-child]:before:float-left [&_.ProseMirror_p.is-editor-empty:first-child]:before:pointer-events-none [&_.ProseMirror_p.is-editor-empty:first-child]:before:h-0"
          />
        </CardContent>
      </Card>
    );
  }

  if (block.block_type === 'video') {
    return (
      <Card className="card-elevated">
        <CardHeader className="flex flex-row items-center justify-between py-3">
          <div className="flex items-center gap-2">
            <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab" />
            <Video className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">Video Embed</span>
          </div>
          <Button variant="ghost" size="icon" onClick={onDelete}>
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Title (optional)</Label>
            <Input
              value={block.content?.title || ''}
              onChange={(e) => onUpdate({ ...block.content, title: e.target.value })}
              placeholder="Video title..."
            />
          </div>
          <div className="space-y-2">
            <Label>Video URL (YouTube, Vimeo, Google Drive, Loom)</Label>
            <Input
              value={block.content?.url || ''}
              onChange={(e) => onUpdate({ ...block.content, url: e.target.value })}
              placeholder="https://www.youtube.com/watch?v=... or https://drive.google.com/file/d/..."
            />
            <p className="text-xs text-muted-foreground">
              Paste any YouTube, Vimeo, Google Drive, or Loom link - it will be converted automatically.
            </p>
          </div>
          {block.content?.url && (
            <div className="relative w-full min-h-[200px] overflow-hidden bg-black -mx-6 sm:min-h-[280px] md:aspect-video">
              <iframe
                src={getEmbedUrl(block.content.url)}
                title="Video preview"
                className="absolute inset-0 h-full w-full border-0"
                allowFullScreen
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              />
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  if (block.block_type === 'image') {
    return (
      <Card className="card-elevated">
        <CardHeader className="flex flex-row items-center justify-between py-3">
          <div className="flex items-center gap-2">
            <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab" />
            <ImageIcon className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">Image</span>
          </div>
          <Button variant="ghost" size="icon" onClick={onDelete}>
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Title (optional)</Label>
            <Input
              value={block.content?.title || ''}
              onChange={(e) => onUpdate({ ...block.content, title: e.target.value })}
              placeholder="Image title..."
            />
          </div>
          <div className="space-y-2">
            <Label>Image URL</Label>
            <Input
              value={block.content?.url || ''}
              onChange={(e) => onUpdate({ ...block.content, url: e.target.value })}
              placeholder="https://example.com/image.jpg"
            />
          </div>
          <div className="space-y-2">
            <Label>Caption (optional)</Label>
            <Input
              value={block.content?.caption || ''}
              onChange={(e) => onUpdate({ ...block.content, caption: e.target.value })}
              placeholder="Image caption..."
            />
          </div>
          <div className="space-y-2">
            <Label>Alt text (optional)</Label>
            <Input
              value={block.content?.alt || ''}
              onChange={(e) => onUpdate({ ...block.content, alt: e.target.value })}
              placeholder="Alternative text for accessibility"
            />
          </div>
          <div className="space-y-2">
            <Label>Display size</Label>
            <Select value={block.content?.display?.size || 'medium'} onValueChange={(value) => onUpdate({
              ...block.content,
              display: {
                ...(block.content?.display || {}),
                size: value,
              },
            })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="small">Small</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="large">Large</SelectItem>
                <SelectItem value="full">Full</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Alignment</Label>
            <Select value={block.content?.display?.alignment || 'center'} onValueChange={(value) => onUpdate({
              ...block.content,
              display: {
                ...(block.content?.display || {}),
                alignment: value,
              },
            })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="center">Center</SelectItem>
                <SelectItem value="left">Left</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {block.content?.url && (
            <img src={block.content.url} alt={block.content.alt || block.content.caption || ''} className="rounded-lg max-h-64 object-contain" />
          )}
        </CardContent>
      </Card>
    );
  }

  if (block.block_type === 'hero') {
    return (
      <Card className="card-elevated">
        <CardHeader className="flex flex-row items-center justify-between py-3">
          <div className="flex items-center gap-2">
            <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab" />
            <BookOpen className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">Hero</span>
          </div>
          <Button variant="ghost" size="icon" onClick={onDelete}>
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Title</Label>
            <Input
              value={block.content?.title || ''}
              onChange={(e) => onUpdate({ ...block.content, title: e.target.value })}
              placeholder="Hero title"
            />
          </div>
          <div className="space-y-2">
            <Label>Subtitle</Label>
            <Input
              value={block.content?.subtitle || ''}
              onChange={(e) => onUpdate({ ...block.content, subtitle: e.target.value })}
              placeholder="Hero subtitle"
            />
          </div>
          <div className="space-y-2">
            <Label>Description</Label>
            <BoldableTextarea
              value={block.content?.description || ''}
              onValueChange={(v) => onUpdate({ ...block.content, description: v })}
              placeholder="Short lesson introduction"
              rows={3}
            />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (block.block_type === 'callout') {
    return (
      <Card className="card-elevated">
        <CardHeader className="flex flex-row items-center justify-between py-3">
          <div className="flex items-center gap-2">
            <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab" />
            <HelpCircle className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">Callout</span>
          </div>
          <Button variant="ghost" size="icon" onClick={onDelete}>
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Type</Label>
            <Select
              value={block.content?.style || 'insight'}
              onValueChange={(value) => onUpdate({ ...block.content, style: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="insight">Insight</SelectItem>
                <SelectItem value="warning">Warning</SelectItem>
                <SelectItem value="definition">Definition</SelectItem>
                <SelectItem value="keypoint">Key point</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Text</Label>
            <BoldableTextarea
              value={block.content?.text || ''}
              onValueChange={(v) => onUpdate({ ...block.content, text: v })}
              placeholder="Explain this key idea..."
              rows={3}
            />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (block.block_type === 'reflection') {
    return (
      <Card className="card-elevated">
        <CardHeader className="flex flex-row items-center justify-between py-3">
          <div className="flex items-center gap-2">
            <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab" />
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">Reflection</span>
          </div>
          <Button variant="ghost" size="icon" onClick={onDelete}>
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Prompt</Label>
            <BoldableTextarea
              value={block.content?.prompt || ''}
              onValueChange={(v) => onUpdate({ ...block.content, prompt: v })}
              placeholder="Ask the learner to reflect on..."
              rows={3}
            />
          </div>
          <div className="space-y-2">
            <Label>Placeholder</Label>
            <Input
              value={block.content?.placeholder || 'Write your reflection here...'}
              onChange={(e) => onUpdate({ ...block.content, placeholder: e.target.value })}
              placeholder="Reflection placeholder text"
            />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (block.block_type === 'activity') {
    return (
      <Card className="card-elevated">
        <CardHeader className="flex flex-row items-center justify-between py-3">
          <div className="flex items-center gap-2">
            <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab" />
            <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">Activity</span>
          </div>
          <Button variant="ghost" size="icon" onClick={onDelete}>
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Title (optional)</Label>
            <Input
              value={block.content?.title || ''}
              onChange={(e) => onUpdate({ ...block.content, title: e.target.value })}
              placeholder="Activity title..."
            />
          </div>
          <div className="space-y-2">
            <Label>Description</Label>
            <BoldableTextarea
              value={block.content?.description || ''}
              onValueChange={(v) => onUpdate({ ...block.content, description: v })}
              placeholder={"Describe the activity. Press Enter for a new line, e.g.:\n- Step one\n- Step two\n- Step three"}
              rows={6}
            />
          </div>
          <div className="space-y-2">
            <Label>Instructions</Label>
            <BoldableTextarea
              value={block.content?.instructions || ''}
              onValueChange={(v) => onUpdate({ ...block.content, instructions: v })}
              placeholder={"Detailed instructions for the learner. Newlines are preserved."}
              rows={6}
            />
          </div>
          <div className="space-y-2">
            <Label>External link (optional)</Label>
            <Input
              value={block.content?.externalLink || ''}
              onChange={(e) => onUpdate({ ...block.content, externalLink: e.target.value })}
              placeholder="https://example.com"
            />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (block.block_type === 'summary') {
    return (
      <Card className="card-elevated">
        <CardHeader className="flex flex-row items-center justify-between py-3">
          <div className="flex items-center gap-2">
            <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab" />
            <FileText className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">Summary</span>
          </div>
          <Button variant="ghost" size="icon" onClick={onDelete}>
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Label>Summary content</Label>
            <BoldableTextarea
              mode="html"
              value={block.content?.html || ''}
              onValueChange={(v) => onUpdate({ ...block.content, html: v })}
              placeholder="Write a short recap or takeaway... HTML supported (e.g. <strong>, <ul>, <li>)."
              rows={4}
            />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (block.block_type === 'image_grid') {
    const images = block.content?.images || [];

    return (
      <Card className="card-elevated">
        <CardHeader className="flex flex-row items-center justify-between py-3">
          <div className="flex items-center gap-2">
            <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab" />
            <ImageIcon className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">Image Grid</span>
          </div>
          <Button variant="ghost" size="icon" onClick={onDelete}>
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Title (optional)</Label>
            <Input
              value={block.content?.title || ''}
              onChange={(e) => onUpdate({ ...block.content, title: e.target.value })}
              placeholder="Grid title..."
            />
          </div>
          {images.map((image: any, index: number) => (
            <Card key={image.id || index} className="border">
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between gap-4">
                  <Label>Image {index + 1}</Label>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onUpdate({
                      ...block.content,
                      images: images.filter((_: any, i: number) => i !== index),
                    })}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
                <Input
                  value={image.url || ''}
                  onChange={(e) => {
                    const updated = [...images];
                    updated[index] = { ...updated[index], url: e.target.value };
                    onUpdate({ ...block.content, images: updated });
                  }}
                  placeholder="Image URL"
                />
                <Input
                  value={image.caption || ''}
                  onChange={(e) => {
                    const updated = [...images];
                    updated[index] = { ...updated[index], caption: e.target.value };
                    onUpdate({ ...block.content, images: updated });
                  }}
                  placeholder="Caption"
                />
                <Input
                  value={image.alt || ''}
                  onChange={(e) => {
                    const updated = [...images];
                    updated[index] = { ...updated[index], alt: e.target.value };
                    onUpdate({ ...block.content, images: updated });
                  }}
                  placeholder="Alt text"
                />
              </CardContent>
            </Card>
          ))}

          <Button
            variant="outline"
            onClick={() => onUpdate({
              ...block.content,
              images: [
                ...images,
                { id: `img-${Date.now()}`, url: '', caption: '', alt: '' },
              ],
            })}
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Image
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (block.block_type === 'quiz') {
    return (
      <QuizBlockEditor
        content={block.content || { questions: [] }}
        onUpdate={onUpdate}
        onDelete={onDelete}
      />
    );
  }

  return null;
}
