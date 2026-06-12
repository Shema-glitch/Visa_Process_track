import * as React from 'react';
import * as ToastPrimitives from '@radix-ui/react-toast';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

const ToastProvider = ToastPrimitives.Provider;

const ToastViewport = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Viewport>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Viewport>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Viewport
    ref={ref}
    className={cn(
      'fixed bottom-4 right-4 z-[100] flex flex-col gap-2 w-[380px] max-w-[calc(100vw-2rem)]',
      className
    )}
    {...props}
  />
));
ToastViewport.displayName = ToastPrimitives.Viewport.displayName;

type ToastVariant = 'default' | 'warning' | 'destructive';

const variantClasses: Record<ToastVariant, string> = {
  default: 'bg-card border-border text-foreground',
  warning: 'border-amber-500/30 bg-amber-950/40 text-amber-100',
  destructive: 'border-destructive/50 bg-destructive text-destructive-foreground',
};

const Toast = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Root>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Root> & { variant?: ToastVariant }
>(({ className, variant = 'default', ...props }, ref) => (
  <ToastPrimitives.Root
    ref={ref}
    className={cn(
      'group pointer-events-auto relative flex w-full items-center justify-between space-x-3 overflow-hidden rounded-xl border p-4 pr-8 shadow-lg transition-all',
      'data-[state=open]:animate-in data-[state=closed]:animate-out',
      'data-[state=closed]:fade-out-80 data-[state=closed]:slide-out-to-right-full',
      'data-[state=open]:slide-in-from-bottom-full',
      'data-[swipe=cancel]:translate-x-0 data-[swipe=end]:translate-x-[var(--radix-toast-swipe-end-x)]',
      'data-[swipe=move]:translate-x-[var(--radix-toast-swipe-move-x)] data-[swipe=move]:transition-none',
      variantClasses[variant],
      className
    )}
    {...props}
  />
));
Toast.displayName = ToastPrimitives.Root.displayName;

const ToastAction = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Action>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Action>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Action
    ref={ref}
    className={cn(
      'inline-flex h-7 shrink-0 items-center justify-center rounded-lg border bg-transparent px-2.5 text-xs font-semibold',
      'transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
      'hover:bg-secondary disabled:pointer-events-none disabled:opacity-50',
      className
    )}
    {...props}
  />
));
ToastAction.displayName = ToastPrimitives.Action.displayName;

const ToastClose = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Close>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Close>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Close
    ref={ref}
    className={cn(
      'absolute right-2 top-2 rounded-md p-1 opacity-0 transition-opacity',
      'focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
      'group-hover:opacity-100',
      className
    )}
    toast-close=""
    {...props}
  >
    <X className="size-3.5" />
  </ToastPrimitives.Close>
));
ToastClose.displayName = ToastPrimitives.Close.displayName;

const ToastTitle = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Title>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Title>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Title
    ref={ref}
    className={cn('text-sm font-semibold', className)}
    {...props}
  />
));
ToastTitle.displayName = ToastPrimitives.Title.displayName;

const ToastDescription = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Description>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Description>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Description
    ref={ref}
    className={cn('text-xs opacity-80', className)}
    {...props}
  />
));
ToastDescription.displayName = ToastPrimitives.Description.displayName;

// ── useToast hook ─────────────────────────────────────────────────────────────
type ToastOptions = {
  title?: React.ReactNode;
  description?: React.ReactNode;
  variant?: ToastVariant;
  duration?: number;
  action?: React.ReactElement;
};

type ToastItem = ToastOptions & { id: string; open: boolean };

let listeners: Array<(toasts: ToastItem[]) => void> = [];
let toastState: ToastItem[] = [];
let counter = 0;

function dispatch(toasts: ToastItem[]) {
  toastState = toasts;
  listeners.forEach((l) => l(toasts));
}

export function toast(opts: ToastOptions) {
  const id = String(++counter);
  dispatch([...toastState, { ...opts, id, open: true }]);
  return id;
}

export function dismiss(id: string) {
  dispatch(toastState.map((t) => (t.id === id ? { ...t, open: false } : t)));
  setTimeout(() => {
    dispatch(toastState.filter((t) => t.id !== id));
  }, 300);
}

export function useToast() {
  const [toasts, setToasts] = React.useState<ToastItem[]>(toastState);
  React.useEffect(() => {
    listeners.push(setToasts);
    return () => { listeners = listeners.filter((l) => l !== setToasts); };
  }, []);
  return { toasts, toast, dismiss };
}

// ── Toaster ───────────────────────────────────────────────────────────────────
export function Toaster() {
  const { toasts } = useToast();
  return (
    <ToastProvider>
      {toasts.map(({ id, title, description, variant, duration = 6000, action, open }) => (
        <Toast
          key={id}
          open={open}
          onOpenChange={(o) => { if (!o) dismiss(id); }}
          variant={variant}
          duration={duration}
        >
          <div className="flex-1 min-w-0">
            {title && <ToastTitle>{title}</ToastTitle>}
            {description && <ToastDescription>{description}</ToastDescription>}
          </div>
          {action && <ToastAction altText="action">{action}</ToastAction>}
          <ToastClose />
        </Toast>
      ))}
      <ToastViewport />
    </ToastProvider>
  );
}

export { ToastProvider, ToastViewport, Toast, ToastTitle, ToastDescription, ToastClose, ToastAction };
