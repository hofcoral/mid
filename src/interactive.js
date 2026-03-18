import { createRequire } from 'node:module';
import { ASSISTANTS } from './constants.js';
import { collectModules } from './catalog.js';

const require = createRequire(import.meta.url);
const { MultiselectPrompt } = require('prompts/lib/elements');
const { erase } = require('sisteransi');
const ALL_VALUE = '__mid_all__';

function moduleChoices(modules) {
  return modules.map((module) => ({
    title: module.label,
    value: module.id
  }));
}

function selectedValues(items) {
  return items.filter((item) => item.selected).map((item) => item.value);
}

function selectedTitles(choices, selected) {
  const selectedSet = new Set(selected);
  return choices
    .filter((choice) => selectedSet.has(choice.value))
    .map((choice) => choice.title);
}

function withAllChoice(choices, enabled) {
  if (!enabled || choices.length === 0) {
    return choices;
  }

  return [
    { title: 'All', value: ALL_VALUE },
    ...choices
  ];
}

function isAllValue(value) {
  return value === ALL_VALUE;
}

function realPromptItems(items) {
  return items.filter((item) => !isAllValue(item.value));
}

function syncAllChoice(items) {
  const allItem = items.find((item) => isAllValue(item.value));
  if (!allItem) {
    return;
  }

  const realItems = realPromptItems(items).filter((item) => !item.disabled);
  allItem.selected = realItems.length > 0 && realItems.every((item) => item.selected);
}

function renderBreadcrumbs(steps, config, activeStepIndex, previousLineCount) {
  if (process.stdout.isTTY) {
    process.stdout.write(erase.lines(previousLineCount + 1));
  }

  let lineCount = 0;

  for (let index = 0; index < activeStepIndex; index += 1) {
    const step = steps[index];
    const choices = step.getChoices();
    const selected = config[step.key] ?? [];
    const titles = selectedTitles(choices, selected);
    const suffix = titles.length > 0 ? ` › ${titles.join(', ')}` : '';
    process.stdout.write(`✔ ${step.message}${suffix}\n`);
    lineCount += 1;
  }

  return lineCount;
}

async function runMultiselectStep({ message, choices, selected, min = 0, allowBack = true, allowAll = false }) {
  if (choices.length === 0) {
    return { action: 'next', value: [] };
  }

  return new Promise((resolve, reject) => {
    const promptChoices = withAllChoice(choices, allowAll);
    const selectedSet = new Set(selected);
    const initialAllSelected = allowAll && choices.every((choice) => selectedSet.has(choice.value));
    const prompt = new MultiselectPrompt({
      message,
      choices: promptChoices.map((choice) => ({
        ...choice,
        selected: isAllValue(choice.value) ? initialAllSelected : selectedSet.has(choice.value)
      })),
      min: min || undefined,
      instructions: false,
      hint: ''
    });
    const toValue = (items) => selectedValues(realPromptItems(items));

    function toggleAllSelection() {
      const allItem = prompt.value.find((item) => isAllValue(item.value));
      const nextSelected = !(allItem?.selected);
      for (const item of realPromptItems(prompt.value)) {
        if (!item.disabled) {
          item.selected = nextSelected;
        }
      }
      syncAllChoice(prompt.value);
      prompt.render();
    }

    function toggleCurrentSelection() {
      const current = prompt.value[prompt.cursor];
      if (!current) {
        return;
      }

      if (isAllValue(current.value)) {
        toggleAllSelection();
        return;
      }

      if (current.selected) {
        current.selected = false;
      } else if (current.disabled || prompt.value.filter((item) => item.selected && !isAllValue(item.value)).length >= prompt.maxChoices) {
        prompt.bell();
        return;
      } else {
        current.selected = true;
      }

      syncAllChoice(prompt.value);
      prompt.render();
    }

    function finish(action) {
      if (prompt.closed) {
        return;
      }

      if (action === 'back') {
        if (!allowBack) {
          prompt.bell();
          return;
        }
        prompt.exited = true;
        prompt.aborted = false;
      } else {
        const selected = prompt.value.filter((item) => item.selected);
        if (prompt.minSelected && selected.length < prompt.minSelected) {
          prompt.showMinError = true;
          prompt.render();
          return;
        }
        prompt.done = true;
        prompt.aborted = false;
        prompt.exited = false;
      }

      prompt.out.write(prompt.clear);
      prompt.close();
    }

    prompt.handleSpaceToggle = toggleCurrentSelection;
    prompt.toggleAll = toggleAllSelection;
    prompt.left = () => finish('back');

    prompt.right = () => {
      finish('next');
    };

    prompt.submit = () => finish('next');

    prompt.on('submit', (items) => resolve({ action: 'next', value: toValue(items) }));
    prompt.on('exit', (items) => resolve({ action: 'back', value: toValue(items) }));
    prompt.on('abort', () => reject(new Error('Aborted.')));
  });
}

export async function interactiveConfig(modules, config) {
  const steps = [
    {
      key: 'languages',
      message: 'Select languages',
      getChoices: () => moduleChoices(collectModules(modules, 'language'))
    },
    {
      key: 'frameworks',
      message: 'Select frameworks',
      getChoices: () => moduleChoices(collectModules(modules, 'framework', config.languages)),
      getSelected: (choices) => config.frameworks.filter((id) => choices.some((choice) => choice.value === id)),
      allowAll: true
    },
    {
      key: 'patterns',
      message: 'Select design patterns',
      getChoices: () => moduleChoices(collectModules(modules, 'pattern')),
      allowAll: true
    },
    {
      key: 'general',
      message: 'Select general modules',
      getChoices: () => moduleChoices(collectModules(modules, 'general')),
      allowAll: true
    },
    {
      key: 'domains',
      message: 'Select domains',
      getChoices: () => moduleChoices(collectModules(modules, 'domain'))
    },
    {
      key: 'assistants',
      message: 'Select AI assistants',
      min: 1,
      getChoices: () => ASSISTANTS.map((assistant) => ({
        title: assistant.label,
        value: assistant.id
      }))
    }
  ];

  function findNavigableStepIndex(startIndex, direction) {
    let index = startIndex;
    while (index >= 0 && index < steps.length) {
      const step = steps[index];
      const choices = step.getChoices();
      if (choices.length > 0) {
        return index;
      }
      config[step.key] = [];
      index += direction;
    }
    return index;
  }

  let stepIndex = findNavigableStepIndex(0, 1);
  let breadcrumbLineCount = 0;
  while (stepIndex < steps.length) {
    const step = steps[stepIndex];
    breadcrumbLineCount = renderBreadcrumbs(steps, config, stepIndex, breadcrumbLineCount);
    const choices = step.getChoices();
    const selected = step.getSelected ? step.getSelected(choices) : (config[step.key] ?? []);
    const result = await runMultiselectStep({
      message: step.message,
      choices,
      selected,
      min: step.min,
      allowBack: stepIndex > 0,
      allowAll: !!step.allowAll
    });

    config[step.key] = result.value ?? [];

    if (step.key === 'languages') {
      const frameworks = collectModules(modules, 'framework', config.languages);
      config.frameworks = config.frameworks.filter((id) => frameworks.some((framework) => framework.id === id));
    }

    if (result.action === 'back') {
      stepIndex = findNavigableStepIndex(stepIndex - 1, -1);
      continue;
    }

    stepIndex = findNavigableStepIndex(stepIndex + 1, 1);
  }

  if (config.assistants.length === 0) {
    throw new Error('No assistants selected.');
  }
}
