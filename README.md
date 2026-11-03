# cardnews-images

Card images for the Instagram channel @why.trend.kr (왜떴지), served by GitHub Pages so the Instagram API can fetch them.

- `posts/<date>-<slug>/`: one carousel post
  - `cards.json`: the card text (input to the renderer), with any photos under `img/`
  - `card-N.jpg`: the rendered 1080×1350 cards
  - `caption.txt`: the Instagram caption
  - `reel-cover.jpg`: the cover redrawn at 1080×1920 for the Reel thumbnail (text kept inside y 300–1500 so the 3:4 grid crop and the Reels overlay never cut it)
  - `reel.mp4`: the same cards as a 9:16 Reels video (3 s per card, opening on `reel-cover.jpg`, with background music when `BGM_DIR` is set; the mp3s live outside this repo)
- `tools/render.js`: renders a `cards.json` to JPEGs plus `reel-cover.jpg` (`node tools/render.js <cards.json> <outDir>`)
- `tools/reel.sh`: makes `reel.mp4` from a post's cards (`tools/reel.sh posts/<dir>`, needs ffmpeg)
- `scripts/publish.js`: posts a carousel through graph.instagram.com
- `scripts/publish-reel.js`: posts a Reel (`node scripts/publish-reel.js <caption.txt> <mp4Url> [coverUrl]`; `--no-publish` checks without posting)

## cards.json

`handle`, `accent`, and `cards`, a list of cards. Each card has a `type`:

- `cover`: `kicker` (a short field name such as "미국 증시"), `title`, `sub`
- `table`: `title`, `rows` of `[name, middle, value]`, `foot`
- `big`: `label`, `value` (one short figure), `note`, `foot`
- `list`: `title`, `items` of `[bold line, detail]`
- `timeline`: `title`, `rows` of `[date, bold line, detail]`, optional `foot`
- `outro`: `title`, `sub`, `source`

Any card can take `image` (a path relative to the JSON) and `credit`. A cover or outro with an image becomes a full-bleed photo; other cards get a banner. `\n` in text is a line break. `posts/2026-10-23-nasdaq/cards.json` is a complete example.

## Fonts

`tools/fonts/` holds Noto Sans KR (400, 700, 900) as WOFF2, under the SIL Open Font License 1.1 (`tools/fonts/OFL.txt`).
