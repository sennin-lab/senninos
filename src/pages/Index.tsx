import { useAuth } from '@/hooks/useAuth';
import LoginScreen from '@/components/os/LoginScreen';
import Desktop from '@/components/os/Desktop';

const Index = () => {
  const { user, loading, signIn, signUp, signOut } = useAuth();

  if (loading) {
    return (
      <div className="w-screen h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-muted-foreground">SenniNOS を起動しています...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <LoginScreen onLogin={signIn} onSignUp={signUp} />;
  }

  return (
    <Desktop
      onSignOut={signOut}
      userName={user.user_metadata?.username ?? user.email?.split('@')[0]}
      userId={user.id}
    />
  );
};

export default Index;
