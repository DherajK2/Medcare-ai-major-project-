import { Card } from '../ui/Card';
import { Upload } from 'lucide-react';
export function DocumentUpload() {
  return (
    <Card className="border-dashed border-2 border-gray-300 text-center py-12 hover:bg-gray-50 cursor-pointer">
      <Upload size={40} className="mx-auto text-gray-400 mb-4" />
      <p className="text-gray-600 font-medium">Click or drag document to upload</p>
      <p className="text-xs text-gray-400 mt-2">Supports PDF, JPG, PNG up to 10MB</p>
    </Card>
  );
}