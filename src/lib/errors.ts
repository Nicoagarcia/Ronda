// Traduce errores de Supabase a mensajes para el usuario.

const AUTH_MESSAGES: Record<string, string> = {
  invalid_credentials: 'Email o contraseña incorrectos.',
  email_not_confirmed: 'Todavía no confirmaste tu email.',
  user_already_exists: 'Ya existe una cuenta con ese email.',
  email_exists: 'Ya existe una cuenta con ese email.',
  weak_password: 'La contraseña tiene que tener al menos 8 caracteres.',
  otp_expired: 'El código no es válido o ya venció.',
  over_email_send_rate_limit: 'Esperá un momento antes de pedir otro código.',
  over_request_rate_limit: 'Demasiados intentos. Esperá un momento.',
  validation_failed: 'Revisá los datos ingresados.',
  same_password: 'La contraseña nueva tiene que ser distinta de la anterior.',
};

// Códigos con los que nuestras funciones de la base lanzan mensajes ya escritos para el usuario.
const DB_USER_MESSAGE_CODES = new Set(['P0001', '23514']);

export function errorCode(error: unknown): string | undefined {
  return error && typeof error === 'object' ? (error as { code?: string }).code : undefined;
}

export function errorMessage(error: unknown): string {
  if (!error || typeof error !== 'object') return 'Algo salió mal. Probá de nuevo.';
  const { code, message, name } = error as { code?: string; message?: string; name?: string };

  if (code && AUTH_MESSAGES[code]) return AUTH_MESSAGES[code];
  if (name === 'AuthRetryableFetchError' || message === 'Network request failed') {
    return 'No hay conexión. Revisá internet y probá de nuevo.';
  }
  // Los CHECK de Postgres ("new row … violates check constraint") no son para el usuario.
  if (code && DB_USER_MESSAGE_CODES.has(code) && message && !message.includes('violates')) {
    return message;
  }
  return 'Algo salió mal. Probá de nuevo.';
}
