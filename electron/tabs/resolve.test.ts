// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { extractYouTubeId } from '../../shared/youtube';
import { resolveTabUrl } from './resolve';

const PLAYER = 'https://yaleh-fbe1c.web.app/youtube.html';

describe('extractYouTubeId', () => {
  it.each([
    ['https://www.youtube.com/watch?v=dQw4w9WgXcQ', 'dQw4w9WgXcQ'],
    ['https://youtube.com/watch?v=dQw4w9WgXcQ&t=42s', 'dQw4w9WgXcQ'],
    ['https://m.youtube.com/watch?v=dQw4w9WgXcQ', 'dQw4w9WgXcQ'],
    ['https://youtu.be/dQw4w9WgXcQ?si=abc', 'dQw4w9WgXcQ'],
    ['https://www.youtube.com/shorts/dQw4w9WgXcQ', 'dQw4w9WgXcQ'],
    ['https://www.youtube.com/embed/dQw4w9WgXcQ', 'dQw4w9WgXcQ'],
    ['https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ', 'dQw4w9WgXcQ'],
    ['https://www.youtube.com/live/dQw4w9WgXcQ', 'dQw4w9WgXcQ'],
  ])('%s → %s', (url, id) => {
    expect(extractYouTubeId(url)).toBe(id);
  });

  it.each([
    'https://www.youtube.com/',
    'https://www.youtube.com/watch?v=corto',
    'https://www.youtube.com/@canal',
    'https://evil-youtube.com/watch?v=dQw4w9WgXcQ',
    'https://youtube.com.evil.io/watch?v=dQw4w9WgXcQ',
    'javascript:alert(1)',
    'no es url',
  ])('no reconoce %s', url => {
    expect(extractYouTubeId(url)).toBeNull();
  });
});

describe('resolveTabUrl', () => {
  it('los sitios permitidos se cargan tal cual', () => {
    expect(resolveTabUrl('https://classroom.google.com/c/1', PLAYER)).toEqual({
      kind: 'web',
      url: 'https://classroom.google.com/c/1',
    });
  });

  it('los videos de YouTube van al reproductor propio con el id', () => {
    expect(resolveTabUrl('https://youtu.be/dQw4w9WgXcQ', PLAYER)).toEqual({
      kind: 'youtube',
      url: `${PLAYER}?v=dQw4w9WgXcQ`,
      videoId: 'dQw4w9WgXcQ',
    });
  });

  it('youtube.com sin video y los sitios no permitidos se bloquean', () => {
    expect(resolveTabUrl('https://www.youtube.com/feed/trending', PLAYER)).toBeNull();
    expect(resolveTabUrl('https://es.wikipedia.org/', PLAYER)).toBeNull();
    expect(resolveTabUrl('http://classroom.google.com/', PLAYER)).toBeNull();
  });
});
