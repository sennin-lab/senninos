import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { User, Lock, Eye, EyeOff, Loader2, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import SenniLogo from './SenniLogo';
import lockscreenBg from '@/assets/lockscreen.jpg';

interface LoginScreenProps {
  onLogin: (username: string, password: string) => Promise<{ error: { message: string } | null }>;
  onSignUp: (username: string, password: string) => Promise<{ error: { message: string } | null }>;
}

export default function LoginScreen({ onLogin, onSignUp }: LoginScreenProps) {
  const [locked, setLocked] = useState(true);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [time, setTime] = useState(new Date());
  useEffect(() => {
    const interval = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSignUp && password !== confirmPassword) { setError('パスワードが一致しません'); return; }
    setLoading(true); setError('');
    try {
      const { error } = await (isSignUp ? onSignUp : onLogin)(username, password);
      if (error) {
        const messages: Record<string, string> = {
          'Invalid login credentials': 'ユーザー名またはパスワードが正しくありません',
          'User already registered': 'このユーザー名は既に使用されています',
          'Email not confirmed': 'アカウント設定を確認してください',
          'Failed to fetch': '接続できません。しばらくしてからもう一度お試しください',
        };
        setError(messages[error.message] || error.message);
      }
    } catch { setError('接続できません。もう一度お試しください'); }
    finally { setLoading(false); }
  };

  return (
    <div className="relative w-screen h-[100dvh] overflow-auto">
      <img src={lockscreenBg} alt="" className="fixed inset-0 w-full h-full object-cover" width={1920} height={1080} />
      <div className="fixed inset-0 bg-background/40 backdrop-blur-sm" />
      <AnimatePresence mode="wait">
        {locked ? (
          <motion.div key="lock" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, y: -50 }} className="relative min-h-[100dvh] flex flex-col items-center justify-center gap-6" onClick={() => setLocked(false)}>
            <div className="absolute top-7 left-7 flex items-center gap-2"><SenniLogo className="w-9 h-9" /><span className="text-primary-foreground font-semibold">SenniNOS</span></div>
            <div className="text-center lock-text-shadow">
              <p className="text-6xl sm:text-7xl font-light text-primary-foreground mb-3">{time.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })}</p>
              <p className="text-sm sm:text-xl text-primary-foreground/80">{time.toLocaleDateString('ja-JP', { month: 'long', day: 'numeric', weekday: 'long' })}</p>
            </div>
            <Button variant="ghost" className="text-primary-foreground/80 mt-8" onClick={() => setLocked(false)}>サインインへ <ArrowRight /></Button>
          </motion.div>
        ) : (
          <motion.div key="login" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="relative min-h-[100dvh] flex items-center justify-center px-6 py-6">
            <div className="w-full max-w-[340px] flex flex-col items-center">
              <SenniLogo className="w-16 h-16 sm:w-24 sm:h-24 mb-2" />
              <h1 className="text-2xl font-semibold text-primary-foreground mb-1">SenniNOS</h1>
              <p className="text-sm text-primary-foreground/70 mb-5">{isSignUp ? '新しいアカウント' : 'おかえりなさい'}</p>
              <form onSubmit={handleSubmit} className="w-full space-y-3">
                <div className="relative"><User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <input aria-label="ユーザー名" name="username" autoComplete="username" value={username} onChange={e => setUsername(e.target.value)} placeholder="ユーザー名" required maxLength={24} autoFocus className="w-full h-10 pl-10 pr-3 rounded-md bg-background/85 border border-border text-foreground text-sm outline-none focus:ring-2 focus:ring-primary" />
                </div>
                <div className="relative"><Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <input aria-label="パスワード" autoComplete={isSignUp ? 'new-password' : 'current-password'} type={showPassword ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} placeholder="パスワード" required minLength={8} maxLength={128} className="w-full h-10 pl-10 pr-10 rounded-md bg-background/85 border border-border text-foreground text-sm outline-none focus:ring-2 focus:ring-primary" />
                  <Button variant="ghost" size="icon" type="button" aria-label={showPassword ? 'パスワードを隠す' : 'パスワードを表示'} title={showPassword ? 'パスワードを隠す' : 'パスワードを表示'} onClick={() => setShowPassword(!showPassword)} className="absolute right-0 top-0 text-muted-foreground">{showPassword ? <EyeOff /> : <Eye />}</Button>
                </div>
                {isSignUp && <input aria-label="パスワード確認" autoComplete="new-password" type={showPassword ? 'text' : 'password'} value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder="パスワードをもう一度" required minLength={8} maxLength={128} className="w-full h-10 px-3 rounded-md bg-background/85 border border-border text-foreground text-sm outline-none focus:ring-2 focus:ring-primary" />}
                {error && <p role="alert" className="text-destructive text-xs text-center bg-background/90 p-2 rounded-md">{error}</p>}
                <Button type="submit" disabled={loading} className="w-full">{loading ? <Loader2 className="animate-spin" /> : <ArrowRight />}{isSignUp ? 'アカウント作成' : 'サインイン'}</Button>
              </form>
              <Button variant="ghost" disabled={loading} onClick={() => { setIsSignUp(!isSignUp); setError(''); setPassword(''); setConfirmPassword(''); }} className="mt-3 text-xs text-primary-foreground/80">{isSignUp ? 'サインインに戻る' : 'アカウントを作成'}</Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
