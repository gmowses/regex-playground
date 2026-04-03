# Regex Playground

Regex tester with real-time matching, network presets, match highlighting and flags control. Everything runs client-side -- no data is sent to any server.

**[Live Demo](https://gmowses.github.io/regex-playground)**

## Features

- **Real-time matching** -- results update as you type, no button required
- **Match highlighting** -- matched segments are highlighted directly in the test string
- **Flags control** -- toggle `g`, `i`, `m`, `s` individually
- **Match details** -- each match shows its index, value, and capture groups
- **Network presets** -- one-click patterns for common network engineering tasks:
  - IPv4 Address
  - IPv6 Address
  - CIDR Block
  - MAC Address
  - ASN (AS number)
  - Domain / FQDN
  - Email
  - URL
- **Copy regex** -- copies the full `/pattern/flags` string to clipboard
- **Error display** -- invalid regex patterns show the browser error message inline
- **Dark / Light mode** -- toggle or auto-detect from system preference
- **i18n** -- English and Portuguese (auto-detect from browser language)
- **Zero backend** -- pure client-side, works offline

## Tech Stack

- React 19
- TypeScript
- Tailwind CSS v4
- Vite
- Lucide icons

## Getting Started

```bash
git clone https://github.com/gmowses/regex-playground.git
cd regex-playground
npm install
npm run dev
```

Open `http://localhost:5173` in your browser.

## Build

```bash
npm run build
```

Static files are generated in `dist/`.

## License

[MIT](LICENSE) -- Gabriel Mowses
