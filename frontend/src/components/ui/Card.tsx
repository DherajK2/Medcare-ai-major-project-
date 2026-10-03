import { HTMLAttributes } from 'react';
import { cn } from '../../utils/cn';

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('bg-white rounded-xl shadow-sm border border-gray-100 p-6', className)} {...props} />;
}