using System.Diagnostics;
using Microsoft.Win32;

namespace TechMindInstallerW10
{
    #region Partial Class Uninstall Silent Mode
    /// <summary>
    /// Essa é uma classe parcial de Program para deinstalar silenciosamente
    /// o TechMind
    /// </summary>
    partial class Program
    {
        #region Func RunSilentDesinstallation
        /// <summary>
        /// Inicia a Desinstalação começando removendo a regra de FireWall do 
        /// TechMind
        /// </summary>
        static void RunSilentDesinstallation()
        {
            Console.WriteLine("Removendo Regra do FireWall...");

            try
            {
                // Nome da regra que foi adicionada
                string ruleName = "TechMind";

                ProcessStartInfo psi = new()
                {
                    FileName = "netsh",
                    Arguments = $"advfirewall firewall delete rule name=\"{ruleName}\"",
                    UseShellExecute = false,
                    CreateNoWindow = true,
                    RedirectStandardOutput = true,
                    RedirectStandardError = true
                };

                using Process process = Process.Start(psi)!;
                string output = process.StandardOutput.ReadToEnd();
                string error = process.StandardError.ReadToEnd();

                process.WaitForExit();

                if (process.ExitCode == 0)
                {
                    Console.WriteLine("Regra de firewall removida com sucesso.");
                    StoppingServices();
                }
                else
                {
                    Console.WriteLine($"Falha ao remover regra. Código: {process.ExitCode}");
                    Console.WriteLine($"Erro: {error}");
                    Environment.Exit(0); // Encerra o programa imediatamente
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Erro inesperado ao remover regra de firewall: {ex.Message}");
                Environment.Exit(0); // Encerra o programa imediatamente
            }
        }
        #endregion

        #region Func RemoveRegEdit
        /// <summary>
        /// Remove o RegEdit Refente ao TechMind
        /// </summary>
        static void RemoveServiceSilent()
        {
            // Atualiza o rótulo indicando que o processo de remoção do registro está em andamento
            Console.WriteLine("Removendo Serviço...");

            string serviceName = "TechMind";

            try
            {
                // Para o serviço antes de excluir
                Process.Start("sc.exe", $"stop {serviceName}").WaitForExit();

                // Remove o serviço
                Process.Start("sc.exe", $"delete {serviceName}").WaitForExit();
            }
            catch(Exception ex)
            {
                Console.WriteLine("Erro ao remover serviço: " + ex.Message);
            }

        }
        #endregion

        #region Func StoppingServices
        /// <summary>
        /// Finalizando os Serviços Referente ao TechMind
        /// </summary>
        static void StoppingServices()
        {
            // Atualiza o rótulo indicando que o processo de finalização está em andamento
            Console.WriteLine("Finalizando Processos...");

            // Nome do processo a ser finalizado, sem a extensão .exe
            string processName = "techmind";

            // Obtém todos os processos em execução com o nome especificado
            Process[] processes = Process.GetProcessesByName(processName);

            // Verifica se há algum processo em execução com o nome fornecido
            if (processes.Length > 0)
            {
                // Para cada processo encontrado, tenta finalizar
                foreach (Process process in processes)
                {
                    try
                    {
                        // Finaliza o processo
                        process.Kill();
                        // Chama o método para remover arquivos após o processo ser finalizado
                        RemoveFiles();
                    }
                    catch (Exception ex)
                    {
                        // Caso haja erro ao finalizar o processo, o erro é registrado no console
                        Console.WriteLine($"Erro ao finalizar o processo: {ex.Message}");
                    }
                }
            }
            else
            {
                // Caso nenhum processo seja encontrado, chama o método para remover arquivos
                RemoveFiles();
            }
        }
        #endregion

        static void RemoveFiles()
        {
            // Atualiza o rótulo indicando que os arquivos estão sendo removidos
            Console.WriteLine("Removendo arquivos...");

            // Caminho do diretório a ser removido
            string folderPath = @"C:\Program Files\techmind";

            try
            {
                // Verifica se o diretório existe
                if (Directory.Exists(folderPath))
                {
                    // Deleta todos os arquivos dentro da pasta
                    foreach (string file in Directory.GetFiles(folderPath))
                    {
                        File.Delete(file);
                        RemoveServiceSilent();
                        // Após a remoção dos arquivos, atualiza o rótulo e exibe o botão para reiniciar
                        Console.WriteLine("Desinstalação Concluida!");
                        Console.WriteLine("Deve-se Reiniciar o computador...");
                        // Environment.Exit(0);
                    }

                    // Deleta todas as subpastas dentro da pasta
                    foreach (string subDir in Directory.GetDirectories(folderPath))
                    {
                        Directory.Delete(subDir, true); // 'true' para excluir recursivamente
                        RemoveServiceSilent();
                        Console.WriteLine("Desinstalação Concluida!");
                        Console.WriteLine("Deve-se Reiniciar o computador...");
                        Environment.Exit(0);
                    }
                }
                else
                {
                    RemoveServiceSilent();
                    Console.WriteLine("Desinstalação Concluida!");
                    Console.WriteLine("Deve-se Reiniciar o computador...");
                    Environment.Exit(0);
                }
            }
            catch (Exception ex)
            {
                // Exibe uma mensagem de erro caso ocorra alguma exceção ao excluir a pasta
                Console.WriteLine($"Erro ao excluir a pasta: {ex.Message}");
                Environment.Exit(0);
            }
        }
    }
    #endregion
}
