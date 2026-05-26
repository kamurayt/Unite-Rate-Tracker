import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import "./style.css";

const STORAGE_KEY = "unite-rate-tracker-v2";
const UPDATE_MINUTES = 3;

function signed(num) {
  return num > 0 ? `+${num}` : `${num}`;
}

function buildDailyGroups(matches) {
  const grouped = {};

  matches.forEach((m) => {
    if (!grouped[m.date]) grouped[m.date] = [];
    grouped[m.date].push(m);
  });

  return Object.entries(grouped).map(([date, list]) => {
    const totalDiff = list.reduce((a, b) => a + b.diff, 0);

    const finalRating = list[list.length - 1]?.rating || 0;

    const startRating = finalRating - totalDiff;

    return {
      date,
      matches: list,
      totalDiff,
      finalRating,
      startRating,
    };
  });
}

function App() {
  const saved = JSON.parse(
    localStorage.getItem(STORAGE_KEY) || "null"
  );

  const [playerId, setPlayerId] = useState(
    saved?.playerId || ""
  );

  const [matches, setMatches] = useState(
    saved?.matches || []
  );

  const [status, setStatus] = useState("待機中");

  const dailyGroups = useMemo(
    () => buildDailyGroups(matches),
    [matches]
  );

  useEffect(() => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        playerId,
        matches,
      })
    );
  }, [playerId, matches]);

  async function updateCheck() {
    try {
      setStatus("更新中...");

      const res = await fetch(
        `/api/unite?player=${encodeURIComponent(playerId)}`
      );

      const data = await res.json();

      if (!data.ok) {
        setStatus(data.error);
        return;
      }

      const previousRating =
        matches.length > 0
          ? matches[matches.length - 1].rating
          : data.currentRating;

      const diff =
        data.currentRating - previousRating;

      const now = new Date();

      const match = {
        id: Date.now().toString(),
        date: `${now.getFullYear()}-${String(
          now.getMonth() + 1
        ).padStart(2, "0")}-${String(
          now.getDate()
        ).padStart(2, "0")}`,
        time: `${String(now.getHours()).padStart(
          2,
          "0"
        )}:${String(now.getMinutes()).padStart(
          2,
          "0"
        )}`,
        pokemon: "取得中",
        result: diff >= 0 ? "win" : "lose",
        diff,
        rating: data.currentRating,
      };

      setMatches((prev) => [...prev, match]);

      setStatus(`更新成功 ${signed(diff)}`);
    } catch (e) {
      setStatus("取得失敗");
    }
  }

  useEffect(() => {
    const id = setInterval(
      updateCheck,
      UPDATE_MINUTES * 60 * 1000
    );

    return () => clearInterval(id);
  }, []);

  return (
    <div className="app">
      <h1>Unite Rate Tracker</h1>

      <input
        value={playerId}
        onChange={(e) =>
          setPlayerId(e.target.value)
        }
        placeholder="UniteAPI ID"
      />

      <button onClick={updateCheck}>
        更新チェック
      </button>

      <p>{status}</p>

      {dailyGroups.map((day) => (
        <div className="day" key={day.date}>
          <h2>
            {day.date} 開始 {day.startRating}
            → 最終 {day.finalRating}
            ({signed(day.totalDiff)})
          </h2>

          {day.matches.map((m) => (
            <div className="match" key={m.id}>
              {m.time} {m.pokemon}{" "}
              {signed(m.diff)} レート{" "}
              {m.rating}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

createRoot(
  document.getElementById("root")
).render(<App />);
