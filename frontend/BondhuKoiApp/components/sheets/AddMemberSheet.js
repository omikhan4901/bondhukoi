import React, { useState, useEffect, useCallback } from 'react';
import { TouchableOpacity, ActivityIndicator } from 'react-native';
import { YStack, XStack, Input, useTheme } from 'tamagui';
import { Search, UserPlus, Check } from '@tamagui/lucide-icons-2';
import { BodyText } from '../SanctuaryComponents';
import { BottomSheetModal } from '../modals/BottomSheetModal';
import { ConfirmModal } from '../modals/ConfirmModal';
import { userService, circleService, friendService } from '../../src/services/api';

/**
 * AddMemberSheet — real user search and add to circle
 * @param {string} circleId - the circle to add to
 * @param {function} onAdded - called with the added user object
 */
export const AddMemberSheet = ({ visible, onClose, circleId, onAdded }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [added, setAdded] = useState({});
  const [isSearching, setIsSearching] = useState(false);
  const [addingId, setAddingId] = useState(null);
  const [friends, setFriends] = useState([]);
  const [isLoadingFriends, setIsLoadingFriends] = useState(false);
  const [errorOpen, setErrorOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const theme = useTheme();

  // Debounced search
  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        setIsSearching(true);
        const data = await userService.searchUsers(query.trim());
        setResults(data.results || []);
      } catch (err) {
        console.error('Search failed:', err);
        setResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [query]);

  // Reset on close & Load friends
  useEffect(() => {
    if (!visible) {
      setQuery('');
      setResults([]);
      setAdded({});
      setAddingId(null);
    } else {
      loadFriends();
    }
  }, [visible]);

  const loadFriends = async () => {
    try {
      setIsLoadingFriends(true);
      const data = await friendService.getFriendsList();
      setFriends(data.friends || []);
    } catch (err) {
      console.error('Failed to load friends:', err);
    } finally {
      setIsLoadingFriends(false);
    }
  };

  const handleAdd = async (user) => {
    if (added[user.id] || addingId === user.id) return;
    setAddingId(user.id);
    try {
      await circleService.addMember(circleId, user.id);
      setAdded((prev) => ({ ...prev, [user.id]: true }));
      onAdded?.(user);
    } catch (err) {
      console.error('Failed to add member:', err);
      setErrorMessage(err.message || "Something went wrong while adding this member.");
      setErrorOpen(true);
    } finally {
      setAddingId(null);
    }
  };

  const renderUserRow = (user) => (
    <XStack key={user.id} ai="center" jc="space-between" py={12}
      borderBottomWidth={1} borderBottomColor="$outlineVariant">
      <YStack f={1} mr={12}>
        <BodyText fontWeight="700">{user.name}</BodyText>
        <BodyText fontSize={13} color="$onSurfaceVariant">
          {user.university || user.email}
          {user.friend_code ? ` • ${user.friend_code}` : ''}
        </BodyText>
      </YStack>
      <TouchableOpacity
        onPress={() => handleAdd(user)}
        activeOpacity={0.8}
        disabled={!!added[user.id] || addingId === user.id}
      >
        <XStack
          bg={added[user.id] ? '$tertiary' : '$primary'}
          opacity={0.15}
          px={14} py={8} borderRadius={999} ai="center" gap={6}
          pos="absolute" top={0} left={0} right={0} bottom={0}
        />
        <XStack px={14} py={8} borderRadius={999} ai="center" gap={6}>
          {addingId === user.id ? (
            <ActivityIndicator color="$primary" size="small" />
          ) : added[user.id] ? (
            <Check color="$tertiary" size={16} />
          ) : (
            <UserPlus color="$primary" size={16} />
          )}
          <BodyText fontSize={13} fontWeight="700" color={added[user.id] ? '$tertiary' : '$primary'}>
            {added[user.id] ? 'Added' : 'Add'}
          </BodyText>
        </XStack>
      </TouchableOpacity>
    </XStack>
  );

  return (
    <BottomSheetModal visible={visible} onClose={onClose} title="Add Member">
      <XStack
        bg="$surfaceContainerLow"
        borderRadius={16}
        px={16}
        mb={20}
        ai="center"
        borderWidth={1}
        borderColor="$outlineVariant"
      >
        {isSearching ? (
          <ActivityIndicator color="#47A1FF" size="small" style={{ marginRight: 12 }} />
        ) : (
          <Search color="$onSurfaceVariant" size={20} style={{ marginRight: 12 }} />
        )}
        <Input
          unstyled
          placeholder="Search by name, email, or friend code..."
          placeholderTextColor="$onSurfaceVariant"
          value={query}
          onChangeText={setQuery}
          autoCapitalize="none"
          color={theme.onSurface.get()}
          fontSize={16}
          f={1}
          py={16}
        />
      </XStack>

      {/* Friend Suggestions */}
      {query.trim() === '' && (
        <YStack gap={4}>
          <BodyText fontWeight="700" fontSize={13} color="$onSurfaceVariant" mb={8} textTransform="uppercase" letterSpacing={1}>
            Suggested Friends
          </BodyText>
          {isLoadingFriends ? (
            <ActivityIndicator color="#47A1FF" py={20} />
          ) : friends.length === 0 ? (
            <BodyText color="$onSurfaceVariant" fontSize={14} py={10}>No friends found.</BodyText>
          ) : (
            friends.map((user) => renderUserRow(user))
          )}
          <YStack h={1} bg="$outlineVariant" my={16} />
          <BodyText fontWeight="700" fontSize={13} color="$onSurfaceVariant" mb={8} textTransform="uppercase" letterSpacing={1}>
            Search Global
          </BodyText>
        </YStack>
      )}

      {results.length === 0 && query.trim() && !isSearching && (
        <YStack ai="center" py={20}>
          <BodyText color="$onSurfaceVariant" fontSize={14}>No users found for "{query}"</BodyText>
        </YStack>
      )}

      {results.map((user) => renderUserRow(user))}

      <ConfirmModal
        visible={errorOpen}
        onClose={() => setErrorOpen(false)}
        onConfirm={() => setErrorOpen(false)}
        title="Unable to Add"
        message={errorMessage}
        confirmLabel="Got it"
        confirmVariant="blue"
      />
    </BottomSheetModal>
  );
};
