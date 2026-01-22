# Deploy to Apps Script

## From Cloud Shell (every time)

```bash
cd ~/GodWorld
git pull
npm install
npx clasp push
```

## First time setup (only once)

```bash
cd ~
git clone https://github.com/pnils08/GodWorld.git
cd GodWorld
npm install
npx clasp login
npx clasp push
```

## If Cloud Shell resets

Cloud Shell sometimes clears installed packages. If `npx clasp push` fails, run `npm install` first.
