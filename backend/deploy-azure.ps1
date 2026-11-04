# Script automatizado de despliegue en Azure App Service y CloudAMQP
$ErrorActionPreference = "Stop"

$APP_NAME = "posada-ec-alojamientos"
$RG_NAME = "rg-$APP_NAME"
$PLAN_NAME = "plan-$APP_NAME"
$LOCATION = "brazilsouth"
$NODE_ID = "NODE_ALO_LUXE"
$ZIP_PATH = "d:\SEBASTIAN\INTEGRACION_DE_SISTEMAS\Proyecto RDA1\backend\deploy.zip"

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "   DESPLIEGUE AUTOMATICO EN AZURE APP SERVICE (B1 Linux)  " -ForegroundColor Cyan
Write-Host "   App: $APP_NAME | Region: $LOCATION | Nodo: $NODE_ID    " -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan

# 1. Registrar proveedor si hace falta
Write-Host "`n[1/7] Verificando registro del proveedor Microsoft.Web..." -ForegroundColor Yellow
az provider register --namespace Microsoft.Web

# 2. Crear Grupo de Recursos
Write-Host "`n[2/7] Creando Grupo de Recursos '$RG_NAME' en '$LOCATION'..." -ForegroundColor Yellow
az group create --name $RG_NAME --location $LOCATION --output table

# 3. Crear Plan de App Service (B1 Linux)
Write-Host "`n[3/7] Creando App Service Plan '$PLAN_NAME' (Linux B1)..." -ForegroundColor Yellow
az appservice plan create --name $PLAN_NAME --resource-group $RG_NAME --sku B1 --is-linux --output table

# 4. Crear Web App
Write-Host "`n[4/7] Creando Web App '$APP_NAME' con runtime Node 22 LTS..." -ForegroundColor Yellow
az webapp create --resource-group $RG_NAME --plan $PLAN_NAME --name $APP_NAME --runtime "NODE:22-lts" --output table

# 5. Ajustes de Runtime y Variables de Entorno
Write-Host "`n[5/7] Configurando Always On y comando de inicio..." -ForegroundColor Yellow
az webapp config set --resource-group $RG_NAME --name $APP_NAME --always-on true --startup-file "node dist/main.js"

Write-Host "`nConfigurando variables de entorno de la aplicacion..." -ForegroundColor Yellow
az webapp config appsettings set --resource-group $RG_NAME --name $APP_NAME --settings `
  SCM_DO_BUILD_DURING_DEPLOYMENT="false" `
  ENABLE_ORYX_BUILD="false" `
  WEBSITES_CONTAINER_START_TIME_LIMIT="600" `
  PORT="8080" `
  HOST="0.0.0.0" `
  NODE_ENV="production" `
  TZ="America/Guayaquil" `
  WEBSITE_TIME_ZONE="America/Guayaquil" `
  NODE_ID="$NODE_ID" `
  EVENT_BUS_MODE="rabbitmq" `
  RABBITMQ_URL="amqps://qkvqjvku:ATBxToI1JvR6YbRBIIAnATa5mnjdIqz_@shark.rmq.cloudamqp.com/qkvqjvku" `
  BOOKING_REST_STOCK_URL="https://booking-core-api.azurewebsites.net/api/v3/inventory/stock" `
  BOOKING_BASE_URL="https://booking-core-api.azurewebsites.net/api/v3" `
  DATABASE_URL="postgresql://postgres.hieymocmcfftjtjsspjl:Sebastianv631498@aws-0-ca-central-1.pooler.supabase.com:6543/postgres" `
  JWT_SECRET="luxestays_jwt_secret_enterprise_secure_key_2026_rda1_epn" `
  JWT_EXPIRES_IN="7d" `
  IVA_RATE="0.15" `
  TASA_MUNICIPAL="2.00" `
  --output table

# 6. Despliegue de paquete ZIP precompilado
Write-Host "`n[6/7] Desplegando archivo ZIP precompilado ($ZIP_PATH)..." -ForegroundColor Yellow
az webapp deploy --resource-group $RG_NAME --name $APP_NAME --src-path $ZIP_PATH --type zip --async false

# 7. Verificacion de salud
Write-Host "`n[7/7] Esperando que la aplicacion inicie y responda healthcheck..." -ForegroundColor Yellow
Start-Sleep -Seconds 15

$HEALTH_URL = "https://$APP_NAME.azurewebsites.net/api/v2/alojamientos/health"
Write-Host "Consultando: $HEALTH_URL" -ForegroundColor Cyan

$attempts = 0
$maxAttempts = 12
$success = $false

while ($attempts -lt $maxAttempts -and -not $success) {
    $attempts++
    try {
        $res = Invoke-RestMethod -Uri $HEALTH_URL -Method Get -TimeoutSec 10
        Write-Host "Respuesta de Healthcheck (Intento $attempts):" -ForegroundColor Green
        $res | ConvertTo-Json
        $success = $true
    } catch {
        Write-Host "Intento $attempts/$maxAttempts: Servicio aun iniciando... esperando 10s..." -ForegroundColor DarkGray
        Start-Sleep -Seconds 10
    }
}

if ($success) {
    Write-Host "`nDESPLIEGUE COMPLETADO EXITOSAMENTE!" -ForegroundColor Green
    Write-Host "URL Base: https://$APP_NAME.azurewebsites.net/api/v2" -ForegroundColor Green
    Write-Host "Health:   https://$APP_NAME.azurewebsites.net/api/v2/alojamientos/health" -ForegroundColor Green
} else {
    Write-Host "`nEl servicio demoro en responder. Puedes revisar los logs con: az webapp log tail --resource-group $RG_NAME --name $APP_NAME" -ForegroundColor Yellow
}

