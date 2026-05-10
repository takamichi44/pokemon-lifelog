import { useState } from "react";
import { usePokemonEngine } from "./hooks/usePokemonEngine";
import { PartyView } from "./components/PartyView";
import { PokedexView } from "./components/PokedexView";
import { TrainerView } from "./components/TrainerView";
import { BottomNav, type TabId } from "./components/BottomNav";
import { Onboarding } from "./components/Onboarding";
import type { AttributeType, ActivityCategory } from "./types";
import "./App.css";

const ONBOARDING_KEY = "pokemon_lifelog_v1_onboarded";

export default function App() {
  const {
    state,
    addActivity,
    allocateFromPool,
    claimChallengeReward,
    resetGame,
    setDecayRate,
    setTrainerName,
    setStarterPokemon,
    grantDp,
    forgetMove,
    cancelPendingMove,
    purchaseDecoration,
    applyDecoration,
    removeDecoration,
  } = usePokemonEngine((fromPokemonId, toPokemonId) => {
    setEvolutionAnimation({ fromPokemonId, toPokemonId });
  });
  const [onboarded, setOnboarded] = useState(() => {
    return localStorage.getItem(ONBOARDING_KEY) === "true";
  });
  const [tab, setTab] = useState<TabId>("party");
  const [evolutionAnimation, setEvolutionAnimation] = useState<{
    fromPokemonId: number;
    toPokemonId: number;
  } | null>(null);

  function handleOnboardingComplete(trainerName: string, starterPokemonId: number) {
    setTrainerName(trainerName);
    setStarterPokemon(starterPokemonId);
    localStorage.setItem(ONBOARDING_KEY, "true");
    setOnboarded(true);
  }

  if (!onboarded) {
    return <Onboarding onComplete={handleOnboardingComplete} />;
  }

  const hasPoolDp = Object.values(state.dpPool).some((v) => v > 0);

  function handleAddActivity(
    text: string,
    attribute: AttributeType,
    category: ActivityCategory,
    targetSlotId: number | null,
    pokemonResponse?: string,
    isConversation?: boolean,
  ) {
    addActivity(
      text,
      attribute,
      category,
      targetSlotId,
      pokemonResponse,
      isConversation,
    );
  }

  return (
    <div className="app">
      <header className="app-header">
        <h1 className="app-header__title">ポケモンライフログ</h1>
        <span className="app-header__tp">TP: {Math.floor(state.totalTp)}</span>
      </header>

      <main className="app-main">
        {tab === "party" && (
          <PartyView
            state={state}
            onAllocate={allocateFromPool}
            onAddActivity={handleAddActivity}
            onClaimReward={claimChallengeReward}
            onForgetMove={forgetMove}
            onCancelPendingMove={cancelPendingMove}
            onPurchaseDecoration={purchaseDecoration}
            onApplyDecoration={applyDecoration}
            onRemoveDecoration={removeDecoration}
            evolutionAnimation={evolutionAnimation}
            onCloseEvolutionAnimation={() => setEvolutionAnimation(null)}
          />
        )}
        {tab === "pokedex" && (
          <PokedexView caughtPokemon={state.caughtPokemon ?? []} />
        )}
        {tab === "trainer" && (
          <TrainerView
            state={state}
            onReset={resetGame}
            onDecayRateChange={setDecayRate}
            onNameChange={setTrainerName}
            onClaimReward={claimChallengeReward}
            onGrantDp={grantDp}
          />
        )}
      </main>

      <BottomNav current={tab} onChange={setTab} hasPoolDp={hasPoolDp} />
    </div>
  );
}
