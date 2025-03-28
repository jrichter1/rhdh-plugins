/*
 * Copyright 2024 The Backstage Authors
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
import { initCustom } from '@kie-tools-core/editor/dist/envelope';
import {
  ServerlessWorkflowDiagramEditorChannelApi,
  ServerlessWorkflowDiagramEditorEnvelopeApi,
} from '@kie-tools/serverless-workflow-diagram-editor-envelope/dist/api';
import {
  ServerlessWorkflowDiagramEditor,
  ServerlessWorkflowDiagramEditorEnvelopeApiImpl,
  ServerlessWorkflowDiagramEditorFactory,
} from '@kie-tools/serverless-workflow-diagram-editor-envelope/dist/envelope';

initCustom<
  ServerlessWorkflowDiagramEditor,
  ServerlessWorkflowDiagramEditorEnvelopeApi,
  ServerlessWorkflowDiagramEditorChannelApi
>({
  container: document.getElementById('root')!,
  bus: {
    postMessage: (message, targetOrigin: string, _) =>
      window.parent.postMessage(message, targetOrigin, _),
  },
  apiImplFactory: {
    create: args =>
      new ServerlessWorkflowDiagramEditorEnvelopeApiImpl(
        args,
        new ServerlessWorkflowDiagramEditorFactory({
          shouldLoadResourcesDynamically: true,
        }),
      ),
  },
});
