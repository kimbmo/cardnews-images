// Publish a Reel to Instagram (Instagram API with Instagram Login).
// usage: IG_USER_ID=... node publish-reel.js <caption.txt> <mp4Url> [coverJpegUrl] [--no-publish] [--dry-run]
// The video must be reachable at a public URL (GitHub Pages); Meta fetches it.
// --no-publish creates the container and waits for it to finish processing, then stops:
// a full check that publishes nothing.
// Token handling is the same as publish.js: curl through the proxy, never Node fetch.
const fs = require('fs');
const { execFileSync } = require('child_process');

const API = 'https://graph.instagram.com/v26.0';
const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const noPublish = args.includes('--no-publish');
const [captionPath, video_url, cover_url] = args.filter((a) => !a.startsWith('--'));
const { IG_USER_ID, IG_ACCESS_TOKEN } = process.env;

if (!captionPath || !video_url) {
  console.error('need a caption file and a video URL');
  process.exit(1);
}
if (!dryRun && !IG_USER_ID) {
  console.error('IG_USER_ID must be set');
  process.exit(1);
}
const caption = fs.readFileSync(captionPath, 'utf8').trim();

function call(method, path, params) {
  const a = ['-sS', ...(method === 'GET' ? ['-G'] : []), `${API}/${path}`];
  if (IG_ACCESS_TOKEN) a.push('-H', `Authorization: Bearer ${IG_ACCESS_TOKEN}`);
  for (const [k, v] of Object.entries(params)) a.push('--data-urlencode', `${k}=${v}`);
  const json = JSON.parse(execFileSync('curl', a, { encoding: 'utf8' }));
  if (json.error) throw new Error(`${path}: ${JSON.stringify(json.error)}`);
  return json;
}

// Video processing is slower than images: poll every 30 s for up to 10 minutes.
async function waitFinished(id) {
  for (let i = 0; i < 20; i++) {
    const { status_code, status } = call('GET', id, { fields: 'status_code,status' });
    if (status_code === 'FINISHED') return;
    if (status_code === 'ERROR' || status_code === 'EXPIRED') throw new Error(`container ${id}: ${status_code} ${status || ''}`);
    await new Promise((r) => setTimeout(r, 30_000));
  }
  throw new Error(`container ${id} not ready after 10 minutes`);
}

(async () => {
  const params = { media_type: 'REELS', video_url, caption, share_to_feed: 'true' };
  if (cover_url) params.cover_url = cover_url;
  if (dryRun) return console.log('POST', `${IG_USER_ID}/media`, params);
  console.log('account:', call('GET', 'me', { fields: 'username' }).username);
  const { id } = call('POST', `${IG_USER_ID}/media`, params);
  console.log('container:', id);
  await waitFinished(id);
  if (noPublish) return console.log('container finished; not published (--no-publish)');
  const published = call('POST', `${IG_USER_ID}/media_publish`, { creation_id: id });
  console.log('published media id:', published.id);
})().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
