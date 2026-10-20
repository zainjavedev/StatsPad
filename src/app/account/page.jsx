import { redirect } from 'next/navigation';

/* No accounts: favorites live in this browser, so the old sign-in pages just go home. */
export default function Page() { redirect('/teams'); }
