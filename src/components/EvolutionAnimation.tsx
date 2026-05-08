import { useState, useEffect } from "react";
import { animatedSpriteUrl, onSpriteError } from "../utils/spriteUrl";
import { getPokemonName } from "../data/pokemonNames";
import { playPokemonCry } from "../utils/pokemonCry";

interface Props {
  fromPokemonId: number;
  toPokemonId: number;
  onComplete: () => void;
  onCancel: () => void;
}

export function EvolutionAnimation({
  fromPokemonId,
  toPokemonId,
  onComplete,
  onCancel,
}: Props) {
  const [phase, setPhase] = useState<
    | "confirm"
    | "shake"
    | "silhouette"
    | "flash"
    | "bounce"
    | "complete"
    | "cancel"
  >("confirm");
  const [flashCount, setFlashCount] = useState(0);

  // Phase 1: Shake (1秒)
  useEffect(() => {
    if (phase === "shake") {
      const timer = setTimeout(() => setPhase("silhouette"), 1000);
      return () => clearTimeout(timer);
    }
  }, [phase]);

  // Phase 2: Silhouette with 3 flashes (1.2秒)
  useEffect(() => {
    if (phase === "silhouette") {
      const flashInterval = setInterval(() => {
        setFlashCount((prev) => {
          if (prev >= 5) {
            // 3回点滅 = 6回変化 (on/off x3)
            clearInterval(flashInterval);
            setPhase("flash");
            return prev;
          }
          return prev + 1;
        });
      }, 200); // 200ms間隔で点滅
      return () => clearInterval(flashInterval);
    }
  }, [phase]);

  // Phase 3: Flash and switch to evolved form (0.3秒)
  useEffect(() => {
    if (phase === "flash") {
      const timer = setTimeout(() => setPhase("bounce"), 300);
      return () => clearTimeout(timer);
    }
  }, [phase]);

  // Phase 4: Bounce and play cry (1秒)
  useEffect(() => {
    if (phase === "bounce") {
      playPokemonCry(toPokemonId, 0.3);
      const timer = setTimeout(() => setPhase("complete"), 1000);
      return () => clearTimeout(timer);
    }
  }, [phase, toPokemonId]);

  // Complete (0.5秒)
  useEffect(() => {
    if (phase === "complete") {
      const timer = setTimeout(onComplete, 500);
      return () => clearTimeout(timer);
    }
  }, [phase, onComplete]);

  const getImageSrc = () => {
    if (phase === "shake" || phase === "silhouette")
      return animatedSpriteUrl(fromPokemonId);
    return animatedSpriteUrl(toPokemonId);
  };

  const getImageClass = () => {
    const base = "evolution-animation__sprite";
    if (phase === "shake") return `${base} shake`;
    if (phase === "silhouette")
      return `${base} silhouette ${flashCount % 2 === 0 ? "visible" : "hidden"}`;
    if (phase === "flash") return `${base} flash`;
    if (phase === "bounce") return `${base} bounce`;
    return base;
  };

  const fromName = getPokemonName(fromPokemonId);
  const toName = getPokemonName(toPokemonId);

  if (phase === "confirm") {
    return (
      <div className="evolution-animation">
        <div className="evolution-animation__container">
          <img
            src={animatedSpriteUrl(fromPokemonId)}
            alt="Pokemon to evolve"
            className="evolution-animation__sprite"
            onError={(e) => onSpriteError(e, fromPokemonId)}
          />
        </div>
        <div className="evolution-dialog">
          <div className="evolution-dialog__message">
            ・・・おや！？ {fromName}のようすが・・・！
          </div>
          <div className="evolution-dialog__question">進化させますか？</div>
          <div className="evolution-dialog__buttons">
            <button
              className="evolution-dialog__button evolution-dialog__button--yes"
              onClick={() => setPhase("shake")}
            >
              はい
            </button>
            <button
              className="evolution-dialog__button evolution-dialog__button--no"
              onClick={() => setPhase("cancel")}
            >
              いいえ
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (phase === "complete") {
    return (
      <div className="evolution-animation">
        <div className="evolution-animation__container">
          <img
            src={animatedSpriteUrl(toPokemonId)}
            alt="Evolved Pokemon"
            className="evolution-animation__sprite"
            onError={(e) => onSpriteError(e, toPokemonId)}
          />
        </div>
        <div className="evolution-dialog">
          <div className="evolution-dialog__message">
            おめでとう！{fromName}は{toName}にしんかした！
          </div>
          <div className="evolution-dialog__buttons">
            <button
              className="evolution-dialog__button evolution-dialog__button--ok"
              onClick={onComplete}
            >
              OK
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (phase === "cancel") {
    return (
      <div className="evolution-animation">
        <div className="evolution-animation__container">
          <img
            src={animatedSpriteUrl(fromPokemonId)}
            alt="Pokemon evolution cancelled"
            className="evolution-animation__sprite"
            onError={(e) => onSpriteError(e, fromPokemonId)}
          />
        </div>
        <div className="evolution-dialog">
          <div className="evolution-dialog__message">
            {fromName}のへんかがとまった
          </div>
          <div className="evolution-dialog__buttons">
            <button
              className="evolution-dialog__button evolution-dialog__button--ok"
              onClick={onCancel}
            >
              OK
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="evolution-animation">
      <div className="evolution-animation__container">
        <img
          src={getImageSrc()}
          alt="Evolving Pokemon"
          className={getImageClass()}
          onError={(e) =>
            onSpriteError(
              e,
              phase === "shake" || phase === "silhouette"
                ? fromPokemonId
                : toPokemonId,
            )
          }
        />
      </div>
    </div>
  );
}
