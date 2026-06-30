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

import {
  ProcessInstanceDTO,
  ProcessInstanceStatusDTO,
  WorkflowResultDTOOutputsInnerFormatEnum,
} from '@red-hat-developer-hub/backstage-plugin-orchestrator-common';

import { orchestratorApiRef } from '../../api';
import { WorkflowResult } from './WorkflowResult';

// Mock child components
jest.mock('./WorkflowDescriptionModal', () => ({
  WorkflowDescriptionModal: ({ open, workflow, onClose }: any) =>
    open ? (
      <div role="dialog">
        <h2>Workflow: {workflow.name || 'Loading...'}</h2>
        <button onClick={onClose}>Close</button>
      </div>
    ) : null,
}));

jest.mock('./WorkflowLogsDialog', () => ({
  WorkflowLogsDialog: ({ open, onClose, instanceId }: any) =>
    open ? (
      <div role="dialog">
        <h2>Logs for {instanceId}</h2>
        <button onClick={onClose}>Close</button>
      </div>
    ) : null,
}));

jest.mock('../ui/SamlSsoExpiredDialog', () => ({
  SamlSsoExpiredDialog: ({ open, onClose }: any) =>
    open ? (
      <div role="dialog">
        <h2>SAML SSO Expired</h2>
        <button onClick={onClose}>Close</button>
      </div>
    ) : null,
}));

jest.mock('../Trans', () => ({
  Trans: ({ message, params }: any) => (
    <span>{`${message}:${JSON.stringify(params || {})}`}</span>
  ),
}));

// Mock hooks
jest.mock('../../hooks/useTranslation', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        'run.results': 'Results',
        'run.suggestedNextWorkflow': 'Suggested Next Workflow',
        'run.suggestedNextWorkflows': 'Suggested Next Workflows',
        'run.status.noAdditionalInfo': 'No additional information',
        'run.status.resultsWillBeDisplayedHereOnceTheRunIsComplete':
          'Results will be displayed here once the run is complete',
        'run.logs.viewLogs': 'View Logs',
        'common.links': 'Links',
        'common.values': 'Values',
      };
      return translations[key] || key;
    },
  }),
}));

jest.mock('../../hooks/useLogsEnabled', () => ({
  useLogsEnabled: jest.fn(() => true),
}));

jest.mock('../../utils/ErrorUtils', () => ({
  extractSsoReauthorizeUrl: jest.fn(() => 'https://sso.example.com'),
  isSamlSsoError: jest.fn(() => false),
}));

jest.mock('../../utils/formatMetadataForDisplay', () => ({
  formatMetadataForDisplay: (data: any) => data,
}));

jest.mock('../../utils/UrlUtils', () => ({
  buildUrl: (path: string) => path,
}));

jest.mock('@backstage/core-components', () => ({
  ...jest.requireActual('@backstage/core-components'),
  InfoCard: ({ title, subheader, children }: any) => (
    <div>
      <h1>{title}</h1>
      {subheader}
      {children}
    </div>
  ),
  Link: ({ to, children, onClick }: any) => (
    <a href={to} onClick={onClick}>
      {children}
    </a>
  ),
  MarkdownContent: ({ content }: any) => <div>{content}</div>,
  StructuredMetadataTable: ({ metadata }: any) => (
    <div>{JSON.stringify(metadata)}</div>
  ),
}));

jest.mock('@backstage/plugin-catalog', () => ({
  AboutField: ({ label, children }: any) => (
    <div>
      <strong>{label}</strong>
      {children}
    </div>
  ),
}));

jest.mock('@backstage/core-plugin-api', () => ({
  ...jest.requireActual('@backstage/core-plugin-api'),
  useApi: jest.fn(),
  useRouteRef: jest.fn(
    () =>
      ({ workflowId }: any) =>
        `/workflows/${workflowId}/execute`,
  ),
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
  executionSummary: ['Workflow completed at 2024-01-01T01:00:00Z'],
};

const mockErrorInstance: ProcessInstanceDTO = {
  ...mockInstance,
  state: ProcessInstanceStatusDTO.Error,
  error: {
    nodeDefinitionId: 'node-error',
    message: 'Workflow execution failed',
  },
  executionSummary: ['Workflow failed at 2024-01-01T00:30:00Z'],
};

const mockAbortedInstance: ProcessInstanceDTO = {
  ...mockInstance,
  state: ProcessInstanceStatusDTO.Aborted,
};

describe('WorkflowResult', () => {
  let mockOrchestratorApi: any;

  beforeEach(() => {
    jest.clearAllMocks();

    mockOrchestratorApi = {
      getWorkflowOverview: jest.fn().mockResolvedValue({
        data: {
          id: 'next-workflow',
          name: 'Next Workflow',
          description: 'Description',
        },
      }),
    };

    const { useApi } = require('@backstage/core-plugin-api');
    useApi.mockReturnValue(mockOrchestratorApi);

    // Reset SAML error mock to false by default
    const { isSamlSsoError } = require('../../utils/ErrorUtils');
    isSamlSsoError.mockReturnValue(false);

    // Reset logs enabled to true by default
    const { useLogsEnabled } = require('../../hooks/useLogsEnabled');
    useLogsEnabled.mockReturnValue(true);
  });

  const renderComponent = (instance: ProcessInstanceDTO = mockInstance) => {
    return render(
      <TestApiProvider apis={[[orchestratorApiRef, mockOrchestratorApi]]}>
        <WorkflowResult
          instance={instance}
          className="test-class"
          cardClassName="card-class"
        />
      </TestApiProvider>,
    );
  };

  const TestWrapper = ({ instance }: { instance: ProcessInstanceDTO }) => (
    <TestApiProvider apis={[[orchestratorApiRef, mockOrchestratorApi]]}>
      <WorkflowResult
        instance={instance}
        className="test-class"
        cardClassName="card-class"
      />
    </TestApiProvider>
  );

  describe('Basic Rendering', () => {
    it('should render with title', async () => {
      renderComponent();

      expect(await screen.findByText('Results')).toBeInTheDocument();
    });

    it('should render active instance with info message', async () => {
      const activeInstance = {
        ...mockInstance,
        executionSummary: ['Workflow started at 2024-01-01T00:00:00Z'],
      };

      renderComponent(activeInstance);

      expect(
        await screen.findByText(
          'Results will be displayed here once the run is complete',
        ),
      ).toBeInTheDocument();
    });

    it('should render completed instance with success message', async () => {
      renderComponent(mockCompletedInstance);

      expect(
        await screen.findByText(/run.status.completedAt/i),
      ).toBeInTheDocument();
    });
  });

  describe('Status Messages', () => {
    it('should display different status messages based on workflow state with error', async () => {
      // Error state -> shows failed status
      const { rerender } = render(<TestWrapper instance={mockErrorInstance} />);

      expect(await screen.findByText(/run.status.failed/i)).toBeInTheDocument();
      expect(
        await screen.findByText('Workflow execution failed'),
      ).toBeInTheDocument();
      expect(screen.getByRole('alert')).toBeInTheDocument();

      // Completed state with error -> shows completed with message (NOT failed)
      const completedWithError = {
        ...mockCompletedInstance,
        error: { nodeDefinitionId: 'node-error', message: 'Warning message' },
      };

      rerender(<TestWrapper instance={completedWithError} />);

      expect(
        await screen.findByText(/run.status.completedWithMessage/i),
      ).toBeInTheDocument();
      expect(screen.queryByText(/run.status.failed/i)).not.toBeInTheDocument();
      expect(await screen.findByText('Warning message')).toBeInTheDocument();
      expect(screen.getByRole('alert')).toBeInTheDocument();
    });

    it('should display aborted message for aborted workflow', async () => {
      renderComponent(mockAbortedInstance);

      expect(await screen.findByText('Run has aborted')).toBeInTheDocument();
    });

    it('should display waiting message when workflow is waiting at node', async () => {
      const waitingInstance = {
        ...mockInstance,
        executionSummary: [
          'Workflow waiting at node TestNode since 2024-01-01T00:15:00Z',
        ],
      };

      renderComponent(waitingInstance);

      expect(
        await screen.findByText(/run.status.runningWaitingAtNode/i),
      ).toBeInTheDocument();
    });
  });

  describe('Workflow Outputs', () => {
    it('should render link outputs', async () => {
      const instanceWithLinks = {
        ...mockCompletedInstance,
        workflowdata: {
          result: {
            outputs: [
              {
                key: 'GitHub PR',
                value: 'https://github.com/org/repo/pull/123',
                format: WorkflowResultDTOOutputsInnerFormatEnum.Link,
              },
            ],
          },
        },
      };

      renderComponent(instanceWithLinks);

      expect(await screen.findByText('Links')).toBeInTheDocument();
      expect(await screen.findByText('GitHub PR')).toBeInTheDocument();
    });

    it('should render value outputs with different types (string, number, array, object)', async () => {
      const instanceWithValues = {
        ...mockCompletedInstance,
        workflowdata: {
          result: {
            outputs: [
              {
                key: 'status',
                value: 'success',
                format: WorkflowResultDTOOutputsInnerFormatEnum.Text,
              },
              {
                key: 'count',
                value: 42,
                format: WorkflowResultDTOOutputsInnerFormatEnum.Number,
              },
              {
                key: 'items',
                value: ['item1', 'item2'],
                format: WorkflowResultDTOOutputsInnerFormatEnum.Text,
              },
              {
                key: 'data',
                value: { foo: 'bar' },
                format: WorkflowResultDTOOutputsInnerFormatEnum.Text,
              },
            ],
          },
        },
      };

      renderComponent(instanceWithValues);

      expect(await screen.findByText('Values')).toBeInTheDocument();

      // Verify all value types are rendered:
      // String and number values should be displayed directly
      const valuesSection = screen.getByText('Values').parentElement;
      expect(valuesSection?.textContent).toContain('status');
      expect(valuesSection?.textContent).toContain('success');
      expect(valuesSection?.textContent).toContain('count');
      expect(valuesSection?.textContent).toContain('42');

      // Array should be stringified (note: JSON.stringify adds quotes)
      expect(valuesSection?.textContent).toContain('items');
      expect(valuesSection?.textContent).toContain('item1');
      expect(valuesSection?.textContent).toContain('item2');

      // Object should be stringified with "Object:" prefix
      expect(valuesSection?.textContent).toContain('data');
      expect(valuesSection?.textContent).toContain('Object:');
      expect(valuesSection?.textContent).toContain('foo');
      expect(valuesSection?.textContent).toContain('bar');
    });

    it('should not render outputs section when no outputs', async () => {
      renderComponent(mockCompletedInstance);

      expect(screen.queryByText('Links')).not.toBeInTheDocument();
      expect(screen.queryByText('Values')).not.toBeInTheDocument();
    });
  });

  describe('Next Workflows', () => {
    it('should render suggested next workflows with plural label when multiple', async () => {
      const instanceWithMultipleNextWorkflows = {
        ...mockCompletedInstance,
        workflowdata: {
          result: {
            nextWorkflows: [
              { id: 'workflow-1', name: 'Workflow One' },
              { id: 'workflow-2', name: 'Workflow Two' },
            ],
          },
        },
      };

      renderComponent(instanceWithMultipleNextWorkflows);

      expect(
        await screen.findByText('Suggested Next Workflows'),
      ).toBeInTheDocument();
      expect(await screen.findByText('Workflow One')).toBeInTheDocument();
      expect(await screen.findByText('Workflow Two')).toBeInTheDocument();
    });

    it('should open and close workflow description modal when next workflow clicked', async () => {
      const user = userEvent.setup({ delay: null });
      const instanceWithNextWorkflow = {
        ...mockCompletedInstance,
        workflowdata: {
          result: {
            nextWorkflows: [{ id: 'next-workflow', name: 'Next Workflow' }],
          },
        },
      };

      renderComponent(instanceWithNextWorkflow);

      // Click workflow link to open modal
      const workflowLink = await screen.findByText('Next Workflow');
      await user.click(workflowLink);

      // Verify modal opens and API is called
      await waitFor(() => {
        expect(mockOrchestratorApi.getWorkflowOverview).toHaveBeenCalledWith(
          'next-workflow',
        );
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      // Close modal
      const closeButton = screen.getByText('Close');
      await user.click(closeButton);

      // Verify modal closes
      await waitFor(() => {
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      });
    });

    it('should not render next workflows section when empty', async () => {
      renderComponent(mockCompletedInstance);

      expect(
        screen.queryByText('Suggested Next Workflow'),
      ).not.toBeInTheDocument();
    });
  });

  describe('Logs Dialog', () => {
    it('should show view logs button when logs are enabled', async () => {
      renderComponent();

      expect(await screen.findByText('View Logs')).toBeInTheDocument();
    });

    it('should not show view logs button when logs are disabled', async () => {
      const { useLogsEnabled } = require('../../hooks/useLogsEnabled');
      useLogsEnabled.mockReturnValue(false);

      renderComponent();

      expect(screen.queryByText('View Logs')).not.toBeInTheDocument();
    });

    it('should open and close logs dialog when view logs clicked', async () => {
      const user = userEvent.setup({ delay: null });
      renderComponent();

      // Open logs dialog
      const viewLogsButton = await screen.findByText('View Logs');
      await user.click(viewLogsButton);

      // Verify dialog opens
      expect(
        await screen.findByText(`Logs for ${mockInstance.id}`),
      ).toBeInTheDocument();

      // Close dialog
      const closeButton = screen.getByText('Close');
      await user.click(closeButton);

      // Verify dialog closes
      await waitFor(() => {
        expect(
          screen.queryByText(`Logs for ${mockInstance.id}`),
        ).not.toBeInTheDocument();
      });
    });
  });

  describe('SAML SSO Error', () => {
    it('should show and close SAML dialog when SAML error detected', async () => {
      const user = userEvent.setup({ delay: null });
      const { isSamlSsoError } = require('../../utils/ErrorUtils');
      isSamlSsoError.mockReturnValue(true);

      const samlErrorInstance = {
        ...mockErrorInstance,
        error: {
          nodeDefinitionId: 'node-error',
          message: 'SAML SSO token expired',
        },
      };

      renderComponent(samlErrorInstance);

      // Verify SAML dialog is shown
      expect(await screen.findByText('SAML SSO Expired')).toBeInTheDocument();

      // Close dialog
      const closeButton = screen.getByText('Close');
      await user.click(closeButton);

      // Verify dialog closes
      await waitFor(() => {
        expect(screen.queryByText('SAML SSO Expired')).not.toBeInTheDocument();
      });
    });

    it('should not show SAML dialog when no SAML error', async () => {
      renderComponent(mockErrorInstance);

      expect(screen.queryByText('SAML SSO Expired')).not.toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    it('should handle workflow overview API error gracefully', async () => {
      const user = userEvent.setup({ delay: null });
      mockOrchestratorApi.getWorkflowOverview.mockRejectedValue(
        new Error('API Error'),
      );

      const instanceWithNextWorkflow = {
        ...mockCompletedInstance,
        workflowdata: {
          result: {
            nextWorkflows: [{ id: 'next-workflow', name: 'Next Workflow' }],
          },
        },
      };

      renderComponent(instanceWithNextWorkflow);

      const workflowLink = await screen.findByText('Next Workflow');
      await user.click(workflowLink);

      // Dialog should still open even with error (showing Loading...)
      expect(
        await screen.findByText('Workflow: Loading...'),
      ).toBeInTheDocument();
    });
  });
});
