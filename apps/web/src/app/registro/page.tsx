import { AuthPanel } from '../../components/auth/auth-panel';

export const dynamic = 'force-dynamic';

export default function RegistrationPage() {
  return <main className="auth-status-page"><AuthPanel mode="signup" /></main>;
}

