import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import { RequireAuth } from "@/components/RequireAuth";
import AppLayout from "@/components/AppLayout";
import Index from "./pages/Index";
import Login from "./pages/Login";
import ResetPassword from "./pages/ResetPassword";
import Profile from "./pages/Profile";
import NotFound from "./pages/NotFound";
import AdminDashboard from "./pages/admin/AdminDashboard";
import FacultyManagement from "./pages/admin/FacultyManagement";
import Subjects from "./pages/admin/Subjects";
import UploadSheet from "./pages/admin/UploadSheet";
import Assign from "./pages/admin/Assign";
import Monitoring from "./pages/admin/Monitoring";
import Reports from "./pages/admin/Reports";
import FacultyDashboard from "./pages/faculty/FacultyDashboard";
import MyPapers from "./pages/faculty/MyPapers";
import EvaluateSheet from "./pages/faculty/EvaluateSheet";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/login" element={<Login />} />
            <Route path="/reset-password" element={<ResetPassword />} />

            {/* Admin */}
            <Route element={<RequireAuth role="admin" />}>
              <Route element={<AppLayout />}>
                <Route path="/admin" element={<AdminDashboard />} />
                <Route path="/admin/faculty" element={<FacultyManagement />} />
                <Route path="/admin/subjects" element={<Subjects />} />
                <Route path="/admin/upload" element={<UploadSheet />} />
                <Route path="/admin/assign" element={<Assign />} />
                <Route path="/admin/monitoring" element={<Monitoring />} />
                <Route path="/admin/reports" element={<Reports />} />
              </Route>
            </Route>

            {/* Faculty */}
            <Route element={<RequireAuth role="faculty" />}>
              <Route element={<AppLayout />}>
                <Route path="/faculty" element={<FacultyDashboard />} />
                <Route path="/faculty/papers" element={<MyPapers />} />
                <Route path="/faculty/history" element={<MyPapers historyOnly />} />
                <Route path="/faculty/evaluate/:sheetId" element={<EvaluateSheet />} />
              </Route>
            </Route>

            {/* Shared (any auth) */}
            <Route element={<RequireAuth />}>
              <Route element={<AppLayout />}>
                <Route path="/profile" element={<Profile />} />
              </Route>
            </Route>

            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </Toaster>
    </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
