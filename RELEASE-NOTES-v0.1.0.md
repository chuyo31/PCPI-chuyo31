# PCPI v0.1.0 — Primera release

Primera versión pública de **PCPI (PC Post Install)**: una app para preparar Windows recién formateado instalando rápidamente software gratuito y de confianza con un solo clic.

## Descargas

| Archivo | Para qué sirve |
|---------|----------------|
| **PCPI-Portable-0.1.0.exe** | Recomendado para pendrive: un único `.exe` que se ejecuta sin instalar nada. Ideal para PCs recién formateados. |
| **PCPI-Setup-0.1.0.exe** | Instalador clásico con accesos directos y desinstalador. |
| **PCPI-0.1.0-win.zip** | Versión carpeta extraíble (alternativa al portable). |

> Windows mostrará un aviso de SmartScreen porque el `.exe` no está firmado con certificado de pago. Pulsa **Más información → Ejecutar de todas formas**.

## Qué incluye

### Catálogo (~80 apps, todas gratuitas y open source o freeware)

- Navegadores (Chrome, Firefox, Brave, Opera, Vivaldi)
- Multimedia y vídeo (VLC, Kodi, HandBrake, Kdenlive, Shotcut, OBS…)
- Imagen (GIMP, Paint.NET, Krita, Inkscape, **ImageGlass**, IrfanView)
- Audio (Audacity, REAPER, Ocenaudio, LMMS)
- Ofimática (LibreOffice, OnlyOffice, OpenOffice)
- PDF y email (SumatraPDF, PDF24, Thunderbird, eM Client)
- Utilidades del sistema (7-Zip, WinRAR, Rufus, Everything, PowerToys, **Open-Shell** para menú Inicio clásico)
- **Optimización**: Aurora Windows Optimizer, BleachBit, O&O ShutUp10++
- **Formateo discos/USB/SD**: MiniTool Partition Wizard, SD Card Formatter
- **Drivers offline**: Snappy Driver Installer Origin (instala drivers de red sin Internet)
- Descargas (Motrix, FDM, XDM)
- Acceso remoto (AnyDesk, RustDesk, TeamViewer)
- Nube (Google Drive, Dropbox, MEGA, Nextcloud, OneDrive)
- Programación (VS Code, Git, Docker, Node.js, Postman)
- Gaming (Steam, Epic, Heroic, Playnite, GOG)
- Comunicación (Discord, Telegram, Signal)
- IA local (Ollama, LM Studio, Jan, Open WebUI)
- Seguridad (Malwarebytes, Bitdefender, Avast)

### Packs predefinidos

- **PostFormateo** — kit esencial tras formatear (un solo botón).
- **Hogar** — uso doméstico básico.
- **Oficina** — productividad para trabajo.
- **Gaming** — launchers y comunicación.
- **Desarrollo** — stack moderno para devs.
- **Creador** — herramientas para creadores de contenido.
- **Audio** — suite musical.
- **IA** — IA generativa local.
- **Técnico** — kit completo para informáticos.

### Funciones

- Instalación masiva con cola: **descarga varias apps en paralelo, instala una a una**.
- Detección automática de apps instaladas y con actualización disponible.
- Logos vectoriales para todas las apps del catálogo.
- Catálogo actualizable en caliente desde GitHub (botón **Actualizar catálogo**).
- Tema claro/oscuro.
- Historial de instalaciones.

## Requisitos

- Windows 10 1809+ o Windows 11.
- Winget (App Installer) — viene de serie; si falta, se instala desde Microsoft Store.
- Conexión a Internet para descargar instaladores (usa **SDIO** primero si te faltan drivers de red).

## Cómo usarlo en un PC recién formateado

1. Copia `PCPI-Portable-0.1.0.exe` a un pendrive.
2. Si no hay drivers de red en el PC formateado, instala primero los drivers con **Snappy Driver Installer Origin** desde el mismo pendrive.
3. Conecta a Internet y ejecuta `PCPI-Portable-0.1.0.exe`.
4. Abre el pack **PostFormateo** o elige apps del catálogo y pulsa **Instalar**.

## Conocido / próximos pasos

- Sin firma de código (avisos de SmartScreen).
- Sin auto-update.
- Soporte Linux/macOS en arquitectura, sin implementar todavía.
