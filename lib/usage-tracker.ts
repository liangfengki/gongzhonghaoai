import { STATIC_AUTH_CODES } from './auth-codes';

const MAX_USAGE_PER_CODE = 10;

export function validateCodeForLogin(code: string, existingUsageCookie: string | undefined): {
  ok: boolean;
  error?: string;
  currentUsage?: number;
} {
  if (!STATIC_AUTH_CODES.includes(code)) {
    return { ok: false, error: '无效的授权码' };
  }

  if (!existingUsageCookie) {
    return { ok: true, currentUsage: 0 };
  }

  const usage = parseInt(existingUsageCookie, 10);
  if (isNaN(usage)) {
    return { ok: true, currentUsage: 0 };
  }

  if (usage >= MAX_USAGE_PER_CODE) {
    return { ok: false, error: '该授权码已用完（上限10篇），请更换新的授权码' };
  }

  return { ok: true, currentUsage: usage };
}

export function checkCodeUsage(code: string, usageCookie: string | undefined): {
  ok: boolean;
  error?: string;
  remaining?: number;
} {
  if (!STATIC_AUTH_CODES.includes(code)) {
    return { ok: false, error: '无效的授权码' };
  }

  if (!usageCookie) {
    return { ok: false, error: '请重新登录' };
  }

  const usage = parseInt(usageCookie, 10);
  if (isNaN(usage)) {
    return { ok: false, error: '请重新登录' };
  }

  if (usage >= MAX_USAGE_PER_CODE) {
    return { ok: false, error: '该授权码已用完（上限10篇），请更换新的授权码' };
  }

  return { ok: true, remaining: MAX_USAGE_PER_CODE - usage };
}

export function incrementUsage(usageCookie: string | undefined): number {
  const usage = parseInt(usageCookie || '0', 10);
  if (isNaN(usage)) return 1;
  return usage + 1;
}
