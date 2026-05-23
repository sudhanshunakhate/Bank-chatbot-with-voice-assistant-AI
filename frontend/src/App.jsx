import { Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext.jsx";
import { AppLayout } from "./components/AppLayout.jsx";
import { LoginPage } from "./pages/LoginPage.jsx";
import { RegisterPage } from "./pages/RegisterPage.jsx";
import { DashboardPage } from "./pages/DashboardPage.jsx";
import { TransactionsPage } from "./pages/TransactionsPage.jsx";
import { ExpensesPage } from "./pages/ExpensesPage.jsx";
import { AdvisorPage } from "./pages/AdvisorPage.jsx";
import { ProfilePage } from "./pages/ProfilePage.jsx";

function PrivateRoute({ children }) {
  const { token, loading } = useAuth();
  if (loading) {
    return (
      <div className="page-center muted">
        <div className="spinner" aria-hidden />
        <p>Loading your workspace…</p>
      </div>
    );
  }
  if (!token) return <Navigate to="/login" replace />;
  return children;
}

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route
          path="/"
          element={
            <PrivateRoute>
              <AppLayout />
            </PrivateRoute>
          }
        >
          <Route index element={<DashboardPage />} />
          <Route path="transactions" element={<TransactionsPage />} />
          <Route path="expenses" element={<ExpensesPage />} />
          <Route path="advisor" element={<AdvisorPage />} />
          <Route path="profile" element={<ProfilePage />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AuthProvider>
  );
}
