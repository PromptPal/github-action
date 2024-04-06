# PromptPal/github-action

integrate this Github Action to simplify your CI experience

> [!IMPORTANT]
> Please make sure you already have a valid `promptpal.yml` config file

```yaml
name: Testing

on:
  push:
    branches: [master]
  pull_request:
    branches: [master]

jobs:
  container-job:
    steps:
      - uses: PromptPal/github-action@v1.0.2
        env:
          PROMPTPAL_ENDPOINT: ${{ secrets.PROMPTPAL_ENDPOINT }}
          PROMPTPAL_API_TOKEN: ${{ secrets.PROMPTPAL_API_TOKEN }}
        with:
          token: ${{ secrets.GITHUB_TOKEN }}
          # generate types by PromptPal CLI
          command: pp g
```

## Variables

| variable | type   | note                                                                                                               | example              |
|----------|--------|--------------------------------------------------------------------------------------------------------------------|----------------------|
| token    | string | github personal token                                                                                              | secrets.GITHUB_TOKEN |
| command  | string | PromptPal commands. we use `pp` to present `promptpal`.  full documetion is here: https://github.com/PromptPal/cli | - pp init - pp g     |
|          |        |                                                                                                                    |                      |
