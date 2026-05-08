import { useState } from "react";
import type { PokemonSlot, AttributeType, DecorationCategory } from "../types";
import {
  DECORATION_CATALOG,
  ACCESSORY_MAX,
  getDecorationsByCategory,
} from "../data/decorationCatalog";

interface Props {
  slot: PokemonSlot;
  dpPool: Record<AttributeType, number>;
  onPurchase: (itemId: string) => void;
  onApply: (itemId: string) => void;
  onRemove: (itemId: string, category: DecorationCategory) => void;
}

const TABS: { id: DecorationCategory; label: string }[] = [
  { id: "background", label: "🌄 背景" },
  { id: "frame", label: "🖼 フレーム" },
  { id: "accessory", label: "🎀 アクセサリー" },
];

export function DecorationShop({ slot, dpPool, onPurchase, onApply, onRemove }: Props) {
  const [activeTab, setActiveTab] = useState<DecorationCategory>("background");

  const poolTotal = Math.floor(Object.values(dpPool).reduce((s, v) => s + v, 0));
  const deco = slot.decoration;
  const items = getDecorationsByCategory(activeTab);

  function isEquipped(itemId: string): boolean {
    if (activeTab === "background") return deco.backgroundId === itemId;
    if (activeTab === "frame") return deco.frameId === itemId;
    return deco.accessoryIds.includes(itemId);
  }

  function isAccessoryFull(): boolean {
    return activeTab === "accessory" && deco.accessoryIds.length >= ACCESSORY_MAX;
  }

  return (
    <div className="deco-shop">
      {/* DPプール残高 */}
      <div className="deco-shop__pool">
        <span className="deco-shop__pool-label">DPプール残高</span>
        <span className="deco-shop__pool-val">{poolTotal} DP</span>
      </div>

      {/* タブ */}
      <div className="deco-shop__tabs">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            className={`deco-shop__tab${activeTab === tab.id ? " active" : ""}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* アクセサリー上限表示 */}
      {activeTab === "accessory" && (
        <div className="deco-shop__acc-hint">
          装備中: {deco.accessoryIds.length} / {ACCESSORY_MAX}
        </div>
      )}

      {/* アイテム一覧 */}
      <div className="deco-shop__grid">
        {items.map((item) => {
          const purchased = deco.purchasedIds.includes(item.id);
          const equipped = isEquipped(item.id);
          const canAfford = poolTotal >= item.cost;
          const accFull = isAccessoryFull() && !equipped;

          return (
            <div
              key={item.id}
              className={`deco-shop__item${equipped ? " equipped" : ""}${purchased ? " purchased" : ""}`}
            >
              <div className="deco-shop__item-emoji">{item.emoji}</div>
              <div className="deco-shop__item-name">{item.name}</div>

              {purchased ? (
                <div className="deco-shop__item-badges">
                  <span className="deco-shop__badge deco-shop__badge--owned">購入済み</span>
                  {equipped ? (
                    <button
                      className="deco-shop__btn deco-shop__btn--remove"
                      onClick={() => onRemove(item.id, item.category)}
                    >
                      外す
                    </button>
                  ) : (
                    <button
                      className="deco-shop__btn deco-shop__btn--apply"
                      onClick={() => onApply(item.id)}
                      disabled={accFull}
                      title={accFull ? `アクセサリーは${ACCESSORY_MAX}個まで` : undefined}
                    >
                      つける
                    </button>
                  )}
                </div>
              ) : (
                <button
                  className="deco-shop__btn deco-shop__btn--buy"
                  onClick={() => onPurchase(item.id)}
                  disabled={!canAfford || accFull}
                  title={
                    !canAfford
                      ? "DPが足りない"
                      : accFull
                        ? `アクセサリーは${ACCESSORY_MAX}個まで`
                        : undefined
                  }
                >
                  {item.cost} DP で購入
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* 現在の装備プレビュー */}
      {(deco.backgroundId || deco.frameId || deco.accessoryIds.length > 0) && (
        <div className="deco-shop__current">
          <div className="deco-shop__current-title">現在の装備</div>
          <div className="deco-shop__current-list">
            {deco.backgroundId && (
              <span className="deco-shop__current-item">
                {DECORATION_CATALOG.find((d) => d.id === deco.backgroundId)?.emoji}{" "}
                {DECORATION_CATALOG.find((d) => d.id === deco.backgroundId)?.name}
              </span>
            )}
            {deco.frameId && (
              <span className="deco-shop__current-item">
                {DECORATION_CATALOG.find((d) => d.id === deco.frameId)?.emoji}{" "}
                {DECORATION_CATALOG.find((d) => d.id === deco.frameId)?.name}
              </span>
            )}
            {deco.accessoryIds.map((accId) => {
              const acc = DECORATION_CATALOG.find((d) => d.id === accId);
              return acc ? (
                <span key={accId} className="deco-shop__current-item">
                  {acc.emoji} {acc.name}
                </span>
              ) : null;
            })}
          </div>
        </div>
      )}
    </div>
  );
}
