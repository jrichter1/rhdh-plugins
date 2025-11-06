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

import { test, expect, Page, type BrowserContext } from '@playwright/test';
import { Extensions } from './pages/extensions';
import { runAccessibilityTests } from './utils/accessibility';
import { ExtensionHelper } from './utils/helper';
import {
  MarketplaceMessages,
  getTranslations,
  replaceTemplate,
} from './utils/translations';

test.describe('Admin > Extensions', () => {
  let extensions: Extensions;
  let extensionHelper: ExtensionHelper;
  let translations: MarketplaceMessages;
  let sharedPage: Page;
  let sharedContext: BrowserContext;
  const isMac = process.platform === 'darwin';

  const commonHeadings = [
    'Versions',
    'Author',
    'Tags',
    'Category',
    'Publisher',
    'Support Provider',
  ];
  const supportTypeOptions = [
    'Generally available',
    'Certified',
    'Custom plugin',
    'Tech preview',
    'Dev preview',
    'Community plugin',
  ];

  async function switchToLocale(page: Page, locale: string): Promise<void> {
    await page.getByRole('link', { name: 'Settings' }).click();
    await page.getByRole('button', { name: 'English' }).click();
    await page.getByRole('option', { name: locale }).click();
    await page.locator('a').filter({ hasText: 'Home' }).click();
  }

  test.beforeAll(async ({ browser }) => {
    test.info().annotations.push({
      type: 'component',
      description: 'core',
    });

    sharedContext = await browser.newContext();
    sharedPage = await sharedContext.newPage();
    const currentLocale = await sharedPage.evaluate(
      () => globalThis.navigator.language.split('-')[0],
    );
    await sharedPage.goto('/');
    await sharedPage.getByRole('button', { name: 'Enter' }).click();

    await switchToLocale(sharedPage, currentLocale);
    translations = getTranslations(currentLocale);
  });

  test.afterAll(async () => {
    await sharedContext.close();
  });

  test.beforeEach(async ({ page }) => {
    extensions = new Extensions(page, translations);
    extensionHelper = new ExtensionHelper(page);
    const navLink = page.locator(`nav button[aria-label="Administration"]`);
    await navLink.waitFor({ state: 'visible' });
    await navLink.click();
    await extensions.navigateToExtensions(translations.header.extensions);
  });

  test.describe('Extensions > Catalog', () => {
    test('Verify search bar in extensions', async ({ page }) => {
      await extensionHelper.searchInputPlaceholder('Dynatrace');
      await extensionHelper.verifyHeading('DynaTrace');
      await page.getByRole('button', { name: 'Clear Search' }).click();
    });

    test('Verify category and author filters in extensions', async ({
      page,
    }, testInfo) => {
      await extensionHelper.verifyHeading(/Plugins \(\d+\)/);

      await runAccessibilityTests(page, testInfo);

      await extensionHelper.clickTab(translations.header.catalog);
      await extensionHelper.clickButton('CI/CD');
      await extensions.selectDropdown(translations.search.category);
      await page.getByRole('option', { name: 'CI/CD' }).isChecked();
      await page.keyboard.press(`Escape`);
      await extensions.selectDropdown(translations.search.author);
      await extensions.toggleOption('Red Hat');
      await page.keyboard.press(`Escape`);
      await extensionHelper.verifyHeading('Red Hat Argo CD');
      // await uiHelper.verifyText("by Red Hat");
      await extensionHelper.verifyTextInLocator('', 'by Red Hat', true);
      await page.getByRole('heading', { name: 'Red Hat Argo CD' }).click();
      await extensionHelper.verifyTableHeadingAndRows([
        translations.installedPackages.table.columns.packageName,
        translations.installedPackages.table.columns.version,
        translations.installedPackages.table.columns.role,
        'Backstage compatibility version',
        translations.table.status,
      ]);
      await extensionHelper.verifyHeading(translations.metadata.versions);
      await page
        .getByRole('button', { name: translations.button.close })
        .click();

      await page.getByRole('link', { name: 'Read more' }).click();

      // await uiHelper.clickLink("Read more");
      await page
        .getByRole('button', { name: translations.button.close })
        .click();
      await extensions.selectDropdown('Author');
      await extensions.toggleOption('Red Hat');
      await expect(
        page.getByRole('option', { name: 'Red Hat' }).getByRole('checkbox'),
      ).not.toBeChecked();
      await expect(page.getByRole('button', { name: 'Red Hat' })).toBeHidden();
      await page.keyboard.press(`Escape`);
      await expect(
        page.getByLabel('Category').getByRole('combobox'),
      ).toBeEmpty();
      await page.keyboard.press(`Escape`);
    });

    test('Verify support type filters in extensions', async ({ page }) => {
      await extensions.selectDropdown('Support type');
      await expect(page.getByRole('listbox')).toBeVisible();

      // Verify all support type options are present
      for (const option of supportTypeOptions) {
        await expect(page.getByRole('listbox')).toContainText(option);
      }

      await page.keyboard.press('Escape');
      await expect(
        page.getByLabel('Category').getByRole('combobox'),
      ).toBeEmpty();
    });

    test('Verify certified badge in extensions', async ({ page }) => {
      await extensions.selectDropdown('Support type');
      await extensions.toggleOption('Certified');
      await page.keyboard.press(`Escape`);
      await extensionHelper.verifyHeading('DynaTrace');
      await expect(
        page.getByLabel('Certified by Red Hat').first(),
      ).toBeVisible();
      await expect(extensions.badge.first()).toBeVisible();
      await extensions.badge.first().hover();
      const tooltip = page
        .getByRole('tooltip')
        .getByText('Certified by Red Hat');
      await expect(tooltip).toBeVisible();
      await extensionHelper.verifyHeading('DynaTrace');
      await page.getByRole('heading', { name: 'DynaTrace' }).first().click();
      await page
        .getByRole('button', { name: translations.button.close })
        .click();
      await page.getByRole('link', { name: 'Read more' }).click();

      await expect(
        page.getByLabel('Stable and secured by Red Hat').getByText('Certified'),
      ).toBeVisible();
      await extensionHelper.verifyTextInLocator(
        '',
        translations.metadata.about,
        true,
      );
      await extensionHelper.verifyHeading(translations.metadata.versions);
      await extensionHelper.verifyTableHeadingAndRows([
        translations.installedPackages.table.columns.packageName,
        translations.installedPackages.table.columns.version,
        translations.installedPackages.table.columns.role,
        'Backstage compatibility version',
        translations.table.status,
      ]);
      await page
        .getByRole('button', { name: translations.button.close })
        .click();
      await extensions.selectDropdown('Support type');
      await extensions.toggleOption('Certified');
    });

    test('Verify Generally available badge in extensions', async ({ page }) => {
      await extensions.selectSupportTypeFilter('Generally available (GA)');

      await expect(
        page
          .getByLabel('Generally available (GA) and supported by Red Hat')
          .first(),
      ).toBeVisible();
      await expect(extensions.badge.first()).toBeVisible();
      await extensions.badge.first().hover();
      const tooltip = page
        .getByRole('tooltip')
        .getByText('Generally available (GA) and supported by Red Hat');
      await expect(tooltip).toBeVisible();

      await page.getByRole('link', { name: 'Read more' }).click();

      await expect(
        page
          .getByLabel('Production-ready and supported by Red Hat')
          .getByText('Generally available (GA)'),
      ).toBeVisible();

      for (const heading of commonHeadings) {
        await extensionHelper.verifyHeading(heading);
      }

      await page
        .getByRole('button', { name: translations.button.close })
        .click();

      await extensions.resetSupportTypeFilter('Generally available (GA)');
    });

    // Skipping below test due to the issue: https://issues.redhat.com/browse/RHDHBUGS-2104
    test.skip('Verify custom plugin badge in extensions', async ({ page }) => {
      await extensions.selectDropdown('Support type');
      await extensions.toggleOption('Custom plugin');
      await page.keyboard.press(`Escape`);
      await expect(page.getByLabel('Custom plugins').first()).toBeVisible();
      await expect(extensions.badge.first()).toBeVisible();
      await extensions.badge.first().hover();
      const tooltip = page.getByRole('tooltip').getByText('Custom plugins');
      await expect(tooltip).toBeVisible();

      await page.getByRole('link', { name: 'Read more' }).click();

      await expect(
        page
          .getByLabel('Plugins added by the administrator')
          .getByText('Custom'),
      ).toBeVisible();
      await page
        .getByRole('button', { name: translations.button.close })
        .click();
      await extensions.selectDropdown('Support type');
      await extensions.toggleOption('Custom plugin');
      await page.keyboard.press(`Escape`);
    });

    test('Verify tech preview badge in extensions', async () => {
      await extensions.verifySupportTypeBadge({
        supportType: 'Tech preview (TP)',
        pluginName: 'Bulk Import',
        badgeLabel: 'Plugin still in development',
        badgeText: translations.badges.techPreview,
        tooltipText: '',
        searchTerm: 'Bulk Import',
        headings: ['About', 'Versions', ...commonHeadings],
        includeTable: true,
        includeAbout: false,
      });
    });

    test('Verify dev preview badge in extensions', async () => {
      await extensions.selectSupportTypeFilter('Dev preview (DP)');
      await extensionHelper.verifyHeading('Developer Lightspeed');

      await extensions.verifyPluginDetails({
        pluginName: 'Developer Lightspeed',
        badgeLabel: 'An early-stage, experimental',
        badgeText: 'Dev preview (DP)',
        headings: commonHeadings,
        includeTable: true,
        includeAbout: false,
      });

      await extensions.resetSupportTypeFilter('Dev preview (DP)');
    });

    test('Verify community plugin badge in extensions', async ({ page }) => {
      await extensions.selectSupportTypeFilter('Community plugin');

      await extensions.clickReadMoreByPluginTitle(
        'ServiceNow Integration for Red Hat Developer Hub',
      );
      await expect(
        page
          .getByLabel('Open-source plugins, no official support')
          .getByText('Community plugin'),
      ).toBeVisible();

      await extensionHelper.verifyTextInLocator(
        '',
        translations.metadata.about,
        true,
      );
      for (const heading of commonHeadings) {
        await extensionHelper.verifyHeading(heading);
      }

      await expect(page.getByText('AuthorRed Hat')).toBeVisible();

      await page
        .getByRole('button', { name: translations.button.close })
        .click();
      await extensions.resetSupportTypeFilter('Community plugin');
    });

    test.use({
      permissions: ['clipboard-read', 'clipboard-write'],
    });

    test('Verify plugin configuration can be viewed in the production environment', async ({
      page,
    }) => {
      const productionEnvAlert = page
        .locator('div[class*="MuiAlertTitle-root"]')
        .first();
      productionEnvAlert.getByText(
        'Plugin installation is disabled in the production environment.',
        { exact: true },
      );
      await extensionHelper.searchInputPlaceholder('Topology');
      await extensions.waitForSearchResults('Topology');
      await extensions.clickReadMoreByPluginTitle('Topology');
      await extensionHelper.clickButton(translations.actions.view);

      await extensionHelper.verifyHeading(
        'Application Topology for Kubernetes',
      );
      await extensionHelper.verifyTextInLocator(
        '',
        '- package: ./dynamic-plugins/dist/backstage-community-plugin-topology',
        true,
      );
      await extensionHelper.verifyTextInLocator('', 'disabled: false', true);
      await extensionHelper.verifyTextInLocator('', 'Apply', true);
      await extensionHelper.verifyHeading('Default configuration');
      await extensionHelper.clickButton('Apply');
      await extensionHelper.verifyTextInLocator('', 'pluginConfig:', true);
      await extensionHelper.verifyTextInLocator('', 'dynamicPlugins:', true);
      await extensionHelper.clickTab(translations.install.aboutPlugin);
      await extensionHelper.verifyHeading('Configuring The Plugin');
      await extensionHelper.clickTab(translations.install.examples);
      await extensionHelper.clickByDataTestId('ContentCopyRoundedIcon');
      await expect(page.getByRole('button', { name: '✔' })).toBeVisible();
      await extensionHelper.clickButton(translations.install.reset);
      await expect(page.getByText('pluginConfig:')).toBeHidden();
      const modifier = isMac ? 'Meta' : 'Control';
      await page.keyboard.press(`${modifier}+KeyA`);
      await page.keyboard.press(`${modifier}+KeyV`);
      await extensionHelper.verifyTextInLocator('', 'pluginConfig:', true);
      await page.locator("button[class^='copy-button']").nth(0).click();
      await expect(
        page.getByRole('button', { name: '✔' }).nth(0),
      ).toBeVisible();
      const clipboardContent = await page.evaluate(() =>
        window.navigator.clipboard.readText(),
      );
      expect(clipboardContent).not.toContain('pluginConfig:');
      expect(clipboardContent).toContain(
        'backstage-community.plugin-topology:',
      );
      await extensionHelper.clickButton(translations.install.back);
      await expect(
        page.getByRole('button', { name: translations.actions.view }),
      ).toBeVisible();
      await extensionHelper.verifyHeading(
        'Application Topology for Kubernetes',
      );
    });

    // Following test is disabled for CI as plugin installation is disabled in CI
    test.skip('Enable plugin from catalog extension page', async ({ page }) => {
      await extensionHelper.clickTab(translations.header.catalog);
      await extensions.clickReadMoreByPluginTitle(
        'Adoption Insights for Red Hat Developer Hub',
      );
      await extensionHelper.verifyHeading('Adoption Insights for Red Hat');
      await page.getByTestId('plugin-actions').click();
      await expect(page.getByLabel('EditPlugin')).toBeVisible();
      await page.getByTestId('disable-plugin').click();
      const alertText = await page.getByRole('alert').first().textContent();
      expect(alertText).toContain('Backend restart required');
      expect(alertText).toContain(
        'The Adoption Insights for Red Hat Developer Hub plugin requires a restart of the backend system to finish installing, updating, enabling or disabling.',
      );
    });
  });

  test.describe('Extensions > Installed Plugin', () => {
    test.beforeEach(async () => {
      await extensionHelper.clickTab(translations.header.installedPackages);
      await extensionHelper.verifyHeading(
        new RegExp(
          replaceTemplate(translations.header.installedPackagesWithCount, {
            count: '\\d+',
          }),
        ),
      );
    });

    test('Installed packages page', async ({ page }, testInfo) => {
      await runAccessibilityTests(page, testInfo);
      await extensionHelper.verifyTableHeadingAndRows([
        translations.installedPackages.table.columns.name,
        translations.installedPackages.table.columns.packageName,
        translations.installedPackages.table.columns.role,
        translations.installedPackages.table.columns.version,
        translations.installedPackages.table.columns.actions,
      ]);
      await page.waitForTimeout(2000);
      await page.getByRole('button', { name: 'Name', exact: true }).click();
      await expect(
        page.getByRole('cell', { name: 'Techdocs' }).first(),
      ).toBeVisible();
      await expect(
        page.getByRole('cell', {
          name: 'backstage-plugin-techdocs-module-addons-contrib',
        }),
      ).toBeVisible();
      await expect(
        page.getByRole('cell', { name: 'Frontend plugin module' }),
      ).toBeVisible();
      await expect(page.getByRole('cell', { name: '1.1.27' })).toBeVisible();
      await expect(
        page.locator('.v5-MuiBox-root.css-1i27l4i').first(),
      ).toBeVisible();
      await page.getByRole('button', { name: 'Rows per page: 5 rows' }).click();
      await page.getByRole('option', { name: '10', exact: true }).click();
      await page
        .locator('div')
        .getByRole('button', { name: 'Rows per page: 10 rows' })
        .scrollIntoViewIfNeeded();
      await expect(
        page.getByRole('button', { name: 'Rows per page: 10 rows' }),
      ).toBeVisible();
      await expect(
        page.getByRole('button', { name: 'Next Page' }),
      ).toBeVisible();
      await expect(
        page.getByRole('button', { name: 'Previous Page' }),
      ).toBeVisible();
    });

    test('Topology package sidebar for CI', async ({ page }) => {
      await page.getByRole('textbox', { name: 'Search' }).click();
      await page.getByRole('textbox', { name: 'Search' }).fill('Topology');
      await expect(
        page.getByRole('cell', { name: 'backstage-community-plugin-topology' }),
      ).toBeVisible();
      await expect(
        page
          .getByRole('row', { name: 'Topology backstage-community' })
          .getByTestId('EditIcon'),
      ).toBeVisible();
      await expect(
        page
          .getByRole('row', {
            name: 'Topology backstage-community-plugin-topology',
          })
          .getByTestId('FileDownloadOutlinedIcon'),
      ).toBeVisible();
      await expect(
        page
          .getByRole('row', {
            name: 'Topology backstage-community-plugin-topology',
          })
          .getByRole('checkbox'),
      ).toBeVisible();
      await page
        .getByRole('link', {
          name: 'Topology',
        })
        .click();
      await expect(
        page.getByRole('heading', {
          name: 'Topology',
        }),
      ).toBeVisible();
      await expect(page.getByRole('button', { name: 'View' })).toBeVisible();
      await page.getByRole('button', { name: 'View' }).hover();
      await page
        .getByRole('button', { name: translations.button.close })
        .click();
      await expect(
        page
          .getByRole('cell', {
            name: translations.installedPackages.table.tooltips.enableActions,
          })
          .first(),
      ).toBeVisible();
    });

    // Following test is disabled for CI as plugin installation is disabled in CI
    test.skip('Edit Analytics provider segment package through side menu ', async ({
      page,
    }) => {
      await page.getByRole('textbox', { name: 'Search' }).click();
      await page
        .getByRole('textbox', { name: 'Search' })
        .fill('Analytics provider segment');
      await expect(
        page.getByRole('cell', { name: 'Analytics Provider Segment' }),
      ).toBeVisible();
      await page
        .getByRole('link', { name: 'Analytics Provider Segment' })
        .click();
      await page.getByTestId('plugin-actions').click();
      await page.getByTestId('edit-configuration').click();
      await extensionHelper.verifyHeading(
        translations.install.editInstructions,
      );
      await expect(
        page.getByRole('tab', { name: translations.install.examples }),
      ).toBeVisible();
      await extensionHelper.verifyHeading(
        'backstage-community-plugin-analytics-provider-segment',
      );
      await expect(page.getByText('SaveCancelReset')).toBeVisible();
      await expect(page.getByText('plugins: - package: "./')).toBeVisible();
      await page.getByRole('button', { name: 'Apply' }).click();
      await expect(
        page.locator(
          '.v5-MuiCardContent-root [data-mode-id="yaml"] [role="code"]',
        ),
      ).toContainText('testMode: ${SEGMENT_TEST_MODE}');
      await page
        .getByRole('button', { name: translations.install.reset })
        .click();
      await expect(
        page.locator(
          '.v5-MuiCardContent-root [data-mode-id="yaml"] [role="code"]',
        ),
      ).not.toContainText('testMode: ${SEGMENT_TEST_MODE}');
      await page
        .getByRole('button', { name: translations.install.cancel })
        .click();
      await expect(
        page
          .locator('div')
          .filter({ hasText: 'Analytics Provider Segmentby' })
          .nth(4),
      ).toBeVisible();
      await page
        .getByRole('button', { name: translations.button.close })
        .click();
    });

    // Following test is disabled for CI as plugin installation is disabled in CI
    test.skip('Edit Analytics provider segment package through action cell in the installed package row ', async ({
      page,
    }) => {
      await page.getByRole('textbox', { name: 'Search' }).click();
      await page
        .getByRole('textbox', { name: 'Search' })
        .fill('Analytics provider segment');
      await expect(
        page.getByRole('cell', { name: 'Analytics Provider Segment' }),
      ).toBeVisible();
      await page
        .getByRole('button', {
          name: translations.installedPackages.table.tooltips.editPackage,
        })
        .click();
      await extensionHelper.verifyHeading(
        translations.install.editInstructions,
      );
      await expect(page.getByText('SaveCancelReset')).toBeVisible();
      await page
        .getByRole('button', { name: translations.button.save })
        .click();
      await extensionHelper.verifyHeading(
        new RegExp(
          replaceTemplate(translations.header.installedPackagesWithCount, {
            count: '\\d+',
          }),
        ),
        10000,
      );
      await expect(page.getByRole('alert').first()).toContainText(
        'The Analytics Provider Segment package requires a restart of the backend system to finish installing, updating, enabling or disabling.',
        { timeout: 10000 },
      );
    });

    // Following test is disabled for CI as plugin installation is disabled in CI
    test.skip('Plugin enable-disable toggle in action cell in the installed package row ', async ({
      page,
    }) => {
      await page.getByRole('textbox', { name: 'Search' }).click();
      await page
        .getByRole('textbox', { name: 'Search' })
        .fill('Dynamic Home Page');
      await expect(
        page.getByRole('cell', { name: 'Dynamic Home Page' }),
      ).toBeVisible();
      await page.getByRole('checkbox').hover();
      await expect(
        page.getByLabel(
          translations.installedPackages.table.tooltips.disablePackage,
        ),
      ).toBeVisible();
      await page.getByRole('checkbox').click();
      await expect(page.getByRole('alert').first()).toContainText(
        'The red-hat-developer-hub-backstage-plugin-dynamic-home-page package requires a restart of the backend system to finish installing, updating, enabling or disabling.',
        { timeout: 15000 },
      );
      await page.getByRole('textbox', { name: 'Search' }).fill('Global Header');
      await expect(
        page.getByRole('cell', { name: 'Global Header' }),
      ).toBeVisible();
      await page.getByRole('checkbox').hover();
      await expect(
        page.getByLabel(
          translations.installedPackages.table.tooltips.disablePackage,
        ),
      ).toBeVisible();
      await page.getByRole('checkbox').click();

      await page.getByRole('button', { name: 'View packages' }).click();
      await expect(
        page
          .getByLabel('Backend restart required')
          .getByText('Backend restart required'),
      ).toBeVisible({ timeout: 10000 });

      const packageVerifications = [
        { rowTitle: 'Name', rowValue: 'Action' },
        {
          rowTitle: 'red-hat-developer-hub-backstage-plugin-dynamic-home-page',
          rowValue: 'Package disabled',
        },
        {
          rowTitle: 'red-hat-developer-hub-backstage-plugin-global-header',
          rowValue: 'Package disabled',
        },
      ];

      for (const { rowTitle, rowValue } of packageVerifications) {
        await extensions.verifyKeyValueRowElements(rowTitle, rowValue);
      }

      await expect(page.getByText('To finish the package')).toBeVisible();
      await page
        .getByRole('button', { name: translations.button.close, exact: true })
        .click();
    });
  });
});
