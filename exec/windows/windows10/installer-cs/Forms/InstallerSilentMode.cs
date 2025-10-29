using System.Diagnostics;
using System.ServiceProcess;
using System.Text.Json;
using System.Text.Json.Serialization;

namespace TechMindInstallerW10
{
    partial class Program
    {
        #region VersionInfo
        /// <summary>
        /// Classe de modelo utilizada para representar as informações de versão 
        /// do sistema e do atualizador. 
        /// Os atributos JsonPropertyName garantem que as propriedades sejam 
        /// corretamente mapeadas durante a serialização e desserialização JSON.
        /// </summary>
        public class VersionInfo
        {
            /// <summary>
            /// Versão mais recente do sistema Techmind.
            /// Serializada/desserializada como "latest_version_techmind".
            /// </summary>
            [JsonPropertyName("latest_version_techmind")]
            public string LatestVersionTechmind { get; set; }

            /// <summary>
            /// Versão mais recente do atualizador (tm-updater).
            /// Serializada/desserializada como "latest_version_updater".
            /// </summary>
            [JsonPropertyName("latest_version_updater")]
            public string LatestVersionUpdater { get; set; }
        }
        #endregion


        #region RunSilentInstallation
        /// <summary>
        /// Função principal responsável por controlar o fluxo da instalação silenciosa.
        /// Executa a criação de diretórios, obtém informações de versão, salva arquivos
        /// de configuração, baixa os arquivos necessários, adiciona regras de firewall
        /// e cria o serviço em segundo plano.
        /// </summary>
        static void RunSilentInstallation()
        {
            // Exibe a mensagem de início da instalação no console
            Console.WriteLine("Iniciando Instalação...");

            // Cria a pasta necessária para armazenar os arquivos de configuração
            CreateFolder();

            // Obtém as informações da versão mais recente do sistema e do atualizador
            var versionInfo = GetVersion();

            if (versionInfo != null)
            {
                // Salva o arquivo version.json com as versões recebidas
                SaveVersion(versionInfo.LatestVersionTechmind, versionInfo.LatestVersionUpdater);

                // Realiza o download/atualização dos arquivos necessários em modo silencioso
                Get_FilesAsyncSilent(versionInfo.LatestVersionTechmind, versionInfo.LatestVersionUpdater);
            }
            else
            {
                // Caso não consiga obter a versão, informa erro no console
                Console.WriteLine("Deu ruim");
            }

            // Adiciona regra no firewall para permitir execução do sistema
            AddFirewallRule();

            // Cria o serviço do sistema em modo silencioso
            CreateServiceSilent();

            // Exibe mensagem final indicando término do processo
            Console.WriteLine("Terminou...");

            return;
        }
        #endregion

        #region CreateFolder
        /// <summary>
        /// Função responsável por garantir a existência da pasta base do sistema.
        /// Caso o diretório "C:\Program Files\techmind" não exista, ele será criado.
        /// </summary>
        static void CreateFolder()
        {
            // Exibe a mensagem de criação da pasta no console
            Console.WriteLine("Criando Pasta...");

            // Caminho base onde os arquivos do sistema serão armazenados
            string folderPath = @"C:\Program Files\techmind";

            // Verifica se a pasta já existe
            if (!Directory.Exists(folderPath))
            {
                // Se a pasta não existir, cria a nova pasta no caminho especificado
                Directory.CreateDirectory(folderPath);
            }
        }
        #endregion
        
        #region SaveVersion
        /// <summary>
        /// Função responsável por salvar a versão atual do software em um arquivo JSON.
        /// Cria a pasta de configuração caso não exista e grava o arquivo "version.json"
        /// dentro de "C:\Program Files\techmind\configs".
        /// </summary>
        /// <param name="techmind">Versão ou identificador do sistema Techmind.</param>
        /// <param name="updater">Versão ou identificador do atualizador (tm-updater).</param>
        static void SaveVersion(string techmind, string updater)
        {
            // Exibe mensagem informando que o arquivo de configuração está sendo criado
            Console.WriteLine("Criando arquivo de Configuração...");

            // Estrutura de chave-valor que armazena as versões recebidas
            var dataVersion = new Dictionary<string, string>
            {
                { "techmind", techmind },
                { "tm-updater", updater }
            };

            // Serializa os dados em formato JSON com indentação para melhor legibilidade
            string json = JsonSerializer.Serialize(dataVersion, new JsonSerializerOptions { WriteIndented = true });

            // Caminho base da pasta de configuração
            string pastaBase = @"C:\Program Files\techmind\configs";

            // Caminho completo do arquivo version.json
            string caminho = Path.Combine(pastaBase, "version.json");

            try
            {
                // Garante que a pasta de configuração exista
                Directory.CreateDirectory(pastaBase);

                // Escreve o JSON no arquivo version.json
                File.WriteAllText(caminho, json);
            }
            catch (UnauthorizedAccessException)
            {
                // Trata erro de permissão: Program Files exige privilégios administrativos
                Console.WriteLine("Erro: é necessário executar o programa como administrador para salvar em Program Files.");
            }
            catch (Exception ex)
            {
                // Captura qualquer outra exceção inesperada
                Console.WriteLine($"Erro ao salvar versão: {ex.Message}");
            }
        }
        #endregion

        #region GetVersion
        /// <summary>
        /// Função responsável por obter a versão mais recente do software a partir de uma API.
        /// Realiza uma requisição HTTPS para o servidor, ignora erros de certificado,
        /// desserializa a resposta JSON no objeto <see cref="VersionInfo"/> e retorna o resultado.
        /// </summary>
        /// <returns>
        /// Retorna um objeto <see cref="VersionInfo"/> contendo as versões mais recentes 
        /// do sistema Techmind e do atualizador. Caso ocorra erro, retorna null.
        /// </returns>
        private static VersionInfo GetVersion()
        {
            // Exibe mensagem no console informando que a verificação de versão está iniciando
            Console.WriteLine("Verificando Versão do programa...");

            try
            {
#pragma warning disable SYSLIB0014 // Type or member is obsolete
                // Cria a requisição HTTP para obter a versão mais recente
                var request = (System.Net.HttpWebRequest)System.Net.WebRequest.Create("https://techmind.lupatech.com.br/get-current-version/windows10");
#pragma warning restore SYSLIB0014 // Type or member is obsolete

                // Ignora a validação de certificado SSL (não recomendado em produção)
                request.ServerCertificateValidationCallback += (sender, cert, chain, sslPolicyErrors) => true;

                // Define o tempo máximo de espera da requisição (15 segundos)
                request.Timeout = 15000;

                // Executa a requisição e obtém a resposta do servidor
                using var response = (System.Net.HttpWebResponse)request.GetResponse();

                // Lê o conteúdo da resposta como stream
                using var stream = response.GetResponseStream();

                // Lê o stream como texto (JSON retornado pela API)
                using var reader = new StreamReader(stream);
                var jsonResponse = reader.ReadToEnd();

                // Converte o JSON para um objeto VersionInfo
                var resultado = JsonSerializer.Deserialize<VersionInfo>(jsonResponse);

                // Retorna as informações de versão obtidas
                return resultado;
            }
            catch (Exception ex)
            {
                // Em caso de erro, exibe mensagem no console e retorna null
                Console.WriteLine($"Erro ao fazer a requisição: {ex.Message}");
                return null;
            }
        }
        #endregion

        #region Get_FilesAsyncSilent
        /// <summary>
        /// Função responsável por realizar o download silencioso dos arquivos principais:
        /// o sistema Techmind e o atualizador. 
        /// Utiliza a função <see cref="DownloadFiles(string, string)"/> para baixar cada item
        /// com base na versão recebida.
        /// </summary>
        /// <param name="versionTechmind">Versão do sistema Techmind a ser baixada.</param>
        /// <param name="versionUpdater">Versão do atualizador (tm-updater) a ser baixada.</param>
        static void Get_FilesAsyncSilent(string versionTechmind, string versionUpdater)
        {
            try
            {
                // Exibe mensagem de início do download do sistema principal
                Console.WriteLine("Baixando TechMind...");
                DownloadFiles("techmind", versionTechmind);

                // Exibe mensagem de início do download do atualizador
                Console.WriteLine("Baixando Atualizador...");
                DownloadFiles("tm-updater", versionUpdater);
            }
            catch (Exception ex)
            {
                // Captura e exibe erros inesperados durante os downloads
                Console.WriteLine($"Erro geral: {ex.Message}");
            }
        }
        #endregion

        #region DownloadFiles
        /// <summary>
        /// Função responsável por baixar um arquivo executável específico (Techmind ou Updater) 
        /// a partir de um servidor remoto, salvando-o na pasta "C:\Program Files\techmind".
        /// Configura o protocolo TLS, força o uso de SNI e grava o conteúdo em disco.
        /// </summary>
        /// <param name="file">Nome do arquivo a ser baixado (ex.: "techmind" ou "tm-updater").</param>
        /// <param name="version">Versão do arquivo a ser baixada.</param>
        private static void DownloadFiles(string file, string version)
        {
            try
            {
                // Monta a URL de download a partir do nome do arquivo e versão
                string url = $"https://10.1.1.73/download-files/{file}/{version}";

                // Caminho local onde o executável será salvo
                string localPath = $@"C:\Program Files\techmind\{file}.exe";

                // Informa no console qual arquivo está sendo baixado
                Console.WriteLine($"Baixando {file} versão {version}...");

#pragma warning disable SYSLIB0014 // Type or member is obsolete
                // Força o uso de TLS 1.2 e TLS 1.3 para a comunicação segura
                System.Net.ServicePointManager.SecurityProtocol =
                    System.Net.SecurityProtocolType.Tls12 |
                    System.Net.SecurityProtocolType.Tls13;
#pragma warning restore SYSLIB0014 // Type or member is obsolete

#pragma warning disable SYSLIB0014 // Type or member is obsolete
                // Cria a requisição HTTP para o download
                var request = (System.Net.HttpWebRequest)System.Net.WebRequest.Create(url);
#pragma warning restore SYSLIB0014 // Type or member is obsolete

                // Ignora erros de certificado SSL (⚠️ inseguro, apenas para ambientes controlados)
                request.ServerCertificateValidationCallback += (sender, cert, chain, sslPolicyErrors) => true;

                // Define manualmente o host (SNI) esperado pelo servidor
                request.Host = "techmind.lupatech.com.br";

                // Define timeout de 60 segundos para evitar travas
                request.Timeout = 60000;

                // Obtém a resposta do servidor
                using var response = (System.Net.HttpWebResponse)request.GetResponse();

                // Stream da resposta (conteúdo do arquivo)
                using var stream = response.GetResponseStream();

                // Cria o arquivo local onde o executável será gravado
                using var fileStream = File.Create(localPath);

                // Buffer para leitura em blocos (8 KB por vez)
                byte[] buffer = new byte[8192];
                int bytesRead;

                // Lê os dados do stream e escreve no arquivo até o final
                while ((bytesRead = stream.Read(buffer, 0, buffer.Length)) > 0)
                {
                    fileStream.Write(buffer, 0, bytesRead);
                }
            }
            catch (Exception ex)
            {
                // Captura e exibe qualquer erro ocorrido durante o download
                Console.WriteLine($"Erro ao baixar {file}: {ex.Message}");
            }
        }
        #endregion

        #region AddFirewallRule
        /// <summary>
        /// Função responsável por criar uma regra de firewall no Windows para o executável do sistema TechMind.
        /// A regra permite tráfego de entrada (TCP) na porta 9090 para o programa localizado em "%ProgramFiles%\techmind\techmind.exe".
        /// Utiliza o comando `netsh advfirewall` para adicionar a regra.
        /// </summary>
        static void AddFirewallRule()
        {
            // Exibe mensagem informando que a regra de firewall está sendo criada
            Console.WriteLine("Criando Regra do FireWall...");

            try
            {
                // Caminho do executável do sistema (variável de ambiente %ProgramFiles% é expandida pelo sistema)
                string programPath = @"%ProgramFiles%\techmind\techmind.exe";

                // Configura o processo para executar o comando netsh com os parâmetros necessários
                ProcessStartInfo psi = new()
                {
                    FileName = "netsh",
                    Arguments = $"advfirewall firewall add rule name=\"TechMind\" dir=in program=\"{programPath}\" action=allow protocol=TCP localport=9090",
                    UseShellExecute = false,           // Necessário para redirecionar saída
                    CreateNoWindow = true,             // Executa sem abrir janela do console
                    RedirectStandardOutput = true,     // Captura saída padrão
                    RedirectStandardError = true       // Captura saída de erro
                };

                // Inicia o processo do netsh
                using Process process = Process.Start(psi)!;

                // Captura saídas do processo
                string output = process.StandardOutput.ReadToEnd();
                string error = process.StandardError.ReadToEnd();

                // Aguarda a execução terminar
                process.WaitForExit();

                // Se o código de saída for diferente de 0, houve falha
                if (process.ExitCode != 0)
                {
                    Console.WriteLine($"Falha ao adicionar regra. Código: {process.ExitCode}");
                    Console.WriteLine($"Erro: {error}");
                }
            }
            catch (Exception ex)
            {
                // Captura e exibe erros inesperados ao tentar criar a regra
                Console.WriteLine($"Erro inesperado ao criar regra de firewall: {ex.Message}");
            }
        }
        #endregion

        #region CreateServiceSilent
        /// <summary>
        /// Função responsável por criar e iniciar o serviço do sistema TechMind no Windows.
        /// Caso o serviço não exista, ele é criado utilizando o comando `sc create`
        /// apontando para o executável do sistema em "C:\Program Files\techmind\techmind.exe".
        /// Em seguida, o serviço é iniciado com `sc start`.
        /// </summary>
        static void CreateServiceSilent()
        {
            // Exibe mensagem informando que o serviço está sendo criado
            Console.WriteLine("Criando Serviço...");

            try
            {
                // Nome do serviço a ser registrado no Windows
                string serviceName = "TechMind";

                // Caminho do executável que será associado ao serviço
                string serviceExePath = @"C:\Program Files\techmind\techmind.exe";

                // Verifica se o serviço já existe
                bool exists = ServiceExists(serviceName);

                // Caso não exista, cria o serviço com inicialização automática
                if (!exists)
                {
                    Process.Start("sc.exe", $"create {serviceName} binPath= \"{serviceExePath}\" start= auto").WaitForExit();
                }

                // Tenta iniciar o serviço (se já existir, apenas inicia; se foi criado, inicia na sequência)
                Process.Start("sc.exe", $"start {serviceName}").WaitForExit();
            }
            catch (Exception ex)
            {
                // Captura e exibe qualquer erro durante criação/início do serviço
                Console.WriteLine($"Erro: {ex.Message}");
            }
        }
        #endregion

        #region ServiceExists
        /// <summary>
        /// Função que verifica se um serviço do Windows com o nome especificado já existe.
        /// Itera sobre todos os serviços instalados e compara o nome ignorando maiúsculas/minúsculas.
        /// </summary>
        /// <param name="serviceName">Nome do serviço a ser verificado.</param>
        /// <returns>Retorna true se o serviço existir; caso contrário, false.</returns>
        private static bool ServiceExists(string serviceName)
        {
            // Obtém todos os serviços instalados no sistema
            ServiceController[] services = ServiceController.GetServices();

            // Itera sobre cada serviço para verificar se o nome coincide
            foreach (ServiceController s in services)
            {
                if (s.ServiceName.Equals(serviceName, StringComparison.OrdinalIgnoreCase))
                    return true;
            }

            // Retorna false caso o serviço não tenha sido encontrado
            return false;
        }
        #endregion
    }
}