import { useAuth } from '@/hooks/useAuth';
import LoginScreen from '@/components/os/LoginScreen';
import AccountSession from '@/components/os/AccountSession';
import BootScreen from '@/components/os/BootScreen';

const Index = () => {
  const { status, user, signIn, signUp, signOut } = useAuth();

  if (status === 'loading') return <BootScreen />;
  if (!user) return <LoginScreen onLogin={signIn} onSignUp={signUp} />;

  // user.id を key にして、アカウントが変わったらデータとデスクトップを作り直す
  return <AccountSession key={user.id} user={user} onSignOut={signOut} />;
};

export default Index;
