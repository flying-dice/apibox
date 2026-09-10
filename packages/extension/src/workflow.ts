export function pagesWorkflow(inputs: string): string {
  const yamlInputs = JSON.stringify(inputs);
  return `name: Deploy APIBox documentation

on:
  push:
    branches: [main]
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: pages
  cancel-in-progress: false

jobs:
  deploy:
    environment:
      name: github-pages
      url: \${{ steps.deployment.outputs.page_url }}
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v6
      - uses: oven-sh/setup-bun@v2
        with:
          bun-version: 1.4.2
      - uses: actions/configure-pages@v5
      - name: Build documentation
        env:
          APIBOX_INPUTS: ${yamlInputs}
        run: bunx github:flying-dice/apibox build "$APIBOX_INPUTS" --out ./site --base ./
      - uses: actions/upload-pages-artifact@v4
        with:
          path: ./site
      - id: deployment
        uses: actions/deploy-pages@v4
`;
}
