import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";

import { AuthProvider } from "./contexts/AuthContext";
import AuthGuard from "./components/auth/AuthGuard";
import AdminGuard from "./components/auth/AdminGuard";

import LandingPage from "./pages/LandingPage";
import Auth from "./pages/Auth";
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
import AdminSettings from "./pages/admin/AdminSettings";
import Settings from "./pages/Settings";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/dashboard" element={<AuthGuard><Dashboard /></AuthGuard>} />
            <Route path="/programs" element={<AuthGuard><Programs /></AuthGuard>} />
            <Route path="/programs/:programId" element={<AuthGuard><ProgramDetail /></AuthGuard>} />
            <Route path="/programs/:programId/lessons/:lessonId" element={<AuthGuard><LessonViewer /></AuthGuard>} />
            <Route path="/programs/:programId/lessons/:lessonId/assessment" element={<AuthGuard><Assessment /></AuthGuard>} />
            <Route path="/leaderboard" element={<AuthGuard><Leaderboard /></AuthGuard>} />
            <Route path="/certificates" element={<AuthGuard><Certificates /></AuthGuard>} />
            <Route path="/admin" element={<AuthGuard><AdminGuard><AdminDashboard /></AdminGuard></AuthGuard>} />
            <Route path="/admin/pathways" element={<AuthGuard><AdminGuard><AdminLearningPathways /></AdminGuard></AuthGuard>} />
            <Route path="/admin/pathways/:pathwayId" element={<AuthGuard><AdminGuard><AdminPathwayDetail /></AdminGuard></AuthGuard>} />
            <Route path="/admin/programs" element={<AuthGuard><AdminGuard><AdminPrograms /></AdminGuard></AuthGuard>} />
            <Route path="/admin/programs/:programId" element={<AuthGuard><AdminGuard><AdminProgramDetail /></AdminGuard></AuthGuard>} />
            <Route path="/admin/programs/:programId/lessons/:lessonId/edit" element={<AuthGuard><AdminGuard><LessonEditor /></AdminGuard></AuthGuard>} />
            <Route path="/admin/students" element={<AuthGuard><AdminGuard><AdminStudents /></AdminGuard></AuthGuard>} />
            <Route path="/admin/assessments" element={<AuthGuard><AdminGuard><AdminAssessments /></AdminGuard></AuthGuard>} />
            <Route path="/admin/invites" element={<AuthGuard><AdminGuard><AdminInvites /></AdminGuard></AuthGuard>} />
            <Route path="/admin/settings" element={<AuthGuard><AdminGuard><AdminSettings /></AdminGuard></AuthGuard>} />
            <Route path="/settings" element={<AuthGuard><Settings /></AuthGuard>} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;