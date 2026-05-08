import { useState, useEffect, useRef } from "react";
import type {
  GameState,
  PokemonSlot,
  AttributeType,
  ActivityCategory,
} from "../types";
import {
  ATTRIBUTE_COLORS,
  HATCH_THRESHOLD,
  TP_SLOT_THRESHOLDS,
} from "../types";
import { getPokemonName } from "../data/pokemonNames";
import { getEvolutionEntry } from "../data/evolutionTable";
import { DpPoolPanel } from "./DpPoolPanel";
import { PokemonChat } from "./PokemonChat";
import { PokemonDex } from "./PokemonDex";
import { MoveSelectionModal } from "./MoveSelectionModal";
import { animatedSpriteUrl, onSpriteError } from "../utils/spriteUrl";
import { playPokemonCry } from "../utils/pokemonCry";
import { calcLevel } from "../utils/levelSystem";
import { getMovesByPokemonId } from "../services/pokeApiService";
import type { Move } from "../services/pokeApiService";
import { DecorationShop } from "./DecorationShop";
import { DECORATION_CATALOG } from "../data/decorationCatalog";
import type { DecorationCategory } from "../types";
import { EvolutionAnimation } from "./EvolutionAnimation";

type CardMode = "normal" | "chat" | "dex" | "deco";

// ===== 次に覚える技を非同期で取得して表示 =====
function NextMoveInfo({
  pokemonId,
  currentLevel,
  learnedMoves,
}: {
  pokemonId: number;
  currentLevel: number;
  learnedMoves: string[];
}) {
  const [next, setNext] = useState<
    { name: string; atLevel: number } | null | "loading"
  >("loading");

  useEffect(() => {
    let cancelled = false;
    getMovesByPokemonId(pokemonId).then((allMoves: Move[]) => {
      if (cancelled) return;
      // 現在のゲームレベルを超える最初の未習得技を探す
      const nextMove = allMoves
        .filter(
          (m) =>
            Math.ceil(m.level / 10) > currentLevel &&
            !learnedMoves.includes(m.name),
        )
        .sort((a, b) => a.level - b.level)[0];

      if (nextMove) {
        setNext({
          name: nextMove.name,
          atLevel: Math.ceil(nextMove.level / 10),
        });
      } else {
        setNext(null);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [pokemonId, currentLevel, learnedMoves]);

  if (next === "loading")
    return <div className="pokemon-card__next-move-loading">…</div>;
  if (next === null)
    return (
      <div className="pokemon-card__next-move-none">習得できる技はもうない</div>
    );

  return (
    <div className="pokemon-card__next-move-info">
      <span className="pokemon-card__next-move-name">{next.name}</span>
      <span className="pokemon-card__next-move-level">Lv.{next.atLevel}</span>
    </div>
  );
}

interface Props {
  state: GameState;
  onAllocate: (
    slotId: number,
    attribute: AttributeType,
    amount: number,
  ) => void;
  onAddActivity: (
    text: string,
    attribute: AttributeType,
    category: ActivityCategory,
    targetSlotId: number | null,
    pokemonResponse?: string,
    isConversation?: boolean,
  ) => void;
  onClaimReward: () => void;
  onForgetMove?: (moveToForgot: string) => void;
  onCancelPendingMove?: () => void;
  onPurchaseDecoration?: (slotId: number, itemId: string) => void;
  onApplyDecoration?: (slotId: number, itemId: string) => void;
  onRemoveDecoration?: (
    slotId: number,
    itemId: string,
    category: DecorationCategory,
  ) => void;
  evolutionAnimation?: {
    fromPokemonId: number;
    toPokemonId: number;
  } | null;
  onCloseEvolutionAnimation: () => void;
}

const ATTRS: AttributeType[] = ["physical", "smart", "mental", "life"];
const ATTR_LABEL: Record<AttributeType, string> = {
  physical: "フィジカル",
  smart: "スマート",
  mental: "メンタル",
  life: "ライフ",
};

function PokemonCard({
  slot,
  state,
  onAllocate,
  onAddActivity,
  onClaimReward,
  onPurchaseDecoration,
  onApplyDecoration,
  onRemoveDecoration,
}: {
  slot: PokemonSlot;
  state: GameState;
  onAllocate: (slotId: number, attr: AttributeType, amt: number) => void;
  onAddActivity: (
    text: string,
    attr: AttributeType,
    cat: ActivityCategory,
    targetSlotId: number | null,
    response?: string,
    isConversation?: boolean,
  ) => void;
  onClaimReward: () => void;
  onPurchaseDecoration?: (slotId: number, itemId: string) => void;
  onApplyDecoration?: (slotId: number, itemId: string) => void;
  onRemoveDecoration?: (
    slotId: number,
    itemId: string,
    category: DecorationCategory,
  ) => void;
}) {
  const [mode, setMode] = useState<CardMode>("normal");
  const [showAllocate, setShowAllocate] = useState(false);

  // 孵化を検出して鳴き声を再生（進化はEvolutionAnimationで再生）
  const prevPokemonIdRef = useRef<number | null | undefined>(slot.pokemonId);
  useEffect(() => {
    const prev = prevPokemonIdRef.current;
    const curr = slot.pokemonId;
    if (curr && curr !== 0 && prev === 0) {
      playPokemonCry(curr);
    }
    prevPokemonIdRef.current = curr;
  }, [slot.pokemonId]);

  const isEgg = slot.isEgg || slot.pokemonId === 0 || slot.pokemonId === null;
  const name = isEgg ? "タマゴ" : getPokemonName(slot.pokemonId ?? 0);
  const totalDp = ATTRS.reduce((s, k) => s + slot.dp[k], 0);
  const maxDp = Math.max(totalDp, 100);
  const hasPool = ATTRS.some((a) => state.dpPool[a] > 0);

  const evolutionEntry = isEgg ? null : getEvolutionEntry(slot.pokemonId ?? 0);
  const nextEvolutions = evolutionEntry?.evolvesTo ?? null;

  // デコレーション CSS クラス計算
  const deco = slot.decoration;
  const bgClass = deco.backgroundId
    ? (DECORATION_CATALOG.find((d) => d.id === deco.backgroundId)?.cssClass ??
      "")
    : "";
  const frameClass = deco.frameId
    ? (DECORATION_CATALOG.find((d) => d.id === deco.frameId)?.cssClass ?? "")
    : "";
  const accessories = deco.accessoryIds
    .map((id) => DECORATION_CATALOG.find((d) => d.id === id))
    .filter(Boolean);

  function toggleMode(target: CardMode) {
    setMode((prev) => (prev === target ? "normal" : target));
    setShowAllocate(false);
  }

  return (
    <div className="pokemon-card">
      {/* ヒーローエリア: スプライト + 名前 + No.（背景・フレームデコはここだけに適用） */}
      <div className={`pokemon-card__hero ${bgClass} ${frameClass}`.trim()}>
        {/* アクセサリーオーバーレイ */}
        {accessories.map(
          (acc) =>
            acc && (
              <span
                key={acc.id}
                className={`pokemon-card__acc ${acc.cssClass}`}
                aria-hidden="true"
              >
                {acc.spriteUrl ? (
                  <img
                    src={acc.spriteUrl}
                    alt={acc.name}
                    className="pokemon-card__acc-sprite"
                  />
                ) : (
                  acc.emoji
                )}
              </span>
            ),
        )}

        {/* 画像エリア */}
        <div className="pokemon-card__sprite-area">
          {isEgg ? (
            <span className="pokemon-card__egg-icon">🥚</span>
          ) : (
            <img
              src={animatedSpriteUrl(slot.pokemonId!)}
              alt={name}
              className="pokemon-card__sprite pokemon-card__sprite--animated"
              onError={(e) => onSpriteError(e, slot.pokemonId!)}
            />
          )}
        </div>

        {/* 名前・No.・レベル */}
        <div className="pokemon-card__name-row">
          <div className="pokemon-card__name">{name}</div>
          {!isEgg && (
            <div className="pokemon-card__level">
              Lv.{calcLevel(slot.totalDpEver)}
            </div>
          )}
        </div>
        {!isEgg && slot.pokemonId !== null && (
          <div className="pokemon-card__no">No.{slot.pokemonId}</div>
        )}
      </div>

      {/* アクションボタン行 */}
      <div className="pokemon-card__actions">
        <button
          className={`pokemon-card__action-btn${mode === "chat" ? " active" : ""}`}
          onClick={() => toggleMode("chat")}
        >
          💬 {mode === "chat" ? "閉じる" : "話しかける"}
        </button>
        {!isEgg && (
          <button
            className={`pokemon-card__action-btn pokemon-card__action-btn--dex${mode === "dex" ? " active" : ""}`}
            onClick={() => toggleMode("dex")}
          >
            📖 {mode === "dex" ? "閉じる" : "図鑑"}
          </button>
        )}
        {!isEgg && (
          <button
            className={`pokemon-card__action-btn pokemon-card__action-btn--deco${mode === "deco" ? " active" : ""}`}
            onClick={() => toggleMode("deco")}
          >
            🎨 {mode === "deco" ? "閉じる" : "デコる"}
          </button>
        )}
      </div>

      {/* ===== チャットモード ===== */}
      {mode === "chat" && (
        <PokemonChat
          slot={slot}
          state={state}
          onAddActivity={onAddActivity}
          onClaimReward={onClaimReward}
        />
      )}

      {/* ===== 図鑑モード ===== */}
      {mode === "dex" && !isEgg && slot.pokemonId !== null && (
        <PokemonDex pokemonId={slot.pokemonId} />
      )}

      {/* ===== デコモード ===== */}
      {mode === "deco" && (
        <DecorationShop
          slot={slot}
          dpPool={state.dpPool}
          onPurchase={(itemId) => onPurchaseDecoration?.(slot.slotId, itemId)}
          onApply={(itemId) => onApplyDecoration?.(slot.slotId, itemId)}
          onRemove={(itemId, category) =>
            onRemoveDecoration?.(slot.slotId, itemId, category)
          }
        />
      )}

      {/* ===== 通常モード（DP・進化条件） ===== */}
      {mode === "normal" && (
        <>
          {/* 卵: 孵化進捗 */}
          {isEgg && (
            <div className="pokemon-card__hatch">
              <div className="pokemon-card__hatch-label">
                孵化まであと{" "}
                {Math.max(0, HATCH_THRESHOLD - slot.totalDpEver).toFixed(1)} DP
              </div>
              <div className="pokemon-card__hatch-track">
                <div
                  className="pokemon-card__hatch-fill"
                  style={{
                    width: `${Math.min((slot.totalDpEver / HATCH_THRESHOLD) * 100, 100)}%`,
                  }}
                />
              </div>
              <div className="pokemon-card__hatch-num">
                {slot.totalDpEver.toFixed(1)} / {HATCH_THRESHOLD}
              </div>
            </div>
          )}

          {/* DP バー */}
          <div className="pokemon-card__stats">
            <div className="pokemon-card__stats-title">DP</div>
            {ATTRS.map((attr) => {
              const val = slot.dp[attr];
              const pct = (val / maxDp) * 100;
              return (
                <div key={attr} className="pokemon-card__stat-row">
                  <span
                    className="pokemon-card__stat-label"
                    style={{ color: ATTRIBUTE_COLORS[attr] }}
                  >
                    {ATTR_LABEL[attr]}
                  </span>
                  <div className="pokemon-card__stat-track">
                    <div
                      className="pokemon-card__stat-fill"
                      style={{
                        width: `${Math.min(pct, 100)}%`,
                        backgroundColor: ATTRIBUTE_COLORS[attr],
                      }}
                    />
                  </div>
                  <span className="pokemon-card__stat-val">
                    {Math.floor(val)}
                  </span>
                </div>
              );
            })}
            <div className="pokemon-card__affection">
              なつき度: {Math.floor(slot.totalDpEver)}
            </div>
          </div>

          {/* 技セクション */}
          {!isEgg && slot.pokemonId !== null && (
            <div className="pokemon-card__moves">
              {/* 習得済み技 */}
              <div className="pokemon-card__moves-section">
                <div className="pokemon-card__moves-title">習得済み技</div>
                {(slot.learnedMoves ?? []).length === 0 ? (
                  <div className="pokemon-card__moves-empty">なし</div>
                ) : (
                  <div className="pokemon-card__moves-list">
                    {(slot.learnedMoves ?? []).map((move) => (
                      <span key={move} className="pokemon-card__move-chip">
                        {move}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* 次に覚える技 */}
              <div className="pokemon-card__moves-section">
                <div className="pokemon-card__moves-title">次に覚える技</div>
                <NextMoveInfo
                  pokemonId={slot.pokemonId}
                  currentLevel={calcLevel(slot.totalDpEver)}
                  learnedMoves={slot.learnedMoves ?? []}
                />
              </div>
            </div>
          )}

          {/* 進化条件 */}
          {nextEvolutions && nextEvolutions.length > 0 && (
            <div className="pokemon-card__evo">
              <div className="pokemon-card__evo-title">進化条件</div>
              {nextEvolutions.map((target) => {
                const cond = target.conditions;
                const checks: { label: string; met: boolean }[] = [];
                if (cond.minLevel)
                  checks.push({
                    label: `Lv.${cond.minLevel}`,
                    met: calcLevel(slot.totalDpEver) >= cond.minLevel,
                  });
                if (cond.minPhysical)
                  checks.push({
                    label: `フィジカル ${cond.minPhysical}`,
                    met: slot.dp.physical >= cond.minPhysical,
                  });
                if (cond.minSmart)
                  checks.push({
                    label: `スマート ${cond.minSmart}`,
                    met: slot.dp.smart >= cond.minSmart,
                  });
                if (cond.minMental)
                  checks.push({
                    label: `メンタル ${cond.minMental}`,
                    met: slot.dp.mental >= cond.minMental,
                  });
                if (cond.minLife)
                  checks.push({
                    label: `ライフ ${cond.minLife}`,
                    met: slot.dp.life >= cond.minLife,
                  });
                if (cond.minAffection)
                  checks.push({
                    label: `なつき度 ${cond.minAffection}`,
                    met: slot.totalDpEver >= (cond.minAffection ?? 0),
                  });
                if (cond.timeOfDay) {
                  const hour = new Date().getHours();
                  const currentTod = hour >= 6 && hour < 18 ? "day" : "night";
                  checks.push({
                    label: cond.timeOfDay === "day" ? "昼に活動" : "夜に活動",
                    met: currentTod === cond.timeOfDay,
                  });
                }
                if (cond.bias) {
                  const domVal = slot.dp[cond.bias.dominant];
                  const biasMet =
                    cond.bias.withinRange !== undefined
                      ? cond.bias.over.every(
                          (a) =>
                            Math.abs(
                              domVal - slot.dp[a as keyof typeof slot.dp],
                            ) <= cond.bias!.withinRange!,
                        )
                      : cond.bias.over.every(
                          (a) => domVal > slot.dp[a as keyof typeof slot.dp],
                        );
                  checks.push({
                    label: `${ATTR_LABEL[cond.bias.dominant]}が高い`,
                    met: biasMet,
                  });
                }
                return (
                  <div
                    key={target.targetId}
                    className="pokemon-card__evo-entry"
                  >
                    <div className="pokemon-card__evo-name">
                      → {getPokemonName(target.targetId)}
                    </div>
                    {checks.map((c, i) => (
                      <div
                        key={i}
                        className={`pokemon-card__evo-cond${c.met ? " met" : ""}`}
                      >
                        {c.met ? "✅" : "○"} {c.label}
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          )}
          {!nextEvolutions && !isEgg && (
            <div className="pokemon-card__evo">
              <div className="pokemon-card__evo-title">これ以上進化しない</div>
            </div>
          )}

          {/* DP配分 */}
          {hasPool && (
            <div className="pokemon-card__allocate">
              <button
                className="pokemon-card__allocate-btn"
                onClick={() => setShowAllocate((v) => !v)}
              >
                {showAllocate ? "▲ 閉じる" : "▼ DPプールから配分する"}
              </button>
              {showAllocate && (
                <DpPoolPanel
                  state={state}
                  selectedSlotId={slot.slotId}
                  onAllocate={(_, attr, amt) =>
                    onAllocate(slot.slotId, attr, amt)
                  }
                />
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

export function PartyView({
  state,
  onAllocate,
  onAddActivity,
  onClaimReward,
  onForgetMove,
  onCancelPendingMove,
  onPurchaseDecoration,
  onApplyDecoration,
  onRemoveDecoration,
  evolutionAnimation,
  onCloseEvolutionAnimation,
}: Props) {
  const { party, unlockedSlots, totalTp } = state;
  const unlockedParty = party.slice(0, unlockedSlots);
  const [index, setIndex] = useState(0);

  const safeIndex = Math.min(index, unlockedParty.length - 1);
  const current = unlockedParty[safeIndex];

  const nextThreshold = TP_SLOT_THRESHOLDS[unlockedSlots];
  const tpToNext = nextThreshold !== undefined ? nextThreshold - totalTp : null;

  return (
    <div className="party-view">
      <div className="party-nav">
        {unlockedParty.map((s, i) => {
          const isEgg = s.isEgg || s.pokemonId === 0 || s.pokemonId === null;
          const isSelected = i === safeIndex;
          return (
            <button
              key={s.slotId}
              className={`party-nav__icon${isSelected ? " party-nav__icon--active" : ""}`}
              onClick={() => setIndex(i)}
              aria-label={isEgg ? "タマゴ" : getPokemonName(s.pokemonId ?? 0)}
            >
              {isEgg ? (
                <span className="party-nav__icon-egg">🥚</span>
              ) : (
                <img
                  src={animatedSpriteUrl(s.pokemonId!)}
                  alt={getPokemonName(s.pokemonId ?? 0)}
                  className="party-nav__icon-sprite"
                  onError={(e) => onSpriteError(e, s.pokemonId!)}
                />
              )}
            </button>
          );
        })}
      </div>

      {current && (
        <PokemonCard
          slot={current}
          state={state}
          onAllocate={onAllocate}
          onAddActivity={onAddActivity}
          onClaimReward={onClaimReward}
          onPurchaseDecoration={onPurchaseDecoration}
          onApplyDecoration={onApplyDecoration}
          onRemoveDecoration={onRemoveDecoration}
        />
      )}

      {tpToNext !== null && tpToNext > 0 && (
        <div className="party-view__unlock-hint">
          次のスロット解放まであと{" "}
          <span className="party-view__unlock-tp">
            {Math.ceil(tpToNext)} TP
          </span>
        </div>
      )}
      {unlockedSlots >= 6 && (
        <div className="party-view__unlock-hint">パーティが満員です</div>
      )}

      {state.pendingMove && state.pendingMoveSlotId !== null && (
        <MoveSelectionModal
          newMove={state.pendingMove}
          currentMoves={
            state.party.find((s) => s.slotId === state.pendingMoveSlotId)
              ?.learnedMoves ?? []
          }
          onConfirm={(moveToForgot) => onForgetMove?.(moveToForgot)}
          onCancel={() => onCancelPendingMove?.()}
        />
      )}

      {evolutionAnimation && (
        <EvolutionAnimation
          fromPokemonId={evolutionAnimation.fromPokemonId}
          toPokemonId={evolutionAnimation.toPokemonId}
          onComplete={onCloseEvolutionAnimation}
          onCancel={onCloseEvolutionAnimation}
        />
      )}
    </div>
  );
}
