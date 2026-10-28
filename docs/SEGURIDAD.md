# Protocolo de Seguridad y Saneamiento de Credenciales - LuxeStays

Este documento describe las acciones inmediatas para mitigar la exposición de credenciales y asegurar el repositorio y la infraestructura en Supabase, Render y Vercel.

---

## 1. Rotación de Credenciales en Supabase

Dado que la contraseña de la base de datos estuvo presente en texto plano en scripts sueltos (`alter.js`, `alter2.js`, `alter3.js`, etc.) y en el historial de Git, la contraseña actual se considera **comprometida**.

### Pasos para Rotar la Contraseña:
1. Iniciar sesión en la consola de [Supabase](https://supabase.com/dashboard).
2. Seleccionar el proyecto correspondiente a LuxeStays (`hieymocmcfftjtjsspjl`).
3. Navegar a **Project Settings** > **Database**.
4. En la sección **Database Password**, hacer clic en **Reset database password**.
5. Generar una contraseña fuerte (mínimo 16 caracteres alfanuméricos con símbolos seguros). Guardarla en un gestor de contraseñas seguro.
6. En la misma pantalla, copiar la nueva cadena de conexión bajo el apartado **Connection pooling** (Transaction mode, puerto `6543`).
7. Actualizar la variable de entorno `DATABASE_URL` inmediatamente en el panel de **Render** (Environment Variables del Web Service).
8. Actualizar el archivo local `.env` en la máquina de desarrollo (nunca versionarlo).

---

## 2. Purgado del Historial de Git (Git History Purge)

Para remover permanentemente los archivos comprometidos del historial del repositorio Git y evitar que queden rastreables en commits anteriores:

### Opción Recomendada: `git-filter-repo` (Python)
1. Instalar `git-filter-repo` (requiere Python 3):
   ```bash
   pip install git-filter-repo
   ```
2. Realizar un clon fresco o copia de seguridad previa del repositorio:
   ```bash
   git clone --mirror <URL_DEL_REPOSITORIO> repo-backup.git
   ```
3. Ejecutar el filtro para purgar los scripts y archivos sensibles de todos los commits:
   ```bash
   git filter-repo --invert-paths \
     --path backend/alter.js \
     --path backend/alter2.js \
     --path backend/alter3.js \
     --path backend/check.js \
     --path backend/test_hash.js \
     --path backend/booking.sqlite \
     --path backend/.env \
     --path frontend/.env
   ```
4. Forzar el push a las ramas remotas:
   ```bash
   git push origin --force --all
   git push origin --force --tags
   ```

### Opción Alternativa: BFG Repo-Cleaner
```bash
java -jar bfg.jar --delete-files "{alter.js,alter2.js,alter3.js,check.js,test_hash.js,booking.sqlite,.env}"
git reflog expire --expire=now --all && git gc --prune=now --aggressive
git push origin --force --all
```

---

## 3. Confirmación de Archivos Ignorados y Variables de Entorno

### Verificación de `.gitignore`
Los archivos `.gitignore` en la raíz, `backend/` y `frontend/` ignoran explícitamente:
- `.env`, `.env.local`, `.env.*.local`, `.env.production`, `.env.test`
- `*.sqlite`
- `node_modules/`
- `dist/`

### Verificación mediante comando Git
Ejecutar para comprobar que no existan archivos `.env` ni scripts sensibles trackeados:
```bash
git status --ignored
git ls-files | grep -E "(\.env$|\.sqlite$|alter.*\.js|check.*\.js)"
```
Si el comando no retorna ningún archivo versionado, el repositorio está limpio.

---

## 4. Validación de Variables Obligatorias en Arranque
El backend ahora valida al iniciar (`main.ts` / `AppModule`):
1. `DATABASE_URL`: Obligatoria. Si falta, la aplicación arroja un error crítico y aborta el inicio.
2. `JWT_SECRET`: Obligatoria, con una longitud mínima de 32 caracteres. El fallback `'secreto_super_seguro_123'` fue completamente removido.
