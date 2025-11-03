# SUBBITO (setup per sviluppo locale)

Istruzioni rapide per mettere in esecuzione l'app React copiata (i file sorgente originali sono stati lasciati nella root, alcuni come `.txt`).

Prerequisiti
- Node.js (LTS) installato e accessibile nel terminale
- npm (incluso con Node.js)

Passaggi per iniziare

1. Apri PowerShell e vai nella cartella del progetto:

```powershell
cd C:\Users\LUCA\Desktop\SUBBITO
```

2. Inizializza (se non l'hai già fatto) e installa le dipendenze:

```powershell
npm install
```

3. Avvia il dev server:

```powershell
npm run dev
```

Note importanti
- I file originali React sono stati copiati con estensione `.txt`. Per migliorare la compatibilità potresti rinominarli in `.jsx` o `.js` (es. `Pages/Home.txt` → `Pages/Home.jsx`).
- Ho aggiunto alias `@` nel `vite.config.js` puntando alla root del progetto così gli import che usano `@/...` dovrebbero risolversi.
- Se vuoi usare Tailwind, dopo `npm install` assicurati che le dipendenze di Tailwind siano installate (sono già presenti in `package.json`) e che `index.css` sia caricato (già incluso in `src/main.jsx`).

Se vuoi, posso:
- eseguire i rinomini dei file `.txt` a `.jsx` automaticamente,
- lanciare localmente `npm install` e `npm run dev` (se mi dai il permesso e Node/NPM sono disponibili nel terminale che uso),
- o guidarti passo-passo su eventuali errori che compaiono dopo `npm install`.
