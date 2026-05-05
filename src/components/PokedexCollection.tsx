import { ALL_GAME_POKEMON_IDS } from '../data/allGamePokemon';
import { getPokemonName } from '../data/pokemonNames';

interface Props {
  caughtPokemon: number[];
}

function spriteUrl(id: number) {
  return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${id}.png`;
}

export function PokedexCollection({ caughtPokemon }: Props) {
  const caughtSet = new Set(caughtPokemon);
  const total = ALL_GAME_POKEMON_IDS.length;
  const caught = caughtPokemon.length;

  return (
    <div className="pokedex-collection">
      <div className="pokedex-collection__header">
        <span className="pokedex-collection__title">図鑑コレクション</span>
        <span className="pokedex-collection__count">
          <span className="pokedex-collection__caught">{caught}</span>
          <span className="pokedex-collection__total"> / {total}</span>
        </span>
      </div>

      <div className="pokedex-collection__grid">
        {ALL_GAME_POKEMON_IDS.map((id) => {
          const isCaught = caughtSet.has(id);
          return (
            <div
              key={id}
              className={`pokedex-entry${isCaught ? '' : ' pokedex-entry--uncaught'}`}
            >
              <img
                src={spriteUrl(id)}
                alt={isCaught ? getPokemonName(id) : '???'}
                className="pokedex-entry__sprite"
              />
              <div className="pokedex-entry__no">No.{id}</div>
              <div className="pokedex-entry__name">
                {isCaught ? getPokemonName(id) : '???'}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
