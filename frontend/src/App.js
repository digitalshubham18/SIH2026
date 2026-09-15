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
import Grievances from "@/pages/Grievances";
import PublicJobs from "@/pages/PublicJobs";
import AdminLayout from "@/components/AdminLayout";
import AdminOverview from "@/pages/AdminOverview";
import AdminBookings from "@/pages/AdminBookings";
import AdminGrievances from "@/pages/AdminGrievances";
import AdminMandis from "@/pages/AdminMandis";
import AdminTodayCrops from "@/pages/AdminTodayCrops";
import AdminMachinery from "@/pages/AdminMachinery";
import AdminJobs from "@/pages/AdminJobs";
import AdminOfficers from "@/pages/AdminOfficers";
import OfficerRegister from "@/pages/OfficerRegister";

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
            <Route path="/officer-register" element={<OfficerRegister />} />
            <Route path="/mandis" element={<Mandis />} />
            <Route path="/queue/:mandiId" element={<QueueStatus />} />
            <Route path="/dashboard" element={<Protected><FarmerDashboard /></Protected>} />
            <Route path="/book" element={<Protected><BookSlot /></Protected>} />
            <Route path="/bookings" element={<Protected><MyBookings /></Protected>} />
            <Route path="/notifications" element={<Protected><Notifications /></Protected>} />
            <Route path="/grievances" element={<Protected><Grievances /></Protected>} />
            <Route path="/jobs" element={<PublicJobs />} />
            <Route path="/admin" element={<Protected role={["admin", "officer"]}><AdminLayout /></Protected>}>
              <Route index element={<AdminOverview />} />
              <Route path="today" element={<AdminTodayCrops />} />
              <Route path="bookings" element={<AdminBookings />} />
              <Route path="grievances" element={<AdminGrievances />} />
              <Route path="machinery" element={<AdminMachinery />} />
              <Route path="jobs" element={<AdminJobs />} />
              <Route path="officers" element={<AdminOfficers />} />
              <Route path="mandis" element={<AdminMandis />} />
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </LangProvider>
  );
}
