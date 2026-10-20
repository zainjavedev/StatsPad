import React, { useEffect, useState } from 'react';
import { User } from 'lucide-react';
import { readAlerts } from '../lib/alerts';

/* The header's account link: Sign in when signed out, the email's name when signed in. */
export default function AccountButton() {
  const [email, setEmail] = useState('');
  useEffect(() => {
    const update = () => setEmail(readAlerts().emailAddress || '');
    update();
    window.addEventListener('statspad:alerts', update);
    window.addEventListener('storage', update);
    return () => { window.removeEventListener('statspad:alerts', update); window.removeEventListener('storage', update); };
  }, []);
  return <a className="account-btn" href={email ? '/account' : '/signin'} aria-label={email ? `Account: ${email}` : 'Sign in'} title={email || 'Sign in'}>
    <User size={16}/><span>{email ? email.split('@')[0] : 'Sign in'}</span>
  </a>;
}
