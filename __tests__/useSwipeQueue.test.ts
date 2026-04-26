import { renderHook, act, waitFor } from '@testing-library/react-native';
import { useSwipeQueue } from '@/hooks/useSwipeQueue';

const mockInsert = jest.fn().mockResolvedValue({ error: null });
const mockUpdate = jest.fn().mockResolvedValue({ error: null });
const mockSingle = jest.fn().mockResolvedValue({ data: null, error: null });
const mockRpc = jest.fn().mockResolvedValue({ data: null, error: null });

const mockFrom = jest.fn((table: string) => ({
  select: jest.fn().mockReturnThis(),
  eq: jest.fn().mockReturnThis(),
  neq: jest.fn().mockReturnThis(),
  not: jest.fn().mockReturnThis(),
  in: jest.fn().mockReturnThis(),
  gte: jest.fn().mockReturnThis(),
  lte: jest.fn().mockReturnThis(),
  limit: jest.fn().mockResolvedValue({ data: [], error: null }),
  insert: jest.fn().mockReturnThis(),
  update: jest.fn().mockReturnThis(),
  single: mockSingle,
  then: undefined,
}));

jest.mock('@/utils/supabase', () => ({
  supabase: {
    from: (...args: any[]) => mockFrom(...args),
    rpc: (...args: any[]) => mockRpc(...args),
  },
}));

jest.mock('@/app/_layout', () => ({
  useAuth: () => ({
    session: { user: { id: 'user-abc' } },
  }),
}));

const makeProfile = (id: string) => ({
  id,
  name: 'Test',
  date_of_birth: '2000-01-01',
  bio: null,
  location_city: null,
  gender: 'female',
  destination: null,
  hobbies: null,
  relationship_type: null,
  profile_photos: [
    { id: 'photo-1', profile_id: id, url: 'http://x.com/a.jpg',
      display_order: 0, impressions: 0, swipe_left: 0, swipe_right: 0 },
  ],
});

beforeEach(() => {
  jest.clearAllMocks();
});

describe('useSwipeQueue', () => {
  it('starts loading then shows first profile', async () => {
    mockFrom.mockImplementation((table) => {
      const base = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        neq: jest.fn().mockReturnThis(),
        not: jest.fn().mockReturnThis(),
        in: jest.fn().mockReturnThis(),
        gte: jest.fn().mockReturnThis(),
        lte: jest.fn().mockReturnThis(),
      };
      if (table === 'swipes') {
        return { ...base, limit: jest.fn().mockResolvedValue({ data: [], error: null }) };
      }
      if (table === 'user_settings') {
        return {
          ...base,
          single: jest.fn().mockResolvedValue({
            data: { preferred_genders: [], preferred_age_min: 18, preferred_age_max: 99 },
            error: null,
          }),
        };
      }
      if (table === 'profiles') {
        return {
          ...base,
          limit: jest.fn().mockResolvedValue({
            data: [makeProfile('p-1'), makeProfile('p-2')],
            error: null,
          }),
        };
      }
      return { ...base, limit: jest.fn().mockResolvedValue({ data: [], error: null }) };
    });

    const { result } = renderHook(() => useSwipeQueue());
    expect(result.current.isLoading).toBe(true);
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.currentProfile?.id).toBe('p-1');
    expect(result.current.isEmpty).toBe(false);
  });

  it('recordSwipe left advances the queue and inserts a left swipe', async () => {
    const insertMock = jest.fn().mockResolvedValue({ error: null });
    const updateMock = jest.fn().mockReturnValue({
      eq: jest.fn().mockResolvedValue({ error: null }),
    });

    mockFrom.mockImplementation((table) => {
      const base = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        neq: jest.fn().mockReturnThis(),
        not: jest.fn().mockReturnThis(),
        in: jest.fn().mockReturnThis(),
        gte: jest.fn().mockReturnThis(),
        lte: jest.fn().mockReturnThis(),
      };
      if (table === 'user_settings') {
        return {
          ...base,
          single: jest.fn().mockResolvedValue({
            data: { preferred_genders: [], preferred_age_min: 18, preferred_age_max: 99 },
            error: null,
          }),
        };
      }
      if (table === 'profiles') {
        return {
          ...base,
          limit: jest.fn().mockResolvedValue({
            data: [makeProfile('p-1'), makeProfile('p-2')],
            error: null,
          }),
        };
      }
      if (table === 'swipes') {
        return {
          ...base,
          insert: insertMock,
          limit: jest.fn().mockResolvedValue({ data: [], error: null }),
        };
      }
      if (table === 'profile_photos') {
        return { ...base, update: updateMock };
      }
      return { ...base, limit: jest.fn().mockResolvedValue({ data: [], error: null }) };
    });

    const { result } = renderHook(() => useSwipeQueue());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await result.current.recordSwipe('left');
    });

    expect(result.current.currentProfile?.id).toBe('p-2');
    expect(insertMock).toHaveBeenCalledWith(
      expect.objectContaining({ swiper_id: 'user-abc', swiped_id: 'p-1', direction: 'left' })
    );
    expect(updateMock).toHaveBeenCalled();
  });

  it('recordSwipe right sets matchedProfile when rpc returns a match id', async () => {
    const insertSwipeMock = jest.fn().mockResolvedValue({ error: null });
    mockRpc.mockResolvedValue({ data: 'match-uuid-123', error: null });

    mockFrom.mockImplementation((table) => {
      const base = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        neq: jest.fn().mockReturnThis(),
        not: jest.fn().mockReturnThis(),
        in: jest.fn().mockReturnThis(),
        gte: jest.fn().mockReturnThis(),
        lte: jest.fn().mockReturnThis(),
      };
      if (table === 'user_settings') {
        return {
          ...base,
          single: jest.fn().mockResolvedValue({
            data: { preferred_genders: [], preferred_age_min: 18, preferred_age_max: 99 },
            error: null,
          }),
        };
      }
      if (table === 'profiles') {
        return {
          ...base,
          limit: jest.fn().mockResolvedValue({
            data: [makeProfile('p-1')],
            error: null,
          }),
        };
      }
      if (table === 'swipes') {
        return { ...base, insert: insertSwipeMock, limit: jest.fn().mockResolvedValue({ data: [], error: null }) };
      }
      if (table === 'profile_photos') {
        return { ...base, update: jest.fn().mockReturnValue({ eq: jest.fn().mockResolvedValue({ error: null }) }) };
      }
      return { ...base, limit: jest.fn().mockResolvedValue({ data: [], error: null }) };
    });

    const { result } = renderHook(() => useSwipeQueue());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await result.current.recordSwipe('right');
    });

    expect(result.current.matchedProfile).not.toBeNull();
    expect(mockRpc).toHaveBeenCalledWith('check_and_create_match', { p_swiped_id: 'p-1' });
  });

  it('clearMatch resets matchedProfile', async () => {
    mockFrom.mockImplementation(() => ({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      neq: jest.fn().mockReturnThis(),
      not: jest.fn().mockReturnThis(),
      in: jest.fn().mockReturnThis(),
      gte: jest.fn().mockReturnThis(),
      lte: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: null, error: null }),
      limit: jest.fn().mockResolvedValue({ data: [], error: null }),
      insert: jest.fn().mockResolvedValue({ error: null }),
      update: jest.fn().mockResolvedValue({ error: null }),
    }));

    const { result } = renderHook(() => useSwipeQueue());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    act(() => result.current.clearMatch());
    expect(result.current.matchedProfile).toBeNull();
  });
});
