import {DetectorEvent} from '../pose/RepDetector';

export interface SessionState {
  reps: number;
  inPosition: boolean;
}

export const INITIAL_SESSION: SessionState = {reps: 0, inPosition: false};

export function applyEvent(s: SessionState, e: DetectorEvent): SessionState {
  switch (e) {
    case 'repCounted':
      return {...s, reps: s.reps + 1};
    case 'positionAcquired':
      return {...s, inPosition: true};
    case 'positionLost':
      return {...s, inPosition: false};
  }
}
