import { useState } from 'react';
import { usePokemonEngine } from './hooks/usePokemonEngine';
import { PartyView } from './components/PartyView';
import { PokedexView } from './components/PokedexView';
import { TrainerView } from './components/TrainerView';
import { BottomNav, type TabId } from './components/BottomNav';
import type { AttributeType, ActivityCategory } from './types';
import './App.css';

export default function App() {
  const { state, addActivity, allocateFromPool, claimChallengeReward, resetGame, setDecayRate } = usePokemonEngine();
  const [tab, setTab] = useState<TabId>('party');

  const hasPoolDp = Object.values(state.dpPool).some((v) => v > 0);

  function handleAddActivity(
    text: string,
    attribute: AttributeType,
    category: ActivityCategory,
    targetSlotId: number | null,
    pokemonResponse?: string,
  ) {
    addActivity(text, attribute, category, targetSlotId, pokemonResponse);
  }

  return (
    <div className="app">
      <header className="app-header">
        <h1 className="app-header__title">ポケモンライフログ</h1>
        <span className="app-header__tp">TP: {Math.floor(state.totalTp)}</span>
      </header>

      <main className="app-main">
        {tab === 'party' && (
          <PartyView
            state={state}
            onAllocate={allocateFromPool}
            onAddActivity={handleAddActivity}
            onClaimReward={claimChallengeReward}
          />
        )}
        {tab === 'pokedex' && (
          <PokedexView caughtPokemon={state.caughtPokemon ?? []} />
        )}
        {tab === 'trainer' && (
          <TrainerView
            state={state}
            onReset={resetGame}
            onDecayRateChange={setDecayRate}
            onClaimReward={claimChallengeReward}
          />
        )}
      </main>

      <BottomNav current={tab} onChange={setTab} hasPoolDp={hasPoolDp} />
    </div>
  );
}
