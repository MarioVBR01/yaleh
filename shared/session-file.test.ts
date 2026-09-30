// @vitest-environment node
import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { canonicalPayload, createSessionFile, sessionFileName, validateSessionFile, type SessionFile } from './session-file';

const sha256 = (text: string) => createHash('sha256').update(text, 'utf8').digest('hex');
const NOW = new Date('2026-09-29T15:30:00Z');
const HOUR = 3_600_000;

async function makeFile(overrides: Partial<Parameters<typeof createSessionFile>[0]> = {}) {
  return createSessionFile(
    {
      sessionId: 'abcDEF123',
      durationSeconds: 50 * 60,
      createdBy: { name: 'Mario Brañez', email: 'mario@tecba.edu.bo' },
      sources: [{ id: 's1', name: 'apuntes.pdf', type: 'application/pdf', size: 1234, text: 'Las tortugas son reptiles. ñandú' }],
      now: NOW,
      ...overrides,
    },
    sha256
  );
}

const validate = (raw: string, now = NOW) => validateSessionFile(raw, { sha256, now });

/** Recalcula el checksum después de modificar el archivo (para probar las demás reglas). */
async function resign(file: Record<string, unknown>) {
  return JSON.stringify({ ...file, checksum: sha256(canonicalPayload(file as unknown as SessionFile)) });
}

describe('createSessionFile', () => {
  it('genera formato, versión, caducidad de 24 horas y checksum', async () => {
    const file = await makeFile();
    expect(file.format).toBe('yaleh-session');
    expect(file.version).toBe(1);
    expect(Date.parse(file.expiresAt) - Date.parse(file.createdAt)).toBe(24 * HOUR);
    expect(file.checksum).toMatch(/^[a-f0-9]{64}$/);
  });
});

describe('validateSessionFile', () => {
  it('acepta un archivo recién creado (con acentos y ñ en el texto)', async () => {
    const result = await validate(JSON.stringify(await makeFile()));
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.file.sources[0].text).toContain('ñandú');
  });

  it('acepta un archivo sin fuentes', async () => {
    expect((await validate(JSON.stringify(await makeFile({ sources: [] })))).ok).toBe(true);
  });

  it('rechaza lo que no es JSON o no tiene el formato', async () => {
    expect(await validate('no es json')).toMatchObject({ ok: false, code: 'invalid' });
    expect(await validate(JSON.stringify({ format: 'otra-cosa' }))).toMatchObject({ ok: false, code: 'invalid' });
  });

  it('rechaza otra versión', async () => {
    const file = { ...(await makeFile()), version: 2 };
    expect(await validate(JSON.stringify(file))).toMatchObject({ ok: false, code: 'version' });
  });

  it.each([0, 59, 180 * 60 + 1, 90.5])('rechaza la duración %s', async duration => {
    const file = { ...(await makeFile()), durationSeconds: duration };
    expect(await validate(JSON.stringify(file))).toMatchObject({ ok: false, code: 'duration' });
  });

  it('acepta los límites de duración (1 y 180 minutos)', async () => {
    expect((await validate(JSON.stringify(await makeFile({ durationSeconds: 60 }))))).toMatchObject({ ok: true });
    expect((await validate(JSON.stringify(await makeFile({ durationSeconds: 180 * 60 }))))).toMatchObject({ ok: true });
  });

  it('detecta un archivo modificado o dañado (checksum)', async () => {
    const file = await makeFile();
    file.sources[0].text += ' (editado)';
    expect(await validate(JSON.stringify(file))).toMatchObject({ ok: false, code: 'checksum' });
  });

  it('caduca a las 24 horas', async () => {
    const raw = JSON.stringify(await makeFile());
    expect((await validate(raw, new Date(NOW.getTime() + 23 * HOUR))).ok).toBe(true);
    expect(await validate(raw, new Date(NOW.getTime() + 24 * HOUR + 1000))).toMatchObject({ ok: false, code: 'expired' });
  });

  it('rechaza una caducidad mayor a 24 horas aunque el checksum coincida', async () => {
    const file = await makeFile();
    const raw = await resign({ ...file, expiresAt: new Date(NOW.getTime() + 72 * HOUR).toISOString() });
    expect(await validate(raw)).toMatchObject({ ok: false, code: 'expired' });
  });

  it('rechaza fuentes o ids mal formados', async () => {
    const file = await makeFile();
    expect(await validate(await resign({ ...file, sessionId: '../x' }))).toMatchObject({ ok: false, code: 'invalid' });
    expect(
      await validate(await resign({ ...file, sources: [{ id: 's1', name: '', type: '', size: 1, text: '' }] }))
    ).toMatchObject({ ok: false, code: 'invalid' });
  });

  it('rechaza archivos de más de 50 MB', async () => {
    const huge = 'x'.repeat(50 * 1024 * 1024 + 1);
    expect(await validate(huge)).toMatchObject({ ok: false, code: 'too-large' });
  });

  it('los errores traen un mensaje para el estudiante', async () => {
    const result = await validate('{}');
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.message).toMatch(/YALEH/);
  });
});

describe('sessionFileName', () => {
  it('usa la fecha local y la extensión .yaleh', () => {
    expect(sessionFileName(new Date(2026, 8, 29, 15, 7))).toBe('YALEH-sesion-2026-09-29-1507.yaleh');
  });
});
