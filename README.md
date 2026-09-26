# WoW Forever

Enkel gruppsida där man skriver upp sina WoW Forever-karaktärer (race, klass, servertyp, yrken, roller) och ser vilka som är med. Ingen inloggning: man får en privat redigeringslänk.

- Statisk sida (`index.html`, `app.js`, `data.js`, `style.css`), publiceras med GitHub Pages.
- Data ligger i Supabase, schemat `wowforever` i [shared-db](https://github.com/Emil-Leonardsson/shared-db).
- `data.js` innehåller race/klass-matris, servertyper, yrken och Discord-länken (`DISCORD_URL`).
- `qr.html` genererar en utskrivbar affisch med QR-kod.

## Typsnitt

Rubrikerna använder ett Warcraft-liknande fan-typsnitt (`assets/fonts/warcraft-sv.otf`). Originalet saknade å, ä och ö, så de är tillagda genom att sätta ihop bokstäverna a, o, A och O med fontens egna punkter och ring. Typsnittet är inte skapat av oss, kontrollera licensen innan sidan används kommersiellt.
