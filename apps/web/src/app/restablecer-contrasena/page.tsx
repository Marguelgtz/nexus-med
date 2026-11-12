import { AuthPanel } from '../../components/auth/auth-panel';

export const dynamic = 'force-dynamic';

export default async function ResetPasswordPage({ searchParams }: { searchParams: Promise<{ token?: string; error?: string }> }) {
  const params = await searchParams;
  return <main className="auth-status-page"><AuthPanel mode="reset" resetToken={params.token} tokenError={params.error} /></main>;
}

