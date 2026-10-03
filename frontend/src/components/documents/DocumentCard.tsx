import { Card } from '../ui/Card';
export function DocumentCard({ name, date }: { name: string, date: string }) {
  return <Card><p className="font-medium">{name}</p><p className="text-sm text-gray-500">{date}</p></Card>;
}