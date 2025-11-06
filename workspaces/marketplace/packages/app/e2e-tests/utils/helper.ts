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

import { Page, expect } from '@playwright/test';

export class ExtensionHelper {
  private page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  async verifyTextInLocator(
    locator: string,
    text: string | RegExp,
    exact: boolean,
  ) {
    const elementLocator = locator
      ? this.page.locator(locator).getByText(text, { exact }).first()
      : this.page.getByText(text, { exact }).first();

    await elementLocator.waitFor({ state: 'visible' });
    await elementLocator.waitFor({ state: 'attached' });

    try {
      await elementLocator.scrollIntoViewIfNeeded();
    } catch (error) {
      // eslint-disable-next-line no-console
      console.warn(
        `Warning: Could not scroll element into view. Error: ${error.message}`,
      );
    }
    await expect(elementLocator).toBeVisible();
  }

  async verifyTableHeadingAndRows(texts: string[]) {
    // Wait for the table to load by checking for the presence of table rows
    await this.page.waitForSelector('table tbody tr', { state: 'visible' });
    for (const column of texts) {
      const columnSelector = `table th:has-text("${column}")`;
      // check if  columnSelector has at least one element or more
      const columnCount = await this.page.locator(columnSelector).count();
      expect(columnCount).toBeGreaterThan(0);
    }

    // Checks if the table has at least one row with data
    // Excludes rows that have cells spanning multiple columns, such as "No data available" messages
    const rowSelector = `table tbody tr:not(:has(td[colspan]))`;
    const rowCount = await this.page.locator(rowSelector).count();
    expect(rowCount).toBeGreaterThan(0);
  }

  async searchInputPlaceholder(searchTerm: string) {
    await this.page.fill('input[placeholder="Search"]', searchTerm);
  }

  async verifyHeading(heading: string | RegExp, timeout: number = 20000) {
    await this.page
      .getByRole('heading', { name: heading })
      .waitFor({ state: 'visible', timeout: timeout });
  }

  async clickTab(tabName: string) {
    const tabLocator = this.page.getByRole('tab', { name: tabName });
    await tabLocator.waitFor({ state: 'visible' });
    await tabLocator.click();
  }

  async clickButton(buttonName: string) {
    const buttonLocator = this.page.getByRole('button', { name: buttonName });
    await buttonLocator.waitFor({ state: 'visible' });
    await buttonLocator.click();
  }

  async clickByDataTestId(dataTestId: string) {
    const element = this.page.getByTestId(dataTestId);
    await element.waitFor({ state: 'visible' });
    await element.dispatchEvent('click');
  }
}
