import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "./lib/supabaseClient";

// Page Components
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Dashboard from "./pages/Dashboard";
import Admin from "./pages/Admin";

function App() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 1. Check for an active session when the app loads
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    // 2. Listen for auth events (like when a user clicks 'Login' or 'Sign Out')
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    // Cleanup the listener when the app unmounts
    return () => subscription.unsubscribe();
  }, []);

  // Show a clean loading state so the screen doesn't flicker while checking auth
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 text-slate-600 font-medium">
        Loading Application...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans tracking-tight">
      <Router>
        <Routes>
          
          {/* PUBLIC ROUTES (Only accessible if the user is NOT logged in) */}
          <Route 
            path="/" 
            element={!session ? <Login /> : <Navigate to="/dashboard" replace />} 
          />
          <Route 
            path="/signup" 
            element={!session ? <Signup /> : <Navigate to="/dashboard" replace />} 
          />

          {/* PROTECTED ROUTES (Only accessible if the user IS logged in) */}
          <Route 
            path="/dashboard" 
            element={session ? <Dashboard /> : <Navigate to="/" replace />} 
          />
          <Route 
            path="/admin" 
            element={session ? <Admin /> : <Navigate to="/" replace />} 
          />
          
        </Routes>
      </Router>
    </div>
  );
}

export default App;