---
name: react-test-creator
description: Generate comprehensive React component test files following React Testing Library best practices. Use when the user asks to create tests, write tests, generate test files, or improve test coverage for React/TypeScript components. Particularly useful for Backstage plugins and complex component testing.
---

# React Component Test Creator

Generate high-quality React component test files following industry best practices and React Testing Library patterns.

## When to Use This Skill

Use this skill when:

- User asks to "create tests", "write tests", or "generate test file" for a React component
- User wants to improve test coverage for existing components
- User mentions testing React components, TypeScript components, or Backstage plugins
- User shows you a component file and asks about testing

## Core Testing Principles

### 1. React Testing Library Best Practices

**Query Priority (use in this order):**

1. **Semantic queries** (preferred): `getByRole`, `getByLabelText`, `getByText`
2. **Accessible queries**: `getByAltText`, `getByTitle`
3. **Test IDs** (last resort): Avoid `data-testid` - only use when no semantic alternative exists

**Query Method Selection:**

```typescript
// ✅ Async element should exist
expect(await screen.findByText('Loading...')).toBeInTheDocument();

// ✅ Element should NOT exist
expect(screen.queryByText('Abort')).not.toBeInTheDocument();

// ✅ Multiple assertions together
await waitFor(() => {
  expect(mockApi.method).toHaveBeenCalled();
  expect(mockRestart).toHaveBeenCalled();
});
```

**Key Rules:**

- Use `findBy*` for async elements that will appear
- Use `queryBy*` for negative assertions (element should not exist)
- Use `getBy*` for synchronous elements that must exist
- Always add explicit `.toBeInTheDocument()` assertions after `findBy*` for clarity
- Wrap multiple assertions in `waitFor()` when they depend on async operations

### 2. Mock Strategy

**What to Mock:**

- Child components (replace with simple test stubs)
- External dependencies (APIs, hooks, utilities)
- React Router hooks (`useNavigate`, `useRouteRef`, etc.)
- Third-party libraries that don't affect the test logic

**Simplify Unused Mocks:**

```typescript
// ✅ Not verified in tests - use simple function
jest.mock('../../utils/deepSearchObject', () => ({
  deepSearchObject: () => null,
}));

// ❌ Not verified in tests - unnecessary jest.fn()
jest.mock('../../utils/deepSearchObject', () => ({
  deepSearchObject: jest.fn(() => null),
}));

// ✅ Verified in tests - use jest.fn()
const mockOrchestratorApi = {
  abortWorkflowInstance: jest.fn().mockResolvedValue({}),
};
```

**Mock Child Components:**

```typescript
jest.mock('./ChildComponent', () => ({
  ChildComponent: ({ data }: any) => <div>Mock: {data.id}</div>,
}));
```

### 3. Test Organization

**Structure:**

```typescript
describe('ComponentName', () => {
  let mockApi: any;

  beforeEach(() => {
    jest.clearAllMocks();
    mockApi = {
      method: jest.fn().mockResolvedValue({ data: mockData }),
    };
  });

  describe('Basic Rendering', () => {
    it('should render loading state', async () => { ... });
    it('should render with data', async () => { ... });
  });

  describe('User Interactions', () => {
    it('should handle button click', async () => { ... });
  });

  describe('Error Handling', () => {
    it('should display error message', async () => { ... });
  });

  describe('Permissions', () => {
    it('should disable actions without permission', async () => { ... });
  });
});
```

**Grouping Guidelines:**

- Group related tests in `describe` blocks
- Use clear, descriptive test names: `it('should...')`
- Order from simple to complex: Basic Rendering → Interactions → Edge Cases

### 4. Common Patterns

**User Interactions:**

```typescript
it('should handle button click and verify API call', async () => {
  const user = userEvent.setup({ delay: null });
  await renderComponent();

  const button = await screen.findByText('Submit');
  await user.click(button);

  await waitFor(() => {
    expect(mockApi.submit).toHaveBeenCalledWith(expectedData);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument(); // Dialog closed
  });
});
```

**Dialog/Modal Testing:**

```typescript
// ✅ GOOD: Test complete open/close flow in one test
it('should open and close dialog', async () => {
  const user = userEvent.setup({ delay: null });
  await renderComponent();

  // Open dialog
  const openButton = await screen.findByText('Open Dialog');
  await user.click(openButton);

  // Verify dialog opens
  expect(await screen.findByRole('dialog')).toBeInTheDocument();

  // Close dialog
  const closeButton = screen
    .getAllByText('Close')
    .find(btn => btn.closest('[role="dialog"]'));
  await user.click(closeButton!);

  // Verify dialog closes
  await waitFor(() => {
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});

// ❌ BAD: Separate open and close tests (redundant setup)
it('should open dialog', async () => {
  // ... open and verify ...
});
it('should close dialog', async () => {
  // ... duplicates all setup from open test, then closes ...
});
```

**Permission Testing:**

```typescript
it('should disable action when user lacks permission', async () => {
  mockPermission.mockReturnValue({ allowed: false });

  await renderComponent();

  const button = await screen.findByText('Delete');
  expect(button.closest('button')).toBeDisabled();
});
```

**Error Handling:**

```typescript
it('should display error message when API fails', async () => {
  mockApi.getData.mockRejectedValue(new Error('API Error'));

  await renderComponent();

  expect(await screen.findByText('API Error')).toBeInTheDocument();
});
```

### 5. Anti-Patterns to Avoid

**❌ Don't:**

- Use test IDs when semantic queries are available
- Create duplicate smoke tests that just verify component renders
- Test implementation details (internal state, private methods)
- Mix multiple unrelated assertions without grouping
- Leave async queries without explicit assertions
- Mock functions that are never verified
- Create tests that add no value beyond "component doesn't crash"
- **Split open/close dialog tests when close test duplicates open test setup**
- **Create separate single/multiple item tests when multiple inherently tests single**
- **Write multiple tests with identical assertions but different data**
- **Use `as any` type assertions - always use proper TypeScript types**

**✅ Do:**

- Test user-visible behavior
- Verify complete user flows (click button → verify API call → verify UI update)
- Use `mockInstance.id` instead of hardcoding values
- Keep tests DRY with shared helper functions
- Add assertions to verify UI cleanup (dialogs close, menus disappear)
- **Merge open/close dialog tests into one comprehensive test**
- **Use `rerender` to test component behavior with different props/states**
- **Consolidate tests with same assertions into one test with multiple data types**
- **Import and use proper TypeScript types (enums, interfaces) instead of `as any`**
- **Run TypeScript compilation (`yarn tsc --noEmit`) to verify type safety**

### 6. Test Consolidation Principles

**Merge tests that duplicate setup:**

```typescript
// ❌ BAD: Two tests with duplicate setup
it('should open workflow modal', async () => {
  const user = userEvent.setup({ delay: null });
  renderComponent(instanceWithWorkflows);

  const workflowLink = await screen.findByText('Next Workflow');
  await user.click(workflowLink);

  expect(await screen.findByRole('dialog')).toBeInTheDocument();
});

it('should close workflow modal', async () => {
  const user = userEvent.setup({ delay: null }); // ❌ Duplicate
  renderComponent(instanceWithWorkflows); // ❌ Duplicate

  const workflowLink = await screen.findByText('Next Workflow'); // ❌ Duplicate
  await user.click(workflowLink); // ❌ Duplicate

  expect(await screen.findByRole('dialog')).toBeInTheDocument();

  const closeButton = screen.getByText('Close');
  await user.click(closeButton);

  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
});

// ✅ GOOD: One comprehensive test
it('should open and close workflow modal', async () => {
  const user = userEvent.setup({ delay: null });
  renderComponent(instanceWithWorkflows);

  // Open modal
  const workflowLink = await screen.findByText('Next Workflow');
  await user.click(workflowLink);
  expect(await screen.findByRole('dialog')).toBeInTheDocument();

  // Close modal
  const closeButton = screen.getByText('Close');
  await user.click(closeButton);
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
});
```

**Consolidate tests with same assertions:**

```typescript
// ❌ BAD: Three tests, same assertion
it('should render string values', async () => {
  renderComponent(instanceWithStringValue);
  expect(await screen.findByText('Values')).toBeInTheDocument();
});

it('should render array values', async () => {
  renderComponent(instanceWithArrayValue);
  expect(await screen.findByText('Values')).toBeInTheDocument(); // Same assertion!
});

it('should render object values', async () => {
  renderComponent(instanceWithObjectValue);
  expect(await screen.findByText('Values')).toBeInTheDocument(); // Same assertion!
});

// ✅ GOOD: One test with all value types
it('should render value outputs with different types (string, number, array, object)', async () => {
  const instance = {
    outputs: [
      { key: 'status', value: 'success', format: 'text' },
      { key: 'count', value: 42, format: 'number' },
      { key: 'items', value: ['a', 'b'], format: 'text' },
      { key: 'data', value: { foo: 'bar' }, format: 'text' },
    ],
  };

  renderComponent(instance);

  expect(await screen.findByText('Values')).toBeInTheDocument();
  // Actually verify the values are rendered correctly
  expect(screen.getByText('success')).toBeInTheDocument();
  expect(screen.getByText('42')).toBeInTheDocument();
});
```

**Use rerender for state transitions:**

```typescript
// ❌ BAD: Two separate tests for different states
it('should show error status for failed workflow', async () => {
  renderComponent(errorInstance);
  expect(await screen.findByText('Failed')).toBeInTheDocument();
});

it('should show warning for completed workflow with error', async () => {
  renderComponent(completedWithErrorInstance);
  expect(await screen.findByText('Completed with warnings')).toBeInTheDocument();
});

// ✅ GOOD: One test showing state transition
it('should display different status messages based on workflow state', async () => {
  const { rerender } = render(<TestWrapper instance={errorInstance} />);

  // Error state
  expect(await screen.findByText('Failed')).toBeInTheDocument();

  // Completed with error state
  rerender(<TestWrapper instance={completedWithErrorInstance} />);
  expect(await screen.findByText('Completed with warnings')).toBeInTheDocument();
  expect(screen.queryByText('Failed')).not.toBeInTheDocument();
});
```

**Remove redundant single-item tests:**

```typescript
// ❌ BAD: Separate tests for single and multiple
it('should render single workflow', async () => {
  renderComponent(instanceWithOneWorkflow);
  expect(
    await screen.findByText('Suggested Next Workflow'),
  ).toBeInTheDocument();
  expect(await screen.findByText('Workflow One')).toBeInTheDocument();
});

it('should render multiple workflows', async () => {
  renderComponent(instanceWithMultipleWorkflows);
  expect(
    await screen.findByText('Suggested Next Workflows'),
  ).toBeInTheDocument();
  expect(await screen.findByText('Workflow One')).toBeInTheDocument();
  expect(await screen.findByText('Workflow Two')).toBeInTheDocument();
});

// ✅ GOOD: Multiple test proves single works
it('should render suggested next workflows with plural label when multiple', async () => {
  renderComponent(instanceWithMultipleWorkflows);

  expect(
    await screen.findByText('Suggested Next Workflows'),
  ).toBeInTheDocument();
  expect(await screen.findByText('Workflow One')).toBeInTheDocument();
  expect(await screen.findByText('Workflow Two')).toBeInTheDocument();
  // If two workflows render correctly, one workflow obviously works too
});
```

### 7. Coverage Goals

**What to Test:**

- ✅ Component renders with different props/states
- ✅ User interactions trigger expected behavior
- ✅ API calls are made with correct parameters
- ✅ Error states display properly
- ✅ Permission checks enable/disable features
- ✅ Conditional rendering based on state
- ✅ UI cleanup (dialogs close, forms reset)

**What NOT to Test:**

- ❌ Third-party library internals
- ❌ Exact CSS class names
- ❌ Component internal state structure
- ❌ Mock implementation behavior

## Test File Template

```typescript
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import userEvent from '@testing-library/user-event';
import { ComponentName } from './ComponentName';

// Mock child components
jest.mock('./ChildComponent', () => ({
  ChildComponent: ({ data }: any) => <div>Child: {data.id}</div>,
}));

// Mock dependencies
jest.mock('../../hooks/useData', () => ({
  useData: jest.fn(),
}));

describe('ComponentName', () => {
  let mockProps: any;
  let mockUseData: any;

  beforeEach(() => {
    jest.clearAllMocks();

    mockUseData = {
      data: { id: 'test-id', name: 'Test' },
      loading: false,
      error: null,
    };

    const { useData } = require('../../hooks/useData');
    useData.mockReturnValue(mockUseData);

    mockProps = {
      onSubmit: jest.fn(),
      title: 'Test Component',
    };
  });

  const renderComponent = async (props = {}) => {
    return render(<ComponentName {...mockProps} {...props} />);
  };

  describe('Basic Rendering', () => {
    it('should render with title', async () => {
      await renderComponent();

      expect(await screen.findByText('Test Component')).toBeInTheDocument();
    });
  });

  describe('User Interactions', () => {
    it('should call onSubmit when button clicked', async () => {
      const user = userEvent.setup({ delay: null });
      await renderComponent();

      const button = await screen.findByRole('button', { name: /submit/i });
      await user.click(button);

      await waitFor(() => {
        expect(mockProps.onSubmit).toHaveBeenCalled();
      });
    });
  });

  describe('Error Handling', () => {
    it('should display error message', async () => {
      mockUseData.error = new Error('Failed to load');

      await renderComponent();

      expect(await screen.findByText('Failed to load')).toBeInTheDocument();
    });
  });
});
```

## Process

When the user asks to create tests:

1. **Read the component file** to understand:
   - Component props/interface
   - Dependencies (hooks, APIs, child components)
   - User interactions (buttons, forms, dialogs)
   - Conditional rendering logic
   - Permission checks

2. **Identify what to test:**
   - Main rendering paths
   - User interaction flows
   - Error scenarios
   - Permission states
   - Edge cases

3. **Create mock strategy:**
   - List child components to mock
   - Identify hooks/APIs to mock
   - Determine which mocks need verification (use `jest.fn()`)
   - Simplify mocks that are never verified (use simple functions)

4. **Generate test file:**
   - Follow the template structure
   - Use semantic queries (role, text, label)
   - Group tests logically
   - Verify complete user flows
   - Add explicit assertions

5. **Review for quality and consolidation:**
   - No duplicate tests
   - No test IDs unless absolutely necessary
   - All async queries have assertions
   - Tests verify behavior, not implementation
   - Good coverage of error paths and permissions
   - **Check for consolidation opportunities:**
     - Merge open/close dialog tests into one comprehensive test
     - Remove redundant single-item tests when multiple-item tests exist
     - Consolidate tests with identical assertions but different data
     - Use `rerender` for testing state transitions instead of separate tests

6. **Run tests and verify coverage:**
   - Execute the test file to ensure all tests pass
   - Check test coverage for the component being tested
   - Identify uncovered lines/branches
   - Add additional tests for gaps in coverage
   - Report final coverage metrics to user

7. **Verify TypeScript compilation:**
   - Run `yarn tsc --noEmit` to check for TypeScript errors
   - Fix any type errors in the test file
   - **Avoid using `as any`** - use proper types instead:
     - For enums, import and use the actual enum value
     - For complex objects, use `Object.assign()` to add properties
     - Remove unnecessary type assertions where TypeScript can infer types
   - Ensure zero compilation errors before marking tests as complete

8. **Format with Prettier:**
   - Run `yarn prettier --write "path/to/*.test.tsx"` to format the test files
   - This ensures consistent code formatting across the project
   - Verify tests still pass and TypeScript still compiles after formatting

## Example Usage

**User:** "Create tests for WorkflowInstancePage.tsx"

**Response:**

1. Read the component file
2. Identify: uses polling, has abort/rerun buttons, checks permissions, handles errors
3. Create test file with sections:
   - Basic Rendering (loading state, with data)
   - Abort Functionality (dialog open, confirm, error handling)
   - Rerun Functionality (menu selection, API call)
   - Error Handling (polling errors, API errors, permission errors)
   - Permissions (enabled/disabled states)
4. Use semantic queries throughout
5. Verify complete flows (click → API call → UI update)
6. Include explicit assertions for all async elements

## Running Tests and Checking Coverage

After generating tests, **always run them and check coverage:**

### 1. Run the Test File

```bash
yarn test ComponentName.test.tsx --watch=false --no-coverage
```

**Check for:**

- All tests pass ✅
- No syntax errors
- No missing dependencies

### 2. Run with Coverage

```bash
yarn test ComponentName.test.tsx --coverage --collectCoverageFrom='path/to/ComponentName.tsx' --watch=false
```

**Analyze coverage output:**

```
File                  | % Stmts | % Branch | % Funcs | % Lines | Uncovered Line #s
ComponentName.tsx     |   85.71 |    75.00 |   88.88 |   84.62 | 45-52,89
```

### 3. Identify Gaps

Look at uncovered lines:

- Are they error paths not tested?
- Edge cases (empty data, null values)?
- Permission denied scenarios?
- Different component states?

### 4. Add Missing Tests

Create additional tests to cover gaps:

```typescript
// Example: Line 45-52 was uncovered (error handling)
it('should handle network timeout error', async () => {
  mockApi.getData.mockRejectedValue(new Error('Network timeout'));
  await renderComponent();
  expect(await screen.findByText(/timeout/i)).toBeInTheDocument();
});
```

### 5. Report to User

```
✅ Generated test file with 12 tests
✅ All tests passing
✅ Coverage: 76.54% lines, 75% branches
📝 Recommendations:
   - Add test for permission denied scenario (lines 45-48)
   - Test loading state with delayed data (line 52)
```

**Coverage Goals:**

- **Good:** 70-80% line coverage
- **Great:** 80-90% line coverage
- **Excellent:** 90%+ line coverage
- **Diminishing returns:** Don't chase 100% - focus on meaningful tests

### 6. Verify TypeScript Compilation

After creating tests, always verify TypeScript compilation:

```bash
yarn tsc --noEmit
```

**Common TypeScript errors in tests and how to fix them:**

**1. Avoid `as any` - Use proper types:**

```typescript
// ❌ BAD: Using as any
const mockWorkflow = {
  id: 'workflow-123',
  format: 'json' as any,
};

// ✅ GOOD: Import and use enum
import { WorkflowFormatDTO } from '@package/common';
const mockWorkflow = {
  workflowId: 'workflow-123',
  format: WorkflowFormatDTO.Json,
};
```

**2. Adding properties to Error objects:**

```typescript
// ❌ BAD: Type casting
const error = new Error('Failed');
(error as any).response = { status: 403 };

// ✅ GOOD: Use Object.assign
const error = Object.assign(new Error('Failed'), {
  response: { status: 403 },
});
```

**3. Missing required properties:**

```typescript
// ❌ BAD: Missing required field
const error = { message: 'Error' };

// ✅ GOOD: Include all required fields
const error = {
  nodeDefinitionId: 'node-error',
  message: 'Error',
};
```

**4. Enum values in test data:**

```typescript
// ❌ BAD: String literals
outputs: [{ key: 'link', value: 'url', format: 'link' }];

// ✅ GOOD: Use enum
import { FormatEnum } from '@package/common';
outputs: [{ key: 'link', value: 'url', format: FormatEnum.Link }];
```

**If TypeScript errors occur:**

1. Read the error message carefully - it tells you exactly what's wrong
2. Check the type definition to understand required vs optional properties
3. Import the correct types and enums from the common package
4. Never use `as any` to silence errors - fix the underlying type issue
5. Run `yarn tsc --noEmit` again to verify the fix

### 7. Run Prettier to Format Code

After all tests pass and TypeScript compiles, format the test files with Prettier:

```bash
yarn prettier --write "path/to/*.test.tsx"
```

This ensures consistent code formatting according to project style rules. Prettier will automatically:

- Fix indentation and spacing
- Organize imports consistently
- Apply consistent quote styles
- Format multiline objects and arrays

After running prettier, verify tests still pass and TypeScript still compiles.

## Tips

- **Read before writing:** Always read the component first to understand its behavior
- **Think user-first:** Test what users see and do, not implementation details
- **Be comprehensive:** Cover happy path, error path, and edge cases
- **Keep it maintainable:** Use mock data from constants, avoid hardcoded values
- **Verify cleanup:** Check that dialogs close, forms reset, menus disappear
- **Run and iterate:** Generate tests, run them, fix failures, add missing coverage
- **Coverage is a guide:** High coverage doesn't guarantee good tests - focus on meaningful assertions
- **Type safety is mandatory:** Always run `yarn tsc --noEmit` and fix all TypeScript errors - never use `as any`
- **Consistent formatting:** Always run `yarn prettier --write` on test files to ensure consistent code style
