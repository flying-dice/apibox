<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf';
  import Tokens from './Tokens.svelte';

  const { Story } = defineMeta({
    title: 'Foundations/Design tokens',
    component: Tokens,
    parameters: {
      docs: {
        description: {
          component:
            'Every semantic token, rendered live. Flip the Theme toolbar control: each ' +
            'swatch should change. One that does not has escaped the theme layer.',
        },
      },
    },
  });
</script>

<Story name="All tokens" />
