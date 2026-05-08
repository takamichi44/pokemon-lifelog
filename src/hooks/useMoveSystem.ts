/**
 * useMoveSystem.ts
 * ポケモンの技習得・忘却に関するロジックを管理するフック。
 */

import { useCallback } from "react";
import type { Dispatch, SetStateAction } from "react";
import type { GameState } from "../types";
import { getMovesByPokemonId } from "../services/pokeApiService";
import { calcLevel, getMovesForLevel } from "../utils/levelSystem";

export function useMoveSystem(
  state: GameState,
  setState: Dispatch<SetStateAction<GameState>>,
) {
  const checkAndLearnMoves = useCallback(
    async (targetSlotId: number) => {
      // pokemonId だけ現stateから取得（進化直後でも次のレンダ後に最新になる）
      const slot = state.party.find((s) => s.slotId === targetSlotId);
      if (!slot || slot.isEgg || !slot.pokemonId) return;

      const pokemonId = slot.pokemonId;

      try {
        // 非同期API取得（キャッシュあり）
        const allMoves = await getMovesByPokemonId(pokemonId);

        // setState コールバックで最新stateを取得して技習得判定
        setState((prev) => {
          const latestSlot = prev.party.find((s) => s.slotId === targetSlotId);
          if (!latestSlot || latestSlot.isEgg || !latestSlot.pokemonId) return prev;

          const currentLevel = calcLevel(latestSlot.totalDpEver);

          // レベル1〜現在レベルの全技を確認（キャッチアップ含む）
          let newLearnedMoves = [...(latestSlot.learnedMoves ?? [])];
          let pendingMove = prev.pendingMove;
          let pendingMoveSlotId = prev.pendingMoveSlotId;

          outer: for (let lvl = 1; lvl <= currentLevel; lvl++) {
            const movesAtLevel = getMovesForLevel(allMoves, lvl);
            for (const move of movesAtLevel) {
              if (newLearnedMoves.includes(move)) continue;

              if (newLearnedMoves.length < 4) {
                newLearnedMoves = [...newLearnedMoves, move];
              } else if (!pendingMove) {
                // 枠が埋まっている場合はモーダル表示（1件のみ）
                pendingMove = move;
                pendingMoveSlotId = targetSlotId;
                break outer;
              }
            }
          }

          // 変化なければ state を更新しない
          const unchanged =
            newLearnedMoves.length === (latestSlot.learnedMoves ?? []).length &&
            pendingMove === prev.pendingMove;
          if (unchanged) return prev;

          return {
            ...prev,
            party: prev.party.map((s) =>
              s.slotId === targetSlotId
                ? { ...s, learnedMoves: newLearnedMoves }
                : s,
            ),
            pendingMove,
            pendingMoveSlotId,
          };
        });
      } catch (e) {
        console.error("技データ取得エラー:", e);
      }
    },
    [state.party, setState],
  );

  const forgetMove = useCallback(
    (moveToForgot: string) => {
      setState((prev) => {
        if (!prev.pendingMove || prev.pendingMoveSlotId === null) return prev;

        const newParty = prev.party.map((slot) => {
          if (slot.slotId !== prev.pendingMoveSlotId) return slot;
          const newMoves = (slot.learnedMoves ?? [])
            .filter((m) => m !== moveToForgot)
            .concat([prev.pendingMove!]);
          return { ...slot, learnedMoves: newMoves };
        });

        return {
          ...prev,
          party: newParty,
          pendingMove: null,
          pendingMoveSlotId: null,
        };
      });
    },
    [setState],
  );

  const cancelPendingMove = useCallback(() => {
    setState((prev) => ({
      ...prev,
      pendingMove: null,
      pendingMoveSlotId: null,
    }));
  }, [setState]);

  return { checkAndLearnMoves, forgetMove, cancelPendingMove };
}
