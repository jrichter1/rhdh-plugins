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

import { render, screen } from '@testing-library/react';

import '@testing-library/jest-dom';

import { ProcessInstanceStatusDTO } from '@red-hat-developer-hub/backstage-plugin-orchestrator-common';

import { orchestratorApiRef } from '../../api';
import { WorkflowRunDetail } from '../types/WorkflowRunDetail';
import { WorkflowRunDetails } from './WorkflowRunDetails';

// Mock child components
jest.mock('../ui/WorkflowInstanceStatusIndicator', () => ({
  WorkflowInstanceStatusIndicator: ({ status }: any) => (
    <span data-testid="status-indicator">{status}</span>
  ),
}));

jest.mock('../ui/WorkflowStatus', () => ({
  WorkflowStatus: ({ availability }: any) => (
    <span data-testid="workflow-status">
      {availability ? 'Available' : 'Unavailable'}
    </span>
  ),
}));

// Mock Backstage components
jest.mock('@backstage/core-components', () => ({
  Link: ({ to, children }: any) => <a href={to}>{children}</a>,
  CopyTextButton: ({ text }: any) => (
    <button data-testid="copy-button">Copy {text}</button>
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

// Mock hooks
jest.mock('../../hooks/useTranslation', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        'workflow.fields.workflow': 'Workflow',
        'workflow.fields.runStatus': 'Run Status',
        'workflow.fields.workflowStatus': 'Workflow Status',
        'workflow.fields.workflowId': 'Run ID',
        'workflow.fields.workflowIdCopied': 'Copied!',
        'workflow.fields.duration': 'Duration',
        'workflow.fields.started': 'Started',
        'workflow.fields.description': 'Description',
        'workflow.fields.version': 'Version',
      };
      return translations[key] || key;
    },
  }),
}));

jest.mock('@backstage/core-plugin-api', () => ({
  ...jest.requireActual('@backstage/core-plugin-api'),
  useApi: jest.fn(),
  useRouteRef: jest.fn(
    () =>
      ({ workflowId }: any) =>
        `/workflows/${workflowId}`,
  ),
}));

const mockDetails: WorkflowRunDetail = {
  id: 'run-123',
  workflowId: 'workflow-456',
  processName: 'test workflow',
  state: ProcessInstanceStatusDTO.Active,
  start: '2024-01-01 10:00:00',
  duration: '5 minutes',
  description: 'Test workflow description',
};

describe('WorkflowRunDetails', () => {
  let mockOrchestratorApi: any;

  beforeEach(() => {
    jest.clearAllMocks();

    mockOrchestratorApi = {
      getWorkflowOverview: jest.fn().mockResolvedValue({
        data: {
          id: 'workflow-456',
          name: 'Test Workflow',
          version: '1.0.0',
          isAvailable: true,
        },
      }),
    };

    const { useApi } = require('@backstage/core-plugin-api');
    useApi.mockReturnValue(mockOrchestratorApi);
  });

  const renderComponent = (details: WorkflowRunDetail = mockDetails) => {
    return render(
      <TestApiProvider apis={[[orchestratorApiRef, mockOrchestratorApi]]}>
        <WorkflowRunDetails details={details} />
      </TestApiProvider>,
    );
  };

  describe('Basic Rendering', () => {
    beforeEach(() => {
      renderComponent();
    });

    it('should render all workflow detail fields', async () => {
      expect(screen.getByText('Workflow')).toBeInTheDocument();
      expect(screen.getByText('Run Status')).toBeInTheDocument();
      expect(screen.getByText('Workflow Status')).toBeInTheDocument();
      expect(screen.getByText('Run ID')).toBeInTheDocument();
      expect(screen.getByText('Duration')).toBeInTheDocument();
      expect(screen.getByText('Started')).toBeInTheDocument();
      expect(screen.getByText('Description')).toBeInTheDocument();
      expect(screen.getByText('Version')).toBeInTheDocument();
    });

    it('should display workflow name with capitalization', () => {
      expect(screen.getByText('Test workflow')).toBeInTheDocument();
    });

    it('should render workflow name as link to workflow page', () => {
      const link = screen.getByText('Test workflow').closest('a');
      expect(link).toHaveAttribute('href', '/workflows/workflow-456');
    });

    it('should display run status indicator', () => {
      const statusIndicator = screen.getByTestId('status-indicator');
      expect(statusIndicator).toHaveTextContent(
        ProcessInstanceStatusDTO.Active,
      );
    });

    it('should display run ID with copy button', () => {
      expect(screen.getByText('run-123')).toBeInTheDocument();
      expect(screen.getByTestId('copy-button')).toBeInTheDocument();
    });

    it('should display duration', () => {
      expect(screen.getByText('5 minutes')).toBeInTheDocument();
    });

    it('should display start time', () => {
      expect(screen.getByText('2024-01-01 10:00:00')).toBeInTheDocument();
    });

    it('should display description when provided', () => {
      expect(screen.getByText('Test workflow description')).toBeInTheDocument();
    });
  });

  describe('Workflow Overview Loading', () => {
    it('should fetch workflow overview on mount', () => {
      renderComponent();

      expect(mockOrchestratorApi.getWorkflowOverview).toHaveBeenCalledWith(
        'workflow-456',
      );
    });

    it('should display workflow status when overview is loaded', async () => {
      renderComponent();

      const workflowStatus = await screen.findByTestId('workflow-status');
      expect(workflowStatus).toHaveTextContent('Available');
    });

    it('should display version when overview is loaded', async () => {
      renderComponent();

      expect(await screen.findByText('1.0.0')).toBeInTheDocument();
    });

    it('should display unavailable status when overview returns unavailable', async () => {
      mockOrchestratorApi.getWorkflowOverview.mockResolvedValue({
        data: {
          id: 'workflow-456',
          name: 'Test Workflow',
          version: '1.0.0',
          isAvailable: false,
        },
      });

      renderComponent();

      const workflowStatus = await screen.findByTestId('workflow-status');
      expect(workflowStatus).toHaveTextContent('Unavailable');
    });
  });

  describe('Error Handling', () => {
    it('should display unavailable for workflow status and version when API fails', async () => {
      mockOrchestratorApi.getWorkflowOverview.mockRejectedValue(
        new Error('API Error'),
      );

      renderComponent();

      // Both workflow status and version sections should show unavailable (---)
      const unavailableTexts = await screen.findAllByText('---');
      expect(unavailableTexts.length).toBe(2); // Workflow Status and Version
    });
  });

  describe('Edge Cases', () => {
    it('should display unavailable when description is not provided', () => {
      const detailsWithoutDescription = {
        ...mockDetails,
        description: undefined,
      };

      renderComponent(detailsWithoutDescription);

      const descriptionSection = screen.getByText('Description').parentElement;
      expect(descriptionSection?.textContent).toContain('---');
    });

    it('should display unavailable when version is not provided in overview', async () => {
      mockOrchestratorApi.getWorkflowOverview.mockResolvedValue({
        data: {
          id: 'workflow-456',
          name: 'Test Workflow',
          isAvailable: true,
        },
      });

      renderComponent();

      expect(await screen.findByText('---')).toBeInTheDocument();
    });

    it('should handle different workflow states', () => {
      const completedDetails = {
        ...mockDetails,
        state: ProcessInstanceStatusDTO.Completed,
      };

      renderComponent(completedDetails);

      const statusIndicator = screen.getByTestId('status-indicator');
      expect(statusIndicator).toHaveTextContent(
        ProcessInstanceStatusDTO.Completed,
      );
    });
  });
});
