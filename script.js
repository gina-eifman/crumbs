import seedRecipes from './recipes.json' with { type: 'json' };

const CUSTOM_RECIPES_STORAGE_KEY = 'kroshki:customRecipes';
const RECIPE_DRAFT_STORAGE_KEY = 'kroshki:recipeDraft';

function loadCustomRecipes() {
  try {
    const savedRecipes = JSON.parse(localStorage.getItem(CUSTOM_RECIPES_STORAGE_KEY) ?? '[]');
    return Array.isArray(savedRecipes)
      ? savedRecipes.filter(recipe =>
        recipe &&
        typeof recipe.id === 'string' &&
        typeof recipe.name === 'string' &&
        Number.isInteger(recipe.time) && recipe.time > 0 &&
        ['easy', 'medium', 'hard'].includes(recipe.difficulty) &&
        ['breakfast', 'snack', 'lunch', 'dinner', 'dessert'].includes(recipe.type) &&
        Array.isArray(recipe.ingredients) &&
        Array.isArray(recipe.steps)
      )
      : [];
  } catch {
    return [];
  }
}

let customRecipes = loadCustomRecipes();
let recipes = [...seedRecipes, ...customRecipes];

const recipeList = document.getElementById('recipe-list');
const loadMoreButton = document.getElementById('load-more');
const recipeCount = document.getElementById('recipe-count');
const filtersPanel = document.getElementById('recipe-filters');
const searchInput = document.getElementById('recipe-search');
const timeRange = document.getElementById('time-range');
const timeValue = document.getElementById('time-value');
const resetFiltersButton = document.getElementById('reset-filters');
const noResults = document.getElementById('no-results');
const quickTimeButtons = document.querySelectorAll('[data-max-time]');
const favoriteCount = document.getElementById('favorite-count');
const favoriteList = document.getElementById('favorite-list');
const favoritesEmpty = document.getElementById('favorites-empty');
const FAVORITES_STORAGE_KEY = 'kroshki:favoriteRecipeIds';
const recipeForm = document.getElementById('recipe-form');
const recipeNameInput = document.getElementById('recipe-name');
const recipeTimeInput = document.getElementById('recipe-time');
const recipeDifficultyInput = document.getElementById('recipe-difficulty');
const recipeTypeInput = document.getElementById('recipe-type');
const recipeImageInput = document.getElementById('recipe-image');
const nameError = document.getElementById('name-error');
const timeError = document.getElementById('time-error');
const difficultyError = document.getElementById('difficulty-error');
const typeError = document.getElementById('type-error');
const imageError = document.getElementById('image-error');
const formFeedback = document.getElementById('form-feedback');
const ingredientsList = document.getElementById('ingredients-list');
const stepsList = document.getElementById('steps-list');
const addIngredientButton = document.getElementById('add-ingredient');
const addStepButton = document.getElementById('add-step');
const recipeDialog = document.getElementById('recipe-dialog');
const recipeDialogImage = document.getElementById('recipe-dialog-image');
const recipeDialogTitle = document.getElementById('recipe-dialog-title');
const recipeDialogCategory = document.getElementById('recipe-dialog-category');
const recipeDialogMeta = document.getElementById('recipe-dialog-meta');
const recipeDialogNote = document.getElementById('recipe-dialog-note');
const recipeDialogIngredients = document.getElementById('recipe-dialog-ingredients');
const recipeDialogSteps = document.getElementById('recipe-dialog-steps');
const recipeDialogCloseButton = document.getElementById('recipe-dialog-close');

function loadFavoriteIds() {
  try {
    const savedIds = JSON.parse(localStorage.getItem(FAVORITES_STORAGE_KEY) ?? '[]');
    const knownIds = new Set(recipes.map(recipe => recipe.id));
    return new Set(
      Array.isArray(savedIds)
        ? savedIds.filter(id => typeof id === 'string' && knownIds.has(id))
        : []
    );
  } catch {
    return new Set();
  }
}

const favoriteIds = loadFavoriteIds();

const categoryNames = {
  breakfast: 'завтрак',
  snack: 'закуска',
  lunch: 'обед',
  dinner: 'ужин',
  dessert: 'десерт'
};

const difficultyNames = {
  easy: 'легко',
  medium: 'средне',
  hard: 'непросто'
};

function getCardsPerPage() {
  if (window.innerWidth > 1200) return 12;
  if (window.innerWidth > 768) return 8;
  return 4;
}

let cardsPerPage = getCardsPerPage();
let visibleCount = 0;
let filteredRecipes = recipes;

function normalizeText(value) {
  return value.toLocaleLowerCase('ru').replace(/ё/g, 'е').trim();
}

function getCheckedValues(name) {
  return [...filtersPanel.querySelectorAll(`input[name="${name}"]:checked`)]
    .map(input => input.value);
}

function matchesOneOf(recipeValue, selectedValues) {
  return selectedValues.length === 0 || selectedValues.includes(recipeValue);
}

function filterRecipe(recipe, filters) {
  const matchesType = matchesOneOf(recipe.type, filters.types);
  const matchesDifficulty = matchesOneOf(recipe.difficulty, filters.difficulties);
  const matchesTime = recipe.time <= filters.maxTime;
  const searchableText = normalizeText(`${recipe.name} ${recipe.ingredients.join(' ')}`);
  const matchesSearch = searchableText.includes(filters.query);

  return matchesType && matchesDifficulty && matchesTime && matchesSearch;
}

function getRecipeCountLabel(count) {
  const lastTwoDigits = count % 100;
  const lastDigit = count % 10;

  if (lastTwoDigits >= 11 && lastTwoDigits <= 14) return `${count} рецептов`;
  if (lastDigit === 1) return `${count} рецепт`;
  if (lastDigit >= 2 && lastDigit <= 4) return `${count} рецепта`;
  return `${count} рецептов`;
}

function updateTimeOutput() {
  const minutes = Number(timeRange.value);
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  const formattedTime = [
    hours ? `${hours} ч` : '',
    remainingMinutes ? `${remainingMinutes} мин` : ''
  ].filter(Boolean).join(' ');
  timeValue.textContent = `до ${formattedTime}`;

  const min = Number(timeRange.min);
  const max = Number(timeRange.max);
  const progress = ((minutes - min) / (max - min)) * 100;
  timeRange.style.background = `linear-gradient(90deg, #6e8065 0 ${progress}%, #e3ddd5 ${progress}% 100%)`;

  quickTimeButtons.forEach(button => {
    button.classList.toggle('is-selected', Number(button.dataset.maxTime) === minutes);
  });
}

function formatTimeLimit(minutes) {
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return [hours ? `${hours} ч` : '', remainingMinutes ? `${remainingMinutes} мин` : '']
    .filter(Boolean)
    .join(' ');
}

function updateTimeRangeBounds(keepUnfilteredValue = false) {
  const maximumRecipeTime = Math.max(180, ...recipes.map(recipe => Number(recipe.time) || 0));
  const wasAtMaximum = Number(timeRange.value) === Number(timeRange.max);
  timeRange.max = String(maximumRecipeTime);

  if (keepUnfilteredValue || wasAtMaximum || Number(timeRange.value) > maximumRecipeTime) {
    timeRange.value = String(maximumRecipeTime);
  }

  const maxLabel = document.querySelector('.range-labels span:last-child');
  maxLabel.textContent = formatTimeLimit(maximumRecipeTime);
}

function closeCustomSelect(wrapper, returnFocus = false) {
  const trigger = wrapper.querySelector('.select-trigger');
  const options = wrapper.querySelector('.select-options');
  wrapper.classList.remove('is-open');
  trigger.setAttribute('aria-expanded', 'false');
  options.hidden = true;
  if (returnFocus) trigger.focus();
}

function openCustomSelect(wrapper) {
  document.querySelectorAll('[data-custom-select].is-open').forEach(openSelect => {
    if (openSelect !== wrapper) closeCustomSelect(openSelect);
  });

  const trigger = wrapper.querySelector('.select-trigger');
  const options = wrapper.querySelector('.select-options');
  wrapper.classList.add('is-open');
  trigger.setAttribute('aria-expanded', 'true');
  options.hidden = false;

  const selectedOption = options.querySelector('[aria-selected="true"]');
  (selectedOption ?? options.querySelector('.select-option'))?.focus();
}

function setCustomSelectValue(input, value, dispatchChange = false) {
  const wrapper = input.closest('[data-custom-select]');
  const trigger = wrapper.querySelector('.select-trigger');
  const currentLabel = wrapper.querySelector('.select-current');
  const optionButtons = [...wrapper.querySelectorAll('.select-option')];
  const selectedOption = optionButtons.find(option => option.dataset.value === value);

  input.value = selectedOption ? value : '';
  currentLabel.textContent = selectedOption
    ? selectedOption.textContent
    : (input.id === 'recipe-difficulty' ? 'Выбрать' : 'Выбрать раздел');

  optionButtons.forEach(option => {
    option.setAttribute('aria-selected', String(option === selectedOption));
  });

  if (dispatchChange) {
    input.dataset.touched = 'true';
    input.dispatchEvent(new Event('change', { bubbles: true }));
  }
}

function initializeCustomSelects() {
  document.querySelectorAll('[data-custom-select]').forEach(wrapper => {
    const input = wrapper.querySelector('input[type="hidden"]');
    const trigger = wrapper.querySelector('.select-trigger');
    const options = wrapper.querySelector('.select-options');

    trigger.addEventListener('click', () => {
      if (wrapper.classList.contains('is-open')) closeCustomSelect(wrapper);
      else openCustomSelect(wrapper);
    });

    trigger.addEventListener('keydown', event => {
      if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        event.preventDefault();
        openCustomSelect(wrapper);
      }
    });

    options.addEventListener('click', event => {
      const option = event.target.closest('.select-option');
      if (!option) return;
      setCustomSelectValue(input, option.dataset.value, true);
      closeCustomSelect(wrapper, true);
    });

    options.addEventListener('keydown', event => {
      const optionButtons = [...options.querySelectorAll('.select-option')];
      const currentIndex = optionButtons.indexOf(document.activeElement);
      let nextIndex = currentIndex;

      if (event.key === 'ArrowDown') nextIndex = (currentIndex + 1) % optionButtons.length;
      else if (event.key === 'ArrowUp') nextIndex = (currentIndex - 1 + optionButtons.length) % optionButtons.length;
      else if (event.key === 'Home') nextIndex = 0;
      else if (event.key === 'End') nextIndex = optionButtons.length - 1;
      else if (event.key === 'Escape') {
        event.preventDefault();
        closeCustomSelect(wrapper, true);
        return;
      } else return;

      event.preventDefault();
      optionButtons[nextIndex]?.focus();
    });
  });

  document.addEventListener('click', event => {
    document.querySelectorAll('[data-custom-select].is-open').forEach(wrapper => {
      if (!wrapper.contains(event.target)) closeCustomSelect(wrapper);
    });
  });
}

function updateFavoriteButton(button, recipe) {
  const isFavorite = favoriteIds.has(recipe.id);
  button.setAttribute('aria-pressed', String(isFavorite));
  button.setAttribute(
    'aria-label',
    `${isFavorite ? 'Убрать из избранного' : 'Добавить в избранное'}: ${recipe.name}`
  );
  button.textContent = isFavorite ? '♥' : '♡';
}

function saveFavoriteIds() {
  try {
    localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify([...favoriteIds]));
  } catch (error) {
    console.error('Не удалось сохранить избранное в localStorage.', error);
  }
}

function updateFavoritesView() {
  const favoriteRecipes = recipes.filter(recipe => favoriteIds.has(recipe.id));
  favoriteCount.textContent = String(favoriteRecipes.length);
  favoriteList.replaceChildren();

  if (favoriteRecipes.length === 0) {
    favoriteList.appendChild(favoritesEmpty);
    return;
  }

  const fragment = document.createDocumentFragment();
  favoriteRecipes.forEach(recipe => {
    const link = document.createElement('a');
    link.classList.add('favorite-mini-card');
    link.href = '#recipes';
    link.setAttribute('aria-label', `Найти рецепт: ${recipe.name}`);

    const image = document.createElement('img');
    image.src = recipe.imageUrl || 'images/recipes/placeholder.svg';
    image.alt = '';
    image.loading = 'lazy';

    const text = document.createElement('span');
    text.textContent = recipe.name;

    const meta = document.createElement('small');
    meta.textContent = `${categoryNames[recipe.type] ?? recipe.type} · ${recipe.time} мин`;
    text.appendChild(meta);

    link.append(image, text);
    fragment.appendChild(link);
  });

  favoriteList.appendChild(fragment);
}

function createDynamicRow(kind, value = '') {
  const isStep = kind === 'step';
  const row = document.createElement('div');
  row.className = `dynamic-row${isStep ? ' step-row' : ''}`;

  if (isStep) {
    const number = document.createElement('span');
    number.className = 'step-number';
    row.appendChild(number);
  }

  const field = document.createElement(isStep ? 'textarea' : 'input');
  field.name = isStep ? 'steps[]' : 'ingredients[]';
  field.value = value;
  field.placeholder = isStep ? 'Опиши следующий шаг…' : 'Например, 200 г муки';
  field.setAttribute('aria-label', isStep ? 'Шаг приготовления' : 'Ингредиент');
  if (isStep) field.rows = 2;
  else field.type = 'text';
  row.appendChild(field);

  const removeButton = document.createElement('button');
  removeButton.className = 'remove-row';
  removeButton.type = 'button';
  removeButton.setAttribute('aria-label', isStep ? 'Удалить шаг' : 'Удалить ингредиент');
  removeButton.textContent = '×';
  row.appendChild(removeButton);

  return row;
}

function updateDynamicRows(list, kind) {
  const rows = [...list.querySelectorAll('.dynamic-row')];
  rows.forEach((row, index) => {
    const field = row.querySelector('input, textarea');
    const removeButton = row.querySelector('.remove-row');
    const label = kind === 'step' ? `Шаг ${index + 1}` : `Ингредиент ${index + 1}`;

    field.setAttribute('aria-label', label);
    removeButton.disabled = rows.length === 1;

    if (kind === 'step') {
      row.querySelector('.step-number').textContent = String(index + 1).padStart(2, '0');
    }
  });
}

function getDynamicValues(list) {
  return [...list.querySelectorAll('input, textarea')].map(field => field.value.trim());
}

function setFormFieldError(field, errorElement, message, shouldShow) {
  const showError = shouldShow && Boolean(message);
  errorElement.textContent = showError ? message : '';
  field.setAttribute('aria-invalid', String(showError));

  const customSelect = field.closest('[data-custom-select]');
  if (customSelect) {
    customSelect.setAttribute('aria-invalid', String(showError));
    customSelect.querySelector('.select-trigger').setAttribute('aria-invalid', String(showError));
  }

  return showError;
}

let showAllValidationErrors = false;

function validateRecipeForm(showAll = false) {
  const invalidFields = [];
  const name = recipeNameInput.value.trim();
  const nameLength = [...name].length;
  const nameMessage = !name
    ? 'Введи название рецепта.'
    : nameLength < 2 || nameLength > 100
      ? 'Название должно быть длиной от 2 до 100 символов.'
      : '';
  if (setFormFieldError(recipeNameInput, nameError, nameMessage, showAll || recipeNameInput.dataset.touched === 'true')) {
    invalidFields.push(recipeNameInput);
  }

  const time = Number(recipeTimeInput.value);
  const timeMessage = !recipeTimeInput.value
    ? 'Укажи время приготовления.'
    : !Number.isInteger(time) || time <= 0
      ? 'Время должно быть целым числом больше нуля.'
      : '';
  if (setFormFieldError(recipeTimeInput, timeError, timeMessage, showAll || recipeTimeInput.dataset.touched === 'true')) {
    invalidFields.push(recipeTimeInput);
  }

  const difficultyMessage = recipeDifficultyInput.value ? '' : 'Выбери сложность.';
  if (setFormFieldError(recipeDifficultyInput, difficultyError, difficultyMessage, showAll || recipeDifficultyInput.dataset.touched === 'true')) {
    invalidFields.push(document.querySelector('#recipe-difficulty-label + .custom-select .select-trigger'));
  }

  const typeMessage = recipeTypeInput.value ? '' : 'Выбери раздел рецепта.';
  if (setFormFieldError(recipeTypeInput, typeError, typeMessage, showAll || recipeTypeInput.dataset.touched === 'true')) {
    invalidFields.push(document.querySelector('#recipe-type-label + .custom-select .select-trigger'));
  }

  let imageMessage = '';
  const imageUrl = recipeImageInput.value.trim();
  if (imageUrl) {
    try {
      const parsedUrl = new URL(imageUrl);
      if (!['http:', 'https:'].includes(parsedUrl.protocol)) imageMessage = 'Укажи ссылку, начинающуюся с http:// или https://.';
    } catch {
      imageMessage = 'Проверь ссылку на изображение.';
    }
  }
  if (setFormFieldError(recipeImageInput, imageError, imageMessage, showAll || recipeImageInput.dataset.touched === 'true')) {
    invalidFields.push(recipeImageInput);
  }

  const ingredientFields = [...ingredientsList.querySelectorAll('input')];
  const stepFields = [...stepsList.querySelectorAll('textarea')];
  const ingredientsValid = ingredientFields.length > 0 && ingredientFields.every(field => field.value.trim());
  const stepsValid = stepFields.length > 0 && stepFields.every(field => field.value.trim());

  ingredientFields.forEach(field => {
    const shouldMark = showAll || field.dataset.touched === 'true';
    const isEmpty = !field.value.trim();
    field.setAttribute('aria-invalid', String(shouldMark && isEmpty));
    if (shouldMark && isEmpty && !invalidFields.includes(field)) invalidFields.push(field);
  });
  stepFields.forEach(field => {
    const shouldMark = showAll || field.dataset.touched === 'true';
    const isEmpty = !field.value.trim();
    field.setAttribute('aria-invalid', String(shouldMark && isEmpty));
    if (shouldMark && isEmpty && !invalidFields.includes(field)) invalidFields.push(field);
  });

  const listErrors = [];
  if (!ingredientsValid) listErrors.push('Заполни каждый ингредиент или удали пустую строку.');
  if (!stepsValid) listErrors.push('Заполни каждый шаг приготовления или удали пустую строку.');
  const showListErrors = showAll || showAllValidationErrors;
  formFeedback.textContent = showListErrors ? listErrors[0] ?? '' : '';
  formFeedback.classList.toggle('is-error', showListErrors && listErrors.length > 0);

  return {
    valid: !nameMessage && !timeMessage && !difficultyMessage && !typeMessage && !imageMessage && ingredientsValid && stepsValid,
    invalidFields
  };
}

function saveRecipeDraft() {
  const draft = {
    name: recipeNameInput.value,
    time: recipeTimeInput.value,
    difficulty: recipeDifficultyInput.value,
    type: recipeTypeInput.value,
    imageUrl: recipeImageInput.value,
    ingredients: getDynamicValues(ingredientsList),
    steps: getDynamicValues(stepsList)
  };

  try {
    sessionStorage.setItem(RECIPE_DRAFT_STORAGE_KEY, JSON.stringify(draft));
  } catch (error) {
    console.error('Не удалось сохранить черновик рецепта.', error);
  }
}

function restoreRecipeDraft() {
  try {
    const draft = JSON.parse(sessionStorage.getItem(RECIPE_DRAFT_STORAGE_KEY) ?? 'null');
    if (!draft || typeof draft !== 'object') return;

    recipeNameInput.value = typeof draft.name === 'string' ? draft.name : '';
    recipeTimeInput.value = typeof draft.time === 'string' ? draft.time : '';
    recipeImageInput.value = typeof draft.imageUrl === 'string' ? draft.imageUrl : '';
    setCustomSelectValue(recipeDifficultyInput, draft.difficulty ?? '');
    setCustomSelectValue(recipeTypeInput, draft.type ?? '');

    const ingredients = Array.isArray(draft.ingredients) ? draft.ingredients : [''];
    const steps = Array.isArray(draft.steps) ? draft.steps : [''];
    ingredientsList.replaceChildren(...(ingredients.length ? ingredients : ['']).map(value => createDynamicRow('ingredient', value)));
    stepsList.replaceChildren(...(steps.length ? steps : ['']).map(value => createDynamicRow('step', value)));
    updateDynamicRows(ingredientsList, 'ingredient');
    updateDynamicRows(stepsList, 'step');
  } catch {
    sessionStorage.removeItem(RECIPE_DRAFT_STORAGE_KEY);
  }
}

function updateTimeRangeForNewRecipe(recipeTime) {
  const wasUnrestricted = Number(timeRange.value) === Number(timeRange.max);
  const newMax = Math.max(Number(timeRange.max), recipeTime);
  timeRange.max = String(newMax);
  if (wasUnrestricted) timeRange.value = String(newMax);
  document.querySelector('.range-labels span:last-child').textContent = formatTimeLimit(newMax);
  updateTimeOutput();
}

function handleRecipeSubmit(event) {
  event.preventDefault();
  showAllValidationErrors = true;

  const validation = validateRecipeForm(true);
  if (!validation.valid) {
    validation.invalidFields[0]?.focus();
    return;
  }

  const recipe = {
    id: `custom-${crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`}`,
    name: recipeNameInput.value.trim(),
    imageUrl: recipeImageInput.value.trim() || 'images/recipes/placeholder.svg',
    time: Number(recipeTimeInput.value),
    difficulty: recipeDifficultyInput.value,
    type: recipeTypeInput.value,
    ingredients: getDynamicValues(ingredientsList),
    steps: getDynamicValues(stepsList),
    note: 'Добавлен в вашу книгу рецептов'
  };

  const updatedCustomRecipes = [recipe, ...customRecipes];
  try {
    localStorage.setItem(CUSTOM_RECIPES_STORAGE_KEY, JSON.stringify(updatedCustomRecipes));
  } catch (error) {
    formFeedback.textContent = 'Не получилось сохранить рецепт в этом браузере. Проверь свободное место в хранилище.';
    formFeedback.classList.add('is-error');
    console.error('Не удалось сохранить рецепт.', error);
    return;
  }

  customRecipes = updatedCustomRecipes;
  recipes = [...customRecipes, ...seedRecipes];
  updateTimeRangeForNewRecipe(recipe.time);
  updateFavoritesView();
  applyFilters();

  recipeForm.reset();
  setCustomSelectValue(recipeDifficultyInput, '');
  setCustomSelectValue(recipeTypeInput, '');
  ingredientsList.replaceChildren(createDynamicRow('ingredient'));
  stepsList.replaceChildren(createDynamicRow('step'));
  updateDynamicRows(ingredientsList, 'ingredient');
  updateDynamicRows(stepsList, 'step');
  recipeForm.querySelectorAll('[aria-invalid], [data-touched]').forEach(field => {
    field.removeAttribute('aria-invalid');
    delete field.dataset.touched;
  });
  sessionStorage.removeItem(RECIPE_DRAFT_STORAGE_KEY);
  showAllValidationErrors = false;
  formFeedback.classList.remove('is-error');
  formFeedback.textContent = `«${recipe.name}» сохранён в этом браузере и добавлен в книгу.`;
}

function initializeRecipeForm() {
  initializeCustomSelects();
  restoreRecipeDraft();
  updateDynamicRows(ingredientsList, 'ingredient');
  updateDynamicRows(stepsList, 'step');

  addIngredientButton.addEventListener('click', () => {
    const row = createDynamicRow('ingredient');
    ingredientsList.appendChild(row);
    updateDynamicRows(ingredientsList, 'ingredient');
    row.querySelector('input').focus();
    saveRecipeDraft();
  });

  addStepButton.addEventListener('click', () => {
    const row = createDynamicRow('step');
    stepsList.appendChild(row);
    updateDynamicRows(stepsList, 'step');
    row.querySelector('textarea').focus();
    saveRecipeDraft();
  });

  [ingredientsList, stepsList].forEach((list, index) => {
    const kind = index === 0 ? 'ingredient' : 'step';
    list.addEventListener('click', event => {
      const removeButton = event.target.closest('.remove-row');
      if (!removeButton) return;
      removeButton.closest('.dynamic-row').remove();
      updateDynamicRows(list, kind);
      if (showAllValidationErrors) validateRecipeForm(true);
      saveRecipeDraft();
    });
  });

  recipeForm.addEventListener('input', event => {
    if (event.target.matches('input, textarea')) {
      event.target.dataset.touched = 'true';
      validateRecipeForm();
      saveRecipeDraft();
    }
  });

  recipeForm.addEventListener('change', event => {
    if (event.target.matches('input, textarea')) {
      event.target.dataset.touched = 'true';
      validateRecipeForm();
      saveRecipeDraft();
    }
  });

  recipeForm.addEventListener('submit', handleRecipeSubmit);
}

function fillRecipeDialog(recipe) {
  recipeDialogImage.src = recipe.imageUrl || 'images/recipes/placeholder.svg';
  recipeDialogImage.alt = recipe.name;
  recipeDialogTitle.textContent = recipe.name;
  recipeDialogCategory.textContent = categoryNames[recipe.type] ?? recipe.type;

  recipeDialogMeta.replaceChildren();
  [
    `${recipe.time} минут${recipe.timeNote ? ' + охлаждение' : ''}`,
    difficultyNames[recipe.difficulty] ?? recipe.difficulty
  ].forEach((label, index) => {
    if (index > 0) {
      const separator = document.createElement('span');
      separator.className = 'dialog-meta-separator';
      separator.setAttribute('aria-hidden', 'true');
      recipeDialogMeta.appendChild(separator);
    }
    const item = document.createElement('span');
    item.textContent = label;
    recipeDialogMeta.appendChild(item);
  });

  const note = recipe.note ?? recipe.timeNote ?? '';
  recipeDialogNote.textContent = note;
  recipeDialogNote.hidden = !note;

  recipeDialogIngredients.replaceChildren();
  recipe.ingredients.forEach(item => {
    const ingredient = document.createElement('li');
    ingredient.textContent = item;
    recipeDialogIngredients.appendChild(ingredient);
  });

  recipeDialogSteps.replaceChildren();
  recipe.steps.forEach(item => {
    const step = document.createElement('li');
    step.textContent = item;
    recipeDialogSteps.appendChild(step);
  });
}

function createRecipeCard(recipe) {
    const recipeCard = document.createElement('article');
    recipeCard.classList.add('recipe-card');
    recipeCard.dataset.id = recipe.id;
    recipeCard.dataset.name = recipe.name;
    recipeCard.dataset.type = recipe.type;
    recipeCard.dataset.difficulty = recipe.difficulty;
    recipeCard.dataset.time = recipe.time;
    recipeCard.dataset.ingredients = recipe.ingredients.join(' ');

    const imageLink = document.createElement('a');
    imageLink.classList.add('recipe-image-link');
    imageLink.href = `#recipe-${recipe.id}`;
    imageLink.setAttribute('aria-label', `Открыть рецепт: ${recipe.name}`);

    const image = document.createElement('img');
    image.classList.add('recipe-image');
    image.src = recipe.imageUrl || 'images/recipes/placeholder.svg';
    image.alt = `${recipe.name} из книги рецептов`;
    image.loading = 'lazy';

    const categorySpan = document.createElement('span');
    categorySpan.classList.add('recipe-category');
    categorySpan.textContent = categoryNames[recipe.type] ?? recipe.type;

    imageLink.appendChild(image);
    imageLink.appendChild(categorySpan);

    const favoriteButton = document.createElement('button');
    favoriteButton.classList.add('favorite-button');
    favoriteButton.type = 'button';
    updateFavoriteButton(favoriteButton, recipe);

    const cardBody = document.createElement('div');
    cardBody.classList.add('recipe-card-body');

    const metaDiv = document.createElement('div');
    metaDiv.classList.add('recipe-meta');

    const timeSpan = document.createElement('span');
    timeSpan.textContent = `${recipe.time} минут${recipe.timeNote ? ' + охлаждение' : ''}`;

    const separatorIcon = document.createElement('i');

    const difficultySpan = document.createElement('span');
    difficultySpan.textContent = difficultyNames[recipe.difficulty] ?? recipe.difficulty;

    metaDiv.appendChild(timeSpan);
    metaDiv.appendChild(separatorIcon);
    metaDiv.appendChild(difficultySpan);

    const title = document.createElement('h3');
    const titleButton = document.createElement('button');
    titleButton.className = 'recipe-title-toggle';
    titleButton.type = 'button';
    titleButton.setAttribute('aria-haspopup', 'dialog');
    titleButton.setAttribute('aria-controls', 'recipe-dialog');
    titleButton.textContent = recipe.name;
    title.appendChild(titleButton);

    const note = recipe.note ?? recipe.timeNote;
    if (note) {
      const noteParagraph = document.createElement('p');
      noteParagraph.classList.add('recipe-card-note');
      noteParagraph.textContent = note;
      cardBody.appendChild(noteParagraph);
    }

    cardBody.prepend(metaDiv, title);

    recipeCard.appendChild(imageLink);
    recipeCard.appendChild(favoriteButton);
    recipeCard.appendChild(cardBody);

    return recipeCard;
}

function appendRecipes(start, end) {
  const recipesToAppend = filteredRecipes.slice(start, end);
  const fragment = document.createDocumentFragment();

  recipesToAppend.forEach(recipe => {
    fragment.appendChild(createRecipeCard(recipe));
  });

  recipeList.appendChild(fragment);
  visibleCount = end;
  updateLoadMoreButton();
}

function updateLoadMoreButton() {
  loadMoreButton.hidden = visibleCount >= filteredRecipes.length;
  recipeCount.textContent = getRecipeCountLabel(filteredRecipes.length);
  noResults.hidden = filteredRecipes.length !== 0;

  filtersPanel.querySelectorAll('input[name="type"]').forEach(input => {
    const count = recipes.filter(recipe => recipe.type === input.value).length;
    const countLabel = input.closest('.check-row').querySelector('.filter-count');
    if (countLabel) countLabel.textContent = String(count).padStart(2, '0');
  });
}

function showNextPage() {
  const nextCount = Math.min(visibleCount + cardsPerPage, filteredRecipes.length);
  appendRecipes(visibleCount, nextCount);
}

function applyFilters() {
  const filters = {
    types: getCheckedValues('type'),
    difficulties: getCheckedValues('difficulty'),
    maxTime: Number(timeRange.value),
    query: normalizeText(searchInput.value)
  };

  filteredRecipes = recipes.filter(recipe => filterRecipe(recipe, filters));
  visibleCount = 0;
  recipeList.replaceChildren();
  appendRecipes(0, Math.min(cardsPerPage, filteredRecipes.length));
}

filtersPanel.addEventListener('change', event => {
  if (event.target.matches('input[type="checkbox"]')) applyFilters();
});

searchInput.addEventListener('input', applyFilters);

timeRange.addEventListener('input', () => {
  updateTimeOutput();
  applyFilters();
});

quickTimeButtons.forEach(button => {
  button.addEventListener('click', () => {
    timeRange.value = button.dataset.maxTime;
    updateTimeOutput();
    applyFilters();
  });
});

resetFiltersButton.addEventListener('click', () => {
  filtersPanel.querySelectorAll('input[type="checkbox"]').forEach(input => {
    input.checked = false;
  });
  searchInput.value = '';
  timeRange.value = timeRange.max;
  updateTimeOutput();
  applyFilters();
});

updateTimeRangeBounds();
updateTimeOutput();
initializeRecipeForm();
applyFilters();

loadMoreButton.addEventListener('click', showNextPage);

let openRecipeCard = null;

function showRecipeDialog(recipe, trigger) {
  fillRecipeDialog(recipe);
  openRecipeCard?.classList.remove('is-expanded');
  openRecipeCard = trigger.closest('.recipe-card');
  openRecipeCard.classList.add('is-expanded');
  recipeDialog.showModal();
}

recipeDialogCloseButton.addEventListener('click', () => recipeDialog.close());

recipeDialog.addEventListener('click', event => {
  if (event.target === recipeDialog) recipeDialog.close();
});

recipeDialog.addEventListener('close', () => {
  openRecipeCard?.classList.remove('is-expanded');
  openRecipeCard = null;
});

recipeList.addEventListener('click', event => {
  const recipeOpener = event.target.closest('.recipe-title-toggle, .recipe-image-link');
  if (recipeOpener) {
    event.preventDefault();
    const card = recipeOpener.closest('.recipe-card');
    const recipe = recipes.find(item => item.id === card.dataset.id);
    if (recipe) showRecipeDialog(recipe, recipeOpener);
    return;
  }

  const button = event.target.closest('.favorite-button');
  if (!button) return;

  const card = button.closest('.recipe-card');
  const recipeId = card?.dataset.id;
  const recipe = recipes.find(item => item.id === recipeId);
  if (!recipe) return;

  if (favoriteIds.has(recipeId)) {
    favoriteIds.delete(recipeId);
  } else {
    favoriteIds.add(recipeId);
  }

  saveFavoriteIds();
  updateFavoriteButton(button, recipe);
  updateFavoritesView();
});

updateFavoritesView();

window.addEventListener('resize', () => {
  const newCardsPerPage = getCardsPerPage();
  if (newCardsPerPage === cardsPerPage) return;

  cardsPerPage = newCardsPerPage;
  if (visibleCount < cardsPerPage) {
    appendRecipes(visibleCount, Math.min(cardsPerPage, filteredRecipes.length));
  }
  updateLoadMoreButton();
});

