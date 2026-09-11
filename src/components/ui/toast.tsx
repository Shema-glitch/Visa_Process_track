import * as React from 'react';
import * as ToastPrimitives from '@radix-ui/react-toast';
import {
  X,
  CheckCircle2,
  AlertCircle,
  Info,
  StickyNote,
  AlertTriangle,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const ToastProvider = ToastPrimitives.Provider;

const ToastViewport = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Viewport>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Viewport>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Viewport
    ref={ref}
    className={cn(
      // Responsive: full-width on mobile, fixed width on desktop
      'fixed bottom-4 right-4 left-4 sm:left-auto z-[200] flex flex-col gap-2',
      'w-auto sm:w-[380px] max-w-[calc(100vw-2rem)]',
      className
    )}
    {...props}
  />
));
ToastViewport.displayName = ToastPrimitives.Viewport.displayName;

// ── Variants ─────────────────────────────────────────────────────────────────

type ToastVariant = 'default' | 'success' | 'info' | 'warning' | 'destructive' | 'note';

const variantConfig: Record<
  ToastVariant,
  { classes: string; icon: React.ElementType }
> = {
  default: {
    classes: 'bg-card border-border text-foreground',
    icon: Info,
  },
  success: {
    classes:
      'border-emerald-500/30 bg-emerald-950/80 text-emerald-100 dark:border-emerald-500/30 dark:bg-emerald-950/80',
    icon: CheckCircle2,
  },
  info: {
    classes:
      'border-blue-500/30 bg-blue-950/80 text-blue-100 dark:border-blue-500/30 dark:bg-blue-950/80',
    icon: Info,
  },
  warning: {
    classes:
      'border-amber-500/30 bg-amber-950/80 text-amber-100 dark:border-amber-500/30 dark:bg-amber-950/80',
    icon: AlertTriangle,
  },
  destructive: {
    classes:
      'border-red-500/30 bg-red-950/80 text-red-100 dark:border-red-500/30 dark:bg-red-950/80',
    icon: AlertCircle,
  },
  note: {
    classes:
      'border-zinc-500/30 bg-zinc-800/90 text-zinc-200 dark:border-zinc-500/30 dark:bg-zinc-800/90',
    icon: StickyNote,
  },
};

const iconColor: Record<ToastVariant, string> = {
  default: 'text-foreground',
  success: 'text-emerald-400',
  info: 'text-blue-400',
  warning: 'text-amber-400',
  destructive: 'text-red-400',
  note: 'text-zinc-400',
};

// ── Toast ────────────────────────────────────────────────────────────────────

const Toast = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Root>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Root> & {
    variant?: ToastVariant;
  }
>(({ className, variant = 'default', ...props }, ref) => {
  const config = variantConfig[variant];
  return (
    <ToastPrimitives.Root
      ref={ref}
      className={cn(
        'group pointer-events-auto relative flex w-full items-start gap-3 overflow-hidden rounded-xl border p-4 pr-8 shadow-lg shadow-black/20 backdrop-blur-sm transition-all',
        'data-[state=open]:animate-in data-[state=closed]:animate-out',
        'data-[state=closed]:fade-out-80 data-[state=closed]:slide-out-to-right-full',
        'data-[state=open]:slide-in-from-bottom-full',
        'data-[swipe=cancel]:translate-x-0 data-[swipe=end]:translate-x-[var(--radix-toast-swipe-end-x)]',
        'data-[swipe=move]:translate-x-[var(--radix-toast-swipe-move-x)] data-[swipe=move]:transition-none',
        config.classes,
        className
      )}
      {...props}
    />
  );
});
Toast.displayName = ToastPrimitives.Root.displayName;

// ── Toast with icon (used internally by Toaster) ─────────────────────────────

function ToastWithIcon({
  variant,
  title,
  description,
  action,
  id,
  duration,
  open,
}: {
  variant: ToastVariant;
  title?: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactElement;
  id: string;
  duration: number;
  open: boolean;
}) {
  const config = variantConfig[variant];
  const Icon = config.icon;

  return (
    <Toast
      open={open}
      onOpenChange={(o) => {
        if (!o) dismiss(id);
      }}
      variant={variant}
      duration={duration}
    >
      <Icon
        className={cn('size-5 shrink-0 mt-0.5', iconColor[variant])}
        aria-hidden="true"
      />
      <div className="flex-1 min-w-0">
        {title && <ToastTitle>{title}</ToastTitle>}
        {description && <ToastDescription>{description}</ToastDescription>}
      </div>
      {action && <ToastAction altText="action">{action}</ToastAction>}
      <ToastClose />
    </Toast>
  );
}

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
      'absolute right-2 top-2 rounded-md p-1 opacity-50 sm:opacity-0 transition-opacity',
      'focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
      'sm:group-hover:opacity-100',
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
    className={cn('text-sm font-semibold leading-snug', className)}
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
    className={cn('text-xs opacity-80 leading-relaxed mt-0.5', className)}
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
    return () => {
      listeners = listeners.filter((l) => l !== setToasts);
    };
  }, []);
  return { toasts, toast, dismiss };
}

// ── Toaster ───────────────────────────────────────────────────────────────────

export function Toaster() {
  const { toasts } = useToast();
  return (
    <ToastProvider>
      {toasts.map(({ id, title, description, variant = 'default', duration = 6000, action, open }) => (
        <ToastWithIcon
          key={id}
          id={id}
          title={title}
          description={description}
          variant={variant}
          duration={duration}
          action={action}
          open={open}
        />
      ))}
      <ToastViewport />
    </ToastProvider>
  );
}

export {
  ToastProvider,
  ToastViewport,
  Toast,
  ToastTitle,
  ToastDescription,
  ToastClose,
  ToastAction,
};
