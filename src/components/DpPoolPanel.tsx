import { useState } from 'react';
import type { GameState, AttributeType } from '../types';
import { ATTRIBUTE_LABELS, ATTRIBUTE_COLORS } from '../types';

interface Props {
  state: GameState;
  selectedSlotId: number | null;
  onAllocate: (slotId: number, attribute: AttributeType, amount: number) => void;
}

const ATTR_KEYS: AttributeType[] = ['physical', 'smart', 'mental', 'life'];

export function DpPoolPanel({ state, selectedSlotId, onAllocate }: Props) {
  const { dpPool } = state;
  const [amounts, setAmounts] = useState<Record<AttributeType, string>>({
    physical: '', smart: '', mental: '', life: '',
  });

  const totalPool = ATTR_KEYS.reduce((s, k) => s + dpPool[k], 0);
  if (totalPool <= 0) return null;

  function handleAllocate(attr: AttributeType) {
    if (selectedSlotId === null) return;
    const raw = parseFloat(amounts[attr]);
    const amount = isNaN(raw) || raw <= 0 ? dpPool[attr] : Math.min(raw, dpPool[attr]);
    if (amount <= 0) return;
    onAllocate(selectedSlotId, attr, amount);
    setAmounts((prev) => ({ ...prev, [attr]: '' }));
  }

  return (
    <section className="dp-pool">
      <div className="dp-pool__header">
        DPプール
        {selectedSlotId === null && (
          <span className="dp-pool__hint">スロットを選択して配分</span>
        )}
      </div>
      <div className="dp-pool__rows">
        {ATTR_KEYS.filter((attr) => dpPool[attr] > 0).map((attr) => (
          <div key={attr} className="dp-pool__row">
            <span className="dp-pool__label" style={{ color: ATTRIBUTE_COLORS[attr] }}>
              {ATTRIBUTE_LABELS[attr]}
            </span>
            <span className="dp-pool__amount">{dpPool[attr].toFixed(1)}</span>
            <input
              type="number"
              className="dp-pool__input"
              placeholder="全て"
              min="0.1"
              step="0.1"
              max={dpPool[attr]}
              value={amounts[attr]}
              onChange={(e) => setAmounts((prev) => ({ ...prev, [attr]: e.target.value }))}
              disabled={selectedSlotId === null}
            />
            <button
              className="dp-pool__btn"
              disabled={selectedSlotId === null}
              onClick={() => handleAllocate(attr)}
            >
              配分
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}
