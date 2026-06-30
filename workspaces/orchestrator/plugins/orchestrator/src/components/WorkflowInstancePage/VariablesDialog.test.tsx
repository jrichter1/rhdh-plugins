/*
 * Copyright Red Hat, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { render, screen } from '@testing-library/react';

import '@testing-library/jest-dom';

import userEvent from '@testing-library/user-event';

import { VariablesDialog } from './VariablesDialog';

// Mock child components
jest.mock('../ui/InfoDialog', () => ({
  InfoDialog: ({ title, open, children, dialogActions }: any) =>
    open ? (
      <div role="dialog">
        <h2>{title}</h2>
        {children}
        {dialogActions}
      </div>
    ) : null,
}));

jest.mock('../ui/JsonCodeBlock', () => ({
  JsonCodeBlock: ({ value }: any) => (
    <pre data-testid="json-code-block">{JSON.stringify(value)}</pre>
  ),
}));

// Mock hooks
jest.mock('../../hooks/useTranslation', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        'run.variables': 'Variables',
        'common.close': 'Close',
        'messages.noVariablesFound': 'No variables found',
      };
      return translations[key] || key;
    },
  }),
}));

jest.mock('../../utils/isDarkMode', () => ({
  useIsDarkMode: jest.fn(() => false),
}));

// Mock capitalize
jest.mock(
  '@red-hat-developer-hub/backstage-plugin-orchestrator-common',
  () => ({
    capitalize: (str: string) => str.charAt(0).toUpperCase() + str.slice(1),
  }),
);

describe('VariablesDialog', () => {
  const defaultProps = {
    open: true,
    onClose: jest.fn(),
    instanceVariables: {},
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  const renderComponent = (props = {}) => {
    return render(<VariablesDialog {...defaultProps} {...props} />);
  };

  describe('Basic Rendering', () => {
    it('should render dialog title and close button', () => {
      renderComponent();

      expect(screen.getByText('Variables')).toBeInTheDocument();
      expect(screen.getByText('Close')).toBeInTheDocument();
    });

    it('should show no variables message when instanceVariables is empty', () => {
      renderComponent({ instanceVariables: {} });

      expect(screen.getByText('No variables found')).toBeInTheDocument();
    });
  });

  describe('Dialog Visibility', () => {
    it('should show dialog when open is true', () => {
      renderComponent({ open: true });

      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    it('should not show dialog when open is false', () => {
      renderComponent({ open: false });

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
  });

  describe('Variables Display', () => {
    it('should render multiple variables with capitalized keys and JSON code blocks', () => {
      const instanceVariables = {
        input: { name: 'test', version: '1.0' },
        output: { status: 'success' },
        metadata: { timestamp: 1234567890 },
      };

      renderComponent({ instanceVariables });

      expect(screen.getByText('Input')).toBeInTheDocument();
      expect(screen.getByText('Output')).toBeInTheDocument();
      expect(screen.getByText('Metadata')).toBeInTheDocument();

      const codeBlocks = screen.getAllByTestId('json-code-block');
      expect(codeBlocks).toHaveLength(3);

      expect(codeBlocks[0].textContent).toContain('test');
      expect(codeBlocks[0].textContent).toContain('1.0');
      expect(codeBlocks[1].textContent).toContain('success');
      expect(codeBlocks[2].textContent).toContain('1234567890');
      expect(screen.queryByText('No variables found')).not.toBeInTheDocument();
    });
  });

  describe('User Interactions', () => {
    it('should call onClose when Close button is clicked', async () => {
      const user = userEvent.setup({ delay: null });
      const onClose = jest.fn();

      renderComponent({ onClose });

      const closeButton = screen.getByText('Close');
      await user.click(closeButton);

      expect(onClose).toHaveBeenCalled();
    });
  });
});
