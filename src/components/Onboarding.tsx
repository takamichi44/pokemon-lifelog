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
    examples: [
      "ジム・筋トレ・スポーツ",
      "ランニング・ウォーキング",
      "ストレッチ・ヨガ",
    ],
  },
  {
    key: "smart",
    emoji: "📚",
    label: "スマート",
    color: "#3b82f6",
    examples: [
      "勉強・読書・語学",
      "仕事・プログラミング",
      "資格学習・セミナー",
    ],
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
  { id: 1 },
  { id: 4 },
  { id: 7 },
  { id: 152 },
  { id: 155 },
  { id: 158 },
];

// ミチバ博士のセリフ
const DIALOGS = [
  // 画面1
  [
    "やあやあ！よく来てくれたのう。",
    "わしはミチバ博士じゃ。ポケモンライフログの世界へようこそ！",
    "このアプリではのう、毎日の活動を記録することで、ポケモンたちが育っていくのじゃ。",
  ],
  // 画面2
  [
    "活動にはそれぞれ「属性」があってのう。",
    "フィジカル・スマート・メンタル・ライフの4種類じゃ。",
    "どの属性を鍛えるかによって、ポケモンの育ち方や進化先が変わってくるぞ！",
  ],
  // 画面3
  [
    "さて……君の名前を聞かせてくれるかのう？",
    "ポケモンたちは、君のことをその名で呼ぶようになるじゃろう。",
  ],
  // 画面4
  [
    "最後に、最初のパートナーを選んでもらおう！",
    "タマゴからすぐに孵化して、君の旅を共に歩んでくれるぞ！",
    "さあ、どの子と一緒に成長したいかのう？",
  ],
];

function ProfessorDialog({
  lines,
  children,
}: {
  lines: string[];
  children?: React.ReactNode;
}) {
  return (
    <div className="prof-wrap">
      <div className="prof-sprite-wrap">
        <img
          src={`${import.meta.env.BASE_URL}dr-michiba.png`}
          alt="ミチバ博士"
          className="prof-sprite"
          onError={(e) => {
            (e.currentTarget as HTMLImageElement).style.display = "none";
          }}
        />
      </div>
      <div className="prof-dialog">
        <div className="prof-dialog__name">ミチバ博士</div>
        <div className="prof-dialog__body">
          {lines.map((line, i) => (
            <p key={i}>{line}</p>
          ))}
        </div>
      </div>
      {children}
    </div>
  );
}

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
          <ProfessorDialog lines={DIALOGS[0]} />
          <button className="onboarding__btn" onClick={() => setStep(2)}>
            つぎへ →
          </button>
        </div>
      )}

      {/* 画面2: 4属性の説明 */}
      {step === 2 && (
        <div className="onboarding__content">
          <ProfessorDialog lines={DIALOGS[1]} />
          <div className="onboarding__attrs">
            {ATTRIBUTES.map((attr) => (
              <div
                key={attr.key}
                className="onboarding__attr"
                style={{ borderLeftColor: attr.color }}
              >
                <div className="onboarding__attr-header">
                  <span className="onboarding__attr-emoji">{attr.emoji}</span>
                  <span
                    className="onboarding__attr-label"
                    style={{ color: attr.color }}
                  >
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
            <button
              className="onboarding__btn onboarding__btn--ghost"
              onClick={() => setStep(1)}
            >
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
          <ProfessorDialog lines={DIALOGS[2]} />
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
          <p className="onboarding__subdesc">（あとから変更できます）</p>
          <div className="onboarding__nav">
            <button
              className="onboarding__btn onboarding__btn--ghost"
              onClick={() => setStep(2)}
            >
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
          <ProfessorDialog lines={DIALOGS[3]} />
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
                <span className="onboarding__starter-name">
                  {getPokemonName(id)}
                </span>
              </button>
            ))}
          </div>
          <div className="onboarding__nav">
            <button
              className="onboarding__btn onboarding__btn--ghost"
              onClick={() => setStep(3)}
            >
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
