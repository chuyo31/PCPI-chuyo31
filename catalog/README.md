# Catálogo de PCPI

Esta carpeta es la **fuente de la verdad** del catálogo de PCPI.

- `catalog.json` — lista de aplicaciones disponibles para instalar.
- `packs.json` — agrupaciones predefinidas (Hogar, Oficina, Gaming…).

Cualquier cambio aquí se ve reflejado:

1. **En la app empaquetada** (al hacer `npm run build`, el bundle incluye estos JSON).
2. **En las apps PCPI ya instaladas**, cuando los usuarios pulsen el botón "Actualizar catálogo" del header (la app descarga estos archivos directamente desde GitHub raw).

## Cómo añadir una aplicación

Edita `catalog.json` y añade un nuevo objeto al array:

```json
{
  "id": "mi-app",
  "name": "Mi App",
  "developer": "Mi Empresa",
  "description": "Descripción breve de qué hace.",
  "category": "utilities",
  "wingetId": "MiEmpresa.MiApp",
  "license": "MIT",
  "website": "https://miapp.com",
  "tags": ["free", "opensource"]
}
```

### Campos obligatorios

| Campo       | Tipo     | Notas                                                  |
|-------------|----------|--------------------------------------------------------|
| `id`        | string   | Identificador único en kebab-case.                     |
| `name`      | string   | Nombre visible.                                        |
| `wingetId`  | string   | ID exacto en Winget. Verifica con `winget search Mi`. |
| `developer` | string   | Empresa o autor.                                       |
| `description` | string | Una frase clara.                                       |
| `category`  | string   | Una de las categorías (ver lista abajo).               |
| `license`   | string   | `MIT`, `GPL`, `Apache-2.0`, `BSD`, `Freeware`, `Proprietary`, `Other`. |
| `tags`      | string[] | Etiquetas visuales (ver lista abajo).                  |

### Campos opcionales

- `version`, `releaseDate`, `sizeMb`, `website`, `iconUrl`, `screenshots[]`.

### Categorías válidas

`browsers`, `multimedia`, `video`, `photo`, `audio`, `streaming`, `pdf`, `office`,
`email`, `utilities`, `downloaders`, `remote`, `cloud`, `dev`, `gaming`,
`communication`, `ai`, `security`.

### Etiquetas válidas

`essential`, `popular`, `opensource`, `free`, `recommended`, `new`,
`lightweight`, `gaming`, `dev`, `multimedia`.

## Cómo añadir un pack

Edita `packs.json`:

```json
{
  "id": "mi-pack",
  "name": "Mi Pack",
  "description": "Descripción breve del propósito del pack.",
  "emoji": "✨",
  "featured": true,
  "apps": ["chrome", "vlc", "7zip"]
}
```

- `apps` referencia los `id` de `catalog.json`.
- `featured: true` lo destaca en la home.
- `isPostFormat: true` activa el botón especial "🚀 DEJAR PC LISTO".

## Validación

Cuando la app PCPI descarga estos JSON, valida que:

- Sean arrays válidos.
- Cada app tenga `id`, `name` y `wingetId`.
- Cada pack tenga `id`, `name` y `apps` (array).

Si la validación falla, la app **no** sobrescribe el catálogo activo y muestra el error en un toast.

## Filosofía

PCPI **solo** incluye software:

- ✅ Gratuito · ✅ Open Source · ✅ Ampliamente utilizado · ✅ Seguro

**Nunca**: cracks, activadores, software pirata, malware o cualquier cosa ilegal.

Si dudas si una app encaja, pregunta en un issue antes del PR.
