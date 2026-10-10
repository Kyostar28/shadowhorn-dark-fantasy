# Shadowhorn Dark Fantasy — RPG Faucet

Juego RPG de navegador con faucet de criptomoneda ficticia (**Shadowcoins, SHC**), construido con Next.js 15 + Totalum.

## Rutas
| Ruta | Descripción |
|---|---|
| `/` | Landing pública (estadísticas en vivo, razas, estado de la guerra) |
| `/login`, `/register` | Autenticación (tras registrarse → `/game/create`) |
| `/game/create` | Creación de héroe (raza, clase, nombre) |
| `/game` | Campamento / panel principal |
| `/game/faucet` | Reclamo horario de SHC (racha + bonus de territorios, máx. +50%) |
| `/game/battle` | Cacería PvE (1 energía) → `/game/battle/[id]` arena por turnos |
| `/game/dungeons` | Mazmorras con oleadas y jefe final |
| `/game/pvp` | Duelos automáticos con rating Elo (2 energía) |
| `/game/territories` | Mapa de conquista y asedios (2 energía) |
| `/game/guilds` | Crear/unirse/abandonar/donar a hermandades |
| `/game/inventory` | Equipo, bolsa, uso de elixires, subastar objetos |
| `/game/shop` | Tienda con oro |
| `/game/auction` | Casa de subastas (5% de comisión) |
| `/game/quests` | Misiones diarias (UTC) |
| `/game/ptc` | Anuncios Pay-To-Click (1 vez cada 24 h por anuncio) |
| `/game/leaderboard` | Clasificaciones |

## Arquitectura
- `src/lib/game/constants.ts` — razas, clases, fórmulas (compartido cliente/servidor).
- `src/lib/game/combat.ts` — motor de combate puro.
- `src/lib/game/server.ts` — helpers de servidor (héroe de sesión, energía, recompensas, misiones, inventario).
- `src/app/api/*` — toda la lógica es autoritativa en servidor; responden `{ ok, data }`.
- Energía: máx. 30, +1 cada 3 min. Faucet: cada 1 h.

## Descarga del proyecto (ZIP)
`scripts/zip-project.mjs` se ejecuta en `prebuild` y genera `public/shadowhorn-project.zip` (excluye `node_modules`, `.next`, `.git` y **todos los `.env*`**). El botón dorado inferior izquierdo (`src/components/DownloadProjectButton.tsx`) lo descarga.

## Tablas Totalum
faction, territory, guild, dungeon, item, quest, ptc_ad, monster, hero, inventory_item, auction, hero_quest, ptc_view, battle, faucet_claim (+ tablas de auth).
