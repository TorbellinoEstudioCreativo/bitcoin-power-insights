import { useState, FormEvent } from 'react';
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
    <div className="min-h-screen bg-[#0a0e17] flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Terminal-style card */}
        <div className="bg-[#111827] border border-[#1e293b] rounded-lg overflow-hidden shadow-2xl">
          {/* Terminal header bar */}
          <div className="flex items-center gap-2 px-4 py-2.5 bg-[#0d1117] border-b border-[#1e293b]">
            <div className="w-3 h-3 rounded-full bg-[#ff5f57]" />
            <div className="w-3 h-3 rounded-full bg-[#febc2e]" />
            <div className="w-3 h-3 rounded-full bg-[#28c840]" />
            <span className="ml-2 text-xs text-gray-500 font-mono">trader-legendario</span>
          </div>

          {/* Content */}
          <div className="p-6 space-y-6">
            <div className="text-center space-y-1">
              <h1 className="text-xl font-bold text-white tracking-tight">
                {t('auth', 'title')}
              </h1>
              <p className="text-sm text-gray-500 font-mono">
                {t('auth', 'subtitle')}
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={t('auth', 'placeholder')}
                  className={`w-full px-4 py-3 bg-[#0a0e17] border rounded-md text-white placeholder-gray-600 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-all ${
                    error
                      ? 'border-red-500 animate-[shake_0.3s_ease-in-out_0s_2]'
                      : 'border-[#1e293b]'
                  }`}
                  autoFocus
                  disabled={loading}
                />
                {error && (
                  <p className="mt-2 text-xs text-red-400 font-mono">
                    {t('auth', 'error')}
                  </p>
                )}
              </div>

              <button
                type="submit"
                disabled={loading || !password}
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 disabled:bg-gray-700 disabled:text-gray-500 text-white font-semibold rounded-md transition-colors text-sm"
              >
                {loading ? '...' : t('auth', 'button')}
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* Shake animation keyframes */}
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
