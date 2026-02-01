/**
 * React Query hooks for user settings (profile and preferences).
 *
 * Currently uses localStorage for persistence, structured for future
 * gateway API integration when user settings endpoints are available.
 */

import { useQuery, useQueryClient } from "@tanstack/react-query";

// Types

export interface UserProfile {
  name: string;
  email: string;
  avatar?: string;
  bio?: string;
}

export interface NotificationPreference {
  id: string;
  label: string;
  description: string;
  enabled: boolean;
}

export interface UserPreferences {
  timezone: string;
  language: string;
  defaultAgentId: string;
  notifications: NotificationPreference[];
}

export interface UserSettings {
  profile: UserProfile;
  preferences: UserPreferences;
}

// Storage keys
const STORAGE_KEY_PROFILE = "clawdbrain:user:profile";
const STORAGE_KEY_PREFERENCES = "clawdbrain:user:preferences";

// Default values
const DEFAULT_PROFILE: UserProfile = {
  name: "",
  email: "",
  avatar: undefined,
  bio: "",
};

const DEFAULT_NOTIFICATIONS: NotificationPreference[] = [
  {
    id: "agent-updates",
    label: "Agent Updates",
    description: "Get notified when agents complete tasks or need attention",
    enabled: true,
  },
  {
    id: "ritual-reminders",
    label: "Ritual Reminders",
    description: "Receive reminders before scheduled rituals run",
    enabled: true,
  },
  {
    id: "goal-progress",
    label: "Goal Progress",
    description: "Weekly updates on your goal progress",
    enabled: false,
  },
  {
    id: "memory-digests",
    label: "Memory Digests",
    description: "Daily summary of new memories and insights",
    enabled: false,
  },
  {
    id: "system-alerts",
    label: "System Alerts",
    description: "Important system notifications and updates",
    enabled: true,
  },
];

const DEFAULT_PREFERENCES: UserPreferences = {
  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "America/Los_Angeles",
  language: navigator.language?.split("-")[0] || "en",
  defaultAgentId: "",
  notifications: DEFAULT_NOTIFICATIONS,
};

// Query keys factory
export const userSettingsKeys = {
  all: ["userSettings"] as const,
  profile: () => [...userSettingsKeys.all, "profile"] as const,
  preferences: () => [...userSettingsKeys.all, "preferences"] as const,
};

// Storage helpers

function getStoredProfile(): UserProfile {
  if (typeof window === "undefined") return DEFAULT_PROFILE;
  try {
    const stored = localStorage.getItem(STORAGE_KEY_PROFILE);
    if (stored) {
      return { ...DEFAULT_PROFILE, ...JSON.parse(stored) };
    }
  } catch {
    // Ignore parse errors
  }
  return DEFAULT_PROFILE;
}

function getStoredPreferences(): UserPreferences {
  if (typeof window === "undefined") return DEFAULT_PREFERENCES;
  try {
    const stored = localStorage.getItem(STORAGE_KEY_PREFERENCES);
    if (stored) {
      const parsed = JSON.parse(stored);
      // Merge with defaults to ensure new notification types are included
      return {
        ...DEFAULT_PREFERENCES,
        ...parsed,
        notifications: DEFAULT_NOTIFICATIONS.map((defaultNotif) => {
          const storedNotif = parsed.notifications?.find(
            (n: NotificationPreference) => n.id === defaultNotif.id
          );
          return storedNotif ? { ...defaultNotif, enabled: storedNotif.enabled } : defaultNotif;
        }),
      };
    }
  } catch {
    // Ignore parse errors
  }
  return DEFAULT_PREFERENCES;
}

// API functions (localStorage-based, ready for gateway migration)

export async function getUserProfile(): Promise<UserProfile> {
  // Simulate network delay for realistic behavior
  await new Promise((resolve) => setTimeout(resolve, 100));
  return getStoredProfile();
}

export async function getUserPreferences(): Promise<UserPreferences> {
  await new Promise((resolve) => setTimeout(resolve, 100));
  return getStoredPreferences();
}

export async function getUserSettings(): Promise<UserSettings> {
  const [profile, preferences] = await Promise.all([
    getUserProfile(),
    getUserPreferences(),
  ]);
  return { profile, preferences };
}

// Query hooks

/**
 * Hook to get the user profile
 */
export function useUserProfile() {
  return useQuery({
    queryKey: userSettingsKeys.profile(),
    queryFn: getUserProfile,
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 30, // 30 minutes
  });
}

/**
 * Hook to get user preferences
 */
export function useUserPreferences() {
  return useQuery({
    queryKey: userSettingsKeys.preferences(),
    queryFn: getUserPreferences,
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 30, // 30 minutes
  });
}

/**
 * Hook to get all user settings (profile + preferences)
 */
export function useUserSettings() {
  return useQuery({
    queryKey: userSettingsKeys.all,
    queryFn: getUserSettings,
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 30, // 30 minutes
  });
}

/**
 * Hook to prefetch user settings (useful for preloading)
 */
export function usePrefetchUserSettings() {
  const queryClient = useQueryClient();

  return () => {
    queryClient.prefetchQuery({
      queryKey: userSettingsKeys.profile(),
      queryFn: getUserProfile,
    });
    queryClient.prefetchQuery({
      queryKey: userSettingsKeys.preferences(),
      queryFn: getUserPreferences,
    });
  };
}
