import logo from '@/assets/senninos-logo.png';
import { cn } from '@/lib/utils';

export default function SenniLogo({ className }: { className?: string }) {
  return <img src={logo} alt="SenniNOS" width={384} height={384} className={cn('object-contain shrink-0', className)} />;
}