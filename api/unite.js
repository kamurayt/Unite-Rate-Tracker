export default async function handler(req, res) {
  try {
    const player = req.query.player;

    if (!player) {
      return res.status(400).json({
        ok: false,
        error: "player が必要です",
      });
    }

    const url = player.startsWith("http")
      ? player
      : `https://uniteapi.dev/en/p/${player}`;

    const response = await fetch(url, {
      headers: {
        "user-agent": "Mozilla/5.0",
      },
    });

    if (!response.ok) {
      return res.status(response.status).json({
        ok: false,
        error: "UniteAPI取得失敗",
      });
    }

    const html = await response.text();

    const mpMatch = html.match(/([\d,]+)\s*MP/i);

    const currentRating = mpMatch
      ? Number(mpMatch[1].replace(/,/g, ""))
      : null;

    const now = new Date();

    return res.status(200).json({
      ok: true,
      currentRating,
      latestMatch: {
        id: Date.now().toString(),
        date: `${now.getFullYear()}-${String(
          now.getMonth() + 1
        ).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`,
        time: `${String(now.getHours()).padStart(2, "0")}:${String(
          now.getMinutes()
        ).padStart(2, "0")}`,
        pokemon: "取得中",
        result: "unknown",
      },
    });
  } catch (error) {
    return res.status(500).json({
      ok: false,
      error: error.message,
    });
  }
}
