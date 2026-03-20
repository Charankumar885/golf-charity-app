import { useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { Link, useNavigate } from "react-router-dom";

function Signup() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null); // Added for clean inline errors
  
  const navigate = useNavigate();

  const handleSignup = async (e) => {
    e.preventDefault(); // Prevents page reload on form submit
    
    if (!email || !password) {
      setError("Please enter an email and password.");
      return;
    }

    setLoading(true);
    setError(null); // Clear previous errors

    // 1. Create user in Supabase Auth
    const { data, error: signUpError } = await supabase.auth.signUp({ 
      email, 
      password 
    });

    if (signUpError) {
      setError(signUpError.message);
      setLoading(false);
      return;
    }

    // 2. Insert initial profile (Stripe status defaults to inactive via DB schema)
    if (data?.user) {
      const { error: profileError } = await supabase
        .from("profiles")
        .insert([{ id: data.user.id }]);
        
      if (profileError) {
        console.error("Profile creation failed:", profileError);
        // We still navigate them, as the auth account was successfully created
      }
      
      navigate("/dashboard");
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 p-4">
      
      {/* APP HEADER */}
      <h1 className="text-2xl font-bold text-blue-600 mb-8">
        Golf Charity Platform ⛳
      </h1>
      
      <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100 w-full max-w-md">
        
        {/* TITLE */}
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold text-slate-800 mb-2">
            Create Account ✨
          </h2>
          <p className="text-slate-500">
            Join the platform today
          </p>
        </div>

        {/* ERROR MESSAGE DISPLAY */}
        {error && (
          <div className="mb-4 p-3 bg-red-50 text-red-600 text-sm rounded-lg border border-red-100 text-center">
            {error}
          </div>
        )}

        {/* FORM (Enables "Enter" key to submit) */}
        <form onSubmit={handleSignup} className="space-y-4">
          
          {/* EMAIL */}
          <input
            type="email"
            placeholder="Enter your email"
            className="w-full border border-slate-200 p-3 rounded-lg focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-colors"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          
          {/* PASSWORD */}
          <input
            type="password"
            placeholder="Create a password (min 6 chars)"
            className="w-full border border-slate-200 p-3 rounded-lg focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-colors"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
          />
          
          {/* BUTTON */}
          <button
            type="submit"
            disabled={loading}
            className={`w-full p-3 rounded-lg text-white font-semibold transition-colors ${
              loading
                ? "bg-slate-400 cursor-not-allowed"
                : "bg-emerald-600 hover:bg-emerald-700"
            }`}
          >
            {loading ? "Creating Account..." : "Sign Up"}
          </button>
        </form>

        {/* LOGIN LINK */}
        <p className="mt-6 text-center text-sm text-slate-500">
          Already have an account?{" "}
          <Link 
            to="/" 
            className="text-blue-600 font-medium hover:underline"
          >
            Login
          </Link>
        </p>
        
      </div>
    </div>
  );
}

export default Signup;