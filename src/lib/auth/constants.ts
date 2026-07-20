export const STAFF_SESSION_COOKIE = 'staff_session';
export const ADMIN_SESSION_COOKIE = 'admin_session';

// docs/07-auth-security.md 4章で確定した有効期限
export const STAFF_SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 365; // 1年
export const ADMIN_SESSION_MAX_AGE_SECONDS = 60 * 60 * 12; // 12時間(仮。運用開始後に調整可)

export const STAFF_ACCESS_CODE_SETTING_KEY = 'staff_access_code';
