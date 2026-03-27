"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

// ─── LOCKOUT CONFIG ───────────────────────────────────────────────────────────
const STORAGE_KEY = "cp6_auth_attempts";

function getLockoutData() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { attempts: 0, lockedUntil: null };
    return JSON.parse(raw);
  } catch { return { attempts: 0, lockedUntil: null }; }
}

function saveLockoutData(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function getLockoutDuration(attempts) {
  if (attempts <= 3)  return 5 * 60 * 1000;
  if (attempts <= 6)  return 30 * 60 * 1000;
  if (attempts <= 9)  return 2 * 60 * 60 * 1000;
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(0, 0, 0, 0);
  return tomorrow.getTime() - Date.now();
}

function formatCountdown(ms) {
  if (ms <= 0) return "0 detik";
  const totalSec = Math.ceil(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  if (h > 0) return `${h} jam ${m} menit`;
  if (m > 0) return `${m} menit ${s} detik`;
  return `${s} detik`;
}

// ─── COMPONENT ────────────────────────────────────────────────────────────────
export default function StaffLoginPage() {
  const router = useRouter();
  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [error,    setError]    = useState("");
  const [loading,  setLoading]  = useState(false);

  const [attempts,    setAttempts]    = useState(0);
  const [lockedUntil, setLockedUntil] = useState(null);
  const [countdown,   setCountdown]   = useState(0);
  const [shaking,     setShaking]     = useState(false);

  useEffect(() => {
    const data = getLockoutData();
    setAttempts(data.attempts || 0);
    setLockedUntil(data.lockedUntil || null);
  }, []);

  useEffect(() => {
    if (!lockedUntil) return;
    const tick = () => {
      const remaining = lockedUntil - Date.now();
      if (remaining <= 0) {
        setLockedUntil(null);
        setCountdown(0);
        setError("");
      } else {
        setCountdown(remaining);
      }
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [lockedUntil]);

  useEffect(() => {
    const user = localStorage.getItem("cp6_user");
    if (user) router.replace("/dashboard");
  }, [router]);

  const isLocked = lockedUntil && Date.now() < lockedUntil;

  function shake() {
    setShaking(true);
    setTimeout(() => setShaking(false), 500);
  }

  function getLockTierLabel(att) {
    if (att <= 3)  return "5 menit";
    if (att <= 6)  return "30 menit";
    if (att <= 9)  return "2 jam";
    return "sampai besok";
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (isLocked || loading) return;

    setLoading(true);
    setError("");

    try {
      // Use server-side auth API instead of checking credentials client-side
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password }),
      });

      if (res.ok) {
        const account = await res.json();
        saveLockoutData({ attempts: 0, lockedUntil: null });
        setAttempts(0);
        setLockedUntil(null);

        localStorage.setItem(
          "cp6_user",
          JSON.stringify({ email: account.email, role: account.role, name: account.name })
        );
        localStorage.setItem("cp6_role", account.role);

        await new Promise((r) => setTimeout(r, 200));
        router.replace("/dashboard");
      } else {
        // Login failed
        const newAttempts = attempts + 1;
        const shouldLock  = newAttempts % 3 === 0;
        const lockUntil   = shouldLock ? Date.now() + getLockoutDuration(newAttempts) : null;

        setAttempts(newAttempts);
        setLockedUntil(lockUntil);
        saveLockoutData({ attempts: newAttempts, lockedUntil: lockUntil });

        shake();

        if (newAttempts >= 12) {
          setError("Akun dikunci hingga besok pukul 00:00 karena terlalu banyak percobaan salah.");
        } else if (shouldLock) {
          const dur = getLockoutDuration(newAttempts);
          setError(`Terlalu banyak percobaan salah. Tunggu ${formatCountdown(dur)} sebelum coba lagi.`);
        } else {
          const remAfter = 3 - (newAttempts % 3);
          setError(`Email atau password salah. ${remAfter} percobaan tersisa sebelum dikunci.`);
        }
        setLoading(false);
      }
    } catch (err) {
      setError("Koneksi gagal. Coba lagi nanti.");
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#0d0d1a] flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-violet-900/20 rounded-full blur-3xl"/>
        <div className="absolute bottom-1/3 right-1/4 w-48 h-48 bg-indigo-900/20 rounded-full blur-3xl"/>
      </div>

      <div className={`w-full max-w-sm relative transition-transform duration-100 ${shaking ? "animate-shake" : ""}`}>
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-violet-500/15 border border-violet-500/25 mb-4">
            <span className="text-2xl">🗺️</span>
          </div>
          <h1 className="text-xl font-bold text-white tracking-tight">Comipara 6</h1>
          <p className="text-xs text-slate-500 mt-1">User Management Panel</p>
        </div>

        <div className="bg-white/[0.04] backdrop-blur-xl border border-white/[0.08] rounded-2xl p-6 shadow-2xl">

          {isLocked && (
            <div className="mb-4 p-3 bg-rose-500/15 border border-rose-500/25 rounded-xl">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-rose-400 text-sm">🔒</span>
                <span className="text-rose-300 text-xs font-semibold">Login Dikunci</span>
              </div>
              <p className="text-rose-300/80 text-[11px]">
                Coba lagi dalam <span className="font-bold text-rose-200">{formatCountdown(countdown)}</span>
              </p>
              {attempts >= 12 && (
                <p className="text-rose-400/70 text-[10px] mt-1">Kunci maksimal — coba lagi besok.</p>
              )}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-[11px] font-medium text-slate-400 mb-1.5">Email</label>
              <input
                type="email" value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="[username]@[given domain].com"
                required disabled={!!isLocked}
                className="w-full px-3 py-2.5 text-sm bg-white/[0.06] border border-white/[0.10] rounded-xl text-white placeholder-white/20 focus:outline-none focus:border-violet-500/60 focus:bg-white/[0.09] transition-all disabled:opacity-40"
              />
            </div>

            <div>
              <label className="block text-[11px] font-medium text-slate-400 mb-1.5">Password</label>
              <div className="relative">
                <input
                  type={showPass ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required disabled={!!isLocked}
                  className="w-full px-3 py-2.5 pr-24 text-sm bg-white/[0.06] border border-white/[0.10] rounded-xl text-white placeholder-white/20 focus:outline-none focus:border-violet-500/60 focus:bg-white/[0.09] transition-all disabled:opacity-40"
                />
                <button
                  type="button"
                  onClick={() => setShowPass((p) => !p)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 text-xs transition-colors"
                >
                  {showPass ? "Sembunyikan" : "Tampilkan"}
                </button>
              </div>
            </div>

            {!isLocked && attempts > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-slate-500">Percobaan:</span>
                <div className="flex gap-1">
                  {[1, 2, 3].map((i) => (
                    <div
                      key={i}
                      className={`w-2 h-2 rounded-full transition-all ${
                        i <= (attempts % 3 || (attempts > 0 && attempts % 3 === 0 ? 3 : 0))
                          ? "bg-rose-500"
                          : "bg-white/10"
                      }`}
                    />
                  ))}
                </div>
                <span className="text-[10px] text-slate-500">
                  (Kunci {getLockTierLabel(attempts + (3 - (attempts % 3 || 3)))} jika salah {3 - (attempts % 3) || 3}× lagi)
                </span>
              </div>
            )}

            {error && !isLocked && (
              <div className="flex gap-2 items-start px-3 py-2 bg-rose-500/15 border border-rose-500/20 rounded-xl">
                <span className="text-rose-400 text-xs mt-0.5">⚠</span>
                <p className="text-rose-300 text-[11px] leading-relaxed">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={!!isLocked || loading}
              className="w-full py-2.5 bg-violet-500 hover:bg-violet-400 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-xl transition-all active:scale-[0.98]"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin"/>
                  Memeriksa...
                </span>
              ) : isLocked
                ? `Tunggu ${formatCountdown(countdown)}`
                : "Masuk"}
            </button>
          </form>
        </div>

        <p className="text-center text-[10px] text-white/10 mt-6 select-none">
          Restricted Access · Comipara 6
        </p>
      </div>

      <style>{`
        @keyframes shake {
          0%,100%{transform:translateX(0)}
          20%{transform:translateX(-8px)}
          40%{transform:translateX(8px)}
          60%{transform:translateX(-6px)}
          80%{transform:translateX(6px)}
        }
        .animate-shake { animation: shake 0.5s ease-in-out; }
      `}</style>
    </div>
  );
}