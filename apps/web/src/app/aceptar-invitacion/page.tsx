import { AuthPanel } from '../../components/auth/auth-panel';

export const dynamic = 'force-dynamic';
export const metadata = { referrer: 'no-referrer' };

export default async function AcceptInvitationPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams;
  return <main className="auth-status-page"><AuthPanel mode="invitation" invitationToken={token} /></main>;
}

