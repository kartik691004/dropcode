import { Navigate, Route, Routes } from "react-router-dom";
import AppLayout from "../components/layout/AppLayout";
import AuthPage from "../pages/AuthPage";
import IntroPage from "../pages/IntroPage";
import DashboardPage from "../pages/DashboardPage";
import UploadResourcePage from "../pages/UploadResourcePage";
import SearchFilterPage from "../pages/SearchFilterPage";
import ResourceDetailPage from "../pages/ResourceDetailPage";
import UserProfilePage from "../pages/UserProfilePage";
import ProtectedRoute from "./ProtectedRoute";

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<IntroPage />} />
      <Route path="/auth" element={<AuthPage />} />
      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/upload" element={<UploadResourcePage />} />
          <Route path="/search" element={<SearchFilterPage />} />
          <Route path="/resources/:id" element={<ResourceDetailPage />} />
          <Route path="/profile" element={<UserProfilePage />} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
