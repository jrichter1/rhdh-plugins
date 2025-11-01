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

import { getTestLanguage, LANGUAGE_SHORTCUTS } from './testUtils.js';
// These translation files are not exported by the package, so relative imports are necessary for e2e tests
/* eslint-disable @backstage/no-relative-monorepo-imports */
import { homepageMessages } from '../../../../plugins/dynamic-home-page/src/translations/ref.js';
import homepageTranslationDe from '../../../../plugins/dynamic-home-page/src/translations/de.js';
import homepageTranslationFr from '../../../../plugins/dynamic-home-page/src/translations/fr.js';
import homepageTranslationEs from '../../../../plugins/dynamic-home-page/src/translations/es.js';
import homepageTranslationIt from '../../../../plugins/dynamic-home-page/src/translations/it.js';
/* eslint-enable @backstage/no-relative-monorepo-imports */

export type HomepageTexts = {
  onboarding: {
    greeting: {
      goodMorning: string;
      goodAfternoon: string;
      goodEvening: string;
    };
    getStarted: { title: string; description: string; buttonText: string };
    explore: { title: string; description: string; buttonText: string };
    learn: { title: string; description: string; buttonText: string };
  };
  quickAccess: {
    title: string;
    fetchError: string;
    error: string;
  };
  entities: {
    title: string;
    description: string;
    viewAll: (count: number) => string;
  };
  templates: {
    title: string;
    empty: string;
    emptyDescription: string;
    register: string;
  };
};

function getNestedValue(obj: any, path: string): string {
  return path.split('.').reduce((current, key) => current?.[key], obj) || '';
}

function transformTranslations(
  messages: Record<string, string> | any,
  isNested = false,
): HomepageTexts {
  const getValue = (key: string) => {
    if (isNested) {
      return getNestedValue(messages, key);
    }
    return messages[key] || getNestedValue(homepageMessages, key);
  };

  return {
    onboarding: {
      greeting: {
        goodMorning: getValue('onboarding.greeting.goodMorning'),
        goodAfternoon: getValue('onboarding.greeting.goodAfternoon'),
        goodEvening: getValue('onboarding.greeting.goodEvening'),
      },
      getStarted: {
        title: getValue('onboarding.getStarted.title'),
        description: getValue('onboarding.getStarted.description'),
        buttonText: getValue('onboarding.getStarted.buttonText'),
      },
      explore: {
        title: getValue('onboarding.explore.title'),
        description: getValue('onboarding.explore.description'),
        buttonText: getValue('onboarding.explore.buttonText'),
      },
      learn: {
        title: getValue('onboarding.learn.title'),
        description: getValue('onboarding.learn.description'),
        buttonText: getValue('onboarding.learn.buttonText'),
      },
    },
    quickAccess: {
      title: getValue('quickAccess.title'),
      fetchError: getValue('quickAccess.fetchError'),
      error: getValue('quickAccess.error'),
    },
    entities: {
      title: getValue('entities.title'),
      description: getValue('entities.description'),
      viewAll: (count: number) =>
        getValue('entities.viewAll').replace('{{count}}', String(count)),
    },
    templates: {
      title: getValue('templates.title'),
      empty: getValue('templates.empty'),
      emptyDescription: getValue('templates.emptyDescription'),
      register: getValue('templates.register'),
    },
  };
}

const translations: Record<string, HomepageTexts> = {
  en: transformTranslations(homepageMessages, true),
  de: transformTranslations((homepageTranslationDe as any).messages, false),
  fr: transformTranslations((homepageTranslationFr as any).messages, false),
  es: transformTranslations((homepageTranslationEs as any).messages, false),
  it: transformTranslations((homepageTranslationIt as any).messages, false),
};

export const getCurrentHomepageLanguage = (): string => {
  const fullLanguage = getTestLanguage();
  const shortcut = Object.entries(LANGUAGE_SHORTCUTS).find(
    ([, lang]) => lang === fullLanguage,
  )?.[0];
  return shortcut || 'en';
};

export const getHomepageTranslations = (): HomepageTexts => {
  const lang = getCurrentHomepageLanguage();
  return translations[lang] || translations.en;
};
