import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { useNavigate } from "react-router-dom";

function Admin() {
  const [subscriptions, setSubscriptions] = useState([]);
  const [winners, setWinners] = useState([]);
  const [drawNumbers, setDrawNumbers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isDrawing, setIsDrawing] = useState(false);
  const navigate = useNavigate();

  const fetchInitialData = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { navigate("/"); return; }

    const { data: subs } = await supabase.from("profiles").select("*").order("created_at", { ascending: false });
    const { data: win } = await supabase.from("winners").select("*").order("created_at", { ascending: false });

    setSubscriptions(subs || []);
    setWinners(win || []);
    setLoading(false);
  };

  useEffect(() => { fetchInitialData(); }, []);

  const runDraw = async () => {
    setIsDrawing(true);
    let nums = Array.from({length: 5}, () => Math.floor(Math.random() * 45) + 1);
    setDrawNumbers(nums);

    await supabase.from("draws").insert({ numbers: nums, created_at: new Date().toISOString() });
    
    const { data: activeUsers } = await supabase.from("profiles").select("id").eq("subscription_status", "active");
    if (activeUsers) {
      for (let u of activeUsers) {
        await supabase.from("winners").insert({ user_id: u.id, match_count: 2, prize: 500, status: "pending" });
      }
    }
    alert("Official Draw Executed!");
    fetchInitialData();
    setIsDrawing(false);
  };

  const updateStatus = async (winnerId, newStatus) => {
    const { error } = await supabase.from("winners").update({ status: newStatus }).eq("id", winnerId);
    if (!error) fetchInitialData();
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900 font-sans">
      {/* TOP NAVIGATION BAR */}
      <nav className="sticky top-0 z-50 bg-white border-b border-slate-200 px-4 py-3">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="bg-indigo-600 p-2 rounded-lg text-white">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <h1 className="text-xl font-black tracking-tight text-slate-800 uppercase">Admin Hub</h1>
          </div>
          <div className="flex items-center gap-4">
            <button onClick={() => navigate("/dashboard")} className="hidden md:block text-sm font-bold text-slate-500 hover:text-indigo-600 transition-colors">User Dashboard</button>
            <button 
              onClick={runDraw} 
              disabled={isDrawing}
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded-full text-sm font-bold shadow-lg shadow-indigo-100 transition-all disabled:opacity-50 flex items-center gap-2"
            >
              {isDrawing ? "Drawing..." : "Execute Draw"}
            </button>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* STATS SECTION */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
          <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
            <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">Total Audience</p>
            <p className="text-4xl font-black text-slate-800">{subscriptions.length}</p>
          </div>
          <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
            <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">Active Subscribers</p>
            <p className="text-4xl font-black text-emerald-500">{subscriptions.filter(s => s.subscription_status === 'active').length}</p>
          </div>
          <div className="bg-slate-900 p-6 rounded-3xl shadow-xl">
            <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">Latest Draw Results</p>
            <div className="flex gap-2 mt-2">
              {drawNumbers.length > 0 ? drawNumbers.map((n, i) => (
                <span key={i} className="bg-slate-800 text-white w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border border-slate-700">{n}</span>
              )) : <span className="text-slate-500 font-bold">No results yet</span>}
            </div>
          </div>
        </div>

        {/* MAIN DATA GRID */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* USERS TABLE */}
          <div className="lg:col-span-4">
            <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm">
              <div className="px-6 py-5 border-b border-slate-100">
                <h3 className="font-black text-slate-800 uppercase tracking-tight">User Directory</h3>
              </div>
              <div className="divide-y divide-slate-50 max-h-[500px] overflow-y-auto">
                {subscriptions.map((sub) => (
                  <div key={sub.id} className="px-6 py-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
                    <div>
                      <p className="text-xs font-mono text-slate-400">#{sub.id.substring(0, 6)}</p>
                      <p className="text-sm font-bold text-slate-700 uppercase">Standard Member</p>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase ${
                      sub.subscription_status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-50 text-red-600'
                    }`}>
                      {sub.subscription_status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* VERIFICATION SECTION */}
          <div className="lg:col-span-8">
            <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm">
              <div className="px-6 py-5 border-b border-slate-100 flex justify-between items-center">
                <h3 className="font-black text-slate-800 uppercase tracking-tight">Pending Verifications</h3>
                <span className="bg-amber-100 text-amber-700 px-3 py-1 rounded-full text-[10px] font-black">
                  {winners.filter(w => w.status === 'pending').length} ACTION NEEDED
                </span>
              </div>
              
              <div className="p-6">
                <div className="grid grid-cols-1 gap-4">
                  {winners.length === 0 && <p className="text-center py-10 text-slate-400 font-bold">No winning claims found.</p>}
                  {winners.map((w) => (
                    <div key={w.id} className={`p-5 rounded-[2rem] border ${w.status === 'paid' ? 'bg-slate-50 border-slate-100 opacity-60' : 'bg-white border-slate-200 shadow-sm'}`}>
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                             <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
                             <p className="text-xs font-black text-slate-400 uppercase tracking-tighter">Winner Reference: {w.user_id.substring(0, 8)}</p>
                          </div>
                          <p className="text-2xl font-black text-slate-800">₹{w.prize}</p>
                        </div>
                        
                        <div className="flex flex-wrap items-center gap-3">
                          {w.proof_url ? (
                            <a href={w.proof_url} target="_blank" rel="noreferrer" className="bg-slate-800 text-white px-5 py-2 rounded-2xl text-xs font-black hover:bg-black transition-all">View Proof</a>
                          ) : (
                            <span className="text-xs font-bold text-slate-400 italic px-4">Waiting for user upload...</span>
                          )}

                          {w.status === 'pending' && w.proof_url && (
                            <>
                              <button 
                                onClick={() => updateStatus(w.id, 'paid')} 
                                className="bg-emerald-500 text-white px-5 py-2 rounded-2xl text-xs font-black hover:bg-emerald-600 shadow-lg shadow-emerald-100 transition-all"
                              >
                                Approve
                              </button>
                              <button 
                                onClick={() => updateStatus(w.id, 'rejected')} 
                                className="bg-red-50 text-red-600 px-5 py-2 rounded-2xl text-xs font-black hover:bg-red-100 transition-all"
                              >
                                Reject
                              </button>
                            </>
                          )}

                          {w.status === 'paid' && (
                            <span className="flex items-center gap-1 text-emerald-600 font-black text-xs uppercase bg-emerald-50 px-4 py-2 rounded-2xl">
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                              </svg>
                              Paid
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default Admin;