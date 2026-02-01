"use client";

import * as React from "react";
import { createFileRoute } from "@tanstack/react-router";

import {
  ProfileSection,
  PreferencesSection,
  AIProviderSection,
  GatewaySection,
  ChannelsSection,
  AgentsSection,
  HealthSection,
  AdvancedSection,
  ConnectionsSection,
  UsageSection,
  KeyboardShortcutsModal,
  SettingsNav,
  SettingsMobileNav,
  type SettingsSection,
} from "@/components/domain/settings";

export const Route = createFileRoute("/you/")({
  component: YouPage,
  validateSearch: (search: Record<string, unknown>): { section?: SettingsSection } => {
    const validSections: SettingsSection[] = [
      "profile",
      "preferences",
      "health",
      "ai-provider",
      "gateway",
      "channels",
      "agents",
      "advanced",
      "connections",
      "usage",
    ];
    const section = search.section as SettingsSection | undefined;
    return {
      section: section && validSections.includes(section) ? section : undefined,
    };
  },
});

function YouPage() {
  const navigate = Route.useNavigate();
  const { section: searchSection } = Route.useSearch();

  const [activeSection, setActiveSection] = React.useState<SettingsSection>(
    searchSection || "profile"
  );
  const [shortcutsOpen, setShortcutsOpen] = React.useState(false);

  // Sync URL with active section
  const handleSectionChange = (section: SettingsSection) => {
    setActiveSection(section);
    navigate({
      search: (prev) => (section === "profile" ? {} : { ...prev, section }),
      replace: true,
    });
  };

  // Update active section when URL changes
  React.useEffect(() => {
    if (searchSection && searchSection !== activeSection) {
      setActiveSection(searchSection);
    }
  }, [searchSection, activeSection]);

  const renderSection = () => {
    switch (activeSection) {
      case "profile":
        return <ProfileSection />;
      case "preferences":
        return <PreferencesSection />;
      case "health":
        return <HealthSection />;
      case "ai-provider":
        return <AIProviderSection />;
      case "gateway":
        return <GatewaySection />;
      case "channels":
        return <ChannelsSection />;
      case "agents":
        return <AgentsSection />;
      case "advanced":
        return <AdvancedSection onOpenShortcuts={() => setShortcutsOpen(true)} />;
      case "connections":
        return <ConnectionsSection />;
      case "usage":
        return <UsageSection />;
      default:
        return <ProfileSection />;
    }
  };

  return (
    <>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-muted-foreground mt-1">
          Manage your profile, preferences, and account settings.
        </p>
      </div>

      {/* Main Content */}
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Sidebar Navigation - Desktop */}
          <aside className="hidden lg:block w-64 shrink-0">
            <div className="sticky top-8">
              <SettingsNav
                activeSection={activeSection}
                onSectionChange={handleSectionChange}
              />
            </div>
          </aside>

          {/* Mobile Navigation */}
          <div className="lg:hidden sticky top-0 z-20 -mx-4 px-4 py-2 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
            <SettingsMobileNav
              activeSection={activeSection}
              onSectionChange={handleSectionChange}
            />
          </div>

          {/* Content Area */}
          <main className="flex-1 min-w-0">
            {renderSection()}
          </main>
        </div>

      {/* Keyboard Shortcuts Modal */}
      <KeyboardShortcutsModal open={shortcutsOpen} onOpenChange={setShortcutsOpen} />
    </>
  );
}
