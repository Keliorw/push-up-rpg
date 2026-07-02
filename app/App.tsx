import React, {useEffect, useState} from 'react';
import {StatusBar} from 'react-native';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import {StartScreen} from './src/screens/StartScreen';
import {MapScreen} from './src/screens/MapScreen';
import {CardScreen} from './src/screens/CardScreen';
import {WorkoutScreen} from './src/screens/WorkoutScreen';
import {VictoryScreen} from './src/screens/VictoryScreen';
import {
  currentMonster,
  defeatMonster,
  INITIAL_PROGRESSION,
  Progression,
} from './src/game/progression';
import {loadProgression, saveProgression} from './src/storage/progressionStore';
import {playVictory} from './src/sound';

type Screen = 'start' | 'map' | 'card' | 'battle' | 'victory';

export default function App() {
  const [screen, setScreen] = useState<Screen>('start');
  const [progression, setProgression] = useState<Progression>(INITIAL_PROGRESSION);
  const [defeatedName, setDefeatedName] = useState('');

  useEffect(() => {
    loadProgression().then(setProgression);
  }, []);

  const onDefeated = () => {
    setProgression(prev => {
      const m = currentMonster(prev);
      setDefeatedName(m ? m.name : '');
      const next = defeatMonster(prev, new Date().toISOString().slice(0, 10));
      saveProgression(next);
      return next;
    });
    playVictory();
    setScreen('victory');
  };

  return (
    <SafeAreaProvider>
      <StatusBar barStyle="light-content" />
      {screen === 'start' && <StartScreen onStart={() => setScreen('map')} />}
      {screen === 'map' && (
        <MapScreen progression={progression} onSelect={() => setScreen('card')} />
      )}
      {screen === 'card' && (
        <CardScreen
          progression={progression}
          onStart={() => setScreen('battle')}
          onBack={() => setScreen('map')}
        />
      )}
      {screen === 'battle' && (
        <WorkoutScreen
          progression={progression}
          onDefeated={onDefeated}
          onExit={() => setScreen('map')}
        />
      )}
      {screen === 'victory' && (
        <VictoryScreen name={defeatedName} onContinue={() => setScreen('map')} />
      )}
    </SafeAreaProvider>
  );
}
