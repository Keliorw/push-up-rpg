import React, {useState} from 'react';
import {
  Image,
  LayoutChangeEvent,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {MAP_IMAGE} from '../assets/cardImages';
import {LOCATIONS, NODE_POSITIONS} from '../game/monsters';
import {Progression, currentMonster} from '../game/progression';

function currentLocationIndex(p: Progression): number | null {
  const m = currentMonster(p);
  if (!m) {
    return null;
  }
  const match = /^loc(\d+)-/.exec(m.id);
  return match ? Number(match[1]) : null;
}

export function MapScreen({
  progression,
  onSelect,
}: {
  progression: Progression;
  onSelect: () => void;
}) {
  const [size, setSize] = useState({w: 0, h: 0});
  const onLayout = (e: LayoutChangeEvent) => {
    const {width, height} = e.nativeEvent.layout;
    setSize({w: width, h: height});
  };
  const curLoc = currentLocationIndex(progression);

  return (
    <View style={styles.root}>
      <View style={styles.wrap} onLayout={onLayout}>
        <Image source={MAP_IMAGE} style={styles.map} resizeMode="cover" />
        {size.w > 0 &&
          NODE_POSITIONS.map((pos, i) => {
            const locIndex = i + 1;
            const hasContent = locIndex <= LOCATIONS.length;
            let state: 'done' | 'current' | 'locked' = 'locked';
            if (curLoc === null) {
              state = hasContent ? 'done' : 'locked';
            } else if (locIndex < curLoc) {
              state = 'done';
            } else if (locIndex === curLoc && hasContent) {
              state = 'current';
            }
            const left = pos.x * size.w - 18;
            const top = pos.y * size.h - 18;
            const marker = (
              <View
                style={[
                  styles.node,
                  state === 'done' && styles.nodeDone,
                  state === 'current' && styles.nodeCurrent,
                  state === 'locked' && styles.nodeLocked,
                ]}>
                <Text style={styles.nodeText}>{locIndex}</Text>
              </View>
            );
            if (state === 'current') {
              return (
                <Pressable
                  key={locIndex}
                  onPress={onSelect}
                  style={[styles.nodeWrap, {left, top}]}>
                  {marker}
                </Pressable>
              );
            }
            return (
              <View key={locIndex} style={[styles.nodeWrap, {left, top}]}>
                {marker}
              </View>
            );
          })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {flex: 1, backgroundColor: '#101828'},
  wrap: {flex: 1, width: '100%'},
  map: {width: '100%', height: '100%'},
  nodeWrap: {position: 'absolute', width: 36, height: 36},
  node: {
    width: 36, height: 36, borderRadius: 18, borderWidth: 3, borderColor: '#fff',
    backgroundColor: 'rgba(0,0,0,0.55)', alignItems: 'center', justifyContent: 'center',
  },
  nodeDone: {backgroundColor: '#2e7d32'},
  nodeCurrent: {borderColor: '#F5A623'},
  nodeLocked: {opacity: 0.55},
  nodeText: {color: '#fff', fontWeight: '800', fontSize: 16},
});
