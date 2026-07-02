import {useCallback, useRef, useState} from 'react';
import SoundPlayer from 'react-native-sound-player';
import {RepDetector} from '../pose/RepDetector';
import {Pose} from '../pose/types';
import {applyEvent, INITIAL_SESSION, SessionState} from './sessionState';

const BEEP = require('../assets/beep.wav');

export function useWorkoutSession() {
  const [session, setSession] = useState<SessionState>(INITIAL_SESSION);
  const detectorRef = useRef<RepDetector | null>(null);
  if (detectorRef.current === null) {
    detectorRef.current = new RepDetector();
  }

  const onPose = useCallback((pose: Pose) => {
    const events = detectorRef.current!.process(pose, Date.now());
    if (events.length === 0) {
      return;
    }
    setSession(s => events.reduce(applyEvent, s));
    if (events.includes('repCounted')) {
      try {
        SoundPlayer.playAsset(BEEP);
      } catch {
        // звук не критичен — счёт важнее
      }
    }
  }, []);

  return {reps: session.reps, inPosition: session.inPosition, onPose};
}
