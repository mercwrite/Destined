import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import MatchModal from '@/components/MatchModal';

const makeProfile = (id: string, name: string) => ({
  id,
  name,
  date_of_birth: '2000-01-01',
  bio: null,
  location_city: null,
  gender: null,
  destination: null,
  hobbies: null,
  relationship_type: null,
  photos: [],
});

jest.mock('expo-router', () => ({ useRouter: () => ({ push: jest.fn() }) }));
jest.mock('react-native-reanimated', () => {
  const Reanimated = require('react-native-reanimated/mock');
  Reanimated.default.call = () => {};
  return Reanimated;
});

describe('MatchModal', () => {
  it('renders match heading and matched user name', () => {
    render(
      <MatchModal
        matchedProfile={makeProfile('p-2', 'Sarah')}
        currentUserProfile={makeProfile('p-1', 'Alex')}
        onKeepSwiping={jest.fn()}
      />
    );
    expect(screen.getByText("It's a Match!")).toBeTruthy();
    expect(screen.getByText('You and Sarah liked each other')).toBeTruthy();
  });

  it('calls onKeepSwiping when Keep Swiping is pressed', () => {
    const onKeepSwiping = jest.fn();
    render(
      <MatchModal
        matchedProfile={makeProfile('p-2', 'Sarah')}
        currentUserProfile={makeProfile('p-1', 'Alex')}
        onKeepSwiping={onKeepSwiping}
      />
    );
    fireEvent.press(screen.getByText('Keep Swiping'));
    expect(onKeepSwiping).toHaveBeenCalledTimes(1);
  });
});
