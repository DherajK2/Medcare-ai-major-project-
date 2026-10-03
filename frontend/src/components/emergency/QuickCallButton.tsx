import { Button } from '../ui/Button';
import { Phone } from 'lucide-react';
export function QuickCallButton({ name, number }: { name: string, number: string }) {
  return (
    <a href={`tel:${number}`} className="block w-full">
      <Button variant="danger" className="w-full flex justify-between items-center py-6 text-lg">
        <span>Call {name}</span> <Phone />
      </Button>
    </a>
  );
}