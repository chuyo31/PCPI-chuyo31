# PCPI v0.2.0 — Cancelación de instalaciones

Versión centrada en hacer la cola de instalación **mucho más robusta**: ahora puedes cancelar instalaciones que se cuelguen sin necesidad de cerrar la app, ni una a una ni en bloque.

## Descargas

| Archivo | Para qué sirve |
|---------|----------------|
| **PCPI-Portable-0.2.0.exe** | Recomendado para pendrive: un único `.exe` que se ejecuta sin instalar nada. Ideal para PCs recién formateados. |
| **PCPI-Setup-0.2.0.exe** | Instalador clásico con accesos directos y desinstalador. |
| **PCPI-0.2.0-win.zip** | Versión carpeta extraíble (alternativa al portable). |

> Windows mostrará un aviso de SmartScreen porque el `.exe` no está firmado con certificado de pago. Pulsa **Más información → Ejecutar de todas formas**.

## Novedades

### Cancelar instalaciones colgadas

- **Botón "Cancelar todo"** en la barra inferior: detiene a la vez todas las descargas e instalaciones en curso o pendientes.
- **Botón ⊘ en cada app** activa: cancela solo esa, y la cola continúa automáticamente con la siguiente.
- Las apps canceladas quedan marcadas en rojo con la etiqueta *"Cancelada por el usuario"*, en lugar de aparecer como error.

### Cómo funciona por dentro

- En Windows se mata el árbol completo del proceso `winget` con `taskkill /T /F`, así muere también el instalador hijo que winget pudiera haber lanzado.
- El backend distingue entre "fallo real" y "cancelación", evitando que cancelar te llene la cola de errores falsos.
- Los items ya finalizados (completados, cancelados o con error) se protegen de eventos tardíos: ningún progreso atrasado los puede "resucitar".

## Mejoras complementarias

- Resumen final ampliado: ahora muestra "X ok · Y errores · Z canceladas" cuando termina la cola.
- Script `publish-release.mjs` corregido: resuelve binarios usando `PATH + PATHEXT` para encontrar `gh.exe`, `git.exe`, `npm.cmd`, etc.

## Requisitos

- Windows 10 1809+ o Windows 11.
- Winget (App Installer) — viene de serie; si falta, se instala desde Microsoft Store.

## Conocido / próximos pasos

- Sin firma de código (avisos de SmartScreen).
- Sin auto-update.
- Soporte Linux/macOS aún en stub.
