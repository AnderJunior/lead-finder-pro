import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { SuperAdminRoute } from "@/components/SuperAdminRoute";
import Index from "./pages/Index";
import Leads from "./pages/Leads";
import SearchPage from "./pages/SearchPage";
import Login from "./pages/Login";
import UsersPage from "./pages/Users";
import SettingsPage from "./pages/Settings";
import Funil from "./pages/Funil";
import LeadDetails from "./pages/LeadDetails";
import Ranking from "./pages/Ranking";
import BuscasRealizadas from "./pages/BuscasRealizadas";
import Relatorios from "./pages/Relatorios";
import ResetPassword from "./pages/ResetPassword";
import NotFound from "./pages/NotFound";
import SuperAdminDashboard from "./pages/admin/SuperAdminDashboard";
import SuperAdminEmpresas from "./pages/admin/SuperAdminEmpresas";
import SuperAdminPlanos from "./pages/admin/SuperAdminPlanos";
import SuperAdminAssinaturas from "./pages/admin/SuperAdminAssinaturas";
import SuperAdminFinanceiro from "./pages/admin/SuperAdminFinanceiro";
import SuperAdminEmpresaDetalhes from "./pages/admin/SuperAdminEmpresaDetalhes";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/reset-password" element={<ResetPassword />} />

            {/* Super Admin Backoffice */}
            <Route path="/admin" element={<SuperAdminRoute><SuperAdminDashboard /></SuperAdminRoute>} />
            <Route path="/admin/empresas" element={<SuperAdminRoute><SuperAdminEmpresas /></SuperAdminRoute>} />
            <Route path="/admin/empresas/:id" element={<SuperAdminRoute><SuperAdminEmpresaDetalhes /></SuperAdminRoute>} />
            <Route path="/admin/planos" element={<SuperAdminRoute><SuperAdminPlanos /></SuperAdminRoute>} />
            <Route path="/admin/assinaturas" element={<SuperAdminRoute><SuperAdminAssinaturas /></SuperAdminRoute>} />
            <Route path="/admin/financeiro" element={<SuperAdminRoute><SuperAdminFinanceiro /></SuperAdminRoute>} />

            {/* App normal */}
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <Index />
                </ProtectedRoute>
              }
            />
            <Route
              path="/search"
              element={
                <ProtectedRoute>
                  <SearchPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/buscas-realizadas"
              element={
                <ProtectedRoute>
                  <BuscasRealizadas />
                </ProtectedRoute>
              }
            />
            <Route
              path="/leads"
              element={
                <ProtectedRoute>
                  <Leads />
                </ProtectedRoute>
              }
            />
            <Route
              path="/funil"
              element={
                <ProtectedRoute>
                  <Funil />
                </ProtectedRoute>
              }
            />
            <Route
              path="/lead/:id"
              element={
                <ProtectedRoute>
                  <LeadDetails />
                </ProtectedRoute>
              }
            />
            <Route
              path="/users"
              element={
                <ProtectedRoute>
                  <UsersPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/ranking"
              element={
                <ProtectedRoute>
                  <Ranking />
                </ProtectedRoute>
              }
            />
            <Route
              path="/relatorios"
              element={
                <ProtectedRoute>
                  <Relatorios />
                </ProtectedRoute>
              }
            />
            <Route
              path="/settings"
              element={
                <ProtectedRoute>
                  <SettingsPage />
                </ProtectedRoute>
              }
            />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
