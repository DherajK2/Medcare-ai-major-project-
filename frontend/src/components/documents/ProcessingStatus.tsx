export function ProcessingStatus({ status }: { status: string }) {
  return <div className="text-sm font-medium text-blue-600">Status: {status}</div>;
}