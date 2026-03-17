import prompts from 'prompts';
import { ASSISTANTS } from './constants.js';
import { collectModules } from './catalog.js';

function moduleChoices(modules) {
  return modules.map((module) => ({
    title: module.label,
    value: module.id
  }));
}

export async function interactiveConfig(modules, config) {
  const generalModules = collectModules(modules, 'general');
  const languages = collectModules(modules, 'language');

  const generalResponse = await prompts({
    type: generalModules.length > 0 ? 'multiselect' : null,
    name: 'general',
    message: 'Select general modules',
    instructions: false,
    hint: '- Space to select. Enter to confirm.',
    choices: moduleChoices(generalModules).map((choice) => ({
      ...choice,
      selected: config.general.includes(choice.value)
    }))
  });
  config.general = generalResponse.general ?? [];

  const languageResponse = await prompts({
    type: languages.length > 0 ? 'multiselect' : null,
    name: 'languages',
    message: 'Select languages',
    instructions: false,
    hint: '- Space to select. Enter to confirm.',
    choices: moduleChoices(languages).map((choice) => ({
      ...choice,
      selected: config.languages.includes(choice.value)
    }))
  });
  config.languages = languageResponse.languages ?? [];

  const frameworks = collectModules(modules, 'framework', config.languages);
  const validFrameworks = config.frameworks.filter((id) => frameworks.some((framework) => framework.id === id));
  const frameworkResponse = await prompts({
    type: frameworks.length > 0 ? 'multiselect' : null,
    name: 'frameworks',
    message: 'Select frameworks',
    instructions: false,
    hint: frameworks.length > 0 ? '- Space to select. Enter to confirm.' : '- Select a language first to enable frameworks.',
    choices: moduleChoices(frameworks).map((choice) => ({
      ...choice,
      selected: validFrameworks.includes(choice.value)
    }))
  });
  config.frameworks = frameworkResponse.frameworks ?? [];

  const assistantResponse = await prompts({
    type: 'multiselect',
    name: 'assistants',
    message: 'Select assistants',
    instructions: false,
    hint: '- Space to select. Enter to confirm.',
    choices: ASSISTANTS.map((assistant) => ({
      title: assistant.label,
      value: assistant.id,
      selected: config.assistants.includes(assistant.id)
    })),
    min: 1
  });
  config.assistants = assistantResponse.assistants ?? [];

  if (config.assistants.length === 0) {
    throw new Error('No assistants selected.');
  }
}
