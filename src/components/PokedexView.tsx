import { useState } from 'react';
import { ALL_GAME_POKEMON_IDS } from '../data/allGamePokemon';
import { getPokemonName } from '../data/pokemonNames';
import { PokemonDex } from './PokemonDex';
import { animatedSpriteUrl, onSpriteError, staticSpriteUrl } from '../utils/spriteUrl';

interface Props {
  caughtPokemon: number[];
}

export function PokedexView({ caughtPokemon }: Props) {
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const caughtSet = new Set(caughtPokemon);
  const total = ALL_GAME_POKEMON_IDS.length;
  const caught = caughtPokemon.length;

  function handleSelect(id: number) {
    if (!caughtSet.has(id)) return;
    setSelectedId((prev) => (prev === id ? null : id));
  }

  return (
    <div className="pokedex-view">
      {/* ヘッダー */}
      <div className="pokedex-view__header">
        <span className="pokedex-view__title">図鑑コレクション</span>
        <span className="pokedex-view__count">
          <span className="pokedex-view__caught">{caught}</span>
          <span className="pokedex-view__total"> / {total}</span>
        </span>
      </div>

      {/* 選択中ポケモンの詳細 */}
      {selectedId !== null && (
        <div className="pokedex-view__detail">
          <div className="pokedex-view__detail-sprite-row">
            <img
              src={animatedSpriteUrl(selectedId)}
              alt={getPokemonName(selectedId)}
              className="pokedex-view__detail-sprite"
              onError={(e) => onSpriteError(e, selectedId)}
            />
          </div>
          <PokemonDex pokemonId={selectedId} />
        </div>
      )}

      {/* 未入手の場合のヒント */}
      {caught === 0 && (
        <div className="pokedex-view__hint">
          ポケモンを孵化・進化させると図鑑に登録されます
        </div>
      )}

      {/* グリッド */}
      <div className="pokedex-view__grid">
        {ALL_GAME_POKEMON_IDS.map((id) => {
          const isCaught = caughtSet.has(id);
          const isSelected = selectedId === id;
          return (
            <button
              key={id}
              className={[
                'pokedex-entry',
                isCaught ? '' : 'pokedex-entry--uncaught',
                isSelected ? 'pokedex-entry--selected' : '',
              ].join(' ').trim()}
              onClick={() => handleSelect(id)}
              disabled={!isCaught}
            >
              <img
                src={isCaught ? animatedSpriteUrl(id) : staticSpriteUrl(id)}
                alt={isCaught ? getPokemonName(id) : '???'}
                className="pokedex-entry__sprite"
                onError={isCaught ? (e) => onSpriteError(e, id) : undefined}
              />
              <div className="pokedex-entry__no">No.{id}</div>
              <div className="pokedex-entry__name">
                {isCaught ? getPokemonName(id) : '???'}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
