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

import { ProcessInstanceStatusDTO } from '@red-hat-developer-hub/backstage-plugin-orchestrator-common';

import { WorkflowProgressNode } from './WorkflowProgressNode';
import { WorkflowProgressNodeModel } from './WorkflowProgressNodeModel';

// Mock child components
jest.mock('./Paragraph', () => ({
  Paragraph: ({ children }: any) => (
    <div data-testid="paragraph">{children}</div>
  ),
}));

// Mock hooks
jest.mock('../../hooks/useTranslation', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        'messages.additionalDetailsAboutThisErrorAreNotAvailable':
          'Additional details about this error are not available',
        'tooltips.completed': 'Completed',
        'tooltips.active': 'Active',
        'tooltips.aborted': 'Aborted',
        'tooltips.suspended': 'Suspended',
        'tooltips.pending': 'Pending',
        'tooltips.error': 'Error',
      };
      return translations[key] || key;
    },
  }),
}));

jest.mock('../../hooks/useWorkflowInstanceStatusColors', () => ({
  useWorkflowInstanceStateColors: (status: string) => `color-${status}`,
}));

// Mock luxon DateTime
jest.mock('luxon', () => ({
  DateTime: {
    fromISO: jest.fn(() => ({
      toRelative: jest.fn(() => '2 minutes ago'),
    })),
  },
}));

describe('WorkflowProgressNode', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const baseModel: WorkflowProgressNodeModel = {
    id: 'node-1',
    name: 'Test Node',
    status: ProcessInstanceStatusDTO.Completed,
    exit: '2024-01-01T00:00:00Z',
  };

  const renderComponent = (model: Partial<WorkflowProgressNodeModel> = {}) => {
    return render(<WorkflowProgressNode model={{ ...baseModel, ...model }} />);
  };

  describe('Basic Rendering', () => {
    it('should render node name', () => {
      renderComponent();

      expect(screen.getByText('Test Node')).toBeInTheDocument();
    });

    it('should render relative time when exit timestamp exists', () => {
      renderComponent({ exit: '2024-01-01T00:00:00Z' });

      expect(screen.getByText('2 minutes ago')).toBeInTheDocument();
    });

    it('should render unavailable when no exit timestamp', () => {
      renderComponent({ exit: undefined });

      expect(screen.getByText('---')).toBeInTheDocument();
    });
  });

  describe('Status Icons', () => {
    it('should render appropriate icons for different statuses', () => {
      const { rerender } = renderComponent({
        status: ProcessInstanceStatusDTO.Completed,
      });
      expect(screen.getByTestId('CheckCircleIcon')).toBeInTheDocument();

      rerender(
        <WorkflowProgressNode
          model={{
            ...baseModel,
            status: ProcessInstanceStatusDTO.Active,
          }}
        />,
      );
      expect(screen.getByTestId('HourglassTopIcon')).toBeInTheDocument();

      rerender(
        <WorkflowProgressNode
          model={{
            ...baseModel,
            status: ProcessInstanceStatusDTO.Aborted,
          }}
        />,
      );
      expect(screen.getByTestId('CancelIcon')).toBeInTheDocument();

      rerender(
        <WorkflowProgressNode
          model={{
            ...baseModel,
            status: ProcessInstanceStatusDTO.Suspended,
          }}
        />,
      );
      expect(screen.getByTestId('PauseCircleIcon')).toBeInTheDocument();

      rerender(
        <WorkflowProgressNode
          model={{
            ...baseModel,
            status: ProcessInstanceStatusDTO.Pending,
          }}
        />,
      );
      expect(screen.getByTestId('HourglassTopIcon')).toBeInTheDocument();
    });

    it('should render error icon with or without error message', () => {
      const { rerender } = renderComponent({
        status: ProcessInstanceStatusDTO.Error,
        error: {
          nodeDefinitionId: 'node-error',
          message: 'Something went wrong',
        },
      });
      expect(screen.getByTestId('ErrorIcon')).toBeInTheDocument();

      rerender(
        <WorkflowProgressNode
          model={{
            ...baseModel,
            status: ProcessInstanceStatusDTO.Error,
            error: undefined,
          }}
        />,
      );
      expect(screen.getByTestId('ErrorIcon')).toBeInTheDocument();
    });

    it('should render nothing when status is undefined', () => {
      renderComponent({ status: undefined });

      expect(screen.queryByTestId('CheckCircleIcon')).not.toBeInTheDocument();
      expect(screen.queryByTestId('ErrorIcon')).not.toBeInTheDocument();
      expect(screen.queryByTestId('HourglassTopIcon')).not.toBeInTheDocument();
      expect(screen.queryByTestId('CancelIcon')).not.toBeInTheDocument();
      expect(screen.queryByTestId('PauseCircleIcon')).not.toBeInTheDocument();
    });
  });

  describe('Status Colors', () => {
    it('should apply color class based on status', () => {
      renderComponent({ status: ProcessInstanceStatusDTO.Completed });

      const icon = screen.getByTestId('CheckCircleIcon');
      expect(icon).toHaveClass(`color-${ProcessInstanceStatusDTO.Completed}`);
    });
  });
});
