# Internationalization Conventions

## Key naming
- Keys use dot-separated namespaces: `toolbar.`, `status.`, `options.`, `language.`, `toast.`
- Reuse existing keys when wording is identical.

## Interpolation
- Use `{name}` tokens in values.
- Provide variables via `I18n.t(key, { name: value })`.

## Pluralization
- Values may be an object with `one` and `other` forms.
- `I18n.t(key, { count: n })` selects the correct form.

## Markup
- DOM elements with `data-i18n="key"` get their text content replaced.
- Use `data-i18n-attr="attr:key"` to localize attributes.
- For dynamic content, call `I18n.t()` from JavaScript.

## Do/Don't
- **Do** keep values free of HTML except for existing safe tags.
- **Don't** concatenate untranslated strings in code.
