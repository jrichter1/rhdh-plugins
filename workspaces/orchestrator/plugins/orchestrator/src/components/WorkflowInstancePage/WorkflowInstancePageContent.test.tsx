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
} from '@red-hat-developer-hub/backstage-plugin-orchestrator-common';

import { orchestratorApiRef } from '../../api';
import {
  mapProcessInstanceToDetails,
  WorkflowInstancePageContent,
} from './WorkflowInstancePageContent';

// Mock child components
jest.mock('./WorkflowRunDetails', () => ({
  WorkflowRunDetails: ({ details }: any) => (
    <div data-testid="workflow-run-details">
      <div>ID: {details.id}</div>
      <div>Name: {details.processName}</div>
      <div>State: {details.state}</div>
    </div>
  ),
}));

jest.mock('./WorkflowResult', () => ({
  WorkflowResult: ({ instance }: any) => (
    <div data-testid="workflow-result">Result for {instance.id}</div>
  ),
}));

jest.mock('./WorkflowInputs', () => ({
  WorkflowInputs: ({ loading, responseError }: any) => (
    <div data-testid="workflow-inputs">
      {loading && <span>Loading inputs...</span>}
      {responseError && <span>Error: {responseError.message}</span>}
      {!loading && !responseError && <span>Inputs loaded</span>}
    </div>
  ),
}));

jest.mock('./WorkflowProgress', () => ({
  WorkflowProgress: ({ workflowStatus, workflowNodes }: any) => (
    <div data-testid="workflow-progress">
      <div>Status: {workflowStatus}</div>
      <div>Nodes: {workflowNodes.length}</div>
    </div>
  ),
}));

jest.mock('./VariablesDialog', () => ({
  VariablesDialog: ({ open, onClose, instanceVariables }: any) =>
    open ? (
      <div role="dialog" data-testid="variables-dialog">
        <h2>Variables</h2>
        <div>{JSON.stringify(instanceVariables)}</div>
        <button onClick={onClose}>Close</button>
      </div>
    ) : null,
}));

// Mock hooks
jest.mock('../../hooks/useTranslation', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        'common.details': 'Details',
        'workflow.progress': 'Progress',
        'run.viewVariables': 'View Variables',
      };
      return translations[key] || key;
    },
  }),
}));

jest.mock('../../hooks/useWorkflowInstanceCardHeightMode', () => ({
  useWorkflowInstanceCardHeightMode: jest.fn(() => 'fixed'),
}));

jest.mock('@backstage/plugin-permission-react', () => ({
  usePermission: jest.fn(() => ({ allowed: true })),
}));

jest.mock('@backstage/core-components', () => ({
  Content: ({ children }: any) => <div>{children}</div>,
  InfoCard: ({ title, children, className }: any) => (
    <div className={className}>
      <h2>{title}</h2>
      {children}
    </div>
  ),
  Link: ({ to, onClick, children }: any) => (
    <a href={to} onClick={onClick}>
      {children}
    </a>
  ),
}));

jest.mock('@backstage/core-plugin-api', () => ({
  ...jest.requireActual('@backstage/core-plugin-api'),
  useApi: jest.fn(),
}));

jest.mock('../../utils/DurationUtils', () => ({
  formatDuration: (ms: number) => `${ms}ms`,
}));

const mockInstance: ProcessInstanceDTO = {
  id: 'test-instance-id',
  processId: 'test-workflow',
  processName: 'Test Workflow',
  state: ProcessInstanceStatusDTO.Active,
  start: '2024-01-01T00:00:00Z',
  end: '2024-01-01T01:00:00Z',
  nodes: [
    {
      id: 'node-1',
      nodeId: '1',
      name: 'Start',
      type: 'StartNode',
      enter: '2024-01-01T00:00:00Z',
      definitionId: 'start',
    },
  ],
  workflowdata: {
    result: {
      message: 'Success',
    },
  },
};

describe('WorkflowInstancePageContent', () => {
  let mockOrchestratorApi: any;

  beforeEach(() => {
    jest.clearAllMocks();

    mockOrchestratorApi = {
      getWorkflowDataInputSchema: jest.fn().mockResolvedValue({
        data: {
          inputSchema: { type: 'object' },
        },
      }),
    };

    const { useApi } = require('@backstage/core-plugin-api');
    useApi.mockReturnValue(mockOrchestratorApi);

    // Reset permission mock to allowed by default
    const { usePermission } = require('@backstage/plugin-permission-react');
    usePermission.mockReturnValue({ allowed: true });

    // Reset card height mode to 'fixed' by default
    const {
      useWorkflowInstanceCardHeightMode,
    } = require('../../hooks/useWorkflowInstanceCardHeightMode');
    useWorkflowInstanceCardHeightMode.mockReturnValue('fixed');
  });

  const renderComponent = (instance: ProcessInstanceDTO = mockInstance) => {
    return render(
      <TestApiProvider apis={[[orchestratorApiRef, mockOrchestratorApi]]}>
        <WorkflowInstancePageContent instance={instance} />
      </TestApiProvider>,
    );
  };

  describe('Basic Rendering', () => {
    it('should render all four cards', () => {
      renderComponent();

      expect(screen.getByText('Details')).toBeInTheDocument();
      expect(screen.getByText('Progress')).toBeInTheDocument();
      expect(screen.getByTestId('workflow-run-details')).toBeInTheDocument();
      expect(screen.getByTestId('workflow-result')).toBeInTheDocument();
      expect(screen.getByTestId('workflow-inputs')).toBeInTheDocument();
      expect(screen.getByTestId('workflow-progress')).toBeInTheDocument();
    });

    it('should render with instance data', () => {
      renderComponent();

      expect(screen.getByText(`ID: ${mockInstance.id}`)).toBeInTheDocument();
      expect(
        screen.getByText(`Name: ${mockInstance.processName}`),
      ).toBeInTheDocument();
      expect(
        screen.getByText(`State: ${mockInstance.state}`),
      ).toBeInTheDocument();
    });

    it('should fetch workflow input schema on mount', async () => {
      renderComponent();

      await waitFor(() => {
        expect(
          mockOrchestratorApi.getWorkflowDataInputSchema,
        ).toHaveBeenCalledWith(mockInstance.processId, mockInstance.id);
      });
    });
  });

  describe('Layout Modes', () => {
    it('should render in fixed height mode by default', () => {
      const {
        useWorkflowInstanceCardHeightMode,
      } = require('../../hooks/useWorkflowInstanceCardHeightMode');

      renderComponent();

      // Verify hook was called and returned 'fixed'
      expect(useWorkflowInstanceCardHeightMode).toHaveBeenCalled();
    });

    it('should render in content height mode when configured', () => {
      const {
        useWorkflowInstanceCardHeightMode,
      } = require('../../hooks/useWorkflowInstanceCardHeightMode');
      useWorkflowInstanceCardHeightMode.mockReturnValue('content');

      renderComponent();

      // Verify hook was called
      expect(useWorkflowInstanceCardHeightMode).toHaveBeenCalled();
    });
  });

  describe('Variables Dialog', () => {
    it('should show view variables link when user has admin permission', () => {
      renderComponent();

      expect(screen.getByText('View Variables')).toBeInTheDocument();
    });

    it('should not show view variables link when user lacks admin permission', () => {
      const { usePermission } = require('@backstage/plugin-permission-react');
      usePermission.mockReturnValue({ allowed: false });

      renderComponent();

      expect(screen.queryByText('View Variables')).not.toBeInTheDocument();
    });

    it('should open variables dialog when view variables clicked', async () => {
      const user = userEvent.setup({ delay: null });
      renderComponent();

      const viewVariablesLink = screen.getByText('View Variables');
      await user.click(viewVariablesLink);

      expect(await screen.findByTestId('variables-dialog')).toBeInTheDocument();
      expect(screen.getByText('Variables')).toBeInTheDocument();
    });

    it('should close variables dialog', async () => {
      const user = userEvent.setup({ delay: null });
      renderComponent();

      const viewVariablesLink = screen.getByText('View Variables');
      await user.click(viewVariablesLink);

      expect(await screen.findByTestId('variables-dialog')).toBeInTheDocument();

      const closeButton = screen.getByText('Close');
      await user.click(closeButton);

      await waitFor(() => {
        expect(
          screen.queryByTestId('variables-dialog'),
        ).not.toBeInTheDocument();
      });
    });

    it('should pass instance variables without result property', async () => {
      const user = userEvent.setup({ delay: null });
      renderComponent();

      const viewVariablesLink = screen.getByText('View Variables');
      await user.click(viewVariablesLink);

      const dialog = await screen.findByTestId('variables-dialog');
      const variablesText = dialog.textContent || '';

      // Should not contain result content
      expect(variablesText).not.toContain('Success');
    });
  });

  describe('Workflow Inputs', () => {
    it('should show loading state while fetching schema', () => {
      mockOrchestratorApi.getWorkflowDataInputSchema.mockReturnValue(
        new Promise(() => {}), // Never resolves
      );

      renderComponent();

      expect(screen.getByText('Loading inputs...')).toBeInTheDocument();
    });

    it('should show loaded state after schema fetched', async () => {
      renderComponent();

      expect(await screen.findByText('Inputs loaded')).toBeInTheDocument();
    });

    it('should show error state when schema fetch fails', async () => {
      mockOrchestratorApi.getWorkflowDataInputSchema.mockRejectedValue(
        new Error('Schema fetch failed'),
      );

      renderComponent();

      expect(
        await screen.findByText('Error: Schema fetch failed'),
      ).toBeInTheDocument();
    });
  });

  describe('Workflow Progress', () => {
    it('should display workflow progress with status', () => {
      renderComponent();

      expect(
        screen.getByText(`Status: ${mockInstance.state}`),
      ).toBeInTheDocument();
    });

    it('should display workflow progress with node count', () => {
      renderComponent();

      expect(screen.getByText('Nodes: 1')).toBeInTheDocument();
    });

    it('should handle workflow with no nodes', () => {
      const instanceWithNoNodes = {
        ...mockInstance,
        nodes: [],
      };

      renderComponent(instanceWithNoNodes);

      expect(screen.getByText('Nodes: 0')).toBeInTheDocument();
    });
  });

  describe('Component Display Name', () => {
    it('should have correct displayName', () => {
      expect(WorkflowInstancePageContent.displayName).toBe(
        'WorkflowInstancePageContent',
      );
    });
  });
});

describe('mapProcessInstanceToDetails', () => {
  const mockT = (key: string) => key;

  it('should map instance with start and end dates', () => {
    const instance: ProcessInstanceDTO = {
      id: 'test-id',
      processId: 'test-workflow',
      processName: 'Test Workflow',
      state: ProcessInstanceStatusDTO.Completed,
      start: '2024-01-01T00:00:00Z',
      end: '2024-01-01T01:00:00Z',
      nodes: [],
    };

    const result = mapProcessInstanceToDetails(instance, mockT);

    expect(result.id).toBe('test-id');
    expect(result.processName).toBe('Test Workflow');
    expect(result.workflowId).toBe('test-workflow');
    expect(result.state).toBe(ProcessInstanceStatusDTO.Completed);
    expect(result.start).not.toBe('N/A');
    expect(result.duration).toContain('ms');
  });

  it('should handle instance without end date', () => {
    const instance: ProcessInstanceDTO = {
      id: 'test-id',
      processId: 'test-workflow',
      processName: 'Test Workflow',
      state: ProcessInstanceStatusDTO.Active,
      start: '2024-01-01T00:00:00Z',
      nodes: [],
    };

    const result = mapProcessInstanceToDetails(instance, mockT);

    expect(result.duration).toBe('---');
  });

  it('should handle instance without start date', () => {
    const instance: ProcessInstanceDTO = {
      id: 'test-id',
      processId: 'test-workflow',
      processName: 'Test Workflow',
      state: ProcessInstanceStatusDTO.Active,
      nodes: [],
    };

    const result = mapProcessInstanceToDetails(instance, mockT);

    expect(result.start).toBe('---');
    expect(result.duration).toBe('---');
  });

  it('should handle instance without process name', () => {
    const instance: ProcessInstanceDTO = {
      id: 'test-id',
      processId: 'test-workflow',
      state: ProcessInstanceStatusDTO.Active,
      nodes: [],
    };

    const result = mapProcessInstanceToDetails(instance, mockT);

    expect(result.processName).toBe('---');
  });

  it('should include description when present', () => {
    const instance: ProcessInstanceDTO = {
      id: 'test-id',
      processId: 'test-workflow',
      processName: 'Test Workflow',
      state: ProcessInstanceStatusDTO.Active,
      description: 'Test description',
      nodes: [],
    };

    const result = mapProcessInstanceToDetails(instance, mockT);

    expect(result.description).toBe('Test description');
  });
});
