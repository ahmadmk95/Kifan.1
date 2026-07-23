'use client';

import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';

export default function LogoutButton() {
  const router = useRouter();
  const logout = async () => {
    // Forget the auto sign-in credentials so logout actually stays logged out.
    try { window.localStorage.removeItem('mwk_autologin'); } catch {}
    try {
      await api.logout();
    } catch {
      // ignore — clearing client state regardless
    }
    router.push('/');
    router.refresh();
  };
  return (
    <button onClick={logout} style={{ background: 'none', border: 'none', font: 'inherit', color: 'var(--mawkab-green)', fontWeight: 500, fontSize: '14.5px', padding: 0, cursor: 'pointer' }}>
      خروج
    </button>
  );
}
