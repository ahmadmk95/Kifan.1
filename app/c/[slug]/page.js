import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

// Public committee pages are closed — the site is private now. Send visitors to
// login; authorized users read committees under /private.
export default function CommitteePage({ params }) {
  redirect(`/login?next=/private/c/${params.slug}`);
}
