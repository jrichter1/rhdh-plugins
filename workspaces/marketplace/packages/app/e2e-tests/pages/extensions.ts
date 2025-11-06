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

import { Page, expect, Locator } from '@playwright/test';
import { ExtensionHelper } from '../utils/helper';
import type { MarketplaceMessages } from '../utils/translations';

export class Extensions {
  private page: Page;
  public badge: Locator;
  // private uiHelper: UIhelper;
  private extensionHelper: ExtensionHelper;
  private translations: MarketplaceMessages;

  constructor(page: Page, translations: MarketplaceMessages) {
    this.page = page;
    this.translations = translations;
    this.badge = this.page.getByTestId('TaskAltIcon');
    // this.uiHelper = new UIhelper(page);
    this.extensionHelper = new ExtensionHelper(page);
  }

  private getCommonHeadings() {
    return [
      this.translations.metadata.versions,
      'Author',
      'Tags',
      this.translations.metadata.category,
      this.translations.metadata.publisher,
      this.translations.metadata.supportProvider,
    ];
  }

  private getTableHeaders() {
    return [
      this.translations.installedPackages.table.columns.packageName,
      this.translations.installedPackages.table.columns.version,
      this.translations.installedPackages.table.columns.role,
      'Backstage compatibility version',
      this.translations.table.status,
    ];
  }

  async navigateToExtensions(navText: string) {
    const navLink = this.page.locator(`nav a:has-text("${navText}")`).first();
    await navLink.waitFor({ state: 'visible', timeout: 15_000 });
    await navLink.dispatchEvent('click');
    await this.page
      .getByRole('heading', { name: navText })
      .waitFor({ state: 'visible' });
  }

  async clickReadMoreByPluginTitle(pluginTitle: string) {
    const allCards = this.page.locator('.v5-MuiPaper-outlined');
    const targetCard = allCards.filter({ hasText: pluginTitle });
    await targetCard.getByRole('link', { name: 'Read more' }).click();
  }

  async selectDropdown(name: string) {
    await this.page
      .getByLabel(name)
      .getByRole('button', { name: 'Open' })
      .click();
  }

  async toggleOption(name: string) {
    await this.page
      .getByRole('option', { name: name })
      .getByRole('checkbox')
      .click();
  }

  async clickAway() {
    await this.page.locator('#menu- div').first().click();
  }

  async selectSupportTypeFilter(supportType: string) {
    await this.selectDropdown(this.translations.search.supportType);
    await this.toggleOption(supportType);
    await this.page.keyboard.press('Escape');
  }

  async resetSupportTypeFilter(supportType: string) {
    await this.selectDropdown(this.translations.search.supportType);
    await this.toggleOption(supportType);
    await this.page.keyboard.press('Escape');
  }

  async verifyMultipleHeadings(headings: string[] = this.getCommonHeadings()) {
    for (const heading of headings) {
      await this.page
        .getByRole('heading', { name: this.translations.header.extensions })
        .waitFor({ state: 'visible' });
    }
  }

  async waitForSearchResults(searchText: string) {
    await expect(
      this.page.locator('.v5-MuiPaper-outlined').first(),
    ).toContainText(searchText, { timeout: 10000 });
  }

  async verifyPluginDetails({
    pluginName,
    badgeLabel,
    badgeText,
    headings = this.getCommonHeadings(),
    includeTable = true,
    includeAbout = false,
  }: {
    pluginName: string;
    badgeLabel: string;
    badgeText: string;
    headings?: string[];
    includeTable?: boolean;
    includeAbout?: boolean;
  }) {
    await this.clickReadMoreByPluginTitle(pluginName);
    await expect(
      this.page.getByLabel(badgeLabel).getByText(badgeText),
    ).toBeVisible();

    if (includeAbout) {
      const exact: boolean = true;
      await this.extensionHelper.verifyTextInLocator(
        '',
        this.translations.metadata.about,
        exact,
      );
    }

    await this.verifyMultipleHeadings(headings);

    if (includeTable) {
      await this.extensionHelper.verifyTableHeadingAndRows(
        this.getTableHeaders(),
      );
    }

    await this.page
      .getByRole('button', { name: this.translations.button.close })
      .click();
  }

  async verifySupportTypeBadge({
    supportType,
    pluginName,
    badgeLabel,
    badgeText,
    tooltipText,
    searchTerm,
    headings = this.getCommonHeadings(),
    includeTable = true,
    includeAbout = false,
  }: {
    supportType: string;
    pluginName?: string;
    badgeLabel: string;
    badgeText: string;
    tooltipText: string;
    searchTerm?: string;
    headings?: string[];
    includeTable?: boolean;
    includeAbout?: boolean;
  }) {
    await this.selectSupportTypeFilter(supportType);

    if (searchTerm) {
      await this.extensionHelper.searchInputPlaceholder(searchTerm);
      await this.waitForSearchResults(searchTerm);
    }

    if (pluginName) {
      await this.verifyPluginDetails({
        pluginName,
        badgeLabel,
        badgeText,
        headings,
        includeTable,
        includeAbout,
      });
    } else {
      await expect(this.page.getByLabel(badgeLabel).first()).toBeVisible();
      await expect(this.badge.first()).toBeVisible();
      await this.badge.first().hover();
      const tooltip = this.page.getByRole('tooltip').getByText(tooltipText);
      await expect(tooltip).toBeVisible();
    }

    await this.resetSupportTypeFilter(supportType);
  }

  async verifyKeyValueRowElements(rowTitle: string, rowValue: string) {
    const rowLocator = this.page.locator('.v5-MuiTableRow-root');
    await expect(rowLocator.filter({ hasText: rowTitle })).toContainText(
      rowValue,
    );
  }
}
