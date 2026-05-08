import { useState, useEffect } from 'react';
import { getPokeData, TYPE_COLORS } from '../services/pokeApiService';
import type { PokeData } from '../services/pokeApiService';
import { getPokemonName } from '../data/pokemonNames';

interface Props {
  pokemonId: number;
}

export function PokemonDex({ pokemonId }: Props) {
  const [data, setData] = useState<PokeData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    setData(null);
    getPokeData(pokemonId)
      .then(setData)
      .catch((e) => setError(e instanceof Error ? e.message : 'エラーが発生しました'))
      .finally(() => setLoading(false));
  }, [pokemonId]);

  const name = getPokemonName(pokemonId);

  return (
    <div className="pokemon-dex">
      <div className="pokemon-dex__title">
        No.{pokemonId} {name}
        {data?.genus && (
          <span className="pokemon-dex__genus">（{data.genus}）</span>
        )}
      </div>

      {loading && (
        <div className="pokemon-dex__loading">
          <span /><span /><span />
        </div>
      )}

      {error && (
        <div className="pokemon-dex__error">⚠️ {error}</div>
      )}

      {data && (
        <>
          {/* タイプ */}
          <div className="pokemon-dex__types">
            {data.types.map((t) => (
              <span
                key={t}
                className="pokemon-dex__type-badge"
                style={{ background: TYPE_COLORS[t] ?? '#9ea29e' }}
              >
                {t}
              </span>
            ))}
          </div>

          {/* 高さ・重さ */}
          <div className="pokemon-dex__stats-row">
            <div className="pokemon-dex__stat">
              <span className="pokemon-dex__stat-label">高さ</span>
              <span className="pokemon-dex__stat-val">{(data.height / 10).toFixed(1)} m</span>
            </div>
            <div className="pokemon-dex__stat">
              <span className="pokemon-dex__stat-label">重さ</span>
              <span className="pokemon-dex__stat-val">{(data.weight / 10).toFixed(1)} kg</span>
            </div>
          </div>

          {/* 図鑑説明 */}
          {data.flavorText && (
            <p className="pokemon-dex__flavor">{data.flavorText}</p>
          )}

          {/* 特性 */}
          {data.abilities.length > 0 && (
            <div className="pokemon-dex__abilities">
              <div className="pokemon-dex__abilities-title">特性</div>
              {data.abilities.map((ab, i) => (
                <div
                  key={i}
                  className={`pokemon-dex__ability${ab.isHidden ? ' pokemon-dex__ability--hidden' : ''}`}
                >
                  <span className="pokemon-dex__ability-name">
                    {ab.nameJa}
                    {ab.isHidden && (
                      <span className="pokemon-dex__ability-hidden-badge">隠れ特性</span>
                    )}
                  </span>
                  {ab.flavorJa && (
                    <p className="pokemon-dex__ability-flavor">{ab.flavorJa}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
