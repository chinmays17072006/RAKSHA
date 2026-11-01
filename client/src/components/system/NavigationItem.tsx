import type { LucideIcon } from "lucide-react";

export function NavigationItem({
  icon: Icon,
  label,
  active = false,
  disabled = false,
  phase,
  onClick,
}: {
  icon: LucideIcon;
  label: string;
  active?: boolean;
  disabled?: boolean;
  phase?: string;
  onClick?: () => void;
}) {
  const stateClass = active ? "nav-item--active" : disabled ? "nav-item--disabled" : "";
  return (
    <button
      type="button"
      className={`nav-item ${stateClass}`}
      aria-current={active ? "page" : undefined}
      aria-disabled={disabled ? "true" : undefined}
      title={disabled ? `${label} — planned for a later phase` : undefined}
      onClick={onClick}
    >
      <Icon size={17} strokeWidth={active ? 1.9 : 1.8} aria-hidden="true" />
      <span>{label}</span>
      {active && <span className="nav-item__active-dot" />}
      {disabled && <span className="nav-item__phase">{phase ?? "NEXT"}</span>}
    </button>
  );
}
