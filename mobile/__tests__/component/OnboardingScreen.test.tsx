/**
 * Run with jest-expo only.
 */
import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { NavigationContainer, CommonActions } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Text } from 'react-native';
import { OnboardingScreen } from '../../src/screens/OnboardingScreen';
import { readPreferences, resetOnboarding } from '../../src/onboarding/preferences';

const Stack = createNativeStackNavigator();

function TestHost() {
  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName="Onboarding">
        <Stack.Screen name="Onboarding" component={OnboardingScreen} />
        <Stack.Screen name="FigureDetail">{() => <Text testID="detail">Detail</Text>}</Stack.Screen>
      </Stack.Navigator>
    </NavigationContainer>
  );
}

beforeEach(async () => {
  await resetOnboarding();
});

describe('OnboardingScreen', () => {
  it('renders the first slide title + Next button + Skip', () => {
    const { getByText, getByLabelText } = render(<TestHost />);
    expect(getByText('Hunt like a collector')).toBeTruthy();
    expect(getByLabelText('Next')).toBeTruthy();
    expect(getByLabelText('Skip onboarding')).toBeTruthy();
  });

  it('Skip marks onboarding complete and navigates to FigureDetail', async () => {
    const { getByLabelText, findByTestId } = render(<TestHost />);
    fireEvent.press(getByLabelText('Skip onboarding'));
    await findByTestId('detail');
    const prefs = await readPreferences();
    expect(prefs.onboardingCompletedAt).not.toBeNull();
  });

  it('Next advances through all three slides, ending with a Get started CTA', () => {
    const { getByLabelText, getByText } = render(<TestHost />);
    fireEvent.press(getByLabelText('Next'));
    expect(getByText('Search anything')).toBeTruthy();
    fireEvent.press(getByLabelText('Next'));
    expect(getByText('Ready to hunt?')).toBeTruthy();
    expect(getByLabelText('Get started')).toBeTruthy();
  });

  it('Get started on the last slide completes onboarding and navigates away', async () => {
    const { getByLabelText, findByTestId } = render(<TestHost />);
    fireEvent.press(getByLabelText('Next'));
    fireEvent.press(getByLabelText('Next'));
    fireEvent.press(getByLabelText('Get started'));
    await findByTestId('detail');
    const prefs = await readPreferences();
    expect(prefs.onboardingCompletedAt).not.toBeNull();
  });

  // Ensure the reset navigation wipes back-stack so user can't swipe back.
  it('uses CommonActions.reset to replace the stack so back gesture does not return here', async () => {
    const dispatch = jest.fn();
    jest.spyOn(require('@react-navigation/native'), 'useNavigation').mockReturnValue({
      dispatch,
      canGoBack: () => false,
    });
    const { getByLabelText } = render(<TestHost />);
    fireEvent.press(getByLabelText('Skip onboarding'));
    await waitFor(() => expect(dispatch).toHaveBeenCalled());
    const action = dispatch.mock.calls[0][0];
    // CommonActions.reset payload shape.
    expect(action.type).toBe(CommonActions.reset({ index: 0, routes: [] }).type);
    jest.restoreAllMocks();
  });
});
