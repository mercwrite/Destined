import { StyleSheet, View } from 'react-native';
import SwipeCard, { SwipeCardRef } from '@/components/SwipeCard';
import type { ProfileCardData } from '@/components/ProfileCard';

type Props = {
  profiles: ProfileCardData[];
  onSwipe: (direction: 'left' | 'right') => void;
  cardRef: React.RefObject<SwipeCardRef | null>;
};

export default function SwipeStack({ profiles, onSwipe, cardRef }: Props) {
  const displayed = profiles.slice(0, 3);

  return (
    <View style={styles.container}>
      {[...displayed].reverse().map((profile, reversedIndex) => {
        const stackIndex = displayed.length - 1 - reversedIndex;
        const isTop = stackIndex === 0;
        return (
          <SwipeCard
            key={profile.id}
            ref={isTop ? cardRef : undefined}
            profile={profile}
            onSwipe={onSwipe}
            isTop={isTop}
            stackIndex={stackIndex}
          />
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    position: 'relative',
  },
});
