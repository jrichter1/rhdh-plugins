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

import {
  WorkflowFormatDTO,
  WorkflowOverviewDTO,
} from '@red-hat-developer-hub/backstage-plugin-orchestrator-common';

import { WorkflowDescriptionModal } from './WorkflowDescriptionModal';

// Mock hooks
jest.mock('../../hooks/useTranslation', () => ({
  useTranslation: () => ({
    t: (key: string, params?: Record<string, string>) => {
      const translations: Record<string, string> = {
        'workflow.buttons.runWorkflow': 'Run Workflow',
        'common.close': 'Close',
        'workflow.messages.areYouSureYouWantToRunThisWorkflow':
          'Are you sure you want to run this workflow?',
        'workflow.errors.failedToLoadDetails': `Failed to load workflow details for ${params?.id}`,
      };
      return translations[key] || key;
    },
  }),
}));

const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
}));

const mockWorkflow: WorkflowOverviewDTO = {
  workflowId: 'workflow-123',
  name: 'Test Workflow',
  description: 'This is a test workflow description',
  format: WorkflowFormatDTO.Json,
};

describe('WorkflowDescriptionModal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const renderComponent = (props: {
    workflow?: WorkflowOverviewDTO;
    workflowError?: { itemId: string; error: any };
    runWorkflowLink?: string;
    open?: boolean;
    onClose?: () => void;
  }) => {
    return render(
      <WorkflowDescriptionModal
        workflow={props.workflow || mockWorkflow}
        workflowError={props.workflowError}
        runWorkflowLink={props.runWorkflowLink || '/run/workflow-123'}
        open={props.open !== undefined ? props.open : true}
        onClose={props.onClose || jest.fn()}
      />,
    );
  };

  describe('Basic Rendering', () => {
    beforeEach(() => {
      renderComponent({});
    });

    it('should render workflow name as title', () => {
      expect(screen.getByText('Test Workflow')).toBeInTheDocument();
    });

    it('should render workflow description when provided', () => {
      expect(
        screen.getByText('This is a test workflow description'),
      ).toBeInTheDocument();
    });

    it('should render all dialog controls', () => {
      expect(screen.getByLabelText('close')).toBeInTheDocument();
      expect(screen.getByText('Run Workflow')).toBeInTheDocument();
      expect(screen.getByText('Close')).toBeInTheDocument();
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

  describe('Content Display', () => {
    it('should display default message when workflow has no description', () => {
      const workflowWithoutDescription: WorkflowOverviewDTO = {
        ...mockWorkflow,
        description: undefined,
      };

      renderComponent({ workflow: workflowWithoutDescription });

      expect(
        screen.getByText('Are you sure you want to run this workflow?'),
      ).toBeInTheDocument();
    });

    it('should display error message when workflowError is provided', () => {
      const workflowError = {
        itemId: 'workflow-456',
        error: {
          message: 'Network error occurred',
        },
      };

      renderComponent({ workflowError });

      expect(
        screen.getByText('Failed to load workflow details for workflow-456'),
      ).toBeInTheDocument();
      expect(screen.getByText('Network error occurred')).toBeInTheDocument();
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

    it('should navigate to runWorkflowLink when Run Workflow button is clicked', async () => {
      const user = userEvent.setup({ delay: null });

      renderComponent({ runWorkflowLink: '/execute/workflow-123' });

      const runButton = screen.getByText('Run Workflow');
      await user.click(runButton);

      expect(mockNavigate).toHaveBeenCalledWith('/execute/workflow-123');
    });
  });

  describe('Button States', () => {
    it('should enable Run Workflow button when no error', () => {
      renderComponent({});

      const runButton = screen.getByText('Run Workflow');
      expect(runButton).not.toBeDisabled();
    });

    it('should disable Run Workflow button when workflowError exists', () => {
      const workflowError = {
        itemId: 'workflow-error',
        error: { message: 'Error' },
      };

      renderComponent({ workflowError });

      const runButton = screen.getByText('Run Workflow');
      expect(runButton).toBeDisabled();
    });
  });
});
