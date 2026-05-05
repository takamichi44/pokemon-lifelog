import { useState, useEffect } from 'react';
import type { PokemonSlot, AttributeType } from '../types';
import { ATTRIBUTE_LABELS, ATTRIBUTE_COLORS, TP_SLOT_THRESHOLDS } from '../types';
import { getPokemonName } from '../data/pokemonNames';

interface Props {
  slot: PokemonSlot;
  index: number;
  isUnlocked: boolean;
  totalTp: number;
  isSelected: boolean;
  onSelect: () => void;
}

const ATTR_KEYS: AttributeType[] = ['physical', 'smart', 'mental', 'life'];

export function PartySlot({ slot, index, isUnlocked, totalTp: _totalTp, isSelected, onSelect }: Props) {
  const [spriteUrl, setSpriteUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!isUnlocked || slot.isEgg || slot.pokemonId === null || slot.pokemonId === 0) {
      setSpriteUrl(null);
      return;
    }
    setSpriteUrl(
      `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${slot.pokemonId}.png`,
    );
  }, [slot.pokemonId, slot.isEgg, isUnlocked]);

  if (!isUnlocked) {
    const neededTp = TP_SLOT_THRESHOLDS[index] ?? 9999;
    return (
      <div className="party-slot party-slot--locked" onClick={onSelect}>
        <span className="party-slot__lock">🔒</span>
        <span className="party-slot__lock-label">TP {neededTp}</span>
      </div>
    );
  }

  const totalDp = ATTR_KEYS.reduce((s, k) => s + slot.dp[k], 0);
  const name = slot.isEgg || slot.pokemonId === 0
    ? 'タマゴ'
    : getPokemonName(slot.pokemonId ?? 0);

  return (
    <div
      className={`party-slot${isSelected ? ' party-slot--selected' : ''}`}
      onClick={onSelect}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && onSelect()}
    >
      <div className="party-slot__image-area">
        {slot.isEgg || slot.pokemonId === 0 ? (
          <span className="party-slot__egg">🥚</span>
        ) : spriteUrl ? (
          <img src={spriteUrl} alt={name} className="party-slot__sprite" />
        ) : (
          <span className="party-slot__no-image">?</span>
        )}
      </div>

      <div className="party-slot__name">{name}</div>

      <div className="party-slot__dp-bars">
        {ATTR_KEYS.map((attr) => {
          const val = slot.dp[attr];
          const pct = totalDp > 0 ? (val / Math.max(totalDp, 100)) * 100 : 0;
          return (
            <div key={attr} className="party-slot__bar-row">
              <span
                className="party-slot__bar-label"
                style={{ color: ATTRIBUTE_COLORS[attr] }}
              >
                {ATTRIBUTE_LABELS[attr][0]}
              </span>
              <div className="party-slot__bar-track">
                <div
                  className="party-slot__bar-fill"
                  style={{
                    width: `${Math.min(pct, 100)}%`,
                    backgroundColor: ATTRIBUTE_COLORS[attr],
                  }}
                />
              </div>
              <span className="party-slot__bar-value">{Math.floor(val)}</span>
            </div>
          );
        })}
      </div>

      <div className="party-slot__affection">
        なつき度 {Math.floor(slot.totalDpEver)}
      </div>

      {isSelected && <div className="party-slot__selected-badge">選択中</div>}
    </div>
  );
}
