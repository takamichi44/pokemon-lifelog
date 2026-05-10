import { useState } from "react";
import { animatedSpriteUrl, onSpriteError } from "../utils/spriteUrl";
import { getPokemonName } from "../data/pokemonNames";

interface Props {
  onComplete: (trainerName: string, starterPokemonId: number) => void;
}

const ATTRIBUTES = [
  {
    key: "physical",
    emoji: "💪",
    label: "フィジカル",
    color: "#ef4444",
    examples: ["ジム・筋トレ・スポーツ", "ランニング・ウォーキング", "ストレッチ・ヨガ"],
  },
  {
    key: "smart",
    emoji: "📚",
    label: "スマート",
    color: "#3b82f6",
    examples: ["勉強・読書・語学", "仕事・プログラミング", "資格学習・セミナー"],
  },
  {
    key: "mental",
    emoji: "🧠",
    label: "メンタル",
    color: "#a855f7",
    examples: [
      "日記・手帳を書いた",
      "友達・家族と話した・食事した",
      "映画・音楽・アニメを楽しんだ",
      "絵を描いた・楽器を弾いた",
      "瞑想・マインドフルネス",
      "悩みを整理した・感謝を伝えた",
    ],
  },
  {
    key: "life",
    emoji: "🌿",
    label: "ライフ",
    color: "#22c55e",
    examples: ["食事・料理・お弁当", "睡眠・休養・入浴", "家事・掃除・片付け"],
  },
];

const STARTERS = [
  { id: 1,   gen: "I" },
  { id: 4,   gen: "I" },
  { id: 7,   gen: "I" },
  { id: 152, gen: "II" },
  { id: 155, gen: "II" },
  { id: 158, gen: "II" },
];

export function Onboarding({ onComplete }: Props) {
  const [step, setStep] = useState(1);
  const [name, setName] = useState("");
  const [selectedStarter, setSelectedStarter] = useState<number | null>(null);

  function handleComplete() {
    if (selectedStarter === null) return;
    onComplete(name.trim() || "トレーナー", selectedStarter);
  }

  return (
    <div className="onboarding">
      {/* ステップインジケーター */}
      <div className="onboarding__steps">
        {[1, 2, 3, 4].map((s) => (
          <div
            key={s}
            className={`onboarding__step-dot ${s === step ? "onboarding__step-dot--active" : ""} ${s < step ? "onboarding__step-dot--done" : ""}`}
          />
        ))}
      </div>

      {/* 画面1: 世界観 */}
      {step === 1 && (
        <div className="onboarding__content">
          <div className="onboarding__egg">🥚</div>
          <h2 className="onboarding__title">ポケモンライフログ</h2>
          <p className="onboarding__desc">
            今日やったことを記録すると、<br />
            ポケモンが育ちます。
          </p>
          <p className="onboarding__subdesc">
            運動・勉強・人との会話・食事…<br />
            毎日の行動がポケモンの力になります。<br />
            タマゴを孵化させて、一緒に成長しよう！
          </p>
          <button className="onboarding__btn" onClick={() => setStep(2)}>
            つぎへ →
          </button>
        </div>
      )}

      {/* 画面2: 4属性の説明 */}
      {step === 2 && (
        <div className="onboarding__content">
          <h2 className="onboarding__title">4つの属性</h2>
          <p className="onboarding__desc">
            活動の内容によって伸びる属性が変わります
          </p>
          <div className="onboarding__attrs">
            {ATTRIBUTES.map((attr) => (
              <div
                key={attr.key}
                className="onboarding__attr"
                style={{ borderLeftColor: attr.color }}
              >
                <div className="onboarding__attr-header">
                  <span className="onboarding__attr-emoji">{attr.emoji}</span>
                  <span className="onboarding__attr-label" style={{ color: attr.color }}>
                    {attr.label}
                  </span>
                </div>
                <ul className="onboarding__attr-examples">
                  {attr.examples.map((ex) => (
                    <li key={ex}>{ex}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <div className="onboarding__nav">
            <button className="onboarding__btn onboarding__btn--ghost" onClick={() => setStep(1)}>
              ← もどる
            </button>
            <button className="onboarding__btn" onClick={() => setStep(3)}>
              つぎへ →
            </button>
          </div>
        </div>
      )}

      {/* 画面3: トレーナー名入力 */}
      {step === 3 && (
        <div className="onboarding__content">
          <div className="onboarding__egg onboarding__egg--trophy">🏆</div>
          <h2 className="onboarding__title">トレーナー名は？</h2>
          <p className="onboarding__desc">
            ポケモンがあなたを呼ぶときの名前です<br />
            <span className="onboarding__subdesc-inline">（あとから変更できます）</span>
          </p>
          <input
            className="onboarding__input"
            type="text"
            placeholder="トレーナー"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={10}
            autoFocus
            onKeyDown={(e) => e.key === "Enter" && setStep(4)}
          />
          <div className="onboarding__nav">
            <button className="onboarding__btn onboarding__btn--ghost" onClick={() => setStep(2)}>
              ← もどる
            </button>
            <button className="onboarding__btn" onClick={() => setStep(4)}>
              つぎへ →
            </button>
          </div>
        </div>
      )}

      {/* 画面4: 御三家選択 */}
      {step === 4 && (
        <div className="onboarding__content">
          <h2 className="onboarding__title">最初の1匹を選ぼう！</h2>
          <p className="onboarding__desc">
            タマゴがすぐに孵化します
          </p>
          <div className="onboarding__starters">
            {STARTERS.map(({ id }) => (
              <button
                key={id}
                className={`onboarding__starter ${selectedStarter === id ? "onboarding__starter--selected" : ""}`}
                onClick={() => setSelectedStarter(id)}
              >
                <img
                  src={animatedSpriteUrl(id)}
                  alt={getPokemonName(id)}
                  className="onboarding__starter-sprite"
                  onError={(e) => onSpriteError(e, id)}
                />
                <span className="onboarding__starter-name">{getPokemonName(id)}</span>
              </button>
            ))}
          </div>
          <div className="onboarding__nav">
            <button className="onboarding__btn onboarding__btn--ghost" onClick={() => setStep(3)}>
              ← もどる
            </button>
            <button
              className="onboarding__btn onboarding__btn--primary"
              onClick={handleComplete}
              disabled={selectedStarter === null}
            >
              冒険を始める！
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
