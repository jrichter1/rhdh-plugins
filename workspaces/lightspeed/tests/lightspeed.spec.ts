import { test, expect } from '@playwright/test';

const modelBaseUrl = '*/**/api/lightspeed';
const createdAt = Date.now();

const models = [
  {
    id: 'mock-model-1',
    object: 'model',
    created: Math.floor(createdAt / 1000),
    owned_by: 'library',
  },
  {
    id: 'mock-model-2',
    object: 'model',
    created: Math.floor(createdAt / 1000),
    owned_by: 'library',
  },
];

const defaultConversation = {
  conversation_id: 'user:development/guest+Av8Fax73D4XPx5Ls',
};

const conversations = [
  {
    conversation_id: 'user:development/guest+Av8Fax73D4XPx5Ls',
    summary: 'Red Hat Developer Hub Assistance',
    lastMessageTimestamp: createdAt,
  },
];

const contents = [
  {
    lc: 1,
    type: 'constructor',
    id: ['langchain_core', 'messages', 'HumanMessage'],
    kwargs: {
      content: 'hello',
      response_metadata: {
        created_at: createdAt,
      },
      additional_kwargs: {},
    },
  },
  {
    lc: 1,
    type: 'constructor',
    id: ['langchain_core', 'messages', 'AIMessage'],
    kwargs: {
      content: 'Fuck off',
      response_metadata: {
        created_at: createdAt,
        model: models[1].id,
      },
      tool_calls: [],
      invalid_tool_calls: [],
      additional_kwargs: {},
    },
  },
];

function generateQueryResponse(conversationId: string) {
  const titles = ['looser', 'bitch', 'shithead', 'dumbass'];
  const response = `Fuck off , ${titles[Math.round(Math.random() * (titles.length - 1))]}`;
  let body = '';

  for (const token of response.split(' ')) {
    body += `{"conversation_id":"${conversationId}","response":{"lc":1,"type":"constructor","id":["langchain_core","messages","AIMessageChunk"],"kwargs":{"content":" ${token}","tool_call_chunks":[],"additional_kwargs":{},"id":"chatcmpl-890","tool_calls":[],"invalid_tool_calls":[],"response_metadata":{"prompt":0,"completion":0,"created_at":1736332476031,"model":"${models[1].id}"}}}}`;
  }
  body += `{"conversation_id":"${conversationId}","response":{"lc":1,"type":"constructor","id":["langchain_core","messages","AIMessageChunk"],"kwargs":{"content":"","tool_call_chunks":[],"additional_kwargs":{},"id":"chatcmpl-890","tool_calls":[],"invalid_tool_calls":[],"response_metadata":{"prompt":0,"completion":0,"finish_reason":"stop","system_fingerprint":"fp_ollama","created_at":1736332476031,"model":"${models[1].id}"}}}}`;

  return body;
}

test.beforeEach(async ({ page }) => {
  await page.route(`${modelBaseUrl}/v1/models`, async route => {
    const json = { object: 'list', data: models };
    await route.fulfill({ json });
  });
  await page.route(`${modelBaseUrl}/conversations`, async route => {
    if (route.request().method() === 'GET') {
      const json = [];
      await route.fulfill({ json });
    }
    if (route.request().method() === 'POST') {
      const json = defaultConversation;
      await route.fulfill({ json });
    }
  });
  await page.route(`${modelBaseUrl}/conversations/user*`, async route => {
    const json = [];
    await route.fulfill({ json });
  });
  await page.route(`${modelBaseUrl}/v1/query`, async route => {
    const payload = route.request().postDataJSON();
    conversations[0].conversation_id = payload.conversation_id;
    contents[0].kwargs.content = payload.query;
    const body = generateQueryResponse(payload.conversation_id);
    await route.fulfill({ body });
  });
});

test('has title', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Enter' }).click();

  const navLink = page.locator(`nav a:has-text("lightspeed")`).first();
  await navLink.waitFor({ state: 'visible' });
  await navLink.click();

  const model = models[1].id;
  const dropdown = page.locator('button[aria-label="Chatbot selector"]');
  await dropdown.waitFor({ state: 'visible' });
  await dropdown.click();
  await page.getByText(model).click();
  expect(dropdown).toHaveText(model);

  await page.route(`${modelBaseUrl}/conversations`, async route => {
    if (route.request().method() === 'GET') {
      const json = conversations;
      await route.fulfill({ json });
    } else {
      await route.fulfill();
    }
  });
  await page.route(`${modelBaseUrl}/conversations/user*`, async route => {
    const json = contents;
    await route.fulfill({ json });
  });

  const inputLocator = page.getByRole('textbox').first();
  await inputLocator.waitFor({ state: 'visible' });
  await inputLocator.fill('fuck you too');
  await page.locator('button[aria-label="Send button"]').click();

  await page.waitForTimeout(10000);
});
