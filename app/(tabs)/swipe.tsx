import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useAuth } from '@/app/_layout';
import { supabase } from '@/utils/supabase';
import { useSwipeQueue } from '@/hooks/useSwipeQueue';
import SwipeStack from '@/components/SwipeStack';
import MatchModal from '@/components/MatchModal';
import type { SwipeCardRef } from '@/components/SwipeCard';
import type { ProfileCardData } from '@/components/ProfileCard';

export default function SwipeScreen() {
  const { session } = useAuth();
  const {
    currentProfile,
    nextProfiles,
    isLoading,
    isEmpty,
    error,
    matchedProfile,
    recordSwipe,
    clearMatch,
    retry,
  } = useSwipeQueue();

  const topCardRef = useRef<SwipeCardRef | null>(null);
  const [currentUserProfile, setCurrentUserProfile] = useState<ProfileCardData | null>(null);

  useEffect(() => {
    const userId = session?.user?.id;
    if (!userId) return;
    supabase
      .from('profiles')
      .select(
        'id, name, date_of_birth, bio, location_city, gender, destination, hobbies, relationship_type, profile_photos (id, profile_id, url, display_order, impressions, swipe_left, swipe_right)'
      )
      .eq('id', userId)
      .single()
      .then(({ data }) => {
        if (data) {
          const photos = ((data as any).profile_photos ?? [])
            .slice()
            .sort((a: any, b: any) => a.display_order - b.display_order);
          setCurrentUserProfile({ ...(data as any), photos });
        }
      });
  }, [session?.user?.id]);

  const handleSwipe = useCallback(
    async (direction: 'left' | 'right') => {
      await Haptics.impactAsync(
        direction === 'right'
          ? Haptics.ImpactFeedbackStyle.Medium
          : Haptics.ImpactFeedbackStyle.Light
      );
      await recordSwipe(direction);
    },
    [recordSwipe]
  );

  function handleButtonSwipe(direction: 'left' | 'right') {
    if (direction === 'left') {
      topCardRef.current?.swipeLeft();
    } else {
      topCardRef.current?.swipeRight();
    }
  }

  const allProfiles = currentProfile ? [currentProfile, ...nextProfiles] : [];

  return (
    <GestureHandlerRootView style={styles.root}>
      {isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#4291db" />
        </View>
      ) : error ? (
        <View style={styles.centered}>
          <Ionicons name="cloud-offline-outline" size={52} color="#9E9E9E" />
          <Text style={styles.emptyTitle}>Something went wrong</Text>
          <Text style={styles.emptySubtitle}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={retry}>
            <Text style={styles.retryText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      ) : isEmpty ? (
        <View style={styles.centered}>
          <Ionicons name="people-outline" size={52} color="#9E9E9E" />
          <Text style={styles.emptyTitle}>You've seen everyone nearby</Text>
          <Text style={styles.emptySubtitle}>Check back later for new profiles</Text>
          <TouchableOpacity style={styles.retryButton} onPress={retry}>
            <Text style={styles.retryText}>Refresh</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          <View style={styles.stackArea}>
            <SwipeStack
              profiles={allProfiles}
              onSwipe={handleSwipe}
              cardRef={topCardRef}
            />
          </View>

          <View style={styles.actionRow}>
            <TouchableOpacity
              style={[styles.actionButton, styles.rejectButton]}
              onPress={() => handleButtonSwipe('left')}
              activeOpacity={0.8}
            >
              <Ionicons name="close" size={32} color="#FF4458" />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionButton, styles.likeButton]}
              onPress={() => handleButtonSwipe('right')}
              activeOpacity={0.8}
            >
              <Ionicons name="heart" size={28} color="#4291db" />
            </TouchableOpacity>
          </View>

          {matchedProfile && (
            <MatchModal
              matchedProfile={matchedProfile}
              currentUserProfile={currentUserProfile}
              onKeepSwiping={clearMatch}
            />
          )}
        </>
      )}
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#FAFAFA',
  },
  stackArea: {
    flex: 1,
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 8,
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 40,
    paddingVertical: 20,
    paddingBottom: 32,
  },
  actionButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 4,
  },
  rejectButton: {
    borderWidth: 1.5,
    borderColor: '#FF4458',
  },
  likeButton: {
    borderWidth: 1.5,
    borderColor: '#4291db',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#FAFAFA',
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1A1A1A',
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#9E9E9E',
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 8,
    backgroundColor: '#4291db',
    borderRadius: 12,
    paddingHorizontal: 28,
    paddingVertical: 12,
  },
  retryText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 15,
  },
});
