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

import { Paragraph } from './Paragraph';

describe('Paragraph', () => {
  it('should render children text', () => {
    render(<Paragraph>Test content</Paragraph>);
    expect(screen.getByText('Test content')).toBeInTheDocument();
  });

  it('should render as paragraph element', () => {
    render(<Paragraph>Test content</Paragraph>);
    const paragraph = screen.getByText('Test content');
    expect(paragraph.tagName).toBe('P');
  });

  it('should apply default variant body2', () => {
    render(<Paragraph>Test content</Paragraph>);
    const paragraph = screen.getByText('Test content');
    expect(paragraph.className).toContain('MuiTypography-body2');
  });

  it('should apply custom variant when provided', () => {
    render(<Paragraph variant="h6">Test content</Paragraph>);
    const paragraph = screen.getByText('Test content');
    expect(paragraph.className).toContain('MuiTypography-h6');
  });

  it('should apply inherit variant when provided', () => {
    render(<Paragraph variant="inherit">Test content</Paragraph>);
    const paragraph = screen.getByText('Test content');
    expect(paragraph).toBeInTheDocument();
  });

  it('should apply correct margin styles', () => {
    render(<Paragraph>Test content</Paragraph>);
    const paragraph = screen.getByText('Test content');
    const styles = window.getComputedStyle(paragraph);
    expect(styles.marginTop).toBe('14px');
    expect(styles.marginBottom).toBe('14px');
  });

  it('should render with multiple children', () => {
    render(
      <Paragraph>
        <span>First</span>
        <span>Second</span>
      </Paragraph>,
    );
    expect(screen.getByText('First')).toBeInTheDocument();
    expect(screen.getByText('Second')).toBeInTheDocument();
  });

  it('should handle empty content', () => {
    const { container } = render(<Paragraph />);
    const paragraph = container.querySelector('p');
    expect(paragraph).toBeInTheDocument();
    expect(paragraph?.textContent).toBe('');
  });

  it('should render complex content', () => {
    render(
      <Paragraph>
        This is a <strong>bold</strong> statement
      </Paragraph>,
    );
    expect(screen.getByText('bold')).toBeInTheDocument();
    const paragraph = screen.getByText(/This is a/);
    expect(paragraph.textContent).toBe('This is a bold statement');
  });

  it('should maintain text content with line breaks', () => {
    render(<Paragraph>Line 1{'\n'}Line 2</Paragraph>);
    const paragraph = screen.getByText(/Line 1/);
    expect(paragraph).toBeInTheDocument();
    expect(paragraph.textContent).toContain('Line 1');
    expect(paragraph.textContent).toContain('Line 2');
  });
});
