import React from 'react';
import {Image, Pressable, StyleSheet, Text, View} from 'react-native';
import {cardImageSource} from '../assets/cardImages';
import {Progression, currentMonster} from '../game/progression';
import {totalTarget} from '../game/workout';

export function CardScreen({
  progression,
  onStart,
  onBack,
}: {
  progression: Progression;
  onStart: () => void;
  onBack: () => void;
}) {
  const m = currentMonster(progression);

  if (!m) {
    return (
      <View style={styles.root}>
        <Text style={styles.target}>Все враги повержены!</Text>
        <Pressable style={styles.btnDark} onPress={onBack}>
          <Text style={styles.btnText}>Назад</Text>
        </Pressable>
      </View>
    );
  }

  const src = cardImageSource(m.cardImage);
  const target =
    m.kind === 'boss'
      ? `БОСС: ${m.sets} подхода × ${m.repsPerSet} (всего ${totalTarget(m)})`
      : `Победи: ${m.repsPerSet} отжиманий`;

  return (
    <View style={styles.root}>
      {src ? <Image source={src} style={styles.card} resizeMode="contain" /> : null}
      <Text style={styles.target}>{target}</Text>
      <View style={styles.hpbar}>
        <View style={styles.hpfill} />
      </View>
      <Pressable style={styles.btn} onPress={onStart}>
        <Text style={styles.btnTextDark}>Начать тренировку</Text>
      </Pressable>
      <Pressable style={styles.btnDark} onPress={onBack}>
        <Text style={styles.btnText}>Назад</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {flex: 1, backgroundColor: '#101828', alignItems: 'center', justifyContent: 'center', padding: 16, gap: 12},
  card: {width: '92%', aspectRatio: 1, borderRadius: 12},
  target: {color: '#fff', fontSize: 18, textAlign: 'center'},
  hpbar: {width: '80%', height: 16, backgroundColor: '#333', borderRadius: 8, overflow: 'hidden'},
  hpfill: {width: '100%', height: '100%', backgroundColor: '#d64545'},
  btn: {backgroundColor: '#F5A623', paddingHorizontal: 40, paddingVertical: 16, borderRadius: 40},
  btnDark: {backgroundColor: '#24314a', paddingHorizontal: 40, paddingVertical: 12, borderRadius: 40},
  btnText: {color: '#fff', fontWeight: '800', fontSize: 16},
  btnTextDark: {color: '#101828', fontWeight: '800', fontSize: 18},
});
