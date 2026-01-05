import { useEffect, useState, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import { Color } from '@tiptap/extension-color';
import { TextStyle } from '@tiptap/extension-text-style';
import {
  ArrowLeft,
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
  AlignLeft,
  AlignCenter,
  AlignRight,
  Link as LinkIcon,
  Loader2,
  HelpCircle,
  Table as TableIcon,
  Palette,
  Type,
} from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { getEmbedUrl } from '@/lib/videoUtils';
import { QuizBlockEditor } from '@/components/admin/QuizBlockEditor';

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

  const handleSave = async () => {
    if (!lesson) return;

    setIsSaving(true);
    try {
      // Delete removed blocks
      const existingIds = blocks.filter((b) => !b.isNew).map((b) => b.id);
      await supabase.from('content_blocks').delete().eq('lesson_id', lessonId).not('id', 'in', `(${existingIds.join(',')})`);

      // Upsert blocks
      for (const block of blocks) {
        if (block.isNew) {
        await supabase.from('content_blocks').insert({
          lesson_id: lessonId!,
          block_type: block.block_type as any,
          content: block.content,
          sort_order: block.sort_order,
        });
        } else {
          await supabase
            .from('content_blocks')
            .update({ content: block.content, sort_order: block.sort_order })
            .eq('id', block.id);
        }
      }

      toast({ title: 'Content saved successfully' });
      fetchLessonData();
    } catch (error: any) {
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
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" asChild>
              <Link to={`/admin/programs/${programId}`}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Link>
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
                      <SelectItem value="video">
                        <div className="flex items-center gap-2">
                          <Video className="h-4 w-4" />
                          Video Embed
                        </div>
                      </SelectItem>
                      <SelectItem value="image">
                        <div className="flex items-center gap-2">
                          <ImageIcon className="h-4 w-4" />
                          Image
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
              <ContentBlockEditor
                key={block.id}
                block={block}
                onUpdate={(content) => handleUpdateBlock(block.id, content)}
                onDelete={() => handleDeleteBlock(block.id)}
              />
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
  const [fontSize, setFontSize] = useState('16px');
  const [textColor, setTextColor] = useState('#000000');

  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      TiptapLink.configure({ openOnClick: false }),
      TiptapImage,
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      Table.configure({ resizable: true }),
      TableRow,
      TableCell,
      TableHeader,
      TextStyle,
      Color,
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
          {/* Toolbar */}
          <div className="flex flex-wrap gap-1 p-2 border-b mb-4 items-center">
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
            
            {/* Font Size */}
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 gap-1">
                  <Type className="h-4 w-4" />
                  <span className="text-xs">Size</span>
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-32 p-2">
                <div className="space-y-1">
                  {['12px', '14px', '16px', '18px', '20px', '24px', '28px', '32px'].map((size) => (
                    <Button
                      key={size}
                      variant="ghost"
                      size="sm"
                      className="w-full justify-start h-7"
                      onClick={() => {
                        setFontSize(size);
                        editor?.chain().focus().setMark('textStyle', { fontSize: size }).run();
                      }}
                    >
                      <span style={{ fontSize }}>{size}</span>
                    </Button>
                  ))}
                </div>
              </PopoverContent>
            </Popover>

            {/* Text Color */}
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 gap-1">
                  <Palette className="h-4 w-4" />
                  <span className="text-xs">Color</span>
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-48 p-2">
                <div className="grid grid-cols-6 gap-1">
                  {[
                    '#000000', '#374151', '#6b7280', '#ef4444', '#f97316', '#eab308',
                    '#22c55e', '#14b8a6', '#3b82f6', '#6366f1', '#8b5cf6', '#ec4899',
                  ].map((color) => (
                    <button
                      key={color}
                      className="w-6 h-6 rounded border border-border hover:scale-110 transition-transform"
                      style={{ backgroundColor: color }}
                      onClick={() => {
                        setTextColor(color);
                        editor?.chain().focus().setColor(color).run();
                      }}
                    />
                  ))}
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <Label className="text-xs">Custom:</Label>
                  <Input
                    type="color"
                    value={textColor}
                    onChange={(e) => {
                      setTextColor(e.target.value);
                      editor?.chain().focus().setColor(e.target.value).run();
                    }}
                    className="w-8 h-8 p-0 border-0"
                  />
                </div>
              </PopoverContent>
            </Popover>

            <div className="w-px h-6 bg-border mx-1" />
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
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => editor?.chain().focus().setTextAlign('left').run()}
            >
              <AlignLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => editor?.chain().focus().setTextAlign('center').run()}
            >
              <AlignCenter className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => editor?.chain().focus().setTextAlign('right').run()}
            >
              <AlignRight className="h-4 w-4" />
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
                    Insert 3x3 Table
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
            className="prose prose-slate dark:prose-invert max-w-none min-h-[200px] focus:outline-none"
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
            <div className="aspect-video rounded-lg overflow-hidden bg-muted">
              <iframe 
                src={getEmbedUrl(block.content.url)} 
                className="w-full h-full" 
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
          {block.content?.url && (
            <img src={block.content.url} alt={block.content.caption || ''} className="rounded-lg max-h-64 object-contain" />
          )}
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
