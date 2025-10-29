# Caminho do diretório atual
$CurrentDir = Get-Location

# Nome do arquivo
$FileName = "TechMind Setup-Windows10.exe"

# Caminho completo do arquivo
$FilePath = Join-Path $CurrentDir $FileName

# Verifica se o arquivo existe e exclui
if (Test-Path $FilePath) {
    Remove-Item $FilePath -Force
    Write-Output "Arquivo '$FileName' excluído com sucesso."
} else {
    Write-Output "Arquivo '$FileName' não encontrado no diretório atual."
}

$FolderName = "bin"
$FolderPath = Join-Path $CurrentDir $FolderName

# Verifica se a pasta existe e exclui
if (Test-Path $FolderPath) {
    Remove-Item $FolderPath -Recurse -Force
    Write-Output "Pasta '$FolderName' excluída com sucesso."
} else {
    Write-Output "Pasta '$FolderName' não encontrada no diretório atual."
}

# Limpa a tela
Clear-Host

# Limpa o build anterior
dotnet clean

# Publica o projeto em Release, self-contained, arquivo único e comprimido
dotnet publish -c Release -r win-x64 --self-contained true `
    -p:PublishSingleFile=true `
    -p:IncludeNativeLibrariesForSelfExtract=true `
    -p:EnableCompressionInSingleFile=true `
    -o .