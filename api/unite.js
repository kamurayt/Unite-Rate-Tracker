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
        error: `UniteAPI取得失敗 ${response.status}`,
      });
    }

    const html = await response.text();

    const text = html
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/&nbsp;/g, " ")
      .replace(/\s+/g, " ");

    const mpMatches = [...text.matchAll(/([\d,]+)\s*MP/gi)]
      .map((m) => Number(m[1].replace(/,/g, "")))
      .filter((n) => n >= 100);

    const currentRating =
      mpMatches.length > 0 ? Math.max(...mpMatches) : null;

    if (!currentRating) {
      return res.status(422).json({
        ok: false,
        error: "レートMPを取得できませんでした",
      });
    }

    const now = new Date();

    return res.status(200).json({
      ok: true,
      currentRating,
      latestMatch: {
        id: `${currentRating}-${Date.now()}`,
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
