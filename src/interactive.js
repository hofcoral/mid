import { createRequire } from 'node:module';
import { ASSISTANTS } from './constants.js';
import { collectModules } from './catalog.js';

const require = createRequire(import.meta.url);
const { MultiselectPrompt } = require('prompts/lib/elements');

const MULTISELECT_INSTRUCTIONS = [
  '',
  'Instructions:',
  '    ↑/↓: Highlight option',
  '    [space]: Toggle selection',
  '    ←: Go back',
  '    →/enter: Continue'
].join('\n');

function moduleChoices(modules) {
  return modules.map((module) => ({
    title: module.label,
    value: module.id
  }));
}

function selectedValues(items) {
  return items.filter((item) => item.selected).map((item) => item.value);
}

async function runMultiselectStep({ message, choices, selected, min = 0, allowBack = true }) {
  if (choices.length === 0) {
    return { action: 'next', value: [] };
  }

  return new Promise((resolve, reject) => {
    const prompt = new MultiselectPrompt({
      message,
      choices: choices.map((choice) => ({
        ...choice,
        selected: selected.includes(choice.value)
      })),
      min: min || undefined,
      instructions: MULTISELECT_INSTRUCTIONS,
      hint: ''
    });

    const originalSubmit = prompt.submit.bind(prompt);
    const toValue = (items) => selectedValues(items);

    prompt.left = () => {
      if (!allowBack) {
        prompt.bell();
        return;
      }
      prompt.exited = true;
      prompt.out.write('\n');
      prompt.close();
    };

    prompt.right = () => {
      originalSubmit();
    };

    prompt.on('submit', (items) => resolve({ action: 'next', value: toValue(items) }));
    prompt.on('exit', (items) => resolve({ action: 'back', value: toValue(items) }));
    prompt.on('abort', () => reject(new Error('Aborted.')));
  });
}

export async function interactiveConfig(modules, config) {
  const steps = [
    {
      key: 'general',
      message: 'Select shared modules',
      getChoices: () => moduleChoices(collectModules(modules, 'general'))
    },
    {
      key: 'patterns',
      message: 'Select design patterns',
      getChoices: () => moduleChoices(collectModules(modules, 'pattern'))
    },
    {
      key: 'languages',
      message: 'Select languages',
      getChoices: () => moduleChoices(collectModules(modules, 'language'))
    },
    {
      key: 'frameworks',
      message: 'Select frameworks',
      getChoices: () => moduleChoices(collectModules(modules, 'framework', config.languages)),
      getSelected: (choices) => config.frameworks.filter((id) => choices.some((choice) => choice.value === id))
    },
    {
      key: 'assistants',
      message: 'Select assistants',
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
  while (stepIndex < steps.length) {
    const step = steps[stepIndex];
    const choices = step.getChoices();
    const selected = step.getSelected ? step.getSelected(choices) : (config[step.key] ?? []);
    const result = await runMultiselectStep({
      message: step.message,
      choices,
      selected,
      min: step.min,
      allowBack: stepIndex > 0
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
