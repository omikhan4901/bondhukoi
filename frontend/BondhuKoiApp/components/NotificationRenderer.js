import React from 'react';
import { TouchableOpacity } from 'react-native';
import { YStack, XStack } from 'tamagui';
import { UserPlus, Bell, Users } from '@tamagui/lucide-icons-2';
import { NotificationItem } from './cards/NotificationItem.js';
import { WatchAlertItem } from './cards/WatchAlertItem.js';
import { BodyText } from './SanctuaryComponents.js';

/**
 * NotificationRenderer - Adapter component that renders different notification types
 * Centralizes notification display logic in a reusable renderer
 * 
 * Supports:
 * - friend_request: UserPlus icon with action button
 * - watch_request: Bell icon with action button
 * - watch_alert: WatchAlertItem (high-priority styling)
 * - circle_invite: Users icon with action button
 * - general: Bell icon (fallback)
 */
export default function NotificationRenderer({ 
  notification, 
  onAction,
}) {
  const {
    type,
    title,
    subtitle,
    icon,
    time,
    action,
    relatedId,
    relatedUserId,
    relatedCircleId,
  } = notification;

  // Convert ISO time string to readable format
  const formatTime = (timeStr) => {
    const date = new Date(timeStr);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    
    return date.toLocaleDateString();
  };

  // Map icon names to Lucide components
  const getIconComponent = (iconName) => {
    const iconMap = {
      UserPlus: UserPlus,
      Bell: Bell,
      Users: Users,
    };
    return iconMap[iconName] || Bell;
  };

  // Special handling for watch alerts (use WatchAlertItem for high-priority display)
  if (type === 'watch_alert') {
    return (
      <WatchAlertItem
        friendName={notification.relatedUserName}
        avatarUrl={notification.relatedUserAvatar}
        avatarId={notification.relatedUserId}
        action={title}
        time={formatTime(time)}
        scope="campus"
      />
    );
  }

  // Render standard notification with optional action button
  const IconComponent = getIconComponent(icon);
  const hasAction = action && onAction;
  
  return (
    <YStack>
      <NotificationItem
        Icon={IconComponent}
        avatarUrl={notification.relatedUserAvatar}
        avatarName={notification.relatedUserName}
        avatarId={notification.relatedUserId}
        title={title}
        subtitle={subtitle}
        time={formatTime(time)}
        variant="blue"
      />
      {hasAction && (
        <XStack px={20} pb={16} gap={12}>
          <TouchableOpacity 
            onPress={() => onAction(type, action, relatedId, relatedUserId, relatedCircleId)}
            style={{ flex: 1 }}
            activeOpacity={0.7}
          >
            <YStack 
              f={1}
              bg="$primary" 
              py={12} 
              px={16} 
              borderRadius={12} 
              ai="center" 
              jc="center"
            >
              <BodyText fontWeight="600" color="white" fontSize={14}>
                Accept
              </BodyText>
            </YStack>
          </TouchableOpacity>
          <TouchableOpacity 
            onPress={() => {
              // Dismiss notification
              if (onAction) {
                onAction(type, 'dismiss', relatedId, relatedUserId, relatedCircleId);
              }
            }}
            style={{ flex: 1 }}
            activeOpacity={0.7}
          >
            <YStack 
              f={1}
              bg="$surfaceContainerHigh" 
              py={12} 
              px={16} 
              borderRadius={12} 
              ai="center" 
              jc="center"
            >
              <BodyText fontWeight="600" color="$onSurface" fontSize={14}>
                Dismiss
              </BodyText>
            </YStack>
          </TouchableOpacity>
        </XStack>
      )}
    </YStack>
  );
}
