function parseCorsOrigins(raw: string | undefined): string | string[] {
  if (!raw) return '*';
  try {
    return JSON.parse(raw);
  } catch {
    return raw;
  }
}

export const config = {
  port: parseInt(process.env.BACKEND_PORT ?? '8000', 10),
  corsOrigins: parseCorsOrigins(process.env.CORS_ORIGINS),
};
