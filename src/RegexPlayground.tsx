import { useState, useMemo, useEffect, useCallback } from 'react'
import { Copy, Check, Sun, Moon, Languages } from 'lucide-react'

// ── i18n ─────────────────────────────────────────────────────────────────────
const translations = {
  en: {
    title: 'Regex Playground',
    subtitle: 'Test regular expressions in real time with match highlighting. Everything runs client-side.',
    regexLabel: 'Regular Expression',
    regexPlaceholder: 'Enter your regex pattern...',
    flags: 'Flags',
    flagG: 'g — global',
    flagI: 'i — case insensitive',
    flagM: 'm — multiline',
    flagS: 's — dotAll',
    testLabel: 'Test String',
    testPlaceholder: 'Paste or type the text to test against...',
    presetsLabel: 'Network Presets',
    matchesLabel: 'Matches',
    matchesDesc: 'Real-time match results',
    noMatches: 'No matches found.',
    noRegex: 'Enter a regex pattern to see matches.',
    matchCount: (n: number) => `${n} match${n !== 1 ? 'es' : ''}`,
    matchIndex: 'Index',
    matchValue: 'Value',
    matchGroups: 'Groups',
    copyRegex: 'Copy regex',
    copied: 'Copied!',
    invalidRegex: 'Invalid regex',
    highlightedLabel: 'Highlighted Text',
    builtBy: 'Built by',
  },
  pt: {
    title: 'Regex Playground',
    subtitle: 'Teste expressoes regulares em tempo real com destaque de correspondencias. Tudo roda no navegador.',
    regexLabel: 'Expressao Regular',
    regexPlaceholder: 'Digite o padrao regex...',
    flags: 'Flags',
    flagG: 'g — global',
    flagI: 'i — ignorar maiusculas',
    flagM: 'm — multilinha',
    flagS: 's — dotAll',
    testLabel: 'Texto de Teste',
    testPlaceholder: 'Cole ou digite o texto para testar...',
    presetsLabel: 'Presets de Rede',
    matchesLabel: 'Correspondencias',
    matchesDesc: 'Resultados em tempo real',
    noMatches: 'Nenhuma correspondencia encontrada.',
    noRegex: 'Digite um padrao regex para ver as correspondencias.',
    matchCount: (n: number) => `${n} correspondencia${n !== 1 ? 's' : ''}`,
    matchIndex: 'Indice',
    matchValue: 'Valor',
    matchGroups: 'Grupos',
    copyRegex: 'Copiar regex',
    copied: 'Copiado!',
    invalidRegex: 'Regex invalido',
    highlightedLabel: 'Texto com Destaque',
    builtBy: 'Criado por',
  },
} as const

type Lang = keyof typeof translations

// ── Presets ───────────────────────────────────────────────────────────────────
const PRESETS = [
  { id: 'ipv4',   label: 'IPv4 Address',  pattern: String.raw`\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b`,        flags: 'g' },
  { id: 'ipv6',   label: 'IPv6 Address',  pattern: String.raw`[0-9a-fA-F:]{2,39}`,                              flags: 'g' },
  { id: 'cidr',   label: 'CIDR Block',    pattern: String.raw`\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\/\d{1,2}`,   flags: 'g' },
  { id: 'mac',    label: 'MAC Address',   pattern: String.raw`([0-9A-Fa-f]{2}[:-]){5}[0-9A-Fa-f]{2}`,          flags: 'g' },
  { id: 'asn',    label: 'ASN',           pattern: String.raw`AS\d{1,10}`,                                       flags: 'g' },
  { id: 'fqdn',   label: 'Domain/FQDN',  pattern: String.raw`[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.[a-zA-Z]{2,}`, flags: 'g' },
  { id: 'email',  label: 'Email',         pattern: String.raw`[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}`, flags: 'g' },
  { id: 'url',    label: 'URL',           pattern: String.raw`https?://[^\s]+`,                                  flags: 'g' },
] as const

// ── Types ─────────────────────────────────────────────────────────────────────
interface MatchResult {
  index: number
  value: string
  groups: string[]
}

// ── Regex engine ─────────────────────────────────────────────────────────────
function runRegex(
  pattern: string,
  flagStr: string,
  text: string,
): { matches: MatchResult[]; error: string | null } {
  if (!pattern) return { matches: [], error: null }
  try {
    const re = new RegExp(pattern, flagStr)
    const matches: MatchResult[] = []
    if (flagStr.includes('g')) {
      let m: RegExpExecArray | null
      re.lastIndex = 0
      while ((m = re.exec(text)) !== null) {
        matches.push({
          index: m.index,
          value: m[0],
          groups: m.slice(1).map(g => g ?? ''),
        })
        if (re.lastIndex === m.index) re.lastIndex++
      }
    } else {
      const m = re.exec(text)
      if (m) {
        matches.push({ index: m.index, value: m[0], groups: m.slice(1).map(g => g ?? '') })
      }
    }
    return { matches, error: null }
  } catch (e) {
    return { matches: [], error: (e as Error).message }
  }
}

// ── Highlighted text builder ──────────────────────────────────────────────────
function buildSegments(text: string, matches: MatchResult[]): { text: string; highlight: boolean }[] {
  if (!matches.length) return [{ text, highlight: false }]
  const segments: { text: string; highlight: boolean }[] = []
  let cursor = 0
  for (const m of matches) {
    if (m.index > cursor) segments.push({ text: text.slice(cursor, m.index), highlight: false })
    if (m.value.length > 0) {
      segments.push({ text: m.value, highlight: true })
      cursor = m.index + m.value.length
    } else {
      cursor = m.index + 1
    }
  }
  if (cursor < text.length) segments.push({ text: text.slice(cursor), highlight: false })
  return segments
}

// ── FlagToggle ────────────────────────────────────────────────────────────────
function FlagToggle({
  flag, label, active, onToggle,
}: { flag: string; label: string; active: boolean; onToggle: () => void }) {
  return (
    <button
      onClick={onToggle}
      className={[
        'px-2.5 py-1 rounded-md text-xs font-mono font-semibold border transition-colors',
        active
          ? 'bg-rose-500 border-rose-500 text-white'
          : 'border-zinc-300 dark:border-zinc-700 text-zinc-500 dark:text-zinc-400 hover:border-rose-400 dark:hover:border-rose-500',
      ].join(' ')}
      title={label}
    >
      {flag}
    </button>
  )
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function RegexPlayground() {
  const [lang, setLang] = useState<Lang>(() => (navigator.language.startsWith('pt') ? 'pt' : 'en'))
  const [dark, setDark] = useState(() => window.matchMedia('(prefers-color-scheme: dark)').matches)

  const [pattern, setPattern] = useState('')
  const [flagG, setFlagG] = useState(true)
  const [flagI, setFlagI] = useState(false)
  const [flagM, setFlagM] = useState(false)
  const [flagS, setFlagS] = useState(false)
  const [testStr, setTestStr] = useState('')
  const [copied, setCopied] = useState(false)

  const t = translations[lang]

  useEffect(() => { document.documentElement.classList.toggle('dark', dark) }, [dark])

  const flagStr = [flagG ? 'g' : '', flagI ? 'i' : '', flagM ? 'm' : '', flagS ? 's' : ''].join('')

  const { matches, error } = useMemo(
    () => runRegex(pattern, flagStr, testStr),
    [pattern, flagStr, testStr],
  )

  const segments = useMemo(
    () => buildSegments(testStr, matches),
    [testStr, matches],
  )

  const handleCopy = useCallback(() => {
    if (!pattern) return
    const full = `/${pattern}/${flagStr}`
    navigator.clipboard.writeText(full).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }, [pattern, flagStr])

  const applyPreset = useCallback((preset: typeof PRESETS[number]) => {
    setPattern(preset.pattern)
    setFlagG(preset.flags.includes('g'))
    setFlagI(preset.flags.includes('i'))
    setFlagM(preset.flags.includes('m'))
    setFlagS(preset.flags.includes('s'))
  }, [])

  return (
    <div className="min-h-screen flex flex-col bg-white dark:bg-[#09090b] text-zinc-900 dark:text-zinc-100 transition-colors">
      {/* Header */}
      <header className="border-b border-zinc-200 dark:border-zinc-800 px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-rose-500 rounded-lg flex items-center justify-center font-mono text-white text-sm font-bold select-none">
              .*
            </div>
            <span className="font-semibold">Regex Playground</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setLang(l => l === 'en' ? 'pt' : 'en')}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
              title="Toggle language"
            >
              <Languages size={14} />
              {lang.toUpperCase()}
            </button>
            <button
              onClick={() => setDark(d => !d)}
              className="p-2 rounded-lg border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
              title="Toggle theme"
            >
              {dark ? <Sun size={16} /> : <Moon size={16} />}
            </button>
            <a
              href="https://github.com/gmowses/regex-playground"
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 rounded-lg border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
              </svg>
            </a>
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="flex-1 px-6 py-10">
        <div className="max-w-5xl mx-auto space-y-8">
          <div>
            <h1 className="text-3xl font-bold">{t.title}</h1>
            <p className="mt-2 text-zinc-500 dark:text-zinc-400">{t.subtitle}</p>
          </div>

          {/* Presets */}
          <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5">
            <p className="text-sm font-medium mb-3">{t.presetsLabel}</p>
            <div className="flex flex-wrap gap-2">
              {PRESETS.map(preset => (
                <button
                  key={preset.id}
                  onClick={() => applyPreset(preset)}
                  className={[
                    'px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors',
                    pattern === preset.pattern
                      ? 'bg-rose-500 border-rose-500 text-white'
                      : 'border-zinc-200 dark:border-zinc-700 hover:border-rose-400 dark:hover:border-rose-500 hover:text-rose-600 dark:hover:text-rose-400',
                  ].join(' ')}
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            {/* Left column: inputs */}
            <div className="space-y-5">
              {/* Regex input */}
              <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">{t.regexLabel}</label>
                  <div className={[
                    'flex items-center gap-2 rounded-lg border px-3 py-2 font-mono text-sm transition-colors focus-within:ring-2 focus-within:ring-rose-500/40',
                    error
                      ? 'border-red-400 dark:border-red-600 bg-red-50 dark:bg-red-900/10'
                      : 'border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/50',
                  ].join(' ')}>
                    <span className="text-zinc-400 select-none">/</span>
                    <input
                      type="text"
                      value={pattern}
                      onChange={e => setPattern(e.target.value)}
                      placeholder={t.regexPlaceholder}
                      spellCheck={false}
                      className="flex-1 bg-transparent outline-none placeholder:text-zinc-400 placeholder:font-sans placeholder:text-xs"
                    />
                    <span className="text-zinc-400 select-none">/{flagStr}</span>
                    <button
                      onClick={handleCopy}
                      disabled={!pattern}
                      title={t.copyRegex}
                      className="ml-1 p-1 rounded text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors disabled:opacity-30"
                    >
                      {copied ? <Check size={13} className="text-rose-500" /> : <Copy size={13} />}
                    </button>
                  </div>
                  {error && (
                    <p className="mt-1.5 text-xs text-red-600 dark:text-red-400 flex items-center gap-1">
                      <span className="font-semibold">{t.invalidRegex}:</span> {error}
                    </p>
                  )}
                </div>

                {/* Flags */}
                <div>
                  <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-2">{t.flags}</p>
                  <div className="flex flex-wrap gap-2">
                    <FlagToggle flag="g" label={t.flagG} active={flagG} onToggle={() => setFlagG(v => !v)} />
                    <FlagToggle flag="i" label={t.flagI} active={flagI} onToggle={() => setFlagI(v => !v)} />
                    <FlagToggle flag="m" label={t.flagM} active={flagM} onToggle={() => setFlagM(v => !v)} />
                    <FlagToggle flag="s" label={t.flagS} active={flagS} onToggle={() => setFlagS(v => !v)} />
                  </div>
                </div>
              </div>

              {/* Test string input */}
              <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5">
                <label className="block text-sm font-medium mb-2">{t.testLabel}</label>
                <textarea
                  value={testStr}
                  onChange={e => setTestStr(e.target.value)}
                  placeholder={t.testPlaceholder}
                  rows={10}
                  spellCheck={false}
                  className="w-full rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/50 px-3 py-2 text-sm font-mono resize-y outline-none focus:ring-2 focus:ring-rose-500/40 placeholder:font-sans placeholder:text-zinc-400 placeholder:text-xs"
                />
              </div>
            </div>

            {/* Right column: results */}
            <div className="space-y-5">
              {/* Highlighted output */}
              <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5">
                <p className="text-sm font-medium mb-2">{t.highlightedLabel}</p>
                <div className="min-h-[80px] rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/50 px-3 py-2 text-sm font-mono whitespace-pre-wrap break-all">
                  {testStr
                    ? segments.map((seg, i) =>
                        seg.highlight ? (
                          <mark key={i} className="bg-rose-200 dark:bg-rose-500/40 text-rose-900 dark:text-rose-100 rounded-sm px-[1px]">
                            {seg.text}
                          </mark>
                        ) : (
                          <span key={i}>{seg.text}</span>
                        ),
                      )
                    : <span className="text-zinc-400 italic text-xs font-sans">{t.testPlaceholder}</span>
                  }
                </div>
              </div>

              {/* Matches panel */}
              <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">{t.matchesLabel}</p>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">{t.matchesDesc}</p>
                  </div>
                  {!error && pattern && testStr && (
                    <span className={[
                      'text-xs font-semibold px-2 py-0.5 rounded-full',
                      matches.length > 0
                        ? 'bg-rose-100 dark:bg-rose-500/20 text-rose-700 dark:text-rose-300'
                        : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500',
                    ].join(' ')}>
                      {t.matchCount(matches.length)}
                    </span>
                  )}
                </div>

                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {!pattern && (
                    <p className="text-xs text-zinc-400 italic">{t.noRegex}</p>
                  )}
                  {pattern && !error && testStr && matches.length === 0 && (
                    <p className="text-xs text-zinc-400 italic">{t.noMatches}</p>
                  )}
                  {matches.map((m, i) => (
                    <div
                      key={i}
                      className="rounded-lg border border-zinc-100 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/30 px-3 py-2 space-y-1"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-[10px] font-mono font-bold text-rose-500 shrink-0">#{i + 1}</span>
                          <span className="font-mono text-xs break-all text-zinc-800 dark:text-zinc-100 bg-rose-100 dark:bg-rose-500/20 px-1.5 py-0.5 rounded">
                            {m.value}
                          </span>
                        </div>
                        <span className="text-[10px] text-zinc-400 shrink-0 tabular-nums">{t.matchIndex}: {m.index}</span>
                      </div>
                      {m.groups.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {m.groups.map((g, gi) => (
                            <span key={gi} className="text-[10px] font-mono px-1.5 py-0.5 rounded border border-zinc-200 dark:border-zinc-700 text-zinc-500 dark:text-zinc-400">
                              ${gi + 1}: {g || '(empty)'}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      <footer className="border-t border-zinc-200 dark:border-zinc-800 px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between text-xs text-zinc-400">
          <span>
            {t.builtBy}{' '}
            <a
              href="https://github.com/gmowses"
              className="text-zinc-600 dark:text-zinc-300 hover:text-rose-500 transition-colors"
            >
              Gabriel Mowses
            </a>
          </span>
          <span>MIT License</span>
        </div>
      </footer>
    </div>
  )
}
