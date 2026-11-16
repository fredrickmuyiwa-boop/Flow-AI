import { Compass } from 'lucide-react';
import { EmptyState } from '../components/ui/misc';
import Button from '../components/ui/Button';
import { useRouter } from '../lib/router';

export default function NotFound() {
  const { navigate, path } = useRouter();
  return (
    <div className="card">
      <EmptyState
        icon={Compass}
        title="Page not found"
        message={`There’s nothing at “${path}”. It may have been moved or deleted.`}
        action={<Button variant="primary" onClick={() => navigate('/')}>Back to Overview</Button>}
      />
    </div>
  );
}
