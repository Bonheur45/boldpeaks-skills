import { Link } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { FileText, Video, BookOpen, FileCheck } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Lesson {
  id: string;
  title: string;
  description: string | null;
  hasVideo?: boolean;
}

interface LessonCardProps {
  lesson: Lesson;
  programId: string;
  isCompleted: boolean;
}

export function LessonCard({ lesson, programId, isCompleted }: LessonCardProps) {
  const getLessonIcon = () => {
    const iconWrapperBase = "flex items-center justify-center w-14 h-14 rounded-full";
    
    if (isCompleted) {
      return (
        <div className={cn(iconWrapperBase, "bg-emerald-100")}>
          <FileCheck className="h-6 w-6 text-emerald-500" />
        </div>
      );
    }
    
    // Show video icon if lesson has video content
    if (lesson.hasVideo) {
      return (
        <div className={cn(iconWrapperBase, "bg-muted")}>
          <Video className="h-6 w-6 text-muted-foreground" />
        </div>
      );
    }
    
    return (
      <div className={cn(iconWrapperBase, "bg-muted")}>
        <BookOpen className="h-6 w-6 text-muted-foreground" />
      </div>
    );
  };

  return (
    <Link
      to={`/programs/${programId}/lessons/${lesson.id}`}
      className={cn(
        'group relative flex items-center gap-5 p-6 rounded-xl border bg-card transition-all duration-300 overflow-hidden',
        'hover:shadow-lg',
        // Full-height left border with matching corner radius
        'before:absolute before:left-0 before:top-0 before:bottom-0 before:w-1.5 before:rounded-l-3xl before:transition-all before:duration-300',
        isCompleted
          ? 'before:bg-emerald-400 before:shadow-[0_0_10px_rgba(52,211,153,0.5)]'
          : 'before:bg-muted-foreground/30'
      )}
    >
      {/* Icon */}
      {getLessonIcon()}

      {/* Content */}
      <div className="flex-1 min-w-0">
        <h4 className="font-semibold text-lg text-foreground group-hover:text-primary transition-colors">
          {lesson.title}
        </h4>
        {lesson.description && (
          <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
            {lesson.description}
          </p>
        )}
      </div>

    </Link>
  );
}