import { Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export interface NavItemProps {
  /** The route path to navigate to */
  href: string;
  /** Lucide icon component */
  icon: LucideIcon;
  /** Label text for the navigation item */
  label: string;
  /** Whether the sidebar is collapsed */
  collapsed?: boolean;
  /** Optional badge count to display */
  badge?: number;
  /** Click handler (used for non-navigation items) */
  onClick?: () => void;
}

export function NavItem({
  href,
  icon: Icon,
  label,
  collapsed = false,
  badge,
  onClick,
}: NavItemProps) {
  const content = (
    <>
      <Icon className="size-5 shrink-0" />
      <motion.span
        initial={false}
        animate={{
          opacity: collapsed ? 0 : 1,
          width: collapsed ? 0 : "auto",
        }}
        transition={{ duration: 0.2 }}
        className="overflow-hidden whitespace-nowrap"
      >
        {label}
      </motion.span>
      {badge !== undefined && badge > 0 && !collapsed && (
        <span className="ml-auto rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
          {badge > 99 ? "99+" : badge}
        </span>
      )}
    </>
  );

  const baseClasses = cn(
    "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
    "text-muted-foreground hover:bg-accent/50 hover:text-foreground",
    "[&.active]:bg-accent [&.active]:text-accent-foreground",
    collapsed && "justify-center px-2"
  );

  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={cn(baseClasses, "w-full text-left")}>
        {content}
      </button>
    );
  }

  return (
    <Link
      to={href}
      className={baseClasses}
      activeProps={{
        className: "active",
      }}
    >
      {content}
    </Link>
  );
}
