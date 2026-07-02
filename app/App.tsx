import React, {useEffect, useState} from 'react';
import {StatusBar} from 'react-native';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import {StartScreen} from './src/screens/StartScreen';
import {MapScreen} from './src/screens/MapScreen';
import {CardScreen} from './src/screens/CardScreen';
import {WorkoutScreen} from './src/screens/WorkoutScreen';
import {VictoryScreen} from './src/screens/VictoryScreen';
import {INITIAL_PROGRESSION, Progression} from './src/game/progression';
import {loadProgression} from './src/storage/progressionStore';

type Screen = 'start' | 'map' | 'card' | 'battle' | 'victory';

export default function App() {
  const [screen, setScreen] = useState<Screen>('start');
  const [progression, setProgression] = useState<Progression>(INITIAL_PROGRESSION);
  const [defeatedName] = useState('');

  useEffect(() => {
    loadProgression().then(setProgression);
  }, []);

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
      {screen === 'battle' && <WorkoutScreen onExit={() => setScreen('map')} />}
      {screen === 'victory' && (
        <VictoryScreen name={defeatedName} onContinue={() => setScreen('map')} />
      )}
    </SafeAreaProvider>
  );
}
