import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
export function TrendIndicator({ direction }: { direction: 'increasing' | 'decreasing' | 'stable' }) {
  if (direction === 'increasing') return <span className="text-amber-500 flex items-center text-sm"><TrendingUp size={16} className="mr-1"/> Increasing</span>;
  if (direction === 'decreasing') return <span className="text-green-500 flex items-center text-sm"><TrendingDown size={16} className="mr-1"/> Decreasing</span>;
  return <span className="text-gray-500 flex items-center text-sm"><Minus size={16} className="mr-1"/> Stable</span>;
}