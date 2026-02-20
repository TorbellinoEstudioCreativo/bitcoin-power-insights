import { useState, FormEvent } from 'react';
import { Lock, ArrowRight, Shield } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

const PASSWORD_HASH = '81f801179dcb1c608caab94dea75c98a05670e5c196f96a4cf97b7f07c76d383';

async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

export function PasswordGate({ children }: { children: React.ReactNode }) {
  const { t } = useLanguage();
  const [authenticated, setAuthenticated] = useState(
    () => sessionStorage.getItem('authenticated') === 'true'
  );
  const [password, setPassword] = useState('');
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(false);

  if (authenticated) {
    return <>{children}</>;
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(false);

    const hash = await hashPassword(password);

    if (hash === PASSWORD_HASH) {
      sessionStorage.setItem('authenticated', 'true');
      setAuthenticated(true);
    } else {
      setError(true);
      setPassword('');
      setTimeout(() => setError(false), 600);
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex flex-col items-center justify-center relative overflow-hidden">
      {/* Dot grid background */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: 'radial-gradient(circle at 2px 2px, rgba(87, 249, 6, 0.03) 1px, transparent 0)',
          backgroundSize: '40px 40px',
        }}
      />

      {/* Green glow orbs */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-[#57f906]/5 blur-[120px] rounded-full" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-[#57f906]/5 blur-[120px] rounded-full" />

      <div className="w-full max-w-md px-6 py-12 relative z-10">
        {/* Logo + Title */}
        <div className="flex flex-col items-center mb-10">
          <div className="mb-4 text-[#57f906]">
            <svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M44 4H30.6666V17.3334H17.3334V30.6666H4V44H44V4Z" fill="currentColor" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold tracking-[0.2em] text-white uppercase text-center">
            {t('auth', 'title')}
          </h1>
          <p className="text-slate-400 text-xs mt-2 tracking-widest uppercase opacity-60">
            {t('auth', 'tagline')}
          </p>
        </div>

        {/* Glass card */}
        <div
          className="rounded-xl p-8 shadow-2xl"
          style={{
            background: 'rgba(22, 35, 15, 0.4)',
            backdropFilter: 'blur(12px)',
            border: '1px solid rgba(87, 249, 6, 0.1)',
          }}
        >
          {/* Badge */}
          <div className="flex justify-center mb-8">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#57f906]/10 border border-[#57f906]/20">
              <Shield className="w-3.5 h-3.5 text-[#57f906]" />
              <span className="text-[10px] font-bold tracking-widest text-[#57f906] uppercase">
                {t('auth', 'badge')}
              </span>
            </div>
          </div>

          <div className="space-y-6">
            {/* Session title */}
            <div className="text-center">
              <h2 className="text-lg font-medium text-white mb-1">
                {t('auth', 'sessionTitle')}
              </h2>
              <p className="text-slate-400 text-sm">
                {t('auth', 'sessionSubtitle')}
              </p>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 ml-1">
                  {t('auth', 'inputLabel')}
                </label>
                <div className="relative group">
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••••••"
                    className={`w-full bg-black/40 border rounded-lg py-4 px-12 text-white placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-[#57f906] focus:border-[#57f906] transition-all duration-300 ${
                      error
                        ? 'border-red-500 animate-[shake_0.3s_ease-in-out_0s_2]'
                        : 'border-white/10'
                    }`}
                    autoFocus
                    disabled={loading}
                  />
                  <Lock className={`absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 transition-colors ${
                    error ? 'text-red-500' : 'text-slate-500 group-focus-within:text-[#57f906]'
                  }`} />
                </div>
                {error && (
                  <p className="mt-2 text-xs text-red-400 font-medium ml-1">
                    {t('auth', 'error')}
                  </p>
                )}
              </div>

              <button
                type="submit"
                disabled={loading || !password}
                className="w-full bg-[#57f906] hover:bg-[#57f906]/90 disabled:bg-slate-800 disabled:text-slate-500 text-[#0a0a0a] font-bold py-4 rounded-lg flex items-center justify-center gap-2 transition-all active:scale-[0.98] group"
              >
                <span className="tracking-widest text-sm uppercase">
                  {loading ? '...' : t('auth', 'button')}
                </span>
                {!loading && (
                  <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
                )}
              </button>
            </form>

            {/* Card footer */}
            <div className="pt-4 flex items-center justify-between text-[10px] text-slate-500 font-medium uppercase tracking-tighter">
              <div className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-[#57f906] animate-pulse" />
                Live Server v4.0.2
              </div>
            </div>
          </div>
        </div>

        {/* Bottom security text */}
        <div className="mt-12 text-center space-y-2">
          <p className="text-[10px] text-slate-600 tracking-widest leading-loose uppercase">
            {t('auth', 'encrypted')}<br />
            {t('auth', 'unauthorized')}
          </p>
        </div>
      </div>

      {/* Copyright */}
      <div className="fixed bottom-6 text-[10px] text-slate-700 tracking-[0.3em] font-light uppercase">
        {t('auth', 'copyright')}
      </div>

      {/* Shake animation */}
      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-8px); }
          75% { transform: translateX(8px); }
        }
      `}</style>
    </div>
  );
}
