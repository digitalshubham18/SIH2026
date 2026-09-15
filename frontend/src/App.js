import "@/App.css";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "sonner";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { LangProvider } from "@/contexts/LangContext";
import Landing from "@/pages/Landing";
import Login from "@/pages/Login";
import Register from "@/pages/Register";
import FarmerDashboard from "@/pages/FarmerDashboard";
import BookSlot from "@/pages/BookSlot";
import Mandis from "@/pages/Mandis";
import QueueStatus from "@/pages/QueueStatus";
import MyBookings from "@/pages/MyBookings";
import Notifications from "@/pages/Notifications";
import AdminDashboard from "@/pages/AdminDashboard";

function Protected({ children, role }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="min-h-screen flex items-center justify-center text-emerald-800">Loading…</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (role && !role.includes(user.role)) return <Navigate to="/dashboard" replace />;
  return children;
}

export default function App() {
  return (
    <LangProvider>
      <AuthProvider>
        <BrowserRouter>
          <Toaster position="top-right" richColors />
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/mandis" element={<Mandis />} />
            <Route path="/queue/:mandiId" element={<QueueStatus />} />
            <Route path="/dashboard" element={<Protected><FarmerDashboard /></Protected>} />
            <Route path="/book" element={<Protected><BookSlot /></Protected>} />
            <Route path="/bookings" element={<Protected><MyBookings /></Protected>} />
            <Route path="/notifications" element={<Protected><Notifications /></Protected>} />
            <Route path="/admin" element={<Protected role={["admin", "officer"]}><AdminDashboard /></Protected>} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </LangProvider>
  );
}
