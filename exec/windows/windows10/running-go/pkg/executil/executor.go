package executil

import (
	"fmt"
	"os/exec"
)

// RunExe executa um arquivo executável (.exe) localizado no diretório especificado,
// passando os argumentos fornecidos para o executável.
//
// Parâmetros:
// - dir: diretório onde o executável está localizado.
// - exeName: nome do arquivo executável a ser executado.
// - args: lista variádica de argumentos que serão passados para o executável.
//
// Retorna um erro caso não consiga iniciar o processo do executável.
//
func RunExe(dir string, exeName string, args ...string) error {
	// Concatena o caminho completo do executável, utilizando "\" como separador
	// Isso é específico para sistemas Windows.
	path := dir + "\\" + exeName

	// Cria o comando para executar o arquivo, passando os argumentos recebidos.
	cmd := exec.Command(path, args...)
	// Define o diretório de trabalho do comando, que será o diretório informado.
	cmd.Dir = dir

	// Inicia a execução do comando (assíncrono).
	err := cmd.Start()
	if err != nil {
		// Caso ocorra erro ao iniciar o executável, encapsula e retorna a mensagem de erro.
		return fmt.Errorf("erro ao iniciar o executável: %w", err)
	}

	// Se chegou aqui, o executável foi iniciado com sucesso, retorna nil.
	return nil
}
