import { ReceptionPage } from '../../components/appointments/reception-page';
export const dynamic = 'force-dynamic';
export default function PhysicianReceptionPage(props: { searchParams: Promise<{ fecha?: string }> }) {
  return <ReceptionPage {...props} administrative={false} />;
}
