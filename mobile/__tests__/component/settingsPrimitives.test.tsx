/**
 * Run with jest-expo only.
 */
import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { Text } from 'react-native';
import { Row, Section, LinkRow } from '../../src/screens/settings/primitives';

describe('settings/primitives', () => {
  describe('Section', () => {
    it('uppercases the title + renders children', () => {
      const { getByText } = render(
        <Section title="Account">
          <Text>inside</Text>
        </Section>,
      );
      expect(getByText('ACCOUNT')).toBeTruthy();
      expect(getByText('inside')).toBeTruthy();
    });
  });

  describe('Row', () => {
    it('renders label + value side by side', () => {
      const { getByText } = render(<Row label="Version" value="0.1.0" />);
      expect(getByText('Version')).toBeTruthy();
      expect(getByText('0.1.0')).toBeTruthy();
    });

    it('clamps the value to one line (numberOfLines=1)', () => {
      const { getByText } = render(<Row label="Email" value="very.long.email@example.com" />);
      const valueNode = getByText('very.long.email@example.com');
      expect(valueNode.props.numberOfLines).toBe(1);
    });
  });

  describe('LinkRow', () => {
    it('renders label + chevron, with button role + label', () => {
      const onPress = jest.fn();
      const { getByLabelText, getByText } = render(
        <LinkRow label="Privacy policy" onPress={onPress} />,
      );
      expect(getByLabelText('Privacy policy')).toBeTruthy();
      expect(getByText('›')).toBeTruthy();
    });

    it('invokes onPress when tapped', () => {
      const onPress = jest.fn();
      const { getByLabelText } = render(
        <LinkRow label="Terms of service" onPress={onPress} />,
      );
      fireEvent.press(getByLabelText('Terms of service'));
      expect(onPress).toHaveBeenCalledTimes(1);
    });
  });
});
