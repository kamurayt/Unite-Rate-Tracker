import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import "./style.css";

const STORAGE_KEY = "unite_rate_tracker_v4";

function getTodayKey() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

function signed(num) {
  return num > 0 ? `+${num}` : `${num}`;
}

function App() {
  const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");

  const [apiId, setApiId] = useState(saved?.apiId || "");
  const [currentRating, setCurrentRating] = useState(saved?.currentRating || 0);
  const [history, setHistory] = useState(saved?.history || []);
  const [dailyLogs, setDailyLogs] = useState(saved?.dailyLogs || []);
  const [characterStats, setCharacterStats] = useState(saved?.characterStats || {});
  const [menuOpen, setMenuOpen] = useState(false);
  const [tab, setTab] = useState("daily");
  const [status, setStatus] = useState("待機中");

  useEffect(() => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ apiId, currentRating, history, dailyLogs, characterStats })
    );
  }, [apiId, currentRating, history, dailyLogs, characterStats]);

  function checkDailyReset() {
    const today = getTodayKey();
    if (history.length === 0) return;

    const latestDay = history[0].date;

    if (latestDay !== today) {
      const start = history[0]?.rating || 0;
      const end = history[history.length - 1]?.rating || 0;

      const dayLog = {
        date: latestDay,
        start,
        end,
        diff: end - start,
        logs: history,
      };

      setDailyLogs((prev) => [dayLog, ...prev].slice(0, 30));
      setHistory([]);
    }
  }

  useEffect(() => {
    checkDailyReset();
  }, []);

  async function fetchData() {
    try {
      setStatus("更新中...");

      let id = apiId.trim();

      if (!id) {
        setStatus("UniteAPI IDかURLを入力して");
        return;
      }

      if (id.includes("/p/")) {
        id = id.split("/p/")[1].split(/[?#/]/)[0];
      }

      const response = await fetch(`/api/unite?player=${encodeURIComponent(id)}`);
      const data = await response.json();

      if (!data.ok) {
        setStatus(data.error || "取得失敗");
        return;
      }

      const rating = Number(data.currentRating || 0);

      if (!rating) {
        setStatus("レート取得失敗");
        return;
      }

      const previous = currentRating || rating;
      const diff = rating - previous;
      const today = getTodayKey();

      const character = data.latestMatch?.pokemon || "取得中";
      const result = diff > 0 ? "win" : diff < 0 ? "lose" : "unknown";

      const matchDate = data.latestMatch?.date || today;
      const matchTime = data.latestMatch?.time || "不明";

      const newLog = {
        id: `${matchDate}-${matchTime}-${rating}`,
        time: matchTime,
        rating,
        diff,
        date: matchDate,
        character,
        win: result === "win",
        result,
      };

      setHistory((prev) => {
        if (prev.some((item) => item.id === newLog.id)) return prev;
        return [...prev, newLog];
      });

      setCurrentRating(rating);

      if (!history.some((item) => item.id === newLog.id)) {
        setCharacterStats((prev) => {
          const next = { ...prev };

          if (!next[character]) {
            next[character] = {
              wins: 0,
              losses: 0,
              totalDiff: 0,
            };
          }

          if (result === "win") next[character].wins += 1;
          if (result === "lose") next[character].losses += 1;

          next[character].totalDiff += diff;

          return next;
        });
      }

      setStatus(`更新成功 ${signed(diff)} / レート ${rating}`);
    } catch (e) {
      console.error(e);
      setStatus("取得失敗");
    }
  }

  useEffect(() => {
    const timer = setInterval(() => {
      checkDailyReset();
      if (apiId) fetchData();
    }, 3 * 60 * 1000);

    return () => clearInterval(timer);
  });

  function resetLogs() {
    if (!confirm("記録を全削除しますか？")) return;

    setHistory([]);
    setDailyLogs([]);
    setCharacterStats({});
    setCurrentRating(0);
    setStatus("記録をリセットしました");
  }

  const todaySummary = useMemo(() => {
    if (history.length === 0) {
      return { start: currentRating || 0, end: currentRating || 0, diff: 0 };
    }

    const start = history[0].rating - history[0].diff;
    const end = history[history.length - 1].rating;

    return { start, end, diff: end - start };
  }, [history, currentRating]);

  return (
    <div className="app">
      <button className="menuBtn" onClick={() => setMenuOpen(!menuOpen)}>
        ☰
      </button>

      <h1>Unite Rate Tracker</h1>

      <input
        value={apiId}
        onChange={(e) => setApiId(e.target.value)}
        placeholder="UniteAPI ID or URL"
      />

      <button className="mainBtn" onClick={fetchData}>
        更新チェック
      </button>

      <button className="resetBtn" onClick={resetLogs}>
        記録リセット
      </button>

      <div className="summary">{status}</div>

      <div className="card">
        <h2>
          {getTodayKey()} 開始 {todaySummary.start} → 最終 {todaySummary.end}（
          {signed(todaySummary.diff)}）
        </h2>

        {history
          .slice()
          .reverse()
          .map((item) => (
            <div className="logItem" key={item.id}>
              <div>{item.time}</div>
              <div>{item.character}</div>
              <div>{signed(item.diff)}</div>
              <div>レート {item.rating}</div>
            </div>
          ))}
      </div>

      {menuOpen && (
        <div className="menu">
          <div className="tabs">
            <button
              className={tab === "daily" ? "activeTab" : ""}
              onClick={() => setTab("daily")}
            >
              日別
            </button>

            <button
              className={tab === "character" ? "activeTab" : ""}
              onClick={() => setTab("character")}
            >
              キャラ別
            </button>
          </div>

          {tab === "daily" && (
            <div>
              {dailyLogs.length === 0 && <p>まだ過去の日別記録はありません</p>}

              {dailyLogs.map((day, index) => (
                <div className="menuCard" key={index}>
                  <h3>{day.date}</h3>
                  <p>
                    開始 {day.start} → 最終 {day.end}
                  </p>
                  <p>増減 {signed(day.diff)}</p>
                </div>
              ))}
            </div>
          )}

          {tab === "character" && (
            <div>
              {Object.entries(characterStats).length === 0 && (
                <p>まだキャラ別記録はありません</p>
              )}

              {Object.entries(characterStats).map(([name, stat]) => (
                <div className="menuCard" key={name}>
                  <h3>{name}</h3>
                  <p>
                    {stat.wins}勝 {stat.losses}敗
                  </p>
                  <p>レート増減 {signed(stat.totalDiff)}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

createRoot(document.getElementById("root")).render(<App />);
