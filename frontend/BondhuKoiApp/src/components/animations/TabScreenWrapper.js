import React from 'react';
import { MotiView } from 'moti';
import { useIsFocused } from '@react-navigation/native';
import { Dimensions } from 'react-native';

const { width } = Dimensions.get('window');

/**
 * TabScreenWrapper
 * Provides a smooth fade + horizontal slide animation when a tab screen is focused.
 */
export const TabScreenWrapper = ({ children, index = 0 }) => {
  const isFocused = useIsFocused();

  // Simple heuristic: if we have an index, we can slide from left or right.
  // For now, let's just do a clean fade + subtle scale/slide up for a premium feel.
  
  return (
    <MotiView
      from={{
        opacity: 0,
        scale: 0.98,
        translateY: 10,
      }}
      animate={{
        opacity: isFocused ? 1 : 0,
        scale: isFocused ? 1 : 0.98,
        translateY: isFocused ? 0 : 10,
      }}
      transition={{
        type: 'timing',
        duration: 400,
      }}
      style={{ flex: 1 }}
    >
      {children}
    </MotiView>
  );
};
