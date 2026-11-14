import SenniLogo from './SenniLogo';

export default function BootScreen({ message = '読み込み中' }: { message?: string }) {
  return (
    <div className="w-screen h-[100dvh] flex flex-col items-center justify-center gap-4 bg-background">
      <SenniLogo className="w-12 h-12 senni-glow" />
      <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      <p className="text-xs text-muted-foreground">{message}</p>
    </div>
  );
}
