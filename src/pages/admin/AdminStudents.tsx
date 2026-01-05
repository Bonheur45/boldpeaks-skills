import { useEffect, useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { Users, Search, Trash2 } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
interface Student {
  id: string;
  email: string;
  full_name: string | null;
  created_at: string;
  enrollments: { program_id: string; program_title: string }[];
  certificates_count: number;
}

interface Program {
  id: string;
  title: string;
}

export default function AdminStudents() {
  const [students, setStudents] = useState<Student[]>([]);
  const [programs, setPrograms] = useState<Program[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProgram, setSelectedProgram] = useState<string>('all');
  const { toast } = useToast();

  useEffect(() => {
    fetchData();
  }, []);

  const handleDeleteStudent = async (studentId: string, studentName: string) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .delete()
        .eq('id', studentId);

      if (error) throw error;

      setStudents(students.filter(s => s.id !== studentId));
      toast({
        title: 'Student removed',
        description: `${studentName} has been removed successfully.`,
      });
    } catch (error) {
      console.error('Error deleting student:', error);
      toast({
        title: 'Error',
        description: 'Failed to remove student. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const fetchData = async () => {
    try {
      const [profilesRes, programsRes] = await Promise.all([
        supabase.from('profiles').select('*').order('created_at', { ascending: false }),
        supabase.from('programs').select('id, title'),
      ]);

      setPrograms(programsRes.data || []);

      // Fetch enrollments and certificates for each student
      const studentsData = await Promise.all(
        (profilesRes.data || []).map(async (profile) => {
          const [enrollmentsRes, certificatesRes] = await Promise.all([
            supabase
              .from('enrollments')
              .select('program_id, program:programs(title)')
              .eq('user_id', profile.id),
            supabase
              .from('certificates')
              .select('id', { count: 'exact', head: true })
              .eq('user_id', profile.id),
          ]);

          return {
            id: profile.id,
            email: profile.email,
            full_name: profile.full_name,
            created_at: profile.created_at,
            enrollments: (enrollmentsRes.data || []).map((e: any) => ({
              program_id: e.program_id,
              program_title: e.program?.title || 'Unknown',
            })),
            certificates_count: certificatesRes.count || 0,
          };
        })
      );

      setStudents(studentsData);
    } catch (error) {
      console.error('Error fetching students:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getInitials = (name?: string | null, email?: string) => {
    if (name) {
      return name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);
    }
    return email?.charAt(0).toUpperCase() || '?';
  };

  const filteredStudents = students.filter((student) => {
    const matchesSearch =
      student.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      student.full_name?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesProgram =
      selectedProgram === 'all' ||
      student.enrollments.some((e) => e.program_id === selectedProgram);

    return matchesSearch && matchesProgram;
  });

  return (
    <DashboardLayout>
      <div className="p-6 lg:p-8 space-y-8">
        {/* Header */}
        <div className="space-y-2">
          <h1 className="text-3xl font-heading font-bold text-foreground flex items-center gap-3">
            <Users className="h-8 w-8 text-primary" />
            Students
          </h1>
          <p className="text-muted-foreground">
            View and manage student enrollments and progress.
          </p>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={selectedProgram} onValueChange={setSelectedProgram}>
            <SelectTrigger className="w-64">
              <SelectValue placeholder="Filter by program" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Programs</SelectItem>
              {programs.map((program) => (
                <SelectItem key={program.id} value={program.id}>
                  {program.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Students Table */}
        <Card className="card-elevated">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>All Students</CardTitle>
                <CardDescription>{filteredStudents.length} students found</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-4">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="flex items-center gap-4">
                    <Skeleton className="h-10 w-10 rounded-full" />
                    <div className="space-y-2 flex-1">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-3 w-48" />
                    </div>
                  </div>
                ))}
              </div>
            ) : filteredStudents.length === 0 ? (
              <div className="text-center py-12">
                <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">No students found</h3>
                <p className="text-muted-foreground">
                  {searchQuery ? 'Try adjusting your search.' : 'Students will appear here when they sign up.'}
                </p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Student</TableHead>
                    <TableHead>Enrolled Programs</TableHead>
                    <TableHead>Certificates</TableHead>
                    <TableHead>Joined</TableHead>
                    <TableHead className="w-[80px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredStudents.map((student) => (
                    <TableRow key={student.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar>
                            <AvatarFallback>
                              {getInitials(student.full_name, student.email)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium">
                              {student.full_name || 'No name'}
                            </p>
                            <p className="text-sm text-muted-foreground">{student.email}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {student.enrollments.length === 0 ? (
                            <span className="text-muted-foreground text-sm">None</span>
                          ) : (
                            student.enrollments.slice(0, 2).map((e) => (
                              <Badge key={e.program_id} variant="secondary" className="text-xs">
                                {e.program_title}
                              </Badge>
                            ))
                          )}
                          {student.enrollments.length > 2 && (
                            <Badge variant="outline" className="text-xs">
                              +{student.enrollments.length - 2} more
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={student.certificates_count > 0 ? 'default' : 'outline'}>
                          {student.certificates_count}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {format(new Date(student.created_at), 'MMM d, yyyy')}
                      </TableCell>
                      <TableCell>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Remove Student</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to remove {student.full_name || student.email}? This will delete their profile and all associated data. This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDeleteStudent(student.id, student.full_name || student.email)}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                Remove
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
