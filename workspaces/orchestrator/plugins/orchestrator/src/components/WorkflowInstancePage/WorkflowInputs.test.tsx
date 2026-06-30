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

import { WorkflowInputs } from './WorkflowInputs';

// Mock Backstage components
jest.mock('@backstage/core-components', () => ({
  InfoCard: ({ title, subheader, children }: any) => (
    <div>
      <h2>{title}</h2>
      {subheader}
      {children}
    </div>
  ),
  Progress: () => <div data-testid="progress">Loading...</div>,
  ResponseErrorPanel: ({ error }: any) => (
    <div data-testid="error-panel">{error.message}</div>
  ),
  StructuredMetadataTable: ({ metadata }: any) => (
    <div data-testid="metadata-table">{JSON.stringify(metadata)}</div>
  ),
}));

// Mock hooks
jest.mock('../../hooks/useTranslation', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        'run.inputs': 'Inputs',
        'messages.workflowInstanceNoInputs': 'No inputs provided',
      };
      return translations[key] || key;
    },
  }),
}));

// Mock formatMetadataForDisplay
jest.mock('../../utils/formatMetadataForDisplay', () => ({
  formatMetadataForDisplay: (data: any) => data,
}));

describe('WorkflowInputs', () => {
  const defaultProps = {
    className: 'test-class',
    cardClassName: 'card-class',
    value: null,
    loading: false,
    responseError: null,
  };

  const renderComponent = (props = {}) => {
    return render(<WorkflowInputs {...defaultProps} {...props} />);
  };

  describe('Basic Rendering', () => {
    it('should render with title', () => {
      renderComponent();

      expect(screen.getByText('Inputs')).toBeInTheDocument();
    });

    it('should render no inputs message when no data', () => {
      renderComponent();

      expect(screen.getByText('No inputs provided')).toBeInTheDocument();
    });
  });

  describe('Loading State', () => {
    it('should show progress and hide inputs/messages when loading', () => {
      renderComponent({
        loading: true,
        value: { data: { key: 'value' } },
      });

      expect(screen.getByTestId('progress')).toBeInTheDocument();
      expect(screen.getByText('Loading...')).toBeInTheDocument();
      expect(screen.queryByTestId('metadata-table')).not.toBeInTheDocument();
      expect(screen.queryByText('No inputs provided')).not.toBeInTheDocument();
    });
  });

  describe('Error State', () => {
    it('should show error panel and hide inputs/progress/messages when error exists', () => {
      const error = { message: 'Failed to load inputs' };

      renderComponent({
        responseError: error,
        value: { data: { key: 'value' } },
      });

      expect(screen.getByTestId('error-panel')).toBeInTheDocument();
      expect(screen.getByText('Failed to load inputs')).toBeInTheDocument();
      expect(screen.queryByTestId('metadata-table')).not.toBeInTheDocument();
      expect(screen.queryByText('No inputs provided')).not.toBeInTheDocument();
      expect(screen.queryByTestId('progress')).not.toBeInTheDocument();
    });
  });

  describe('Data Display', () => {
    it('should render metadata table and hide no inputs message when inputs exist', () => {
      const inputData = {
        name: 'Test Workflow',
        version: '1.0.0',
        parameters: { timeout: 30 },
      };

      renderComponent({ value: { data: inputData } });

      expect(screen.getByTestId('metadata-table')).toBeInTheDocument();
      const tableContent = screen.getByTestId('metadata-table').textContent;
      expect(tableContent).toContain('Test Workflow');
      expect(tableContent).toContain('1.0.0');
      expect(screen.queryByText('No inputs provided')).not.toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty data object', () => {
      renderComponent({ value: { data: {} } });

      expect(screen.getByTestId('metadata-table')).toBeInTheDocument();
    });

    it('should handle null value', () => {
      renderComponent({ value: null });

      expect(screen.getByText('No inputs provided')).toBeInTheDocument();
    });

    it('should handle undefined value', () => {
      renderComponent({ value: undefined });

      expect(screen.getByText('No inputs provided')).toBeInTheDocument();
    });

    it('should handle value without data property', () => {
      renderComponent({ value: {} });

      expect(screen.getByText('No inputs provided')).toBeInTheDocument();
    });
  });
});
