import {
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
} from 'https://www.gstatic.com/firebasejs/12.15.0/firebase-firestore.js';
import {db} from './firebase';
import type {Progression} from '../../app/src/game/progression';

export async function loadRemote(uid: string): Promise<Progression | null> {
  const snap = await getDoc(doc(db, 'users', uid));
  if (!snap.exists()) return null;
  const d = snap.data();
  return {
    defeatedCount: typeof d.defeatedCount === 'number' ? d.defeatedCount : 0,
    lastWorkoutDate: typeof d.lastWorkoutDate === 'string' ? d.lastWorkoutDate : null,
  };
}

export async function saveRemote(
  uid: string,
  p: Progression,
  nickname: string,
): Promise<void> {
  await setDoc(
    doc(db, 'users', uid),
    {
      nickname,
      defeatedCount: p.defeatedCount,
      lastWorkoutDate: p.lastWorkoutDate,
      updatedAt: serverTimestamp(),
    },
    {merge: true},
  );
}
