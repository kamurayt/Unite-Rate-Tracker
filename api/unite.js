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
      .replace(/&amp;/g, "&")
      .replace(/&#x27;/g, "'")
      .replace(/&quot;/g, '"')
      .replace(/\s+/g, " ")
      .trim();

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

    let matchDate = `${now.getFullYear()}-${String(
      now.getMonth() + 1
    ).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;

    let matchTime = `${String(now.getHours()).padStart(2, "0")}:${String(
      now.getMinutes()
    ).padStart(2, "0")}`;

    const dateTimeMatch = text.match(
      /(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+(\d{1,2}),\s+(\d{4})\s*[・·]\s*(\d{1,2}):(\d{2})/i
    );

    if (dateTimeMatch) {
      const months = {
        jan: "01",
        feb: "02",
        mar: "03",
        apr: "04",
        may: "05",
        jun: "06",
        jul: "07",
        aug: "08",
        sep: "09",
        oct: "10",
        nov: "11",
        dec: "12",
      };

      const month = months[dateTimeMatch[1].slice(0, 3).toLowerCase()];
      const day = String(dateTimeMatch[2]).padStart(2, "0");
      const year = dateTimeMatch[3];

      matchDate = `${year}-${month}-${day}`;
      matchTime = `${String(dateTimeMatch[4]).padStart(2, "0")}:${dateTimeMatch[5]}`;
    }

    return res.status(200).json({
      ok: true,
      currentRating,
      latestMatch: {
        id: `${matchDate}-${matchTime}-${currentRating}`,
        date: matchDate,
        time: matchTime,
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
