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

import { renderInTestApp, TestApiProvider } from '@backstage/test-utils';

import { screen, waitFor } from '@testing-library/react';

import '@testing-library/jest-dom';

import userEvent from '@testing-library/user-event';

import {
  ProcessInstanceDTO,
  ProcessInstanceStatusDTO,
} from '@red-hat-developer-hub/backstage-plugin-orchestrator-common';

import { orchestratorApiRef } from '../../api';
import { WorkflowInstancePage } from './WorkflowInstancePage';

// Mock child components
jest.mock('./WorkflowInstancePageContent', () => ({
  WorkflowInstancePageContent: ({ instance }: any) => (
    <div>Instance ID: {instance.id}</div>
  ),
}));

jest.mock('../ui/BaseOrchestratorPage', () => ({
  BaseOrchestratorPage: ({ children, title }: any) => (
    <div>
      <h1>{title}</h1>
      {children}
    </div>
  ),
}));

jest.mock('../ui/InfoDialog', () => ({
  InfoDialog: ({ children, open, title, dialogActions }: any) =>
    open ? (
      <div role="dialog">
        <h2>{title}</h2>
        {children}
        {dialogActions}
      </div>
    ) : null,
}));

jest.mock('../ui/SamlSsoExpiredDialog', () => ({
  SamlSsoExpiredDialog: ({ open }: any) =>
    open ? <div>SAML SSO Expired</div> : null,
}));

jest.mock('../ui/PermissionDeniedPanel', () => ({
  PermissionDeniedPanel: ({ description }: any) => <div>{description}</div>,
  isAccessDeniedError: (error: any) => error?.response?.status === 403,
  extractRequiredPermission: () => 'orchestrator.workflow.use',
}));

jest.mock('../../utils/deepSearchObject', () => ({
  deepSearchObject: () => null,
}));

jest.mock('../../utils/ErrorUtils', () => ({
  extractSsoReauthorizeUrl: () => 'https://sso.example.com',
  isSamlSsoError: () => false,
}));

jest.mock('../../utils/TypeGuards', () => ({
  isNonNullable: (val: any) => val !== null && val !== undefined,
}));

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => jest.fn(),
}));

jest.mock('../../hooks/useOrchestratorAuth', () => ({
  useOrchestratorAuth: () => ({
    authenticate: () => Promise.resolve({}),
  }),
}));

jest.mock('../../hooks/usePermissionArray', () => ({
  usePermissionArrayDecision: jest.fn(() => ({ allowed: true })),
}));

jest.mock('@backstage/core-plugin-api', () => ({
  ...jest.requireActual('@backstage/core-plugin-api'),
  useRouteRef: jest.fn(
    () => () => '/orchestrator/workflows/test-workflow/execute',
  ),
  useRouteRefParams: jest.fn(() => ({ instanceId: 'test-instance-id' })),
}));

jest.mock('@backstage/core-components', () => ({
  ...jest.requireActual('@backstage/core-components'),
  Progress: () => <div>Loading...</div>,
  ResponseErrorPanel: ({ error }: any) => <div>{error.message}</div>,
  ContentHeader: ({ children }: any) => <div>{children}</div>,
}));

// Mock usePolling hook
let mockPollingValue: any = null;
let mockPollingLoading = false;
let mockPollingError: any = null;
const mockRestart = jest.fn();

jest.mock('../../hooks/usePolling', () => ({
  __esModule: true,
  default: jest.fn(() => ({
    value: mockPollingValue,
    loading: mockPollingLoading,
    error: mockPollingError,
    restart: mockRestart,
  })),
}));

const mockInstance: ProcessInstanceDTO = {
  id: 'test-instance-id',
  processId: 'test-workflow',
  processName: 'Test Workflow',
  state: ProcessInstanceStatusDTO.Active,
  start: '2024-01-01T00:00:00Z',
  nodes: [],
};

const mockCompletedInstance: ProcessInstanceDTO = {
  ...mockInstance,
  state: ProcessInstanceStatusDTO.Completed,
  end: '2024-01-01T01:00:00Z',
};

const mockErrorInstance: ProcessInstanceDTO = {
  ...mockInstance,
  state: ProcessInstanceStatusDTO.Error,
};

describe('WorkflowInstancePage', () => {
  let mockOrchestratorApi: any;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();

    // Reset mock polling values
    mockPollingValue = mockInstance;
    mockPollingLoading = false;
    mockPollingError = null;

    mockOrchestratorApi = {
      getInstance: jest.fn().mockResolvedValue({ data: mockInstance }),
      abortWorkflowInstance: jest.fn().mockResolvedValue({}),
      retriggerInstance: jest.fn().mockResolvedValue({}),
      getWorkflowDataInputSchema: jest.fn().mockResolvedValue({
        data: { inputSchema: {} },
      }),
    };
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  const renderComponent = async () => {
    const rendered = await renderInTestApp(
      <TestApiProvider apis={[[orchestratorApiRef, mockOrchestratorApi]]}>
        <WorkflowInstancePage />
      </TestApiProvider>,
    );
    return rendered;
  };

  describe('Basic Rendering', () => {
    it('should render loading state initially', async () => {
      mockPollingLoading = true;
      mockPollingValue = null;

      await renderComponent();

      expect(await screen.findByText('Loading...')).toBeInTheDocument();
    });

    it('should render workflow instance page with title, content and fetch schema', async () => {
      await renderComponent();

      expect(
        await screen.findByRole('heading', { name: /Test Workflow run/i }),
      ).toBeInTheDocument();
      expect(
        await screen.findByText(`Instance ID: ${mockInstance.id}`),
      ).toBeInTheDocument();
      expect(
        mockOrchestratorApi.getWorkflowDataInputSchema,
      ).toHaveBeenCalledWith(mockInstance.processId, mockInstance.id);
    });
  });

  describe('Abort Functionality', () => {
    it('should not show abort button for completed workflows', async () => {
      mockPollingValue = mockCompletedInstance;

      await renderComponent();

      expect(screen.queryByText('Abort')).not.toBeInTheDocument();
    });

    it('should open confirmation dialog and call abort API when confirmed', async () => {
      const user = userEvent.setup({ delay: null });
      await renderComponent();

      // Wait for and click abort button to open dialog
      const abortButton = await screen.findByText('Abort');
      await user.click(abortButton);

      // Wait for dialog to appear
      expect(await screen.findByRole('dialog')).toBeInTheDocument();

      // Find and click the abort button inside the dialog to confirm
      const dialogAbortButtons = screen.getAllByText('Abort');
      const confirmButton = dialogAbortButtons.find(btn =>
        btn.closest('[role="dialog"]'),
      );

      expect(confirmButton).toBeDefined();
      await user.click(confirmButton!);

      await waitFor(() => {
        expect(mockOrchestratorApi.abortWorkflowInstance).toHaveBeenCalledWith(
          mockInstance.id,
        );
        expect(mockRestart).toHaveBeenCalled();
        // Verify dialog closes after confirmation
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      });
    });

    it('should handle abort errors gracefully', async () => {
      const user = userEvent.setup({ delay: null });
      mockOrchestratorApi.abortWorkflowInstance.mockRejectedValue(
        new Error('Abort failed'),
      );

      await renderComponent();

      const abortButton = await screen.findByText('Abort');
      await user.click(abortButton);

      const dialogAbortButtons = screen.getAllByText('Abort');
      const confirmButton = dialogAbortButtons.find(btn =>
        btn.closest('[role="dialog"]'),
      );

      await user.click(confirmButton!);

      // Error should be handled gracefully (component should not crash)
      expect(
        await screen.findByText(`Instance ID: ${mockInstance.id}`),
      ).toBeInTheDocument();
    });
  });

  describe('Rerun Functionality', () => {
    it('should show run again button for error workflows and call retrigger API', async () => {
      const user = userEvent.setup({ delay: null });
      mockPollingValue = mockErrorInstance;

      await renderComponent();

      // Wait for "Run again" button to appear
      const runAgainButton = await screen.findByText('Run again');
      await user.click(runAgainButton);

      // Wait for menu to appear and click "From failure point" option
      const retriggerMenuItem = await screen.findByText(/from failure point/i);
      await user.click(retriggerMenuItem);

      await waitFor(() => {
        expect(mockOrchestratorApi.retriggerInstance).toHaveBeenCalledWith(
          mockInstance.processId,
          mockInstance.id,
          undefined,
        );
        expect(mockRestart).toHaveBeenCalled();
        // Verify menu closes after selection
        expect(
          screen.queryByText(/from failure point/i),
        ).not.toBeInTheDocument();
      });
    });
  });

  describe('Error Handling', () => {
    it('should display error panel when polling fails', async () => {
      mockPollingError = new Error('Failed to fetch instance');

      await renderComponent();

      expect(
        await screen.findByText('Failed to fetch instance'),
      ).toBeInTheDocument();
    });

    it('should display permission denied panel for access errors', async () => {
      const accessError = Object.assign(new Error('Access denied'), {
        response: { status: 403 },
      });
      mockPollingError = accessError;

      await renderComponent();

      expect(await screen.findByText('Access denied')).toBeInTheDocument();
    });
  });

  describe('Polling', () => {
    it('should use polling hook for active workflows', async () => {
      const usePolling = require('../../hooks/usePolling').default;

      await renderComponent();

      expect(usePolling).toHaveBeenCalled();
    });
  });

  describe('State Management', () => {
    it('should determine abort capability based on workflow state', async () => {
      // Active state should allow abort
      mockPollingValue = mockInstance;

      await renderComponent();

      expect(await screen.findByText('Abort')).toBeInTheDocument();
    });

    it('should determine rerun capability based on workflow state', async () => {
      // Completed state should allow rerun
      mockPollingValue = mockCompletedInstance;

      await renderComponent();

      expect(await screen.findByText('Run again')).toBeInTheDocument();
    });
  });

  describe('Permissions', () => {
    it('should enable abort and rerun buttons when user has permission', async () => {
      const {
        usePermissionArrayDecision,
      } = require('../../hooks/usePermissionArray');
      usePermissionArrayDecision.mockReturnValue({ allowed: true });

      await renderComponent();

      expect(usePermissionArrayDecision).toHaveBeenCalled();
      const abortButton = await screen.findByText('Abort');
      expect(abortButton.closest('button')).not.toBeDisabled();
    });

    it('should disable abort and rerun buttons when user lacks permission', async () => {
      const {
        usePermissionArrayDecision,
      } = require('../../hooks/usePermissionArray');
      usePermissionArrayDecision.mockReturnValue({ allowed: false });

      await renderComponent();

      const abortButton = await screen.findByText('Abort');
      expect(abortButton.closest('button')).toBeDisabled();
    });

    it('should check permissions with workflow-specific permission', async () => {
      const {
        usePermissionArrayDecision,
      } = require('../../hooks/usePermissionArray');
      usePermissionArrayDecision.mockReturnValue({ allowed: true });

      await renderComponent();

      // Should be called with both generic and workflow-specific permissions
      expect(usePermissionArrayDecision).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            name: 'orchestrator.workflow.use',
            type: 'basic',
          }),
          expect.objectContaining({
            name: `orchestrator.workflow.use.${mockInstance.processId}`,
            type: 'basic',
          }),
        ]),
      );
    });
  });
});
