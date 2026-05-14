import React from 'react';
import { TouchableOpacity } from 'react-native';
import { XStack } from 'tamagui';
import { Heading, BodyText } from '../SanctuaryComponents';

/**
 * SectionHeader — section title with optional right-side action
 * @param {string} title - section heading text
 * @param {string} actionLabel - optional right action label
 * @param {function} onAction - handler for the right action
 * @param {number} mb - margin bottom (default 16)
 */
export const SectionHeader = ({ title, actionLabel, onAction, mb = 16 }) => (
  <XStack ai="center" jc="space-between" mb={mb}>
    <Heading fontSize={18}>{title}</Heading>
    {actionLabel && (
      <TouchableOpacity onPress={onAction} activeOpacity={0.7}>
        <BodyText color="#47A1FF" fontWeight="700" fontSize={14}>
          {actionLabel}
        </BodyText>
      </TouchableOpacity>
    )}
  </XStack>
);
