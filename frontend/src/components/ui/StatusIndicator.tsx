import { cn } from '../../utils/cn';
export function StatusIndicator({ status }: { status: 'online' | 'offline' | 'away' }) {
  const colors = { online: 'bg-green-500', offline: 'bg-gray-400', away: 'bg-yellow-500' };
  return <span className={cn('w-3 h-3 rounded-full inline-block', colors[status])} />;
}