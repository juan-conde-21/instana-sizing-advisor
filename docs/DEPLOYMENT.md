# Despliegue

Repositorio: https://github.com/juan-conde-21/instana-sizing-advisor

Página esperada: https://juan-conde-21.github.io/instana-sizing-advisor/

El despliegue debe hacerse con rama, Pull Request, CI y GitHub Pages mediante GitHub Actions. No uses force push y no publiques manualmente `dist/`.

## Flujo recomendado

```text
rama → Pull Request → CI → merge a main → deploy-pages → GitHub Pages
```

## A. Publicación mediante rama y Pull Request

1. Revisar estado:

```bash
git status
git diff
```

2. Ejecutar pruebas:

```bash
npm ci
npm run lint
npm test
npm run build
npm run test:e2e
npm audit --omit=dev
```

3. Crear rama:

```bash
git switch -c release/nombre-de-cambio
```

4. Agregar cambios:

```bash
git add README.md docs .github/workflows src tests package.json package-lock.json vite.config.ts .gitignore CHANGELOG.md
```

5. Revisar staged:

```bash
git diff --cached
git diff --cached --check
```

6. Crear commit:

```bash
git commit -m "feat: publish commercial Instana sizing advisor"
```

7. Push:

```bash
git push -u origin release/nombre-de-cambio
```

8. Crear Pull Request hacia `main` y esperar CI.

## B. GitHub Actions

`ci.yml` valida Pull Requests y pushes a `main`.

`deploy-pages.yml` construye y publica GitHub Pages después de llegar a `main`. Usa `GITHUB_TOKEN`, permisos mínimos y el artefacto `dist`.

## C. Configuración de GitHub Pages

En GitHub:

```text
Settings → Pages → Build and deployment → Source → GitHub Actions
```

No uses rama `gh-pages` salvo que el repositorio adopte explícitamente otra estrategia.

## D. Verificación posterior

Después del merge y del workflow `Deploy GitHub Pages`, abre:

https://juan-conde-21.github.io/instana-sizing-advisor/

Valida que la aplicación cargue, que no haya 404 en assets y que el archivo `dist/index.html` haya sido construido con base `/instana-sizing-advisor/`.

## E. Solución de errores

- Assets con 404: revisar `vite.config.ts` y `VITE_BASE_PATH`.
- Página en blanco: revisar consola del navegador y rutas generadas en `dist/index.html`.
- Workflow cancelado: revisar concurrency y volver a ejecutar si corresponde.
- Pages no publica: confirmar Source = GitHub Actions.
- E2E falla en CI: revisar artefactos `playwright-report` y `test-results` subidos por el workflow.
- Caché del navegador: probar recarga dura o sesión incógnita.

## F. Rollback seguro

Si un despliegue queda incorrecto:

1. Revertir el commit en `main`.
2. Crear Pull Request de rollback.
3. Fusionar después de CI.
4. Permitir que `deploy-pages` publique el artefacto corregido.

No uses force push y no edites `dist/` manualmente.
