function parseCorsOrigins(raw: string | undefined): string | string[] {
  if (!raw) return '*';
  // Уже просто звёздочка или URL
  if (raw === '*') return '*';
  try {
    const parsed = JSON.parse(raw);
    // ["*"] → '*' для совместимости с cors()
    if (Array.isArray(parsed) && parsed.length === 1 && parsed[0] === '*') return '*';
    return parsed;
  } catch {
    // Невалидный JSON (например [*] без кавычек) → разрешаем всё
    return '*';
  }
}

export const config = {
  port: parseInt(process.env.BACKEND_PORT ?? '8000', 10),
  corsOrigins: parseCorsOrigins(process.env.CORS_ORIGINS),
};
