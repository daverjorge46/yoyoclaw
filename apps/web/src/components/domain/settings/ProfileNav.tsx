"use client";

import { User, Settings } from "lucide-react";

import { cn } from "@/lib/utils";

export type ProfileSection = "profile" | "preferences";

interface NavItem {
  id: ProfileSection;
  label: string;
  icon: typeof User;
}

interface ProfileNavProps {
  activeSection: ProfileSection;
  onSectionChange: (section: ProfileSection) => void;
  className?: string;
}

const navItems: NavItem[] = [
  { id: "profile", label: "Profile", icon: User },
  { id: "preferences", label: "Preferences", icon: Settings },
];

export function ProfileNav({
  activeSection,
  onSectionChange,
  className,
}: ProfileNavProps) {
  return (
    <nav className={cn("space-y-1", className)}>
      <h4 className="px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
        Personalization
      </h4>
      {navItems.map((item) => {
        const Icon = item.icon;
        const isActive = activeSection === item.id;

        return (
          <button
            key={item.id}
            type="button"
            onClick={() => onSectionChange(item.id)}
            className={cn(
              "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
              isActive
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            <Icon className="h-4 w-4" />
            {item.label}
          </button>
        );
      })}
    </nav>
  );
}

export default ProfileNav;
