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

import { TestApiProvider } from '@backstage/test-utils';

import { render, screen, waitFor } from '@testing-library/react';

import '@testing-library/jest-dom';

import userEvent from '@testing-library/user-event';

import { orchestratorApiRef } from '../../api';
import { WorkflowLogsDialog } from './WorkflowLogsDialog';

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

jest.mock('../ui/TextCodeBlock', () => ({
  TextCodeBlock: ({ value }: any) => (
    <pre data-testid="text-code-block">{value}</pre>
  ),
}));

jest.mock('@backstage/core-components', () => ({
  Progress: () => <div data-testid="progress">Loading...</div>,
  ResponseErrorPanel: ({ error }: any) => (
    <div data-testid="error-panel">{error.message}</div>
  ),
}));

// Mock hooks
jest.mock('../../hooks/useTranslation', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        'run.logs.title': 'Workflow Logs',
        'common.close': 'Close',
        'run.logs.noLogsAvailable': 'No logs available',
      };
      return translations[key] || key;
    },
  }),
}));

jest.mock('../../utils/isDarkMode', () => ({
  useIsDarkMode: jest.fn(() => false),
}));

jest.mock('@backstage/core-plugin-api', () => ({
  ...jest.requireActual('@backstage/core-plugin-api'),
  useApi: jest.fn(),
}));

describe('WorkflowLogsDialog', () => {
  let mockOrchestratorApi: any;

  const defaultProps = {
    open: true,
    onClose: jest.fn(),
    instanceId: 'test-instance-id',
  };

  beforeEach(() => {
    jest.clearAllMocks();

    mockOrchestratorApi = {
      getInstanceLogs: jest.fn().mockResolvedValue({
        data: {
          logs: [
            { log: 'Log entry 1' },
            { log: 'Log entry 2' },
            { log: 'Log entry 3' },
          ],
        },
      }),
    };

    const { useApi } = require('@backstage/core-plugin-api');
    useApi.mockReturnValue(mockOrchestratorApi);
  });

  const renderComponent = (props = {}) => {
    return render(
      <TestApiProvider apis={[[orchestratorApiRef, mockOrchestratorApi]]}>
        <WorkflowLogsDialog {...defaultProps} {...props} />
      </TestApiProvider>,
    );
  };

  describe('Basic Rendering', () => {
    it('should render dialog title and close button', async () => {
      renderComponent();

      expect(await screen.findByText('Workflow Logs')).toBeInTheDocument();
      expect(screen.getByText('Close')).toBeInTheDocument();
    });
  });

  describe('Dialog Visibility', () => {
    it('should show dialog when open is true', async () => {
      renderComponent({ open: true });

      expect(await screen.findByRole('dialog')).toBeInTheDocument();
    });

    it('should not show dialog when open is false', () => {
      renderComponent({ open: false });

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
  });

  describe('Logs Fetching', () => {
    it('should fetch logs on mount when dialog opens', async () => {
      renderComponent();

      await waitFor(() => {
        expect(mockOrchestratorApi.getInstanceLogs).toHaveBeenCalledWith(
          'test-instance-id',
        );
      });
    });

    it('should not fetch logs when dialog is closed', () => {
      renderComponent({ open: false });

      expect(mockOrchestratorApi.getInstanceLogs).not.toHaveBeenCalled();
    });

    it('should not fetch logs when instanceId is missing', () => {
      renderComponent({ instanceId: '' });

      expect(mockOrchestratorApi.getInstanceLogs).not.toHaveBeenCalled();
    });
  });

  describe('Loading State', () => {
    it('should show progress indicator while loading', async () => {
      mockOrchestratorApi.getInstanceLogs.mockReturnValue(
        new Promise(() => {}), // Never resolves
      );

      renderComponent();

      expect(await screen.findByTestId('progress')).toBeInTheDocument();
      expect(screen.getByText('Loading...')).toBeInTheDocument();
    });
  });

  describe('Logs Display', () => {
    it('should display logs in text code block when loaded', async () => {
      renderComponent();

      const codeBlock = await screen.findByTestId('text-code-block');
      expect(codeBlock).toBeInTheDocument();
      expect(codeBlock.textContent).toBe(
        'Log entry 1\n\nLog entry 2\n\nLog entry 3',
      );
    });

    it('should join multiple log entries with double newlines', async () => {
      mockOrchestratorApi.getInstanceLogs.mockResolvedValue({
        data: {
          logs: [{ log: 'First' }, { log: 'Second' }],
        },
      });

      renderComponent();

      const codeBlock = await screen.findByTestId('text-code-block');
      expect(codeBlock.textContent).toBe('First\n\nSecond');
    });

    it('should show no logs message when logs array is empty', async () => {
      mockOrchestratorApi.getInstanceLogs.mockResolvedValue({
        data: {
          logs: [],
        },
      });

      renderComponent();

      expect(await screen.findByText('No logs available')).toBeInTheDocument();
      expect(screen.queryByTestId('text-code-block')).not.toBeInTheDocument();
    });

    it('should handle response with undefined logs', async () => {
      mockOrchestratorApi.getInstanceLogs.mockResolvedValue({
        data: {},
      });

      renderComponent();

      expect(await screen.findByText('No logs available')).toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    it('should show error panel when API fails', async () => {
      mockOrchestratorApi.getInstanceLogs.mockRejectedValue(
        new Error('Failed to fetch logs'),
      );

      renderComponent();

      expect(await screen.findByTestId('error-panel')).toBeInTheDocument();
      expect(screen.getByText('Failed to fetch logs')).toBeInTheDocument();
      expect(screen.queryByTestId('text-code-block')).not.toBeInTheDocument();
    });
  });

  describe('User Interactions', () => {
    it('should call onClose when Close button is clicked', async () => {
      const user = userEvent.setup({ delay: null });
      const onClose = jest.fn();

      renderComponent({ onClose });

      await screen.findByTestId('text-code-block'); // Wait for logs to load

      const closeButton = screen.getByText('Close');
      await user.click(closeButton);

      expect(onClose).toHaveBeenCalled();
    });
  });
});
