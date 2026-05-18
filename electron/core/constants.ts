export const IPC_FROM_GMAIL = "owlpost:from-gmail" as const;
export const IPC_PREFS_GET = "owlpost:prefs:get" as const;
export const IPC_PREFS_SET = "owlpost:prefs:set" as const;
export const IPC_PREFS_CHANGED = "owlpost:prefs:changed" as const;
export const IPC_LAUNCH_AT_LOGIN_GET = "owlpost:launch-at-login:get" as const;
export const IPC_CRASH_REPORTING_AVAIL = "owlpost:crash-reporting-available" as const;
export const IPC_NOTIF_PERMISSION_GET = "owlpost:notification-permission:get" as const;
export const IPC_UPDATE_CHECK = "owlpost:update:check" as const;
export const IPC_UPDATE_INSTALL = "owlpost:update:install" as const;
export const IPC_UPDATE_PENDING = "owlpost:update:pending-version" as const;
export const IPC_UPDATE_READY = "owlpost:update:ready" as const;
export const IPC_APP_RESET = "owlpost:app:reset" as const;
export const IPC_APP_RELAUNCH = "owlpost:app:relaunch" as const;

// Injected scripts cannot import from here — they use string literals matching these values.
export const GMAIL_EVT_UNREAD_COUNT = "unread-count" as const;
export const GMAIL_EVT_ACCOUNT_EMAIL = "account-email" as const;
export const GMAIL_EVT_NOTIFICATION = "notification" as const;
export const GMAIL_EVT_INJECTED_ERROR = "injected-script-error" as const;
export const GMAIL_EVT_TITLE_FORMAT_UNKNOWN = "title-format-unknown" as const;
export const GMAIL_EVT_MENU_ACTION_FAILED = "menu-action-failed" as const;

// ServiceLogin URL ensures logged-out users land on the sign-in form rather than a workspace redirect.
export const GMAIL_INITIAL_URL =
    "https://accounts.google.com/ServiceLogin?service=mail&continue=https%3A%2F%2Fmail.google.com%2Fmail%2Fu%2F0" as const;

export const BLANK_COMPOSE_URL = "https://mail.google.com/mail/?view=cm&fs=1" as const;

export const GMAIL_ALLOWED_HOSTS = new Set(["mail.google.com", "accounts.google.com"]);
