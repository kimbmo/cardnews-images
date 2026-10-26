# cardnews-images

Card images for the Instagram channel @why.trend.kr (왜떴지), served by GitHub Pages so the Instagram API can fetch them.

- `posts/<date>-<slug>/`: one carousel post
  - `cards.json`: the card text (input to the renderer), with any photos under `img/`
  - `card-N.jpg`: the rendered 1080×1350 cards
  - `caption.txt`: the Instagram caption
- `tools/render.js`: renders a `cards.json` to JPEGs (`node tools/render.js <cards.json> <outDir>`)
- `scripts/publish.js`: posts a carousel through graph.instagram.com

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
