import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import "./style.css";

const STORAGE_KEY = "unite_rate_tracker_v3";

function getTodayKey() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(
    2,
    "0"
  )}-${String(now.getDate()).padStart(2, "0")}`;
}

function getTimeString() {
  const now = new Date();
  return `${String(now.getHours()).padStart(2, "0")}:${String(
    now.getMinutes()
  ).padStart(2, "0")}`;
}

function App() {
  const [apiId, setApiId] = useState("");
  const [currentRating, setCurrentRating] = useState(0);
  const [history, setHistory] = useState([]);
  const [dailyLogs, setDailyLogs] = useState([]);
  const [characterStats, setCharacterStats] = useState({});
  const [menuOpen, setMenuOpen] = useState(false);
  const [tab, setTab] = useState("daily");

  useEffect(() => {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));

    if (saved) {
      setApiId(saved.apiId || "");
      setCurrentRating(saved.currentRating || 0);
      setHistory(saved.history || []);
      setDailyLogs(saved.dailyLogs || []);
      setCharacterStats(saved.characterStats || {});
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        apiId,
        currentRating,
        history,
        dailyLogs,
        characterStats,
      })
    );
  }, [apiId, currentRating, history, dailyLogs, characterStats]);

  useEffect(() => {
    checkDailyReset();
  }, []);

  function checkDailyReset() {
    const today = getTodayKey();

    if (history.length === 0) return;

    const latestDay = history[0].date;

    if (latestDay !== today) {
      const grouped = {};

      history.forEach((item) => {
        if (!grouped[item.date]) grouped[item.date] = [];
        grouped[item.date].push(item);
      });

      const newDailyLogs = [...dailyLogs];

      Object.keys(grouped).forEach((date) => {
        const logs = grouped[date];

        const start = logs[0]?.rating || 0;
        const end = logs[logs.length - 1]?.rating || 0;

        newDailyLogs.unshift({
          date,
          start,
          end,
          diff: end - start,
          logs,
        });
      });

      setDailyLogs(newDailyLogs);
      setHistory([]);
    }
  }

  async function fetchData() {
    try {
      let id = apiId.trim();

      if (id.includes("/p/")) {
        id = id.split("/p/")[1];
      }

      const response = await fetch(
        `https://uniteapi.dev/api/player/${id}`
      );

      const data = await response.json();

      const rating =
        data?.stats?.ranked?.overall?.rating ||
        data?.rating ||
        0;

      const match =
        data?.matches?.[0] ||
        {};

      const character =
        match?.pokemon ||
        match?.pokemon_name ||
        "不明";

      const win =
        match?.win ||
        false;

      const previous =
        currentRating;

      const diff =
        previous === 0
          ? 0
          : rating - previous;

      const today = getTodayKey();

      const newLog = {
        time: getTimeString(),
        rating,
        diff,
        date: today,
        character,
        win,
      };

      const updatedHistory = [
        ...history,
        newLog,
      ];

      setHistory(updatedHistory);
      setCurrentRating(rating);

      const stats = {
        ...characterStats,
      };

      if (!stats[character]) {
        stats[character] = {
          wins: 0,
          losses: 0,
          totalDiff: 0,
        };
      }

      if (win) {
        stats[character].wins += 1;
      } else {
        stats[character].losses += 1;
      }

      stats[character].totalDiff += diff;

      setCharacterStats(stats);
    } catch (e) {
      alert("取得失敗");
      console.error(e);
    }
  }

  function resetLogs() {
    if (!confirm("記録を全削除しますか？")) return;

    setHistory([]);
    setDailyLogs([]);
    setCharacterStats({});
    setCurrentRating(0);
  }

  const todaySummary = useMemo(() => {
    if (history.length === 0) {
      return {
        start: 0,
        end: 0,
        diff: 0,
      };
    }

    const start = history[0].rating;
    const end =
      history[history.length - 1].rating;

    return {
      start,
      end,
      diff: end - start,
    };
  }, [history]);

  return (
    <div className="app">
      <button
        className="menuBtn"
        onClick={() =>
          setMenuOpen(!menuOpen)
        }
      >
        ☰
      </button>

      <h1>Unite Rate Tracker</h1>

      <input
        value={apiId}
        onChange={(e) =>
          setApiId(e.target.value)
        }
        placeholder="UniteAPI URL or ID"
      />

      <button
        className="mainBtn"
        onClick={fetchData}
      >
        更新チェック
      </button>

      <button
        className="resetBtn"
        onClick={resetLogs}
      >
        記録リセット
      </button>

      <div className="summary">
        更新成功{" "}
        {todaySummary.diff > 0 ? "+" : ""}
        {todaySummary.diff}
      </div>

      <div className="card">
        <h2>
          {getTodayKey()} 開始{" "}
          {todaySummary.start}
          → 最終 {todaySummary.end}
          (
          {todaySummary.diff > 0
            ? "+"
            : ""}
          {todaySummary.diff})
        </h2>

        {history
          .slice()
          .reverse()
          .map((item, index) => (
            <div
              key={index}
              className="logItem"
            >
              <div>
                {item.time}{" "}
                {item.diff > 0
                  ? "+"
                  : ""}
                {item.diff}
              </div>

              <div>
                レート {item.rating}
              </div>

              <div>
                {item.character}
              </div>

              <div>
                {item.win
                  ? "勝利"
                  : "敗北"}
              </div>
            </div>
          ))}
      </div>

      {menuOpen && (
        <div className="menu">
          <div className="tabs">
            <button
              className={
                tab === "daily"
                  ? "activeTab"
                  : ""
              }
              onClick={() =>
                setTab("daily")
              }
            >
              日別
            </button>

            <button
              className={
                tab === "character"
                  ? "activeTab"
                  : ""
              }
              onClick={() =>
                setTab("character")
              }
            >
              キャラ別
            </button>
          </div>

          {tab === "daily" && (
            <div>
              {dailyLogs.map(
                (day, index) => (
                  <div
                    className="menuCard"
                    key={index}
                  >
                    <h3>
                      {day.date}
                    </h3>

                    <p>
                      {day.start} →
                      {day.end}
                    </p>

                    <p>
                      {day.diff > 0
                        ? "+"
                        : ""}
                      {day.diff}
                    </p>
                  </div>
                )
              )}
            </div>
          )}

          {tab === "character" && (
            <div>
              {Object.entries(
                characterStats
              ).map(
                ([name, stat]) => (
                  <div
                    className="menuCard"
                    key={name}
                  >
                    <h3>{name}</h3>

                    <p>
                      {stat.wins}勝{" "}
                      {stat.losses}敗
                    </p>

                    <p>
                      レート増減{" "}
                      {stat.totalDiff >
                      0
                        ? "+"
                        : ""}
                      {stat.totalDiff}
                    </p>
                  </div>
                )
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

createRoot(
  document.getElementById("root")
).render(<App />);
