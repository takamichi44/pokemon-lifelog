import { useState } from "react";

interface Props {
  newMove: string;
  currentMoves: string[];
  onConfirm: (moveToForgot: string) => void;
  onCancel: () => void;
}

export function MoveSelectionModal({
  newMove,
  currentMoves,
  onConfirm,
  onCancel,
}: Props) {
  const [selected, setSelected] = useState<string | null>(null);

  return (
    <div className="modal-overlay">
      <div className="modal-box">
        <h3 className="modal-title">技が満杯です</h3>
        <p className="modal-message">
          新しい技「<strong>{newMove}</strong>」を覚えさせますか？
        </p>
        <p className="modal-submessage">忘れさせる技を選んでください:</p>

        <div className="move-selection-list">
          {currentMoves.map((move) => (
            <label key={move} className="move-selection-item">
              <input
                type="radio"
                name="forget"
                value={move}
                checked={selected === move}
                onChange={(e) => setSelected(e.target.value)}
              />
              <span className="move-name">{move}</span>
            </label>
          ))}
        </div>

        <div className="modal-actions">
          <button className="modal-btn modal-btn--cancel" onClick={onCancel}>
            キャンセル
          </button>
          <button
            className="modal-btn modal-btn--confirm"
            onClick={() => selected && onConfirm(selected)}
            disabled={!selected}
          >
            {selected ? `${selected}を忘れる` : "選択してください"}
          </button>
        </div>
      </div>
    </div>
  );
}
