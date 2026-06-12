import { useEffect } from 'react';
import { ShieldAlert } from 'lucide-react';
import { toast, dismiss } from '@/components/ui/toast';
import { useAuth } from '@/contexts/useAuth';

const ALERT_KEY = 'vrh_new_device_alert';
const SHOW_KEY = 'vrh_device_alert_show';
const DISMISSED_KEY = 'vrh_device_alert_dismissed';

export function LoginActivityBanner() {
  const { signOut } = useAuth();

  useEffect(() => {
    const hasPending =
      sessionStorage.getItem(ALERT_KEY) === 'pending' ||
      sessionStorage.getItem(SHOW_KEY) === '1';
    const wasDismissed = sessionStorage.getItem(DISMISSED_KEY) === '1';
    if (!hasPending || wasDismissed) return;

    const timeStr = new Date().toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    });

    const id = toast({
      variant: 'warning',
      duration: 8000,
      title: (
        <span className="flex items-center gap-2 text-amber-200">
          <ShieldAlert className="size-4 shrink-0 text-amber-400" />
          New sign-in detected at {timeStr}
        </span>
      ),
      action: (
        <div className="flex gap-1.5 shrink-0">
          <button
            onClick={() => {
              sessionStorage.setItem(DISMISSED_KEY, '1');
              sessionStorage.removeItem(ALERT_KEY);
              sessionStorage.removeItem(SHOW_KEY);
              dismiss(id);
            }}
            className="text-[11px] font-semibold text-amber-300 hover:text-amber-100 underline underline-offset-2 focus-visible:ring-2 focus-visible:ring-amber-400 rounded px-1"
          >
            That was me
          </button>
          <span className="text-amber-600">·</span>
          <button
            onClick={() => signOut()}
            className="text-[11px] font-semibold text-red-400 hover:text-red-200 underline underline-offset-2 focus-visible:ring-2 focus-visible:ring-red-400 rounded px-1"
          >
            Sign out everywhere
          </button>
        </div>
      ),
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}
