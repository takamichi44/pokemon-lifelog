import type { GameState } from '../types';
import { PartySlot } from './PartySlot';

interface Props {
  state: GameState;
  selectedSlotId: number | null;
  onSelectSlot: (slotId: number | null) => void;
}

export function PartyBoard({ state, selectedSlotId, onSelectSlot }: Props) {
  const { party, unlockedSlots, totalTp } = state;

  return (
    <section className="party-board">
      <div className="party-board__header">
        <span className="party-board__title">パーティ</span>
        <span className="party-board__tp">TP: {Math.floor(totalTp)}</span>
      </div>
      <div className="party-board__grid">
        {party.map((slot, i) => (
          <PartySlot
            key={slot.slotId}
            slot={slot}
            index={i}
            isUnlocked={i < unlockedSlots}
            totalTp={totalTp}
            isSelected={selectedSlotId === slot.slotId}
            onSelect={() =>
              onSelectSlot(selectedSlotId === slot.slotId ? null : slot.slotId)
            }
          />
        ))}
      </div>
    </section>
  );
}
