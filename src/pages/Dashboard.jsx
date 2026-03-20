import { useEffect, useState, useCallback } from "react";
import { supabase } from "../lib/supabaseClient";

function Dashboard() {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  // Stats & Winnings
  const [scores, setScores] = useState([]);
  const [score, setScore] = useState("");
  const [charities, setCharities] = useState([]);
  const [selectedCharity, setSelectedCharity] = useState("");
  const [percentage, setPercentage] = useState(10);
  const [userCharity, setUserCharity] = useState(null);
  const [drawNumbers, setDrawNumbers] = useState([]);
  const [prize, setPrize] = useState(0);
  const [lifetimeWon, setLifetimeWon] = useState(0); 
  const [activeWinnings, setActiveWinnings] = useState([]); 

  // 🔹 Fetch Winnings (Paid vs Pending)
  const fetchWinningsData = useCallback(async (userId) => {
    if (!userId) return;

    // 1. Calculate Lifetime Won (Only PAID status)
    const { data: paidWins } = await supabase
      .from("winners")
      .select("prize")
      .eq("user_id", userId)
      .eq("status", "paid");
    
    if (paidWins) {
      setLifetimeWon(paidWins.reduce((sum, win) => sum + (Number(win.prize) || 0), 0));
    }

    // 2. Get Pending/Rejected Wins
    const { data: actionWins } = await supabase
      .from("winners")
      .select("*")
      .eq("user_id", userId)
      .filter("status", "in", '("pending","rejected")')
      .order("created_at", { ascending: false });

    setActiveWinnings(actionWins || []);
  }, []);

  // 🔹 Initial Data Load
  useEffect(() => {
    const loadDashboard = async () => {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (authUser) {
        setUser(authUser);
        
        const [prof, sc, uc, ch] = await Promise.all([
          supabase.from("profiles").select("*").eq("id", authUser.id).maybeSingle(),
          supabase.from("scores").select("*").eq("user_id", authUser.id).order("created_at", { ascending: false }),
          supabase.from("user_charity").select(`*, charities(name)`).eq("user_id", authUser.id).maybeSingle(),
          supabase.from("charities").select("*")
        ]);

        setProfile(prof.data || { subscription_status: "inactive" });
        setScores(sc.data || []);
        setCharities(ch.data || []);

        if (uc.data) {
          setUserCharity(uc.data);
          setSelectedCharity(uc.data.charity_id);
          setPercentage(uc.data.percentage);
        }

        fetchWinningsData(authUser.id);
      }
      setLoading(false);
    };

    loadDashboard();
  }, [fetchWinningsData]);

  // 💳 Subscription
  const handleSubscribe = async () => {
    const { error } = await supabase.from("profiles").upsert({ id: user.id, subscription_status: "active" });
    if (!error) {
      setProfile((prev) => ({ ...prev, subscription_status: "active" }));
      alert("Subscription Activated!");
    }
  };

  // 🎯 Score Input
  const addScore = async () => {
    if (!score || score < 1 || score > 45) return alert("Enter 1-45");
    const { data: existing } = await supabase.from("scores").select("*").eq("user_id", user.id).order("created_at", { ascending: true });
    if (existing?.length >= 5) await supabase.from("scores").delete().eq("id", existing[0].id);

    const { error } = await supabase.from("scores").insert({ user_id: user.id, score: parseInt(score) });
    if (!error) {
      setScore("");
      const { data } = await supabase.from("scores").select("*").eq("user_id", user.id).order("created_at", { ascending: false });
      setScores(data || []);
    }
  };

  // ❤️ Charity Logic (Optimized for instant UI update)
  const saveCharity = async () => {
    if (!selectedCharity) return alert("Select a cause first!");
    const { error } = await supabase.from("user_charity").upsert({ 
      user_id: user.id, 
      charity_id: selectedCharity, 
      percentage: parseInt(percentage) 
    });

    if (!error) {
      // Logic Fix: Update local state immediately so donation card reflects change
      setUserCharity(prev => ({ ...prev, percentage: parseInt(percentage) }));
      alert("Preferences saved!");
    }
  };

  // 📸 Upload Proof
  const handleUploadProof = async (event, winnerId) => {
    const file = event.target.files[0];
    if (!file) return;
    try {
      setUploading(true);
      const fileName = `${user.id}/${winnerId}-${Date.now()}`;
      const { error: storageError } = await supabase.storage.from("proofs").upload(fileName, file);
      if (storageError) throw storageError;

      const { data: { publicUrl } } = supabase.storage.from("proofs").getPublicUrl(fileName);
      await supabase.from("winners").update({ proof_url: publicUrl }).eq("id", winnerId);
      
      alert("Proof uploaded!");
      fetchWinningsData(user.id);
    } catch (e) { alert(e.message); } finally { setUploading(false); }
  };

  // 🎰 Draw Simulator
  const generateDraw = async () => {
    if (activeWinnings.some(w => w.status === 'pending' && !w.proof_url)) return alert("Upload proof for existing win first!");
    const nums = Array.from({length: 5}, () => Math.floor(Math.random() * 45) + 1);
    setDrawNumbers(nums);
    setPrize(500);

    await supabase.from("winners").insert({
      user_id: user.id,
      match_count: 2,
      prize: 500,
      status: "pending",
    });
    fetchWinningsData(user.id);
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center font-black text-indigo-600 bg-slate-50 tracking-tighter">LOADING DASHBOARD...</div>;

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900 font-sans pb-12">
      {/* HEADER */}
      <nav className="bg-white border-b border-slate-200 px-6 py-4 mb-8">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <h1 className="text-2xl font-black text-indigo-600 tracking-tight italic">CHARITY DRAW⛳</h1>
          <div className="flex gap-4">
            <button onClick={() => window.location.href="/admin"} className="text-sm font-bold text-slate-400 hover:text-indigo-600">Admin Panel</button>
            <button onClick={() => supabase.auth.signOut().then(() => window.location.href="/")} className="text-sm font-bold text-red-400">Sign Out</button>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-6">
        {/* PROFILE HEADER */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm mb-8">
          <div>
            <h2 className="text-3xl font-black">{user?.email?.split('@')[0]}</h2>
            <p className="text-slate-400 font-medium">Account Status: <span className="uppercase text-indigo-500 font-bold">{profile?.subscription_status}</span></p>
          </div>
          <div className="flex items-center gap-3">
            <span className={`px-5 py-2 rounded-full text-[10px] font-black uppercase tracking-widest ${profile?.subscription_status === "active" ? "bg-emerald-100 text-emerald-700" : "bg-red-50 text-red-600"}`}>
              {profile?.subscription_status === "active" ? "Active Plan" : "No Plan"}
            </span>
            {profile?.subscription_status !== "active" && (
              <button onClick={handleSubscribe} className="bg-indigo-600 text-white font-black py-3 px-8 rounded-2xl shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all">Activate Account</button>
            )}
          </div>
        </div>

        {/* WINNER ALERT BANNER */}
        {activeWinnings.length > 0 && (
          <div className="mb-8 bg-indigo-600 p-8 rounded-[2.5rem] text-white shadow-xl relative overflow-hidden">
            <div className="relative z-10">
              <h3 className="text-xl font-black mb-1 flex items-center gap-2">🎉 Match Detected!</h3>
              <p className="text-indigo-100/70 mb-6 text-sm">Upload your physical scorecard to verify and claim prize money.</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {activeWinnings.map((win) => (
                  <div key={win.id} className="flex items-center justify-between bg-indigo-500/30 p-6 rounded-3xl border border-white/10 backdrop-blur-sm">
                    <div>
                      <p className="font-black text-3xl">₹{win.prize}</p>
                      <p className="text-[10px] font-black uppercase opacity-60 tracking-widest">{win.status}</p>
                    </div>
                    {win.proof_url ? (
                      <span className="bg-emerald-400 text-white px-5 py-2 rounded-xl font-black text-[10px] uppercase">Verified Proof</span>
                    ) : (
                      <label className="bg-white text-indigo-600 px-6 py-3 rounded-xl font-black text-[10px] uppercase cursor-pointer hover:scale-105 transition-all">
                        {uploading ? "Uploading..." : "Upload File"}
                        <input type="file" accept="image/*" className="hidden" onChange={(e) => handleUploadProof(e, win.id)} disabled={uploading} />
                      </label>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            {/* SCORE ENTRY */}
            <div className="bg-white p-10 rounded-[3rem] border border-slate-100 shadow-sm">
              <h3 className="text-xl font-black mb-8 flex items-center gap-2">🎯 Log Recent Entries</h3>
              <div className="flex gap-3 mb-10">
                <input type="number" className="bg-slate-50 border-none p-5 rounded-2xl w-full font-black text-xl placeholder-slate-300 focus:ring-2 focus:ring-indigo-500" value={score} onChange={e => setScore(e.target.value)} placeholder="00" />
                <button onClick={addScore} className="bg-indigo-600 text-white px-12 font-black rounded-2xl hover:bg-black transition-all shadow-lg shadow-indigo-100">Add</button>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                {scores.map((s) => (
                  <div key={s.id} className="bg-slate-50 p-6 rounded-3xl border border-slate-100 text-center hover:bg-white hover:shadow-md transition-all">
                    <p className="text-3xl font-black text-slate-700">{s.score}</p>
                    <p className="text-[9px] text-slate-400 font-bold uppercase mt-2">{new Date(s.created_at).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* STATS ROW */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-emerald-500 p-10 rounded-[3rem] text-white shadow-xl shadow-emerald-100 flex flex-col justify-between h-52">
                <p className="text-[10px] font-black uppercase tracking-widest opacity-60">Total Lifetime Winnings</p>
                <p className="text-7xl font-black">₹{lifetimeWon}</p>
              </div>
              <div className="bg-blue-600 p-10 rounded-[3rem] text-white shadow-xl shadow-blue-100 flex flex-col justify-between h-52">
                <p className="text-[10px] font-black uppercase tracking-widest opacity-60">Current Donation</p>
                <p className="text-7xl font-black">
                  {userCharity ? userCharity.percentage : percentage}%
                </p>
              </div>
            </div>
          </div>

          {/* SIDEBAR SECTION */}
          <div className="space-y-8">
            {/* CHARITY CONTROL */}
            <div className="bg-white p-10 rounded-[3rem] border border-slate-100 shadow-sm">
              <h3 className="text-xl font-black mb-8">❤️ Charity Split</h3>
              <select className="bg-slate-50 border-none p-5 rounded-2xl w-full font-black mb-6 text-slate-600" value={selectedCharity} onChange={e => setSelectedCharity(e.target.value)}>
                <option value="" disabled>Select Goal</option>
                {charities.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              <div className="flex justify-between items-center mb-8 px-2">
                 <span className="text-[10px] font-black text-slate-400 uppercase">Your Split</span>
                 <span className="text-2xl font-black text-blue-600">{percentage}%</span>
              </div>
              <input type="range" min="10" max="100" value={percentage} className="w-full h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer mb-10 accent-blue-600" onChange={(e) => setPercentage(e.target.value)} />
              <button onClick={saveCharity} className="w-full bg-slate-900 text-white py-5 rounded-2xl font-black text-sm shadow-xl shadow-slate-200 hover:scale-[1.02] transition-all">Update Preferences</button>
            </div>

            {/* DRAW SIMULATOR */}
            <div className="bg-slate-900 p-10 rounded-[3rem] text-white shadow-2xl relative overflow-hidden group">
              <div className="relative z-10">
                <h3 className="text-xl font-black mb-4">🎰 Draw Simulation</h3>
                <p className="text-slate-500 text-xs mb-10 font-bold">Simulate a draw to test your logic.</p>
                <button onClick={generateDraw} className="w-full bg-white text-slate-900 py-5 rounded-2xl font-black mb-8 hover:bg-indigo-50 transition-all active:scale-95">Run Simulator</button>
                {drawNumbers.length > 0 && (
                  <div className="pt-8 border-t border-white/10 animate-in fade-in duration-500">
                    <div className="flex justify-between mb-8">
                      {drawNumbers.map((n, i) => (
                        <div key={i} className="w-10 h-10 bg-slate-800 rounded-full flex items-center justify-center font-black text-xs border border-slate-700">{n}</div>
                      ))}
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] font-black text-slate-500 uppercase">Simulated Reward</span>
                      <span className="text-3xl font-black text-emerald-400">₹{prize}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default Dashboard;