# Route Data

The Vue resolver reads route metadata from a `<route>` block in an SFC or from
a comment block in a JSX/TSX file. The data is merged into the generated route
and overrides existing values. React and Solid resolvers do not support route
data blocks.

## SFC `<route>` Block

Set the parser with the `lang` attribute, or use the
[`routeBlockLang`](./config.md#routeblocklang) option for the default parser.

- **Supported parsers:** JSON, JSON5, YAML (`yml` is an alias for `yaml`)
- **Default:** JSON5

### JSON / JSON5

```html
<route>
{
  name: "name-override",
  meta: {
    requiresAuth: false
  }
}
</route>
```

### YAML

```html
<route lang="yaml">
name: name-override
meta:
  requiresAuth: true
</route>
```

## JSX / TSX Comment Block

In Vue, you can add route data with a comment block that starts with `route`.
This works only for JSX/TSX files in Vue.

The plugin parses only the first comment block. It must start with `route`.
Only the YAML parser is supported.

```jsx
/*
route

name: name-override
meta:
  requiresAuth: false
  id: 1234
  string: "1234"
*/
```

## Syntax Highlighting

### `<route>` block in VS Code

To highlight the `<route>` block with
[Vetur's Custom Code Blocks](https://vuejs.github.io/vetur/highlighting.html#custom-block):

1. Update the settings:

   ```json
   {
     "vetur.grammar.customBlocks": {
       "route": "json"
     }
   }
   ```

2. Run this command in VS Code:

   `Vetur: Generate grammar from vetur.grammar.customBlocks`

3. Restart VS Code.
