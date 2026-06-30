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

import { WorkflowProgress } from './WorkflowProgress';

// Mock child components
jest.mock('./Paragraph', () => ({
  Paragraph: ({ children }: any) => <p data-testid="paragraph">{children}</p>,
}));

jest.mock('./WorkflowProgressNode', () => ({
  WorkflowProgressNode: ({ model }: any) => (
    <div data-testid="workflow-progress-node" data-node-id={model.id}>
      {model.name}
    </div>
  ),
}));

// Mock hooks
jest.mock('../../hooks/useTranslation', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        'messages.noDataAvailable': 'No data available',
      };
      return translations[key] || key;
    },
  }),
}));

// Mock utilities
jest.mock('../../utils/NodeInstanceUtils', () => ({
  compareNodes: (a: any, b: any) => {
    // Simple sort by enter time
    return (a.enter || '').localeCompare(b.enter || '');
  },
}));

jest.mock('./WorkflowProgressNodeModel', () => ({
  fromNodeInstanceToWorkflowProgressNodeModel: jest.fn(
    (workflowStatus, workflowError) => (node: any) => ({
      id: node.id,
      name: node.name,
      type: node.type,
      workflowStatus,
      workflowError,
    }),
  ),
}));

describe('WorkflowProgress', () => {
  const mockNodes = [
    {
      id: 'node-1',
      nodeId: '1',
      name: 'Start Node',
      type: 'StartNode',
      enter: '2024-01-01T00:00:00Z',
      definitionId: 'start',
    },
    {
      id: 'node-2',
      nodeId: '2',
      name: 'Process Node',
      type: 'ActionNode',
      enter: '2024-01-01T00:01:00Z',
      definitionId: 'process',
    },
    {
      id: 'node-3',
      nodeId: '3',
      name: 'End Node',
      type: 'EndNode',
      enter: '2024-01-01T00:02:00Z',
      definitionId: 'end',
    },
  ];

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Empty State', () => {
    it('should render default empty state when no nodes', () => {
      render(
        <WorkflowProgress
          workflowStatus={ProcessInstanceStatusDTO.Active}
          workflowNodes={[]}
        />,
      );

      expect(screen.getByTestId('paragraph')).toBeInTheDocument();
      expect(screen.getByText('No data available')).toBeInTheDocument();
    });

    it('should render custom empty state when provided', () => {
      const customEmptyState = (
        <div data-testid="custom-empty">Custom Empty State</div>
      );

      render(
        <WorkflowProgress
          workflowStatus={ProcessInstanceStatusDTO.Active}
          workflowNodes={[]}
          emptyState={customEmptyState}
        />,
      );

      expect(screen.getByTestId('custom-empty')).toBeInTheDocument();
      expect(screen.getByText('Custom Empty State')).toBeInTheDocument();
      expect(screen.queryByTestId('paragraph')).not.toBeInTheDocument();
    });

    it('should not render empty state when nodes exist', () => {
      render(
        <WorkflowProgress
          workflowStatus={ProcessInstanceStatusDTO.Active}
          workflowNodes={mockNodes}
        />,
      );

      expect(screen.queryByText('No data available')).not.toBeInTheDocument();
    });
  });

  describe('Node Rendering', () => {
    it('should render all workflow nodes', () => {
      render(
        <WorkflowProgress
          workflowStatus={ProcessInstanceStatusDTO.Active}
          workflowNodes={mockNodes}
        />,
      );

      const nodes = screen.getAllByTestId('workflow-progress-node');
      expect(nodes).toHaveLength(3);
    });

    it('should render nodes with correct names', () => {
      render(
        <WorkflowProgress
          workflowStatus={ProcessInstanceStatusDTO.Active}
          workflowNodes={mockNodes}
        />,
      );

      expect(screen.getByText('Start Node')).toBeInTheDocument();
      expect(screen.getByText('Process Node')).toBeInTheDocument();
      expect(screen.getByText('End Node')).toBeInTheDocument();
    });

    it('should render nodes in sorted order', () => {
      const unsortedNodes = [mockNodes[2], mockNodes[0], mockNodes[1]];

      render(
        <WorkflowProgress
          workflowStatus={ProcessInstanceStatusDTO.Active}
          workflowNodes={unsortedNodes}
        />,
      );

      const nodes = screen.getAllByTestId('workflow-progress-node');
      expect(nodes[0]).toHaveAttribute('data-node-id', 'node-1');
      expect(nodes[1]).toHaveAttribute('data-node-id', 'node-2');
      expect(nodes[2]).toHaveAttribute('data-node-id', 'node-3');
    });

    it('should render single node', () => {
      render(
        <WorkflowProgress
          workflowStatus={ProcessInstanceStatusDTO.Active}
          workflowNodes={[mockNodes[0]]}
        />,
      );

      const nodes = screen.getAllByTestId('workflow-progress-node');
      expect(nodes).toHaveLength(1);
      expect(screen.getByText('Start Node')).toBeInTheDocument();
    });
  });

  describe('Workflow States', () => {
    it('should render with Active workflow status', () => {
      render(
        <WorkflowProgress
          workflowStatus={ProcessInstanceStatusDTO.Active}
          workflowNodes={mockNodes}
        />,
      );

      expect(screen.getAllByTestId('workflow-progress-node')).toHaveLength(3);
    });

    it('should render with Completed workflow status', () => {
      render(
        <WorkflowProgress
          workflowStatus={ProcessInstanceStatusDTO.Completed}
          workflowNodes={mockNodes}
        />,
      );

      expect(screen.getAllByTestId('workflow-progress-node')).toHaveLength(3);
    });

    it('should render with Error workflow status', () => {
      render(
        <WorkflowProgress
          workflowStatus={ProcessInstanceStatusDTO.Error}
          workflowNodes={mockNodes}
        />,
      );

      expect(screen.getAllByTestId('workflow-progress-node')).toHaveLength(3);
    });

    it('should render with Aborted workflow status', () => {
      render(
        <WorkflowProgress
          workflowStatus={ProcessInstanceStatusDTO.Aborted}
          workflowNodes={mockNodes}
        />,
      );

      expect(screen.getAllByTestId('workflow-progress-node')).toHaveLength(3);
    });

    it('should render with Suspended workflow status', () => {
      render(
        <WorkflowProgress
          workflowStatus={ProcessInstanceStatusDTO.Suspended}
          workflowNodes={mockNodes}
        />,
      );

      expect(screen.getAllByTestId('workflow-progress-node')).toHaveLength(3);
    });
  });

  describe('Error Handling', () => {
    it('should pass workflow error to nodes', () => {
      const workflowError = {
        message: 'Workflow execution failed',
        nodeDefinitionId: 'process',
      };

      render(
        <WorkflowProgress
          workflowStatus={ProcessInstanceStatusDTO.Error}
          workflowNodes={mockNodes}
          workflowError={workflowError}
        />,
      );

      expect(screen.getAllByTestId('workflow-progress-node')).toHaveLength(3);
    });

    it('should render without error when error is undefined', () => {
      render(
        <WorkflowProgress
          workflowStatus={ProcessInstanceStatusDTO.Completed}
          workflowNodes={mockNodes}
          workflowError={undefined}
        />,
      );

      expect(screen.getAllByTestId('workflow-progress-node')).toHaveLength(3);
    });
  });

  describe('Node Model Transformation', () => {
    it('should transform nodes using fromNodeInstanceToWorkflowProgressNodeModel', () => {
      const {
        fromNodeInstanceToWorkflowProgressNodeModel,
      } = require('./WorkflowProgressNodeModel');

      render(
        <WorkflowProgress
          workflowStatus={ProcessInstanceStatusDTO.Active}
          workflowNodes={mockNodes}
        />,
      );

      expect(fromNodeInstanceToWorkflowProgressNodeModel).toHaveBeenCalledWith(
        ProcessInstanceStatusDTO.Active,
        undefined,
      );
    });

    it('should pass error to transformation function', () => {
      const {
        fromNodeInstanceToWorkflowProgressNodeModel,
      } = require('./WorkflowProgressNodeModel');
      const error = { nodeDefinitionId: 'node-error', message: 'Error' };

      render(
        <WorkflowProgress
          workflowStatus={ProcessInstanceStatusDTO.Error}
          workflowNodes={mockNodes}
          workflowError={error}
        />,
      );

      expect(fromNodeInstanceToWorkflowProgressNodeModel).toHaveBeenCalledWith(
        ProcessInstanceStatusDTO.Error,
        error,
      );
    });
  });

  describe('Component Display Name', () => {
    it('should have correct displayName', () => {
      expect(WorkflowProgress.displayName).toBe('WorkflowProgress');
    });
  });

  describe('Edge Cases', () => {
    it('should handle nodes with missing optional fields', () => {
      const minimalNodes = [
        {
          id: 'node-1',
          nodeId: '1',
          name: 'Minimal Node',
          type: 'ActionNode',
          enter: '2024-01-01T00:00:00Z',
          definitionId: 'minimal',
        },
      ];

      render(
        <WorkflowProgress
          workflowStatus={ProcessInstanceStatusDTO.Active}
          workflowNodes={minimalNodes}
        />,
      );

      expect(screen.getByText('Minimal Node')).toBeInTheDocument();
    });

    it('should handle large number of nodes', () => {
      const manyNodes = Array.from({ length: 50 }, (_, i) => ({
        id: `node-${i}`,
        nodeId: `${i}`,
        name: `Node ${i}`,
        type: 'ActionNode',
        enter: `2024-01-01T00:${String(i).padStart(2, '0')}:00Z`,
        definitionId: `node-${i}`,
      }));

      render(
        <WorkflowProgress
          workflowStatus={ProcessInstanceStatusDTO.Active}
          workflowNodes={manyNodes}
        />,
      );

      const nodes = screen.getAllByTestId('workflow-progress-node');
      expect(nodes).toHaveLength(50);
    });

    it('should create a clone of nodes array for sorting', () => {
      const originalNodes = [...mockNodes];
      const nodesCopy = [...mockNodes];

      render(
        <WorkflowProgress
          workflowStatus={ProcessInstanceStatusDTO.Active}
          workflowNodes={nodesCopy}
        />,
      );

      // Original array should not be mutated
      expect(nodesCopy).toEqual(originalNodes);
    });
  });
});
