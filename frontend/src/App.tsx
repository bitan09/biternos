import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { SocketProvider } from "./context/SocketContext";
import { RequireAuth, RequireAdmin } from "./components/RouteGuards";
import { AppLayout } from "./components/AppLayout";
import { ToastStack } from "./components/ToastStack";

import { LandingPage } from "./pages/LandingPage";
import { LoginPage } from "./pages/LoginPage";
import { SignupPage } from "./pages/SignupPage";
import { ForgotPasswordPage } from "./pages/ForgotPasswordPage";
import { ResetPasswordPage } from "./pages/ResetPasswordPage";
import { DashboardPage } from "./pages/DashboardPage";
import { NotificationsPage } from "./pages/NotificationsPage";
import { AdminPage } from "./pages/AdminPage";

import { ServerDetailLayout } from "./pages/server/ServerDetailLayout";
import { ConsoleTab } from "./pages/server/ConsoleTab";
import { FilesTab } from "./pages/server/FilesTab";
import { PropertiesTab } from "./pages/server/PropertiesTab";
import { PlayersTab } from "./pages/server/PlayersTab";
import { PluginsTab } from "./pages/server/PluginsTab";
import { BackupsTab } from "./pages/server/BackupsTab";
import { SettingsTab } from "./pages/server/SettingsTab";

export function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <SocketProvider>
          <ToastStack />
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/signup" element={<SignupPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />

            <Route element={<RequireAuth />}>
              <Route element={<AppLayout />}>
                <Route path="/dashboard" element={<DashboardPage />} />
                <Route path="/notifications" element={<NotificationsPage />} />

                <Route path="/servers/:id" element={<ServerDetailLayout />}>
                  <Route index element={<ConsoleTab />} />
                  <Route path="files" element={<FilesTab />} />
                  <Route path="properties" element={<PropertiesTab />} />
                  <Route path="players" element={<PlayersTab />} />
                  <Route path="plugins" element={<PluginsTab />} />
                  <Route path="backups" element={<BackupsTab />} />
                  <Route path="settings" element={<SettingsTab />} />
                </Route>

                <Route element={<RequireAdmin />}>
                  <Route path="/admin" element={<AdminPage />} />
                </Route>
              </Route>
            </Route>

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </SocketProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
