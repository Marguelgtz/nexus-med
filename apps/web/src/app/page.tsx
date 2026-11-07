import { redirect } from 'next/navigation';

// Initial navigation goes to the patient registry (the meaningful first
// screen of the product).
export default function Home() {
  redirect('/patients');
}
