import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ThemeProvider } from "./contexts/ThemeContext";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import DashboardLayout from "./layouts/DashboardLayout";
import MetaDashboardLayout from "./layouts/MetaDashboardLayout";
import InstagramDashboardLayout from "./layouts/InstagramDashboardLayout";
import GoogleReviewDashboardLayout from "./layouts/GoogleReviewDashboardLayout";
import Login from "./pages/Login";
import ResetPassword from "./pages/ResetPassword";

// Meta user pages
import MetaDashboard from "./pages/meta/MetaDashboard";

import MetaWABA from "./pages/meta/MetaWABA";
import MetaNumbers from "./pages/meta/MetaNumbers";
import MetaTemplates from "./pages/meta/MetaTemplates";
import MetaChat from "./pages/meta/MetaChat";
import MetaCampaigns from "./pages/meta/MetaCampaigns";
import MetaAnalytics from "./pages/meta/MetaAnalytics";
import MetaSettings from "./pages/meta/MetaSettings";

// Instagram user pages
import InstagramDashboard from "./pages/instagram/InstagramDashboard";
import InstagramConnect from "./pages/instagram/InstagramConnect";
import InstagramAccount from "./pages/instagram/InstagramAccount";
import InstagramPosts from "./pages/instagram/InstagramPosts";
import InstagramDM from "./pages/instagram/InstagramDM";
import InstagramNotifications from "./pages/instagram/InstagramNotifications";
import InstagramCampaigns from "./pages/instagram/InstagramCampaigns";
import InstagramAnalytics from "./pages/instagram/InstagramAnalytics";
import InstagramSettings from "./pages/instagram/InstagramSettings";
import InstagramAIReply from "./pages/instagram/InstagramAIReply";
import InstagramAiAgent from "./pages/instagram/InstagramAiAgent";
import InstagramAdminDashboard from "./pages/instagram/admin/InstagramAdminDashboard";
import ReelCampaigns from "./pages/instagram/ReelCampaigns";
import ReelCampaignsV1 from "./pages/instagram/ReelCampaignsV1";
import ReelCampaignDetails from "./pages/instagram/ReelCampaignDetails";

// Google Review user pages
import {
  GoogleReviewDashboard,
  GoogleReviewConnect,
  GoogleReviewsList,
  GoogleReviewAnalytics,
  GoogleReviewSettings,
  GoogleReviewAdminDashboard,
} from "./pages/google-review";

// Meta admin pages
import AdminMetaDashboard from "./pages/meta/admin/AdminMetaDashboard";
import AdminMetaUsers from "./pages/meta/admin/AdminMetaUsers";
import AdminMetaBusiness from "./pages/meta/admin/AdminMetaBusiness";
import AdminMetaMessages from "./pages/meta/admin/AdminMetaMessages";
import AdminMetaTemplates from "./pages/meta/admin/AdminMetaTemplates";
import AdminMetaSettings from "./pages/meta/admin/AdminMetaSettings";

// Admin pages
import AdminDashboard from "./pages/admin/AdminDashboard";
import UserManagement from "./pages/admin/UserManagement";
import SessionMonitoring from "./pages/admin/SessionMonitoring";
import ApiUsageAdmin from "./pages/admin/ApiUsageAdmin";
import AdminAzureLogs from "./pages/admin/AdminAzureLogs";
import SystemAnalytics from "./pages/admin/SystemAnalytics";
import AdminSettings from "./pages/admin/AdminSettings";

// User pages
import UserDashboard from "./pages/user/UserDashboard";
import Sessions from "./pages/user/Sessions";
import Messages from "./pages/user/Messages";
import ApiKeys from "./pages/user/ApiKeys";
import ApiLogs from "./pages/user/ApiLogs";
import Analytics from "./pages/user/Analytics";
import UserSettings from "./pages/user/UserSettings";
import NumberLists from "./pages/user/NumberLists";
import Groups from "./pages/user/Groups";
import Campaigns from "./pages/user/Campaigns";
import MediaGallery from "./pages/user/MediaGallery";
import ApiDocs from "./pages/user/ApiDocs";
import SendSingleMessage from "./pages/user/SendSingleMessage";
import MessageHistory from "./pages/user/MessageHistory";
import Subscription from "./pages/user/Subscription";
import WhatsAppChats from "./pages/user/WhatsAppChats";
import AiAgent from "./pages/user/AiAgent";
import FlowBuilder from "./pages/user/FlowBuilder";
import CreateFlowPage from "./pages/user/CreateFlowPage";
// New admin pages
import CampaignManagement from "./pages/admin/CampaignManagement";
import MessageLogs from "./pages/admin/MessageLogs";
import AdminMediaFiles from "./pages/admin/AdminMediaFiles";
import PricingPlans from "./pages/admin/PricingPlans";
import AdminAiSettings from "./pages/admin/AdminAiSettings";
import AdminGoogleSettings from "./pages/admin/AdminGoogleSettings";
import FlowManagement from "./pages/admin/FlowManagement";

function ProtectedRoute({ children, adminOnly = false }) {
  const { isAuthenticated, isAdmin } = useAuth();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (adminOnly && !isAdmin) return <Navigate to="/dashboard" replace />;
  return children;
}

function RootRedirect() {
  const { isAuthenticated, isAdmin } = useAuth();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <Navigate to={isAdmin ? "/admin" : "/dashboard"} replace />;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="/" element={<RootRedirect />} />

      {/* Admin routes */}
      <Route
        path="/admin"
        element={
          <ProtectedRoute adminOnly>
            <DashboardLayout role="admin" />
          </ProtectedRoute>
        }
      >
        <Route index element={<AdminDashboard />} />
        <Route path="users" element={<UserManagement />} />
        <Route path="sessions" element={<SessionMonitoring />} />
        <Route path="api-usage" element={<ApiUsageAdmin />} />
        <Route path="analytics" element={<SystemAnalytics />} />
        <Route path="settings" element={<AdminSettings />} />
        <Route path="campaigns" element={<CampaignManagement />} />
        <Route path="msg-logs" element={<MessageLogs />} />
        <Route path="azure-logs" element={<AdminAzureLogs />} />
        <Route path="media" element={<AdminMediaFiles />} />
        <Route path="pricing" element={<PricingPlans />} />
        <Route path="ai-settings" element={<AdminAiSettings />} />
        <Route path="google-settings" element={<AdminGoogleSettings />} />
        <Route path="flows" element={<FlowManagement />} />
      </Route>

      {/* User routes */}
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <DashboardLayout role="user" />
          </ProtectedRoute>
        }
      >
        <Route index element={<UserDashboard />} />
        <Route path="sessions" element={<Sessions />} />
        <Route path="messages" element={<Messages />} />
        <Route path="send-message" element={<SendSingleMessage />} />
        <Route path="message-history" element={<MessageHistory />} />
        <Route path="api-keys" element={<ApiKeys />} />
        <Route path="api-logs" element={<ApiLogs />} />
        <Route path="api-docs" element={<ApiDocs />} />
        <Route path="analytics" element={<Analytics />} />
        <Route path="settings" element={<UserSettings />} />
        <Route path="subscription" element={<Subscription />} />
        <Route path="lists" element={<NumberLists />} />
        <Route path="groups" element={<Groups />} />
        <Route path="campaigns" element={<Campaigns />} />
        <Route path="media" element={<MediaGallery />} />
        <Route path="chats" element={<WhatsAppChats />} />
        <Route path="ai-agent" element={<AiAgent />} />
        <Route path="flow-builder" element={<FlowBuilder />} />
      </Route>

      {/* Meta routes (user panel) */}
      <Route
        path="/meta"
        element={
          <ProtectedRoute>
            <MetaDashboardLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<MetaDashboard />} />

        <Route path="waba" element={<MetaWABA />} />
        <Route path="numbers" element={<MetaNumbers />} />
        <Route path="templates" element={<MetaTemplates />} />
        <Route path="chat" element={<MetaChat />} />
        <Route path="campaigns" element={<MetaCampaigns />} />
        <Route path="analytics" element={<MetaAnalytics />} />
        <Route path="settings" element={<MetaSettings />} />

        {/* Meta admin sub-routes */}
        <Route path="admin" element={<AdminMetaDashboard />} />
        <Route path="admin/users" element={<AdminMetaUsers />} />
        <Route path="admin/businesses" element={<AdminMetaBusiness />} />
        <Route path="admin/messages" element={<AdminMetaMessages />} />
        <Route path="admin/templates" element={<AdminMetaTemplates />} />
        <Route path="admin/settings" element={<AdminMetaSettings />} />
      </Route>

      {/* Instagram routes */}
      <Route
        path="/instagram"
        element={
          <ProtectedRoute>
            <InstagramDashboardLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<InstagramDashboard />} />
        <Route path="connect" element={<InstagramConnect />} />
        <Route path="account" element={<InstagramAccount />} />
        <Route path="posts" element={<InstagramPosts />} />
        <Route path="dm" element={<InstagramDM />} />
        <Route path="notifications" element={<InstagramNotifications />} />
        <Route path="campaigns" element={<InstagramCampaigns />} />
        <Route path="reels" element={<ReelCampaigns />} />
        <Route path="reels-v1" element={<ReelCampaignsV1 />} />
        <Route path="reels/:id" element={<ReelCampaignDetails />} />
        <Route path="analytics" element={<InstagramAnalytics />} />
        <Route path="settings" element={<InstagramSettings />} />
        <Route path="ai-reply" element={<InstagramAIReply />} />
        <Route path="ai-agent" element={<InstagramAiAgent />} />
      </Route>

      <Route
        path="/instagram/admin"
        element={
          <ProtectedRoute adminOnly>
            <DashboardLayout role="admin" />
          </ProtectedRoute>
        }
      >
        <Route index element={<InstagramAdminDashboard />} />
      </Route>

      {/* Google Review routes */}
      <Route
        path="/google-review"
        element={
          <ProtectedRoute>
            <GoogleReviewDashboardLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<GoogleReviewDashboard />} />
        <Route path="connect" element={<GoogleReviewConnect />} />
        <Route path="reviews" element={<GoogleReviewsList />} />
        <Route path="analytics" element={<GoogleReviewAnalytics />} />
        <Route path="settings" element={<GoogleReviewSettings />} />
      </Route>

      <Route
        path="/google-review/admin"
        element={
          <ProtectedRoute adminOnly>
            <DashboardLayout role="admin" />
          </ProtectedRoute>
        }
      >
        <Route index element={<GoogleReviewAdminDashboard />} />
      </Route>

      {/* Full-screen Create Flow Page */}
      <Route
        path="/create-flow"
        element={
          <ProtectedRoute>
            <CreateFlowPage />
          </ProtectedRoute>
        }
      />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}
