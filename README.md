# Stella Filella Wedding & Events — Gestionale Preventivi

Applicazione desktop per la gestione clienti, catalogo servizi e generazione preventivi professionali in PDF per una società di organizzazione eventi.

## Requisiti

- **Node.js** >= 18
- **npm** >= 9

## Installazione

```bash
npm install
```

## Avvio

### Modalità browser (sviluppo veloce)

```bash
npm run dev
```

Apri [http://localhost:5173](http://localhost:5173) nel browser. Tutte le funzionalità sono disponibili tranne i dialog nativi di Electron (salvataggio file, ecc.).

### Modalità Electron (app desktop)

```bash
npm run dev:electron
```

Avvia Vite + Electron insieme. L'app si apre in una finestra desktop nativa.

## Build produzione

### Solo web

```bash
npm run build
```

I file compilati vengono generati in `dist/`.

### Installer desktop (.exe / .dmg)

```bash
npm run electron:build
```

L'installer viene generato nella cartella `release/`.

## Struttura del progetto

```
src/
├── main.tsx                        # Entry point
├── App.tsx                         # Router principale
├── index.css                       # Tailwind CSS + tema
├── types/index.ts                  # Tipi TypeScript e costanti
├── database/index.ts               # Layer dati (localStorage)
├── store/index.ts                  # Stato globale (Zustand)
├── utils/format.ts                 # Formattazione valute e date
├── components/
│   ├── layout/Sidebar.tsx          # Navigazione laterale
│   └── quotes/PdfGenerator.tsx     # Generazione PDF
└── pages/
    ├── Dashboard.tsx               # Dashboard con statistiche
    ├── ClientsPage.tsx             # Gestione clienti
    ├── ServicesPage.tsx            # Catalogo servizi
    ├── QuotesPage.tsx              # Lista preventivi
    ├── QuoteEditor.tsx             # Wizard creazione preventivo
    └── SettingsPage.tsx            # Impostazioni
```

## Stack tecnologico

- **React 19** + **TypeScript**
- **Vite** (bundler)
- **Tailwind CSS v4** (stili)
- **Zustand** (stato globale)
- **@react-pdf/renderer** (generazione PDF)
- **Lucide React** (icone)
- **Electron** (app desktop)
- **electron-builder** (packaging)
