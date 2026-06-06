/**
 * EXAMPLE: How to add MessageBuilder to App.jsx routing
 * 
 * Copy this into your frontend/src/App.jsx
 */

import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ThemeProvider } from "./contexts/ThemeContext";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import DashboardLayout from "./layouts/DashboardLayout";

// Import Message Builder Page
import MessageBuilderPage from "./pages/MessageBuilderPage";

// ... other imports ...

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            {/* Existing routes... */}
            
            {/* ADD THIS NEW ROUTE */}
            <Route 
              path="/messages/builder" 
              element={
                <DashboardLayout>
                  <MessageBuilderPage />
                </DashboardLayout>
              } 
            />
            
            {/* ... rest of routes ... */}
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;

/**
 * NAVIGATION EXAMPLE
 * 
 * Add this to your Sidebar.jsx or Navigation.jsx:
 */

// Option 1: Using Link
import { Link } from "react-router-dom";

<Link 
  to="/messages/builder" 
  className="flex items-center gap-2 px-4 py-2 rounded-lg hover:bg-blue-100"
>
  <span className="text-xl">📨</span>
  <span>Message Builder</span>
</Link>

// Option 2: Using navigate()
import { useNavigate } from "react-router-dom";

const navigate = useNavigate();

<button 
  onClick={() => navigate("/messages/builder")}
  className="flex items-center gap-2 px-4 py-2 rounded-lg hover:bg-blue-100"
>
  <span className="text-xl">📨</span>
  <span>Message Builder</span>
</button>

/**
 * ALTERNATIVE: Direct Component Usage
 * 
 * If you want to embed MessageBuilder in an existing page:
 */

import { MessageBuilder } from "./components/messageBuilder";

export default function MyDashboard() {
  return (
    <div>
      <h1>Dashboard</h1>
      <MessageBuilder /> {/* Embeds the builder inline */}
    </div>
  );
}
