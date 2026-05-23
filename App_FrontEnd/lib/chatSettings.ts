export const CHAT_SETTINGS_DEFAULTS = {
  showSenderProfilePictures: false,
} as const;

export type ChatSettingsDefaults = typeof CHAT_SETTINGS_DEFAULTS;
