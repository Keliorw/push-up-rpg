import React, {useState} from 'react';
import {StatusBar} from 'react-native';
import {StartScreen} from './src/screens/StartScreen';
import {WorkoutScreen} from './src/screens/WorkoutScreen';

export default function App() {
  const [screen, setScreen] = useState<'start' | 'workout'>('start');
  return (
    <>
      <StatusBar barStyle="light-content" />
      {screen === 'start' ? (
        <StartScreen onStart={() => setScreen('workout')} />
      ) : (
        <WorkoutScreen onExit={() => setScreen('start')} />
      )}
    </>
  );
}
