"use client";

import type { ComponentProps, ElementType, ReactNode } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ImageIcon,
  Lock,
  Loader2,
  Search,
  ShieldAlert,
} from "lucide-react";

import { ImageUpload, type ImageUploadType } from "@/components/admin/ImageUpload";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { StickyActionBar } from "@/components/ui/sticky-form-actions";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

type AdminPageShellProps = {
  children: ReactNode;
  className?: string;
  contentClassName?: string;
};

export function AdminPageShell({ children, className, contentClassName }: AdminPageShellProps) {
  return (
    <div className={cn("mx-auto flex min-w-0 w-full max-w-7xl flex-col gap-5 sm:gap-6", className)}>
      <div className={cn("flex flex-col gap-5 sm:gap-6", contentClassName)}>{children}</div>
    </div>
  );
}

type AdminPageHeaderProps = {
  title: ReactNode;
  subtitle?: ReactNode;
  eyebrow?: ReactNode;
  actions?: ReactNode;
  meta?: ReactNode;
  className?: string;
  contentClassName?: string;
};

export function AdminPageHeader({
  title,
  subtitle,
  eyebrow,
  actions,
  meta,
  className,
  contentClassName,
}: AdminPageHeaderProps) {
  return (
    <section
      className={cn(
        "admin-card px-4 py-4 sm:px-5",
        className,
      )}
    >
      <div
        className={cn(
          "flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between",
          contentClassName,
        )}
      >
        <div className="min-w-0 space-y-1">
          {eyebrow ? (
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-admin-brand-soft-text">
              {eyebrow}
            </p>
          ) : null}
          <h1 className="text-xl font-semibold tracking-tight text-slate-950">{title}</h1>
          {subtitle ? <p className="max-w-3xl text-sm text-slate-600">{subtitle}</p> : null}
          {meta ? <div className="pt-1 text-sm text-slate-500">{meta}</div> : null}
        </div>
        {actions ? <div className="flex w-full shrink-0 flex-col gap-2 sm:w-auto sm:flex-row sm:flex-wrap sm:justify-end">{actions}</div> : null}
      </div>
    </section>
  );
}

type DataToolbarProps = {
  searchValue?: string;
  searchPlaceholder?: string;
  onSearchChange?: (value: string) => void;
  filters?: ReactNode;
  actions?: ReactNode;
  summary?: ReactNode;
  className?: string;
};

export function DataToolbar({
  searchValue,
  searchPlaceholder = "Buscar",
  onSearchChange,
  filters,
  actions,
  summary,
  className,
}: DataToolbarProps) {
  return (
    <div
      className={cn(
        "admin-card flex min-w-0 flex-col gap-3 overflow-hidden p-3 lg:flex-row lg:items-center lg:justify-between",
        className,
      )}
    >
      <div className="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
        {onSearchChange ? (
          <div className="relative w-full sm:max-w-xs">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              value={searchValue ?? ""}
              onChange={(event) => onSearchChange(event.target.value)}
              placeholder={searchPlaceholder}
              className="h-9 pl-9"
            />
          </div>
        ) : null}
        {filters ? <div className="flex min-w-0 flex-wrap items-center gap-2">{filters}</div> : null}
        {summary ? <div className="min-w-0 text-sm text-slate-500">{summary}</div> : null}
      </div>
      {actions ? <div className="flex w-full flex-wrap items-center gap-2 lg:w-auto lg:justify-end">{actions}</div> : null}
    </div>
  );
}

type AdminMetricGridProps = {
  children: ReactNode;
  className?: string;
};

export function AdminMetricGrid({ children, className }: AdminMetricGridProps) {
  return <div className={cn("grid gap-3 sm:grid-cols-2 xl:grid-cols-4", className)}>{children}</div>;
}

type ResponsiveEntityListProps<T> = {
  items: T[];
  getKey: (item: T, index: number) => string | number;
  renderItem: (item: T, index: number) => ReactNode;
  empty?: ReactNode;
  className?: string;
};

export function ResponsiveEntityList<T>({
  items,
  getKey,
  renderItem,
  empty,
  className,
}: ResponsiveEntityListProps<T>) {
  if (items.length === 0) return <>{empty ?? null}</>;

  return (
    <div className={cn("grid gap-3", className)}>
      {items.map((item, index) => (
        <div key={getKey(item, index)} className="admin-card p-4">
          {renderItem(item, index)}
        </div>
      ))}
    </div>
  );
}

type DataTableColumn<T> = {
  key: string;
  header: ReactNode;
  cell: (item: T, index: number) => ReactNode;
  className?: string;
  headerClassName?: string;
};

type DataTableProps<T> = {
  columns?: DataTableColumn<T>[];
  data?: T[];
  getRowKey?: (item: T, index: number) => string | number;
  renderMobileItem?: (item: T, index: number) => ReactNode;
  mobileBreakpoint?: "md" | "lg";
  empty?: ReactNode;
  children?: ReactNode;
  mobileList?: ReactNode;
  className?: string;
  tableClassName?: string;
};

export function DataTable<T>({
  columns,
  data,
  getRowKey,
  renderMobileItem,
  mobileBreakpoint = "md",
  empty,
  children,
  mobileList,
  className,
  tableClassName,
}: DataTableProps<T>) {
  const hasGeneratedRows = Boolean(columns && data && getRowKey);
  const hideTableClass = renderMobileItem || mobileList ? `${mobileBreakpoint}:block hidden` : "block";
  const hideListClass = mobileBreakpoint === "lg" ? "lg:hidden" : "md:hidden";

  return (
    <div className={cn("admin-card overflow-hidden", className)}>
      {(renderMobileItem && data && getRowKey) || mobileList ? (
        <div className={cn("p-3", hideListClass)}>
          {mobileList ?? (
            <ResponsiveEntityList
              items={data ?? []}
              getKey={getRowKey as (item: T, index: number) => string | number}
              renderItem={renderMobileItem as (item: T, index: number) => ReactNode}
              empty={empty}
            />
          )}
        </div>
      ) : null}
      <div className={hideTableClass}>
        {hasGeneratedRows ? (
          <Table className={tableClassName}>
            <TableHeader>
              <TableRow>
                {columns?.map((column) => (
                  <TableHead key={column.key} className={column.headerClassName}>
                    {column.header}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {data && data.length > 0 ? (
                data.map((item, index) => (
                  <TableRow key={getRowKey?.(item, index)}>
                    {columns?.map((column) => (
                      <TableCell key={column.key} className={column.className}>
                        {column.cell(item, index)}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={columns?.length ?? 1} className="py-8 text-center text-slate-500">
                    {empty}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        ) : (
          children
        )}
      </div>
    </div>
  );
}

type StatCardProps = {
  label: ReactNode;
  value: ReactNode;
  hint?: ReactNode;
  icon?: ReactNode;
  trend?: ReactNode;
  className?: string;
  iconClassName?: string;
};

export function StatCard({ label, value, hint, icon, trend, className, iconClassName }: StatCardProps) {
  return (
    <div className={cn("admin-card p-4", className)}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <p className="text-xs font-medium uppercase tracking-[0.12em] text-slate-500">{label}</p>
          <div className="text-2xl font-semibold tracking-tight text-slate-950">{value}</div>
          {hint ? <p className="text-xs text-slate-500">{hint}</p> : null}
        </div>
        {icon ? (
          <div
            className={cn(
              "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-admin-brand-soft text-admin-brand-soft-text",
              iconClassName,
            )}
          >
            {icon}
          </div>
        ) : null}
      </div>
      {trend ? <div className="mt-3 text-xs text-slate-600">{trend}</div> : null}
    </div>
  );
}

type ProgressPanelMetric = {
  label: ReactNode;
  value: ReactNode;
  tone?: StatusTone;
};

type ProgressPanelProps = {
  title: ReactNode;
  description?: ReactNode;
  progress: number;
  progressLabel?: ReactNode;
  metrics?: ProgressPanelMetric[];
  className?: string;
};

export function ProgressPanel({
  title,
  description,
  progress,
  progressLabel,
  metrics,
  className,
}: ProgressPanelProps) {
  const safeProgress = Math.max(0, Math.min(100, progress));

  return (
    <section className={cn("admin-card p-4", className)}>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h2 className="text-sm font-semibold text-slate-950">{title}</h2>
          {description ? <p className="mt-1 text-sm text-slate-600">{description}</p> : null}
        </div>
        {progressLabel ? <div className="text-sm font-medium text-slate-500">{progressLabel}</div> : null}
      </div>

      <div className="mt-4 h-2 overflow-hidden rounded-full bg-admin-surface-subtle">
        <div
          className="h-full rounded-full bg-admin-brand transition-[width] duration-300 ease-out"
          style={{ width: `${safeProgress}%` }}
        />
      </div>

      {metrics?.length ? (
        <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-5">
          {metrics.map((metric, index) => (
            <div
              key={index}
              className={cn(
                "rounded-lg border px-3 py-2 text-sm",
                statusToneClass[metric.tone ?? "neutral"],
              )}
            >
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] opacity-80">{metric.label}</p>
              <p className="mt-1 font-semibold">{metric.value}</p>
            </div>
          ))}
        </div>
      ) : null}
    </section>
  );
}

type StatusTone = "neutral" | "success" | "warning" | "danger" | "info" | "brand";

const statusToneClass: Record<StatusTone, string> = {
  neutral: "border-slate-200 bg-slate-50 text-slate-700",
  success: "border-emerald-200 bg-emerald-50 text-emerald-700",
  warning: "border-amber-200 bg-amber-50 text-amber-800",
  danger: "border-rose-200 bg-rose-50 text-rose-700",
  info: "border-sky-200 bg-sky-50 text-sky-700",
  brand: "border-admin-border-strong bg-admin-brand-soft text-admin-brand-soft-text",
};

export type StatusBadgeProps = {
  children: ReactNode;
  tone?: StatusTone;
  dot?: boolean;
  className?: string;
};

export function StatusBadge({ children, tone = "neutral", dot = false, className }: StatusBadgeProps) {
  return (
    <Badge variant="outline" className={cn("gap-1.5 border font-medium", statusToneClass[tone], className)}>
      {dot ? <span className="h-1.5 w-1.5 rounded-full bg-current" /> : null}
      {children}
    </Badge>
  );
}

type FeatureGateProps = {
  allowed: boolean;
  children: ReactNode;
  fallback?: ReactNode;
  title?: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
};

export function FeatureGate({
  allowed,
  children,
  fallback,
  title = "Funcionalidad no disponible",
  description = "Esta opcion no esta incluida para este negocio.",
  action,
  className,
}: FeatureGateProps) {
  if (allowed) return <>{children}</>;
  if (fallback) return <>{fallback}</>;

  return (
    <EmptyState
      icon={ShieldAlert}
      title={title}
      description={description}
      action={action}
      className={className}
    />
  );
}

type StateProps = {
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  icon?: ElementType;
  className?: string;
};

export function EmptyState({ title, description, action, icon: Icon = Search, className }: StateProps) {
  return (
    <div
      className={cn(
        "flex min-h-44 flex-col items-center justify-center rounded-lg border border-dashed border-admin-border bg-admin-surface p-6 text-center",
        className,
      )}
    >
      <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-admin-brand-soft text-admin-brand-soft-text">
        <Icon className="h-5 w-5" />
      </div>
      <h2 className="text-base font-semibold text-slate-950">{title}</h2>
      {description ? <p className="mt-1 max-w-md text-sm text-slate-600">{description}</p> : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}

export function ErrorState({ title, description, action, icon: Icon = AlertTriangle, className }: StateProps) {
  return (
    <div
      className={cn(
        "flex min-h-44 flex-col items-center justify-center rounded-lg border border-rose-200 bg-rose-50 p-6 text-center",
        className,
      )}
    >
      <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-white text-rose-600">
        <Icon className="h-5 w-5" />
      </div>
      <h2 className="text-base font-semibold text-rose-950">{title}</h2>
      {description ? <p className="mt-1 max-w-md text-sm text-rose-700">{description}</p> : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}

type ErrorBannerProps = {
  title?: ReactNode;
  description: ReactNode;
  action?: ReactNode;
  className?: string;
};

export function ErrorBanner({ title = "No se pudo completar la acción", description, action, className }: ErrorBannerProps) {
  return (
    <div
      className={cn(
        "flex flex-col gap-3 rounded-lg border border-rose-200 bg-rose-50 p-4 text-rose-950 sm:flex-row sm:items-start sm:justify-between",
        className,
      )}
      role="alert"
    >
      <div className="flex gap-3">
        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-rose-600" />
        <div className="min-w-0">
          {title ? <p className="text-sm font-semibold">{title}</p> : null}
          <p className="text-sm text-rose-700">{description}</p>
        </div>
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

type LoadingSkeletonProps = {
  rows?: number;
  variant?: "page" | "table" | "cards";
  className?: string;
};

export function LoadingSkeleton({ rows = 4, variant = "page", className }: LoadingSkeletonProps) {
  if (variant === "table") {
    return (
      <div className={cn("admin-card p-4", className)}>
        <div className="mb-4 h-5 w-40 animate-pulse rounded bg-slate-200/80" />
        <div className="space-y-3">
          {Array.from({ length: rows }).map((_, index) => (
            <div key={index} className="grid grid-cols-4 gap-3">
              <div className="h-4 animate-pulse rounded bg-slate-200/80" />
              <div className="h-4 animate-pulse rounded bg-admin-surface-subtle" />
              <div className="h-4 animate-pulse rounded bg-admin-surface-subtle" />
              <div className="h-4 animate-pulse rounded bg-slate-200/80" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (variant === "cards") {
    return (
      <div className={cn("grid gap-3 sm:grid-cols-2 lg:grid-cols-4", className)}>
        {Array.from({ length: rows }).map((_, index) => (
          <div key={index} className="admin-card p-4">
            <div className="h-4 w-24 animate-pulse rounded bg-slate-200/80" />
            <div className="mt-3 h-7 w-16 animate-pulse rounded bg-slate-200/80" />
            <div className="mt-3 h-3 w-32 animate-pulse rounded bg-admin-surface-subtle" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className={cn("space-y-4", className)}>
      <div className="admin-card p-5">
        <div className="h-6 w-56 animate-pulse rounded bg-slate-200/80" />
        <div className="mt-3 h-4 w-full max-w-xl animate-pulse rounded bg-admin-surface-subtle" />
      </div>
      <LoadingSkeleton rows={rows} variant="table" />
    </div>
  );
}

type ConfirmDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: ReactNode;
  description?: ReactNode;
  confirmLabel?: ReactNode;
  cancelLabel?: ReactNode;
  error?: ReactNode;
  variant?: "default" | "destructive";
  loading?: boolean;
  onConfirm: () => void | Promise<void>;
};

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = "Confirmar",
  cancelLabel = "Cancelar",
  error,
  variant = "default",
  loading = false,
  onConfirm,
}: ConfirmDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div
            className={cn(
              "mb-1 flex h-10 w-10 items-center justify-center rounded-lg",
              variant === "destructive" ? "bg-rose-50 text-rose-600" : "bg-slate-100 text-slate-700",
            )}
          >
            {variant === "destructive" ? <ShieldAlert className="h-5 w-5" /> : <CheckCircle2 className="h-5 w-5" />}
          </div>
          <DialogTitle>{title}</DialogTitle>
          {description ? <DialogDescription>{description}</DialogDescription> : null}
        </DialogHeader>
        {error ? <ErrorBanner title={null} description={error} /> : null}
        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="outline" disabled={loading}>
              {cancelLabel}
            </Button>
          </DialogClose>
          <Button
            type="button"
            variant={variant === "destructive" ? "destructive" : "default"}
            disabled={loading}
            onClick={() => {
              void onConfirm();
            }}
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

type ToastProps = {
  title: ReactNode;
  description?: ReactNode;
  tone?: StatusTone;
  icon?: ReactNode;
  className?: string;
};

export function Toast({ title, description, tone = "neutral", icon, className }: ToastProps) {
  return (
    <div
      className={cn(
        "flex w-full max-w-sm items-start gap-3 rounded-lg border bg-white p-4 shadow-lg",
        statusToneClass[tone],
        className,
      )}
    >
      {icon ? <div className="shrink-0">{icon}</div> : null}
      <div className="min-w-0">
        <p className="text-sm font-semibold">{title}</p>
        {description ? <p className="mt-1 text-sm opacity-80">{description}</p> : null}
      </div>
    </div>
  );
}

type FormSectionProps = {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  contentClassName?: string;
};

export function FormSection({
  title,
  description,
  actions,
  children,
  className,
  contentClassName,
}: FormSectionProps) {
  return (
    <section className={cn("admin-card", className)}>
      <div className="flex flex-col gap-3 border-b border-admin-border px-4 py-4 sm:flex-row sm:items-start sm:justify-between sm:px-5">
        <div className="space-y-1">
          <h2 className="text-base font-semibold text-slate-950">{title}</h2>
          {description ? <p className="text-sm text-slate-600">{description}</p> : null}
        </div>
        {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
      </div>
      <div className={cn("space-y-4 p-4 sm:p-5", contentClassName)}>{children}</div>
    </section>
  );
}

export function AdminSectionCard({
  title,
  description,
  actions,
  children,
  className,
  contentClassName,
}: FormSectionProps) {
  return (
    <section className={cn("admin-card", className)}>
      <div className="flex flex-col gap-3 border-b border-admin-border px-4 py-4 sm:flex-row sm:items-start sm:justify-between sm:px-5">
        <div className="space-y-1">
          <h2 className="text-base font-semibold text-slate-950">{title}</h2>
          {description ? <p className="text-sm text-slate-600">{description}</p> : null}
        </div>
        {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
      </div>
      <div className={cn("p-4 sm:p-5", contentClassName)}>{children}</div>
    </section>
  );
}

type SettingsFieldProps = {
  label: ReactNode;
  description?: ReactNode;
  children: ReactNode;
  htmlFor?: string;
  required?: boolean;
  className?: string;
};

export function SettingsField({ label, description, children, htmlFor, required, className }: SettingsFieldProps) {
  return (
    <div className={cn("grid gap-2 lg:grid-cols-[minmax(180px,260px)_1fr] lg:gap-5", className)}>
      <div className="space-y-1">
        <Label htmlFor={htmlFor} className="text-sm font-medium text-slate-800">
          {label}
          {required ? <span className="text-rose-600"> *</span> : null}
        </Label>
        {description ? <p className="text-xs leading-5 text-slate-500">{description}</p> : null}
      </div>
      <div className="min-w-0">{children}</div>
    </div>
  );
}

type StickyActionsProps = {
  children?: ReactNode;
  primary?: ReactNode;
  secondary?: ReactNode;
  className?: string;
};

export function StickyActions({ children, primary, secondary, className }: StickyActionsProps) {
  return (
    <StickyActionBar className={className}>
      {children ?? (
        <>
          {secondary}
          {primary}
        </>
      )}
    </StickyActionBar>
  );
}

type AdminTabNavItem = {
  key: string;
  label: ReactNode;
  href?: string;
  active?: boolean;
  disabled?: boolean;
};

type AdminTabNavProps = {
  items: AdminTabNavItem[];
  className?: string;
};

export function AdminTabNav({ items, className }: AdminTabNavProps) {
  return (
    <div className={cn("overflow-x-auto pb-1", className)}>
      <div className="inline-flex min-w-full items-center gap-1 rounded-2xl border border-admin-border bg-admin-surface p-1.5 shadow-admin">
        {items.map((item) => {
          const content = (
            <>
              {item.disabled ? <Lock className="h-3.5 w-3.5 shrink-0" /> : null}
              {item.label}
            </>
          );

          if (item.disabled || !item.href) {
            return (
              <span
                key={item.key}
                className={cn(
                  "inline-flex min-h-10 items-center gap-1 rounded-xl border px-3 py-2 text-sm font-medium whitespace-nowrap",
                  item.disabled
                    ? "border-dashed border-admin-border bg-admin-surface-subtle text-slate-400"
                    : item.active
                      ? "border-admin-brand bg-admin-brand text-white shadow-sm"
                      : "border-transparent bg-transparent text-slate-600",
                )}
              >
                {content}
              </span>
            );
          }

          return (
            <Link
              key={item.key}
              href={item.href}
              className={cn(
                "inline-flex min-h-10 items-center gap-1 rounded-xl border px-3 py-2 text-sm font-medium whitespace-nowrap transition-colors",
                item.active
                  ? "border-admin-brand bg-admin-brand text-white shadow-sm"
                  : "border-transparent bg-transparent text-slate-600 hover:border-admin-border hover:bg-admin-brand-soft hover:text-slate-950",
              )}
            >
              {content}
            </Link>
          );
        })}
      </div>
    </div>
  );
}

export type ActionMenuItem = {
  label: ReactNode;
  icon?: ReactNode;
  onSelect?: () => void;
  href?: string;
  destructive?: boolean;
  disabled?: boolean;
  separatorBefore?: boolean;
  target?: "_blank" | "_self";
};

type ActionMenuProps = {
  label?: ReactNode;
  items: ActionMenuItem[];
  align?: ComponentProps<typeof DropdownMenuContent>["align"];
  className?: string;
  showLabel?: boolean;
};

export function ActionMenu({ label = "Acciones", items, align = "end", className, showLabel = false }: ActionMenuProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button type="button" variant="outline" size="sm" className={cn("h-8", className)}>
          <span className={showLabel ? "text-sm" : "text-xs font-medium"}>{label}</span>
          <ChevronDown className="h-3.5 w-3.5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align={align} className="min-w-44">
        <DropdownMenuLabel>{label}</DropdownMenuLabel>
        {items.map((item, index) => (
          <div key={index}>
            {item.separatorBefore ? <DropdownMenuSeparator /> : null}
            {item.href ? (
              <DropdownMenuItem
                asChild
                disabled={item.disabled}
                variant={item.destructive ? "destructive" : "default"}
              >
                <Link href={item.href} onClick={item.onSelect} target={item.target}>
                  {item.icon}
                  {item.label}
                </Link>
              </DropdownMenuItem>
            ) : (
              <DropdownMenuItem
                disabled={item.disabled}
                variant={item.destructive ? "destructive" : "default"}
                onSelect={item.onSelect}
              >
                {item.icon}
                {item.label}
              </DropdownMenuItem>
            )}
          </div>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

type InlineActionsProps = {
  items: ActionMenuItem[];
  className?: string;
  showLabels?: boolean;
};

export function InlineActions({ items, className, showLabels = false }: InlineActionsProps) {
  return (
    <div className={cn("flex flex-wrap items-center gap-1", className)}>
      {items.map((item, index) => {
        const label = typeof item.label === "string" ? item.label : undefined;
        const content = (
          <>
            {item.icon}
            <span className={showLabels ? "text-xs" : "sr-only"}>{item.label}</span>
          </>
        );
        const buttonClassName = cn(
          "h-8",
          !showLabels && "w-8 px-0",
          item.destructive && "text-rose-700 hover:bg-rose-50 hover:text-rose-800",
        );

        if (item.href && !item.disabled) {
          return (
            <Button key={index} asChild variant="ghost" size="sm" className={buttonClassName}>
              <Link
                href={item.href}
                target={item.target}
                onClick={item.onSelect}
                aria-label={label}
                title={label}
              >
                {content}
              </Link>
            </Button>
          );
        }

        return (
          <Button
            key={index}
            type="button"
            variant="ghost"
            size="sm"
            className={buttonClassName}
            disabled={item.disabled}
            onClick={item.onSelect}
            aria-label={label}
            title={label}
          >
            {content}
          </Button>
        );
      })}
    </div>
  );
}

type DataPaginationProps = {
  page: number;
  totalItems: number;
  pageSize?: number;
  onPageChange: (page: number) => void;
  itemLabel?: string;
  className?: string;
};

export function DataPagination({
  page,
  totalItems,
  pageSize = 10,
  onPageChange,
  itemLabel = "resultados",
  className,
}: DataPaginationProps) {
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const safePage = Math.min(Math.max(page, 1), totalPages);
  const first = totalItems === 0 ? 0 : (safePage - 1) * pageSize + 1;
  const last = Math.min(safePage * pageSize, totalItems);

  return (
    <div className={cn("flex flex-col gap-2 border-t border-slate-200 bg-slate-50/70 px-4 py-3 text-sm sm:flex-row sm:items-center sm:justify-between", className)}>
      <p className="text-slate-600">
        {first}–{last} de {totalItems} {itemLabel}
      </p>
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-8"
          disabled={safePage <= 1}
          onClick={() => onPageChange(safePage - 1)}
        >
          <ChevronLeft className="h-4 w-4" />
          <span className="sr-only sm:not-sr-only">Anterior</span>
        </Button>
        <span className="min-w-16 text-center text-xs font-medium text-slate-700">
          {safePage} / {totalPages}
        </span>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-8"
          disabled={safePage >= totalPages}
          onClick={() => onPageChange(safePage + 1)}
        >
          <span className="sr-only sm:not-sr-only">Siguiente</span>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

type MediaUploaderProps = {
  title?: ReactNode;
  description?: ReactNode;
  companyId: number;
  type: ImageUploadType;
  entityId?: number;
  currentUrl?: string | null;
  autoUpload?: boolean;
  onUploadComplete?: (url: string) => void;
  onFileSelect?: (file: File) => void;
  onDelete?: () => void;
  aspectRatio?: "1:1" | "16:9" | "4:3" | "free";
  maxSizeMB?: number;
  className?: string;
};

export function MediaUploader({ title, description, className, ...uploadProps }: MediaUploaderProps) {
  return (
    <div className={cn("space-y-3", className)}>
      {title || description ? (
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
            <ImageIcon className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            {title ? <h3 className="text-sm font-semibold text-slate-950">{title}</h3> : null}
            {description ? <p className="mt-1 text-sm text-slate-600">{description}</p> : null}
          </div>
        </div>
      ) : null}
      <ImageUpload {...uploadProps} />
    </div>
  );
}

type PreviewPanelProps = {
  title?: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  contentClassName?: string;
};

export function PreviewPanel({
  title = "Vista previa",
  description,
  actions,
  children,
  className,
  contentClassName,
}: PreviewPanelProps) {
  return (
    <aside className={cn("admin-card", className)}>
      <div className="flex items-start justify-between gap-3 border-b border-admin-border px-4 py-3">
        <div className="min-w-0">
          <h2 className="text-sm font-semibold text-slate-950">{title}</h2>
          {description ? <p className="mt-1 text-xs text-slate-500">{description}</p> : null}
        </div>
        {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
      </div>
      <div className={cn("p-4", contentClassName)}>{children}</div>
    </aside>
  );
}

// Shared replacements for legacy page-local cards. Existing wrappers re-export these
// so older imports keep working while admin screens migrate incrementally.
export const AdminStatCard = StatCard;
