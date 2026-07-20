// ponytail: memory leak ceiling on infinite unique IPs, prune Map periodically if memory usage rises.
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

export function isRateLimited(ip: string, limit = 60, windowMs = 60 * 1000): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);

  // Prune expired entries periodically to prevent memory leaks (ceiling upgrade)
  if (rateLimitMap.size > 5000) {
    for (const [key, val] of rateLimitMap.entries()) {
      if (now > val.resetTime) {
        rateLimitMap.delete(key);
      }
    }
  }

  if (!entry || now > entry.resetTime) {
    rateLimitMap.set(ip, { count: 1, resetTime: now + windowMs });
    return false;
  }

  entry.count += 1;
  return entry.count > limit;
}
