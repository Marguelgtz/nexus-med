import { ReceptionPage } from '../../../components/appointments/reception-page';
export const dynamic = 'force-dynamic';
export default function SecretaryPage(props: { searchParams: Promise<{ fecha?: string; seccion?: string }> }) {
  return <ReceptionPage {...props} administrative />;
}
