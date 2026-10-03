import { InputHTMLAttributes, forwardRef } from 'react';
import { cn } from '../../utils/cn';

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(({ className, ...props }, ref) => (
  <input ref={ref} className={cn('w-full rounded-lg border border-gray-300 px-4 py-2 min-h-[44px] focus:outline-none focus:ring-2 focus:ring-blue-500', className)} {...props} />
));
Input.displayName = 'Input';