import type { ButtonHTMLAttributes, ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { ArrowUpRight, LoaderCircle, TriangleAlert } from "lucide-react";
import type { IncidentPriority, Severity } from "@/types/disaster";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: "sm" | "md" | "icon";
  icon?: LucideIcon;
}

export function Button({
  variant = "secondary",
  size = "md",
  icon: Icon,
  className = "",
  children,
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button className={`button button--${variant} button--${size} ${className}`} type={type} {...props}>
      {Icon && <Icon size={15} strokeWidth={1.8} aria-hidden="true" />}
      {children}
    </button>
  );
}

export function Card({ children, className = "", ...props }: { children: ReactNode; className?: string } & React.HTMLAttributes<HTMLDivElement>) {
  return <section className={`panel ${className}`} {...props}>{children}</section>;
}

export function SectionHeader({
  eyebrow,
  title,
  action,
  className = "",
}: {
  eyebrow?: string;
  title: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={`section-heading ${className}`}>
      <div>
        {eyebrow && <div className="section-eyebrow">{eyebrow}</div>}
        <h2>{title}</h2>
      </div>
      {action && <div className="section-heading__action">{action}</div>}
    </div>
  );
}

export function StatusBadge({
  children,
  tone = "neutral",
  dot = false,
  className = "",
}: {
  children: ReactNode;
  tone?: "critical" | "warning" | "success" | "info" | "neutral";
  dot?: boolean;
  className?: string;
}) {
  return (
    <span className={`status-badge status-badge--${tone} ${className}`}>
      {dot && <span className="status-badge__dot" aria-hidden="true" />}
      {children}
    </span>
  );
}

const severityClass: Record<Severity, string> = {
  Critical: "critical",
  High: "high",
  Medium: "moderate",
  Moderate: "moderate",
  Low: "low",
};

const severityCode: Record<Severity, string> = {
  Critical: "P0",
  High: "P1",
  Medium: "P2",
  Moderate: "P3",
  Low: "P3",
};

export function SeverityBadge({ severity, priority, compact = false }: { severity: Severity; priority?: IncidentPriority; compact?: boolean }) {
  return (
    <span className={`severity-badge severity-badge--${severityClass[severity]}`}>
      <span>{priority ?? severityCode[severity]}</span>
      {!compact && <span>{severity.toUpperCase()}</span>}
    </span>
  );
}

export function KpiCard({
  icon: Icon,
  label,
  value,
  note,
  trend,
  status,
  statusTone = "info",
  tone = "blue",
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  note: string;
  trend?: string;
  status?: string;
  statusTone?: "critical" | "warning" | "success" | "info";
  tone?: "blue" | "red" | "amber" | "green";
}) {
  return (
    <article className={`kpi-card kpi-card--${tone}`}>
      <div className="kpi-card__top">
        <span className="kpi-card__icon"><Icon size={16} strokeWidth={1.8} aria-hidden="true" /></span>
        <span className="kpi-card__label">{label}</span>
        {status ? <span className={`kpi-card__status kpi-card__status--${statusTone}`}>{status}</span> : trend && <span className="kpi-card__trend">{trend}</span>}
      </div>
      <div className="kpi-card__value">{value}</div>
      <div className="kpi-card__note">{note}</div>
    </article>
  );
}

export function ProgressIndicator({
  value,
  label,
  tone = "blue",
  showValue = true,
}: {
  value: number;
  label?: string;
  tone?: "blue" | "amber" | "red" | "green";
  showValue?: boolean;
}) {
  const safeValue = Math.max(0, Math.min(100, value));
  return (
    <div className="progress-block">
      {(label || showValue) && (
        <div className="progress-block__meta">
          {label && <span>{label}</span>}
          {showValue && <span>{safeValue}%</span>}
        </div>
      )}
      <div className="progress-track" role="progressbar" aria-valuenow={safeValue} aria-valuemin={0} aria-valuemax={100} aria-label={label ?? "Progress"}>
        <span className={`progress-track__fill progress-track__fill--${tone}`} style={{ width: `${safeValue}%` }} />
      </div>
    </div>
  );
}

export function TimelineItem({
  icon: Icon,
  title,
  detail,
  time,
  tone = "blue",
  last = false,
}: {
  icon: LucideIcon;
  title: string;
  detail: string;
  time: string;
  tone?: "blue" | "amber" | "red" | "green";
  last?: boolean;
}) {
  return (
    <div className={`timeline-item ${last ? "timeline-item--last" : ""}`}>
      <span className={`timeline-item__icon timeline-item__icon--${tone}`}><Icon size={13} aria-hidden="true" /></span>
      <div className="timeline-item__copy"><strong>{title}</strong><span>{detail}</span></div>
      <time>{time}</time>
    </div>
  );
}

export interface DataColumn<T> {
  key: string;
  title: string;
  render: (row: T) => ReactNode;
  className?: string;
  align?: "left" | "right";
}

export function DataTable<T extends { id: string | number }>({
  rows,
  columns,
  onRowClick,
  label,
}: {
  rows: T[];
  columns: DataColumn<T>[];
  onRowClick?: (row: T) => void;
  label: string;
}) {
  return (
    <div className="table-scroll">
      <table className="data-table" aria-label={label}>
        <thead><tr>{columns.map((column) => <th key={column.key} className={`${column.className ?? ""} ${column.align === "right" ? "table-cell--right" : ""}`}>{column.title}</th>)}</tr></thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id} className={onRowClick ? "data-table__row--clickable" : ""} onClick={() => onRowClick?.(row)} onKeyDown={(event) => { if (onRowClick && (event.key === "Enter" || event.key === " ")) { event.preventDefault(); onRowClick(row); } }} tabIndex={onRowClick ? 0 : undefined}>
              {columns.map((column) => <td key={column.key} className={`${column.className ?? ""} ${column.align === "right" ? "table-cell--right" : ""}`}>{column.render(row)}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function LoadingState({ label = "Loading operational data" }: { label?: string }) {
  return <div className="state-message" role="status"><LoaderCircle size={18} className="spin" aria-hidden="true" /><span>{label}</span></div>;
}

export function EmptyState({ title, detail }: { title: string; detail: string }) {
  return <div className="state-empty"><span className="state-empty__mark"><ArrowUpRight size={17} aria-hidden="true" /></span><strong>{title}</strong><p>{detail}</p></div>;
}

export function ErrorState({ title = "Unable to load this panel", detail, onRetry }: { title?: string; detail: string; onRetry?: () => void }) {
  return <div className="state-error" role="alert"><TriangleAlert size={18} aria-hidden="true" /><div><strong>{title}</strong><p>{detail}</p>{onRetry && <button className="text-button" onClick={onRetry}>Retry</button>}</div></div>;
}
