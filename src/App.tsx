import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";

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
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/programs" element={<Programs />} />
          <Route path="/programs/:programId" element={<ProgramDetail />} />
          <Route path="/programs/:programId/lessons/:lessonId" element={<LessonViewer />} />
          <Route path="/programs/:programId/lessons/:lessonId/assessment" element={<Assessment />} />
          <Route path="/leaderboard" element={<Leaderboard />} />
          <Route path="/certificates" element={<Certificates />} />
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/admin/pathways" element={<AdminLearningPathways />} />
          <Route path="/admin/pathways/:pathwayId" element={<AdminPathwayDetail />} />
          <Route path="/admin/programs" element={<AdminPrograms />} />
          <Route path="/admin/programs/:programId" element={<AdminProgramDetail />} />
          <Route path="/admin/programs/:programId/lessons/:lessonId/edit" element={<LessonEditor />} />
          <Route path="/admin/students" element={<AdminStudents />} />
          <Route path="/admin/assessments" element={<AdminAssessments />} />
          <Route path="/admin/invites" element={<AdminInvites />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;