import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/context/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import Dashboard from "./pages/Dashboard";
import ClientsPage from "./pages/clients/ClientsPage";
import NewClientPage from "./pages/clients/NewClientPage";
import EditClientPage from "./pages/clients/EditClientPage";
import ProductsPage from "./pages/products/ProductsPage";
import NewProductPage from "./pages/products/NewProductPage";
import EditProductPage from "./pages/products/EditProductPage";
import ContractsPage from "./pages/contracts/ContractsPage";
import ContractBuilderPage from "./pages/contracts/ContractBuilderPage";
import EditContractPage from "./pages/contracts/EditContractPage";
import AuditPage from "./pages/audit/AuditPage";
import UsersPage from "./pages/users/UsersPage";
import AuthPage from "./pages/auth/AuthPage";
import SelectionFieldsPage from "./pages/settings/SelectionFieldsPage";
import ReportsPage from "./pages/reports/ReportsPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/auth" element={<AuthPage />} />
            <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/clients" element={<ProtectedRoute><ClientsPage /></ProtectedRoute>} />
            <Route path="/clients/new" element={<ProtectedRoute><NewClientPage /></ProtectedRoute>} />
            <Route path="/clients/:id" element={<ProtectedRoute><EditClientPage /></ProtectedRoute>} />
            <Route path="/products" element={<ProtectedRoute><ProductsPage /></ProtectedRoute>} />
            <Route path="/products/new" element={<ProtectedRoute><NewProductPage /></ProtectedRoute>} />
            <Route path="/products/:id" element={<ProtectedRoute><EditProductPage /></ProtectedRoute>} />
            <Route path="/contracts" element={<ProtectedRoute><ContractsPage /></ProtectedRoute>} />
            <Route path="/contracts/new" element={<ProtectedRoute><ContractBuilderPage /></ProtectedRoute>} />
            <Route path="/contracts/:id" element={<ProtectedRoute><EditContractPage /></ProtectedRoute>} />
            <Route path="/audit" element={<ProtectedRoute><AuditPage /></ProtectedRoute>} />
            <Route path="/users" element={<ProtectedRoute><UsersPage /></ProtectedRoute>} />
            <Route path="/settings/fields" element={<ProtectedRoute><SelectionFieldsPage /></ProtectedRoute>} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
