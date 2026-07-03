import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import {StartScreen} from '../src/screens/StartScreen';

test('кнопка START вызывает onStart', () => {
  const onStart = jest.fn();
  let tree!: ReactTestRenderer.ReactTestRenderer;
  ReactTestRenderer.act(() => {
    tree = ReactTestRenderer.create(<StartScreen onStart={onStart} />);
  });
  const button = tree.root.findAllByProps({accessibilityRole: 'button'})[0];
  ReactTestRenderer.act(() => {
    button.props.onPress();
  });
  expect(onStart).toHaveBeenCalledTimes(1);
});
