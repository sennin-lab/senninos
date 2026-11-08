import { useAuth } from '@/hooks/useAuth';
import LoginScreen from '@/components/os/LoginScreen';
import Desktop from '@/components/os/Desktop';

const Index = () => {
  const { user, signIn, signUp, signOut } = useAuth();

  if (!user) {
    return <LoginScreen onLogin={signIn} onSignUp={signUp} />;
  }

  // userId を key にして、ユーザーが変わったらデスクトップを作り直す
  return (
    <Desktop
      key={user.id}
      onSignOut={signOut}
      userName={user.username}
      userId={user.id}
    />
  );
};

export default Index;
