"use client";

import { useEffect, useState } from "react";

type Question = {
  id: string;
  category: string;
  value: number;
  question: string;
  answer: string;
};

type Team = {
  name: string;
  score: number;
};

const SHEET_URL =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vSZn5XLwY8wHZHsQfP_5NJ-XSfGOhqoeK48z0x2RLKHSb6Io6AbkvT9xvdUbF9RJSBgHqTqGpWJpLMr/pub?gid=0&single=true&output=csv";

const VALUES = [100, 200, 300, 400, 500];

function parseCSV(csv: string): Question[] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let insideQuotes = false;

  for (let i = 0; i < csv.length; i++) {
    const char = csv[i];
    const next = csv[i + 1];

    if (char === '"' && insideQuotes && next === '"') {
      cell += '"';
      i++;
    } else if (char === '"') {
      insideQuotes = !insideQuotes;
    } else if (char === "," && !insideQuotes) {
      row.push(cell);
      cell = "";
    } else if ((char === "\n" || char === "\r") && !insideQuotes) {
      if (char === "\r" && next === "\n") {
        i++;
      }

      row.push(cell);
      cell = "";

      if (row.some((value) => value.trim() !== "")) {
        rows.push(row);
      }

      row = [];
    } else {
      cell += char;
    }
  }

  if (cell || row.length > 0) {
    row.push(cell);

    if (row.some((value) => value.trim() !== "")) {
      rows.push(row);
    }
  }

  if (rows.length <= 1) {
    return [];
  }

  return rows.slice(1).map((row) => ({
    id: row[0]?.trim() || "",
    category: row[1]?.trim() || "",
    value: Number(row[2]?.trim() || 0),
    question: row[3]?.trim() || "",
    answer: row[4]?.trim() || "",
  }));
}

export default function Home() {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>(
    []
  );
  const [usedQuestions, setUsedQuestions] = useState<string[]>([]);

  const [selectedQuestion, setSelectedQuestion] =
    useState<Question | null>(null);

  const [showAnswer, setShowAnswer] = useState(false);

  const [categoryColumn, setCategoryColumn] = useState<number | null>(
    null
  );

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [teams, setTeams] = useState<Team[]>([
    { name: "Team 1", score: 0 },
    { name: "Team 2", score: 0 },
  ]);

  const [editingTeam, setEditingTeam] = useState<number | null>(null);

  // Allows manual editing of team scores.
  const [editingScore, setEditingScore] = useState<number | null>(null);

  // 2× multiplier applies to all questions.
  const [doubleMultiplier, setDoubleMultiplier] = useState(false);

  // 0.5× penalty applies only to incorrect answers.
  const [halfPenalty, setHalfPenalty] = useState(false);

  // Tracks whether each team has been marked for the current question.
  const [teamResults, setTeamResults] = useState<
    Record<number, "correct" | "incorrect" | null>
  >({});

  useEffect(() => {
    async function loadQuestions() {
      try {
        setLoading(true);

        const response = await fetch(SHEET_URL);

        if (!response.ok) {
          throw new Error("Could not load the Google Sheet.");
        }

        const csv = await response.text();
        const data = parseCSV(csv);

        if (data.length === 0) {
          throw new Error("No questions were found in the Google Sheet.");
        }

        setQuestions(data);

        const uniqueCategories = Array.from(
          new Set(data.map((question) => question.category))
        ).filter(Boolean);

        setCategories(uniqueCategories);
        setSelectedCategories(uniqueCategories.slice(0, 6));
      } catch (err) {
        console.error(err);

        setError(
          "There was a problem loading the trivia questions. Please check the Google Sheet."
        );
      } finally {
        setLoading(false);
      }
    }

    loadQuestions();
  }, []);

  function getQuestion(category: string, value: number) {
    return questions.find(
      (question) =>
        question.category === category && question.value === value
    );
  }

  function openQuestion(question: Question) {
    if (usedQuestions.includes(question.id)) {
      return;
    }

    setSelectedQuestion(question);
    setShowAnswer(false);

    const startingResults: Record<
      number,
      "correct" | "incorrect" | null
    > = {};

    teams.forEach((_, index) => {
      startingResults[index] = null;
    });

    setTeamResults(startingResults);
  }

  // Close popup without marking question as used.
  function cancelQuestion() {
    setSelectedQuestion(null);
    setShowAnswer(false);
    setTeamResults({});
  }

  // Close popup and mark question as used.
  function closeQuestion() {
    if (selectedQuestion) {
      setUsedQuestions((previous) => {
        if (previous.includes(selectedQuestion.id)) {
          return previous;
        }

        return [...previous, selectedQuestion.id];
      });
    }

    setSelectedQuestion(null);
    setShowAnswer(false);
    setTeamResults({});
  }

  // Make a previously-used question available again.
  function restoreQuestion(questionId: string) {
    setUsedQuestions((previous) =>
      previous.filter((id) => id !== questionId)
    );
  }

  function chooseCategory(category: string) {
    if (categoryColumn === null) {
      return;
    }

    setSelectedCategories((previous) => {
      const updated = [...previous];

      updated[categoryColumn] = category;

      return updated;
    });

    setCategoryColumn(null);
  }

  function updateTeamName(index: number, name: string) {
    setTeams((previous) =>
      previous.map((team, teamIndex) =>
        teamIndex === index ? { ...team, name } : team
      )
    );
  }

  // Manually change a team's score.
  function updateTeamScore(index: number, value: string) {
    const newScore = Number(value);

    if (!Number.isFinite(newScore)) {
      return;
    }

    setTeams((previous) =>
      previous.map((team, teamIndex) =>
        teamIndex === index
          ? { ...team, score: newScore }
          : team
      )
    );
  }

  function addTeam() {
    // Maximum of 8 teams.
    if (teams.length >= 8) {
      return;
    }

    setTeams((previous) => [
      ...previous,
      {
        name: `Team ${previous.length + 1}`,
        score: 0,
      },
    ]);
  }

  function removeTeam(index: number) {
    if (teams.length <= 2) {
      return;
    }

    setTeams((previous) =>
      previous.filter((_, teamIndex) => teamIndex !== index)
    );

    setTeamResults((previous) => {
      const updated: Record<number, "correct" | "incorrect" | null> =
        {};

      Object.entries(previous).forEach(([key, value]) => {
        const oldIndex = Number(key);

        if (oldIndex < index) {
          updated[oldIndex] = value;
        } else if (oldIndex > index) {
          updated[oldIndex - 1] = value;
        }
      });

      return updated;
    });
  }

  function markTeamResult(
    teamIndex: number,
    result: "correct" | "incorrect"
  ) {
    if (!selectedQuestion) {
      return;
    }

    // Don't allow a team to be scored twice.
    if (teamResults[teamIndex]) {
      return;
    }

    // Actual question value after 2× multiplier.
    const correctPoints =
      selectedQuestion.value * (doubleMultiplier ? 2 : 1);

    // 0.5× penalty is applied after the 2× multiplier.
    const incorrectPoints =
      correctPoints * (halfPenalty ? 0.5 : 1);

    setTeams((previous) =>
      previous.map((team, index) => {
        if (index !== teamIndex) {
          return team;
        }

        return {
          ...team,
          score:
            result === "correct"
              ? team.score + correctPoints
              : team.score - incorrectPoints,
        };
      })
    );

    setTeamResults((previous) => ({
      ...previous,
      [teamIndex]: result,
    }));
  }

  function resetTeamResult(teamIndex: number) {
    if (!selectedQuestion) {
      return;
    }

    const result = teamResults[teamIndex];

    if (!result) {
      return;
    }

    const correctPoints =
      selectedQuestion.value * (doubleMultiplier ? 2 : 1);

    const incorrectPoints =
      correctPoints * (halfPenalty ? 0.5 : 1);

    setTeams((previous) =>
      previous.map((team, index) => {
        if (index !== teamIndex) {
          return team;
        }

        return {
          ...team,
          score:
            result === "correct"
              ? team.score - correctPoints
              : team.score + incorrectPoints,
        };
      })
    );

    setTeamResults((previous) => ({
      ...previous,
      [teamIndex]: null,
    }));
  }

  // Actual value of the question after applying 2×.
  const questionPoints = selectedQuestion
    ? selectedQuestion.value * (doubleMultiplier ? 2 : 1)
    : 0;

  // Incorrect-answer penalty.
  const incorrectPoints = selectedQuestion
    ? questionPoints * (halfPenalty ? 0.5 : 1)
    : 0;

  const allTeamsScored =
    teams.length > 0 &&
    teams.every((_, index) => teamResults[index] !== null);

  if (loading) {
    return (
      <main className="min-h-screen bg-blue-900 flex items-center justify-center text-white">
        <div className="text-3xl font-bold">
          Loading trivia...
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="min-h-screen bg-blue-900 flex items-center justify-center text-white p-6">
        <div className="bg-white text-black rounded-xl p-8 max-w-lg text-center">
          <h1 className="text-2xl font-bold mb-4">
            Oops!
          </h1>

          <p>{error}</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-blue-900 p-4 md:p-8 pb-28">
      <div className="max-w-7xl mx-auto">

        {/* TITLE */}
        <h1 className="text-center text-white text-4xl md:text-6xl font-black mb-6">
          TRIVIA
        </h1>

        {/* SCOREBOARD */}
        <div
          className={`grid gap-4 mb-6 ${
            teams.length === 2
              ? "grid-cols-2"
              : teams.length === 3
              ? "grid-cols-3"
              : teams.length === 4
              ? "grid-cols-2 md:grid-cols-4"
              : teams.length === 5
              ? "grid-cols-2 md:grid-cols-5"
              : teams.length === 6
              ? "grid-cols-2 md:grid-cols-3 lg:grid-cols-6"
              : teams.length === 7
              ? "grid-cols-2 md:grid-cols-4 lg:grid-cols-7"
              : "grid-cols-2 md:grid-cols-4 lg:grid-cols-8"
          }`}
        >
          {teams.map((team, index) => (
            <div
              key={index}
              className="bg-white rounded-xl p-3 md:p-4 text-center border-4 border-white relative"
            >
              {/* TEAM NAME */}
              {editingTeam === index ? (
                <input
                  autoFocus
                  value={team.name}
                  onChange={(event) =>
                    updateTeamName(index, event.target.value)
                  }
                  onBlur={() => setEditingTeam(null)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      setEditingTeam(null);
                    }
                  }}
                  className="w-full border-2 border-blue-900 rounded-lg px-2 py-2 text-black font-bold text-center"
                />
              ) : (
                <button
                  onClick={() => setEditingTeam(index)}
                  className="text-blue-900 font-black text-lg md:text-xl hover:underline"
                >
                  {team.name}
                </button>
              )}

              {/* SCORE — CLICK TO EDIT */}
              {editingScore === index ? (
                <input
                  autoFocus
                  type="number"
                  value={team.score}
                  onChange={(event) =>
                    updateTeamScore(index, event.target.value)
                  }
                  onBlur={() => setEditingScore(null)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      setEditingScore(null);
                    }
                  }}
                  className="w-full text-3xl md:text-4xl font-black text-blue-900 text-center mt-2 border-2 border-blue-900 rounded-lg px-2 py-1"
                />
              ) : (
                <button
                  onClick={() => setEditingScore(index)}
                  className="block w-full text-3xl md:text-4xl font-black text-blue-900 mt-2 hover:bg-gray-100 rounded-lg transition"
                  title="Click to manually edit score"
                >
                  ${team.score}
                </button>
              )}

              {/* REMOVE TEAM */}
              {teams.length > 2 && (
                <button
                  onClick={() => removeTeam(index)}
                  className="absolute top-1 right-2 text-gray-400 hover:text-red-500 font-bold text-xl"
                  title="Remove team"
                >
                  ×
                </button>
              )}
            </div>
          ))}
        </div>

        {/* ADD TEAM */}
        {teams.length < 8 && (
          <div className="flex justify-center mb-6">
            <button
              onClick={addTeam}
              className="bg-white text-blue-900 font-black px-6 py-3 rounded-lg hover:bg-gray-200 transition"
            >
              + ADD TEAM
            </button>
          </div>
        )}

        {/* BOARD CATEGORY HEADERS */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-2 mb-2">
          {selectedCategories.map((category, index) => (
            <button
              key={`${category}-${index}`}
              onClick={() => setCategoryColumn(index)}
              className="min-h-20 bg-blue-800 border-2 border-white rounded-lg text-white font-black text-lg md:text-xl uppercase p-2 hover:bg-blue-700 transition"
            >
              {category}
            </button>
          ))}
        </div>

        {/* BOARD VALUES */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-2">
          {selectedCategories.map((category) => (
            <div
              key={`${category}-values`}
              className="flex flex-col gap-2"
            >
              {VALUES.map((value) => {
                const question = getQuestion(category, value);

                const isUsed =
                  question && usedQuestions.includes(question.id);

                return (
                  <div
                    key={`${category}-${value}`}
                    className="relative"
                  >
                    <button
                      disabled={!question || isUsed}
                      onClick={() =>
                        question && openQuestion(question)
                      }
                      className={`w-full h-28 md:h-32 rounded-lg border-2 border-white font-black text-3xl md:text-4xl transition ${
                        isUsed
                          ? "bg-gray-500 text-gray-300 cursor-default"
                          : question
                          ? "bg-blue-700 text-yellow-300 hover:bg-blue-600 hover:scale-[1.02]"
                          : "bg-blue-950 text-gray-600 cursor-default"
                      }`}
                    >
                      $
                      {value *
                        (doubleMultiplier ? 2 : 1)}
                    </button>

                    {/* RESTORE USED QUESTION */}
                    {isUsed && question && (
                      <button
                        onClick={(event) => {
                          event.stopPropagation();
                          restoreQuestion(question.id);
                        }}
                        className="absolute top-1 right-1 w-7 h-7 bg-white text-gray-700 rounded-full font-black text-lg leading-none shadow-md hover:bg-red-500 hover:text-white transition"
                        title="Make this question usable again"
                      >
                        ×
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* SCORING OPTIONS */}
      <div className="fixed bottom-4 right-4 z-40 flex flex-col gap-2">

        {/* 2× MULTIPLIER */}
        <label
          className={`w-[280px] h-[76px] flex items-center gap-3 px-5 rounded-xl shadow-2xl border-4 cursor-pointer select-none ${
            doubleMultiplier
              ? "bg-yellow-400 border-yellow-300 text-blue-950"
              : "bg-white border-white text-blue-900"
          }`}
        >
          <input
            type="checkbox"
            checked={doubleMultiplier}
            onChange={(event) =>
              setDoubleMultiplier(event.target.checked)
            }
            className="w-6 h-6 accent-yellow-500 shrink-0"
          />

          <div>
            <div className="font-black text-lg">
              2× MULTIPLIER
            </div>

            <div className="text-sm font-bold">
              {doubleMultiplier
                ? "ACTIVE — ALL QUESTIONS ARE DOUBLE"
                : "OFF"}
            </div>
          </div>
        </label>

        {/* 0.5× PENALTY */}
        <label
          className={`w-[280px] h-[76px] flex items-center gap-3 px-5 rounded-xl shadow-2xl border-4 cursor-pointer select-none ${
            halfPenalty
              ? "bg-yellow-400 border-yellow-300 text-blue-950"
              : "bg-white border-white text-blue-900"
          }`}
        >
          <input
            type="checkbox"
            checked={halfPenalty}
            onChange={(event) =>
              setHalfPenalty(event.target.checked)
            }
            className="w-6 h-6 accent-yellow-500 shrink-0"
          />

          <div>
            <div className="font-black text-lg">
              0.5× PENALTY
            </div>

            <div className="text-sm font-bold">
              {halfPenalty
                ? "ACTIVE — WRONG ANSWERS LOSE HALF"
                : "OFF"}
            </div>
          </div>
        </label>
      </div>

      {/* QUESTION POPUP */}
      {selectedQuestion && (
        <div className="fixed inset-0 bg-black/75 flex items-center justify-center p-4 z-50">
          <div className="relative bg-blue-900 border-4 border-white rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto p-6 md:p-8 text-center shadow-2xl">

            {/* POPUP X — CLOSE WITHOUT USING QUESTION */}
            <button
              onClick={cancelQuestion}
              className="absolute top-3 right-4 text-white text-4xl font-black hover:text-red-400 transition"
              title="Close without using question"
            >
              ×
            </button>

            {!showAnswer ? (
              <>
                {/* CATEGORY NAME */}
                <div className="text-white text-2xl md:text-3xl font-black uppercase mb-2">
                  {selectedQuestion.category}
                </div>

                {/* QUESTION VALUE */}
                <div className="text-yellow-300 text-2xl font-bold mb-5">
                  ${selectedQuestion.value}
                </div>

                {doubleMultiplier && (
                  <div className="inline-block bg-yellow-400 text-blue-900 font-black text-xl px-5 py-2 rounded-full mb-5">
                    2× — WORTH ${questionPoints}
                  </div>
                )}

                {halfPenalty && (
                  <div className="inline-block bg-white text-blue-900 font-black text-xl px-5 py-2 rounded-full mb-5 ml-2">
                    WRONG ANSWER — -$
                    {incorrectPoints}
                  </div>
                )}

                <div className="text-white text-3xl md:text-5xl font-black leading-tight mb-10">
                  {selectedQuestion.question}
                </div>

                <button
                  onClick={() => setShowAnswer(true)}
                  className="bg-yellow-400 text-blue-950 font-black text-2xl px-10 py-5 rounded-xl hover:bg-yellow-300 transition"
                >
                  ANSWER
                </button>
              </>
            ) : (
              <>
                <div className="text-yellow-300 text-2xl font-bold mb-4">
                  ANSWER
                </div>

                <div className="text-white text-3xl md:text-5xl font-black leading-tight mb-5">
                  {selectedQuestion.answer}
                </div>

                {/* SCORING INFORMATION */}
                <div className="text-white font-bold text-xl mb-8">
                  <div>
                    Correct:{" "}
                    <span className="text-green-300">
                      +${questionPoints}
                    </span>
                  </div>

                  <div>
                    Incorrect:{" "}
                    <span className="text-red-300">
                      -${incorrectPoints}
                    </span>
                  </div>
                </div>

                {/* TEAM RESULTS */}
                <div className="bg-blue-800 rounded-xl p-4 md:p-6 mb-6">
                  <h2 className="text-white text-2xl font-black mb-4">
                    WHO GOT IT RIGHT?
                  </h2>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {teams.map((team, index) => {
                      const result = teamResults[index];

                      return (
                        <div
                          key={index}
                          className={`bg-white rounded-lg p-3 flex items-center justify-between gap-2 ${
                            result === "correct"
                              ? "border-4 border-green-500"
                              : result === "incorrect"
                              ? "border-4 border-red-500"
                              : "border-4 border-transparent"
                          }`}
                        >
                          <span className="text-blue-900 font-black text-lg">
                            {team.name}
                          </span>

                          {result === null ? (
                            <div className="flex gap-2">
                              <button
                                onClick={() =>
                                  markTeamResult(
                                    index,
                                    "correct"
                                  )
                                }
                                className="bg-green-500 text-white font-black px-3 py-2 rounded-lg hover:bg-green-400"
                              >
                                ✓
                              </button>

                              <button
                                onClick={() =>
                                  markTeamResult(
                                    index,
                                    "incorrect"
                                  )
                                }
                                className="bg-red-500 text-white font-black px-3 py-2 rounded-lg hover:bg-red-400"
                              >
                                ✕
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() =>
                                resetTeamResult(index)
                              }
                              className={`font-black px-3 py-2 rounded-lg ${
                                result === "correct"
                                  ? "bg-green-500 text-white"
                                  : "bg-red-500 text-white"
                              }`}
                              title="Undo result"
                            >
                              {result === "correct"
                                ? `✓ +$${questionPoints}`
                                : `✕ -$${incorrectPoints}`}
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {allTeamsScored && (
                  <div className="text-green-300 font-black text-xl mb-4">
                    All teams have been scored!
                  </div>
                )}

                <button
                  onClick={closeQuestion}
                  className="bg-white text-blue-900 font-black text-xl px-10 py-4 rounded-xl hover:bg-gray-200 transition"
                >
                  CLOSE & MARK USED
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* CATEGORY SELECTION */}
      {categoryColumn !== null && (
        <div className="fixed inset-0 bg-black/75 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[80vh] overflow-y-auto p-6">
            <h2 className="text-3xl font-black text-center text-blue-900 mb-6">
              Choose a Category
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {categories.map((category) => (
                <button
                  key={category}
                  onClick={() => chooseCategory(category)}
                  className="bg-blue-800 text-white font-bold text-lg p-4 rounded-lg hover:bg-blue-700 transition"
                >
                  {category}
                </button>
              ))}
            </div>

            <button
              onClick={() => setCategoryColumn(null)}
              className="w-full mt-5 bg-gray-200 text-gray-800 font-bold p-4 rounded-lg hover:bg-gray-300 transition"
            >
              CANCEL
            </button>
          </div>
        </div>
      )}
    </main>
  );
}