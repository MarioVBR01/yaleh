/**
 * @file errors.ts
 * @description Mensajes claros para los errores del asistente (brief, sección 7.3).
 */

export function describeAIError(error: unknown): string {
  const text = `${(error as { message?: string })?.message ?? ''} ${JSON.stringify(
    (error as { customErrorData?: unknown })?.customErrorData ?? ''
  )}`;
  const status = (error as { customErrorData?: { status?: number } })?.customErrorData?.status;

  if (status === 429 || /\b429\b|RESOURCE_EXHAUSTED|quota/i.test(text)) {
    return 'Se agotó la cuota gratuita del asistente por ahora. Vuelve a intentarlo en unos minutos.';
  }
  if (status === 401 || status === 403 || /App Check|\b40[13]\b|PERMISSION_DENIED|attestation/i.test(text)) {
    return 'El asistente no está autorizado en este momento (App Check). Avisa al administrador de YALEH.';
  }
  if (/network|Failed to fetch|ERR_INTERNET|offline/i.test(text)) {
    return 'No hay conexión con el asistente. Revisa tu internet.';
  }
  return 'El asistente no pudo responder. Inténtalo de nuevo.';
}
