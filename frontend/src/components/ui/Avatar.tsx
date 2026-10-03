import { cn } from '../../utils/cn';
export function Avatar({ src, fallback, className }: { src?: string; fallback: string; className?: string }) {
  return (
    <div className={cn('h-10 w-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold', className)}>
      {src ? <img src={src} alt="avatar" className="h-full w-full rounded-full object-cover" /> : fallback}
    </div>
  );
}