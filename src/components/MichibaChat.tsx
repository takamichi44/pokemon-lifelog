import { useState, useEffect, useRef, type KeyboardEvent } from "react";
import type { GameState } from "../types";
import type { ChatMessage } from "../services/geminiService";
import { chatWithMichiba } from "../services/geminiService";

interface Props {
  state: GameState;
  onClose: () => void;
}

export function MichibaChat({ state, onClose }: Props) {
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "model",
      text: "こんにちは、トレーナーじゃ。ポケモンライフログのことなら何でも聞いてくれい。",
    },
  ]);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  async function handleSend() {
    const text = input.trim();
    if (!text || loading) return;
    setError(null);
    setLoading(true);

    try {
      const nextMessages: ChatMessage[] = [...messages, { role: "user", text }];
      setMessages(nextMessages);
      setInput("");

      const reply = await chatWithMichiba(
        nextMessages,
        text,
        state.trainerName ?? "トレーナー",
      );

      setMessages((prev) => [...prev, { role: "model", text: reply }]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "応答の取得に失敗しました。");
    } finally {
      setLoading(false);
    }
  }

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  return (
    <div className="trainer-michiba-chat">
      <div className="trainer-michiba-chat__header">
        <button className="trainer-michiba-chat__back" onClick={onClose}>
          ← 戻る
        </button>
        <div className="trainer-michiba-chat__title">ミチバ博士に質問する</div>
      </div>

      <div className="trainer-michiba-chat__info">
        <img
          src={`${import.meta.env.BASE_URL}dr-michiba-face.png`}
          alt="ミチバ博士"
          className="trainer-michiba-chat__avatar"
          onError={(e) => {
            (e.currentTarget as HTMLImageElement).style.display = "none";
          }}
        />
        <div className="trainer-michiba-chat__text">
          このアプリの仕様や使い方について、博士に質問できます。
        </div>
      </div>

      <div className="trainer-michiba-chat__history">
        {messages.map((msg, index) => (
          <div
            key={`${msg.role}-${index}`}
            className={`trainer-michiba-chat__bubble trainer-michiba-chat__bubble--${msg.role}`}
          >
            <div className="trainer-michiba-chat__bubble-text">{msg.text}</div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {error && <div className="trainer-michiba-chat__error">⚠️ {error}</div>}

      <div className="trainer-michiba-chat__input-row">
        <textarea
          className="trainer-michiba-chat__input"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="ミチバ博士に質問する..."
          rows={3}
        />
        <button
          className="trainer-michiba-chat__send"
          onClick={handleSend}
          disabled={loading || !input.trim()}
        >
          {loading ? "送信中..." : "送信"}
        </button>
      </div>
    </div>
  );
}
