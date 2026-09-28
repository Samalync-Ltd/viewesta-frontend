import client from '../api/client';
import {
  getMovieVideoFiles, getEpisodeVideoFiles, sourcesExpireAt, withSharedExpiry, SIGNED_URL_TTL_MS,
} from './videoService';

jest.mock('../api/client', () => ({ __esModule: true, default: { get: jest.fn() } }));

const FETCHED_AT = 1_000_000;
const file = (quality, extra = {}) => ({ quality, file_url: `https://cdn.test/${quality}.mp4`, ...extra });

describe('sourcesExpireAt', () => {
  test('falls back to the default lifetime when the API sends none', () => {
    expect(sourcesExpireAt([file('480p')], FETCHED_AT)).toBe(FETCHED_AT + SIGNED_URL_TTL_MS);
  });

  test('uses a per-file expires_in_seconds (900 s on the ECS build)', () => {
    expect(sourcesExpireAt([file('480p', { expires_in_seconds: 900 })], FETCHED_AT)).toBe(FETCHED_AT + 900000);
  });

  test('uses the earliest expiry across files', () => {
    const at = new Date(FETCHED_AT + 120000).toISOString();
    const files = [file('1080p', { expires_in_seconds: 900 }), file('480p', { expires_at: at })];
    expect(sourcesExpireAt(files, FETCHED_AT)).toBe(FETCHED_AT + 120000);
  });
});

describe('withSharedExpiry', () => {
  test('copies a response-level lifetime onto files without one', () => {
    const files = withSharedExpiry([file('480p'), file('720p', { expires_in_seconds: 60 })], { expires_in_seconds: 900 });
    expect(files[0].expires_in_seconds).toBe(900);
    expect(files[1].expires_in_seconds).toBe(60);
  });

  test('returns the same array when no lifetime is sent', () => {
    const files = [file('480p')];
    expect(withSharedExpiry(files, { video_files: files })).toBe(files);
  });
});

describe('video-files requests', () => {
  afterEach(() => client.get.mockReset());

  test('movie: a top-level expires_in_seconds reaches sourcesExpireAt', async () => {
    client.get.mockResolvedValue({ data: { success: true, data: { video_files: [file('480p')], expires_in_seconds: 900 } } });
    const files = await getMovieVideoFiles('m1');
    expect(sourcesExpireAt(files, FETCHED_AT)).toBe(FETCHED_AT + 900000);
  });

  test('episode: a lifetime on the nested episode object is kept', async () => {
    client.get.mockResolvedValue({ data: { success: true, data: { episode: { video_files: [file('480p')], expires_in_seconds: 900 } } } });
    const files = await getEpisodeVideoFiles('e1');
    expect(sourcesExpireAt(files, FETCHED_AT)).toBe(FETCHED_AT + 900000);
  });
});
