// Publish a carousel to Instagram (Instagram API with Instagram Login).
// usage: IG_USER_ID=... node publish.js <caption.txt> <jpegUrl1> <jpegUrl2> ... [--dry-run]
// Images must be JPEG and reachable at a public URL when this runs; Meta fetches them.
// The token travels as an Authorization: Bearer header. In the cloud environment it is a network
// secret the agent proxy attaches for graph.instagram.com, so IG_ACCESS_TOKEN stays unset there;
// set it only when running somewhere without that proxy.
// Requests go through curl because Node's built-in fetch ignores HTTPS_PROXY, so the proxy
// never sees them and the token is never attached.
const fs = require('fs');
const { execFileSync } = require('child_process');

const API = 'https://graph.instagram.com/v26.0';
const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const [captionPath, ...urls] = args.filter((a) => a !== '--dry-run');
const { IG_USER_ID, IG_ACCESS_TOKEN } = process.env;

if (!captionPath || urls.length < 2 || urls.length > 20) {
  console.error('need a caption file and 2-20 image URLs');
  process.exit(1);
}
if (!dryRun && !IG_USER_ID) {
  console.error('IG_USER_ID must be set');
  process.exit(1);
}
const caption = fs.readFileSync(captionPath, 'utf8').trim();

function call(method, path, params) {
  const args = ['-sS', ...(method === 'GET' ? ['-G'] : []), `${API}/${path}`];
  if (IG_ACCESS_TOKEN) args.push('-H', `Authorization: Bearer ${IG_ACCESS_TOKEN}`);
  for (const [k, v] of Object.entries(params)) args.push('--data-urlencode', `${k}=${v}`);
  const json = JSON.parse(execFileSync('curl', args, { encoding: 'utf8' }));
  if (json.error) throw new Error(`${path}: ${JSON.stringify(json.error)}`);
  return json;
}

async function post(path, params) {
  if (dryRun) {
    console.log('POST', path, params);
    return { id: 'dry-' + Math.random().toString(36).slice(2, 8) };
  }
  return call('POST', path, params);
}

// Meta suggests polling about once a minute for up to five minutes.
async function waitFinished(containerId) {
  if (dryRun) return;
  for (let i = 0; i < 5; i++) {
    const { status_code } = call('GET', containerId, { fields: 'status_code' });
    if (status_code === 'FINISHED') return;
    if (status_code === 'ERROR' || status_code === 'EXPIRED') throw new Error(`container ${containerId}: ${status_code}`);
    await new Promise((r) => setTimeout(r, 60_000));
  }
  throw new Error(`container ${containerId} not ready after 5 minutes`);
}

(async () => {
  // Fail before creating anything if the token is not getting through.
  if (!dryRun) console.log('account:', call('GET', 'me', { fields: 'username' }).username);
  const children = [];
  for (const image_url of urls) {
    const { id } = await post(`${IG_USER_ID}/media`, { image_url, is_carousel_item: 'true' });
    children.push(id);
  }
  for (const id of children) await waitFinished(id);

  const carousel = await post(`${IG_USER_ID}/media`, {
    media_type: 'CAROUSEL',
    children: children.join(','),
    caption,
  });
  await waitFinished(carousel.id);

  const published = await post(`${IG_USER_ID}/media_publish`, { creation_id: carousel.id });
  console.log('published media id:', published.id);
})().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
