import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { AuthGuard } from "@/components/auth/AuthGuard";
import { AuthDebugPanel } from "@/components/auth/AuthDebugPanel";

import LandingPage from "./pages/LandingPage";
import Dashboard from "./pages/Dashboard";
import Programs from "./pages/Programs";
import ProgramDetail from "./pages/ProgramDetail";
import LessonViewer from "./pages/LessonViewer";
import Assessment from "./pages/Assessment";
import Leaderboard from "./pages/Leaderboard";
import Certificates from "./pages/Certificates";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminLearningPathways from "./pages/admin/AdminLearningPathways";
import AdminPathwayDetail from "./pages/admin/AdminPathwayDetail";
import AdminPrograms from "./pages/admin/AdminPrograms";
import AdminProgramDetail from "./pages/admin/AdminProgramDetail";
import LessonEditor from "./pages/admin/LessonEditor";
import AdminStudents from "./pages/admin/AdminStudents";
import AdminAssessments from "./pages/admin/AdminAssessments";
import AdminInvites from "./pages/admin/AdminInvites";
import Settings from "./pages/Settings";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AuthDebugPanel />
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/dashboard" element={<AuthGuard><Dashboard /></AuthGuard>} />
            <Route path="/programs" element={<AuthGuard><Programs /></AuthGuard>} />
            <Route path="/programs/:programId" element={<AuthGuard><ProgramDetail /></AuthGuard>} />
            <Route path="/programs/:programId/lessons/:lessonId" element={<AuthGuard><LessonViewer /></AuthGuard>} />
            <Route path="/programs/:programId/lessons/:lessonId/assessment" element={<AuthGuard><Assessment /></AuthGuard>} />
            <Route path="/leaderboard" element={<AuthGuard><Leaderboard /></AuthGuard>} />
            <Route path="/certificates" element={<AuthGuard><Certificates /></AuthGuard>} />
            <Route path="/admin" element={<AuthGuard><AdminDashboard /></AuthGuard>} />
            <Route path="/admin/pathways" element={<AuthGuard><AdminLearningPathways /></AuthGuard>} />
            <Route path="/admin/pathways/:pathwayId" element={<AuthGuard><AdminPathwayDetail /></AuthGuard>} />
            <Route path="/admin/programs" element={<AuthGuard><AdminPrograms /></AuthGuard>} />
            <Route path="/admin/programs/:programId" element={<AuthGuard><AdminProgramDetail /></AuthGuard>} />
            <Route path="/admin/programs/:programId/lessons/:lessonId/edit" element={<AuthGuard><LessonEditor /></AuthGuard>} />
            <Route path="/admin/students" element={<AuthGuard><AdminStudents /></AuthGuard>} />
            <Route path="/admin/assessments" element={<AuthGuard><AdminAssessments /></AuthGuard>} />
            <Route path="/admin/invites" element={<AuthGuard><AdminInvites /></AuthGuard>} />
            <Route path="/settings" element={<AuthGuard><Settings /></AuthGuard>} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;