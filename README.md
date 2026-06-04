# PCPI — PC Post Install

> **Tu PC listo tras el formateo.**
>
> Aplicación de escritorio moderna que instala rápidamente software gratuito, legal y de confianza
> tras una instalación limpia de Windows. Sin abrir 20 webs, sin malware, sin perder tiempo.

Creado por **Chuyo31** · Powered by AI

---

## ✨ Características

- 📦 Catálogo curado de software **gratuito y open source**.
- 🚀 Packs predefinidos (Hogar, Oficina, Gaming, Desarrollo, IA, PostFormateo…).
- 🛠️ Instalación 100% vía **Winget** (oficial de Microsoft).
- 🌑 Modo oscuro / claro y aspecto inspirado en Microsoft Store + Steam + Discord.
- 🔍 Buscador inteligente (nombre, desarrollador, categoría, etiquetas).
- 📊 Detección automática de apps instaladas y actualizaciones disponibles.
- 📜 Historial de instalaciones.
- ⚙️ Arquitectura multiplataforma preparada (Windows hoy, Linux/macOS a futuro).

---

## 🧰 Requisitos

- **Windows 10 1809+** o **Windows 11** (Winget se incluye por defecto).
- **Node.js 20+** y **npm** (para desarrollo).
- **Winget** disponible en el `PATH`. Comprueba con:
  ```powershell
  winget --version
  ```
  Si no lo tienes, instala "Instalador de aplicaciones" desde la Microsoft Store.

---

## 🚀 Empezar a desarrollar

```bash
# 1. Instala dependencias
npm install

# 2. Arranca el modo desarrollo (Vite + Electron)
npm run dev
```

El comando `npm run dev` arranca Vite y abre automáticamente la ventana de Electron con HMR
(hot module replacement) y DevTools.

---

## 📦 Build de producción

```bash
# Empaqueta el instalador NSIS para Windows
npm run electron:build
```

El instalador queda en `release/<version>/PCPI-Setup-<version>.exe`.

Para una build sin instalador (carpeta lista para ejecutar):

```bash
npm run electron:pack
```

---

## 🗂️ Estructura

```
PCPostINSTAL/
├─ electron/                  # Proceso principal de Electron (Node.js)
│  ├─ main.ts                 #  - Bootstrap de la app, BrowserWindow
│  ├─ preload.ts              #  - Bridge tipado expuesto al renderer (window.pcpi)
│  ├─ ipc/                    #  - Handlers IPC (packages, settings, history)
│  └─ providers/              #  - Capa de abstracción del gestor de paquetes
│     ├─ types.ts             #     · Contrato común
│     ├─ index.ts             #     · Factory según process.platform
│     ├─ windows/winget.ts    #     · Implementación Winget
│     ├─ linux/index.ts       #     · Stub (apt/flatpak en el futuro)
│     └─ macos/index.ts       #     · Stub (brew en el futuro)
│
├─ src/                       # Renderer: React + TypeScript
│  ├─ App.tsx                 # Routing y bootstrap de la UI
│  ├─ main.tsx                # Entry React
│  ├─ index.css               # Tailwind base + variables ShadCN
│  ├─ global.d.ts             # Tipos globales (window.pcpi)
│  │
│  ├─ catalog/                # Catálogo dinámico (no hardcoded en componentes)
│  │  ├─ catalog.json         #  - Lista canónica de aplicaciones
│  │  ├─ packs.json           #  - Packs predefinidos
│  │  ├─ categories.ts        #  - Categorías visuales
│  │  ├─ types.ts             #  - Tipos
│  │  └─ index.ts             #  - Loader + helpers
│  │
│  ├─ components/             # UI reutilizable
│  │  ├─ Layout.tsx, Header.tsx, Sidebar.tsx, Footer.tsx, Logo.tsx
│  │  ├─ AppCard.tsx          # Tarjeta de aplicación (con tooltip y estados)
│  │  ├─ InstallQueueBar.tsx  # Cola de instalación + barra de progreso global
│  │  └─ ui/                  # Componentes ShadCN (button, card, input, badge…)
│  │
│  ├─ pages/                  # Una página por ruta
│  │  ├─ HomePage.tsx         # Hero + stats + packs destacados
│  │  ├─ CatalogPage.tsx      # Catálogo con búsqueda, filtros, vista grid/lista
│  │  ├─ CategoryPage.tsx     # Reutiliza CatalogPage con categoría fijada
│  │  ├─ AppDetailPage.tsx    # Detalle completo de una app
│  │  ├─ PacksPage.tsx        # Packs + botón "DEJAR PC LISTO"
│  │  ├─ PackDetailPage.tsx   # Detalle de un pack
│  │  ├─ HistoryPage.tsx      # Historial de instalaciones
│  │  ├─ SettingsPage.tsx     # Configuración
│  │  └─ AboutPage.tsx        # Créditos y diagnóstico
│  │
│  ├─ services/               # Lógica de negocio (Zustand stores)
│  │  ├─ installer.ts         # Cola, estados, refresh del sistema
│  │  └─ settings.ts          # Persistencia de ajustes
│  │
│  ├─ hooks/
│  │  └─ useTheme.ts          # Sincroniza tema con <html class="dark">
│  │
│  └─ utils/
│     ├─ cn.ts                # clsx + tailwind-merge
│     ├─ format.ts            # tamaños, fechas, duraciones
│     └─ tags.ts              # Metadatos visuales de etiquetas
│
├─ index.html
├─ vite.config.ts             # Vite + vite-plugin-electron
├─ tailwind.config.js         # Paleta PCPI completa (oscuro + claro)
├─ tsconfig.json / tsconfig.node.json
├─ components.json            # Config de ShadCN
└─ package.json               # Scripts + build (electron-builder NSIS)
```

---

## 🎨 Tema

Las paletas exactas están definidas en `tailwind.config.js` bajo el namespace `pcpi-*`:

| Token             | Oscuro    | Claro     |
|-------------------|-----------|-----------|
| Fondo             | `#0f172a` | `#f8fafc` |
| Paneles           | `#1e293b` | `#ffffff` |
| Tarjetas          | `#334155` | `#f1f5f9` |
| Texto principal   | `#ffffff` | `#0f172a` |
| Texto secundario  | `#94a3b8` | `#64748b` |

---

## 🧩 Añadir una nueva aplicación al catálogo

Edita `src/catalog/catalog.json` y añade una entrada:

```json
{
  "id": "mi-app",
  "name": "Mi App",
  "developer": "Mi Empresa",
  "description": "Descripción breve.",
  "category": "utilities",
  "wingetId": "MiEmpresa.MiApp",
  "license": "MIT",
  "website": "https://miapp.com",
  "tags": ["free", "opensource"]
}
```

- `id` debe ser único y kebab-case.
- `wingetId` es **obligatorio** y debe ser el ID exacto (`winget search MiApp`).
- `tags` admite: `essential | popular | opensource | free | recommended | new | lightweight | gaming | dev | multimedia`.

Para añadir un pack, edita `src/catalog/packs.json` referenciando los `id` de las apps.

---

## 🌐 Roadmap multiplataforma

La capa de providers (`electron/providers/`) ya está lista. Para añadir Linux/macOS sólo hay que
implementar la interfaz `PackageProvider`:

```ts
export interface PackageProvider {
  readonly id: string
  isAvailable(): Promise<{ available: boolean; version?: string; error?: string }>
  listInstalled(): Promise<InstalledPackage[]>
  listUpgradable(): Promise<UpgradablePackage[]>
  install(id: string, onProgress?: (e: ProgressEvent) => void): Promise<OpResult>
  upgrade(id: string, onProgress?: (e: ProgressEvent) => void): Promise<OpResult>
  uninstall(id: string, onProgress?: (e: ProgressEvent) => void): Promise<OpResult>
}
```

El renderer no necesita cambios: el factory en `electron/providers/index.ts` selecciona el provider
adecuado según `process.platform`.

---

## 📜 Licencia y filosofía

PCPI **solo incluye** software:

- ✅ Gratuito
- ✅ Open Source
- ✅ Ampliamente utilizado
- ✅ Seguro y de confianza

PCPI **no incluye**, y nunca incluirá:

- ❌ Software pirata, cracks, activadores
- ❌ Software sospechoso o malware
- ❌ Software ilegal

---

Creado con ❤️ por Chuyo31 — *Tu PC listo tras el formateo.*
