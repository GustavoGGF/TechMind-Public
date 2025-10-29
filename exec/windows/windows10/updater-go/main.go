package main

import (
	"crypto/tls"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"techmind-updater/pkg/executil"
	"techmind-updater/pkg/logger"
	"techmind-updater/pkg/report"

	"github.com/mitchellh/go-ps"
)

func KillExistingTechmind() {
	currentPid := os.Getpid()

	processes, err := ps.Processes()
	if err != nil {
		logger.LogToFile("Erro ao listar processos: " + err.Error())
		return
	}

	for _, proc := range processes {
		if strings.EqualFold(proc.Executable(), "techmind.exe") && proc.Pid() != currentPid {
			// Finaliza o processo encontrado
			cmd := exec.Command("taskkill", "/PID", fmt.Sprint(proc.Pid()), "/F")
			err := cmd.Run()
			if err != nil {
				logger.LogToFile(fmt.Sprintf("Erro ao finalizar processo %d: %v", proc.Pid(), err))
			} else {
				logger.LogToFile(fmt.Sprintf("Finalizado processo duplicado: PID %d", proc.Pid()))
			}
		}
	}
}

func RenameFile() string{
	// Caminhos absoluto do arquivo atual e do novo nome
	oldPath := `C:\Program Files\techmind\techmind.exe`
	newPath := `C:\Program Files\techmind\techmindOlde.exe`

	// Renomeia o arquivo
	err := os.Rename(oldPath, newPath)
	if err != nil {
		logger.LogToFile(fmt.Sprintf("Erro ao renomear arquivo: %v\n", err))
		return ""
	}

	return newPath
}

func GetVersion() string {
		// Caminho do arquivo JSON
	configFilePath := filepath.Join("C:\\", "Program Files", "techmind", "configs", "version.json")

	// Abre o arquivo
	file, err := os.Open(configFilePath)
	if err != nil {
		logger.LogToFile(fmt.Sprintf("Erro ao abrir o arquivo JSON: %v\n", err))
		return ""
	}
	defer file.Close()

	// Decodifica o JSON para um mapa genérico
	var data map[string]interface{}
	err = json.NewDecoder(file).Decode(&data)
	if err != nil {
		logger.LogToFile(fmt.Sprintf("Erro ao decodificar JSON: %v\n", err))
		return ""
	}

	versionVal, ok := data["new_version"].(string)
	if !ok {
		logger.LogToFile(fmt.Sprintln("Chave 'new_version' não encontrada ou não é uma string."))
		return ""
	}

	return versionVal
}

func DownloadNewFile(version string){
	url := "https://techmind.lupatech.com.br/download-files/techmind/" + version

	// Cliente HTTP que ignora verificação de certificado (caso necessário)
	client := &http.Client{
		Transport: &http.Transport{
			TLSClientConfig: &tls.Config{InsecureSkipVerify: true},
		},
	}

	// Requisição GET
	resp, err := client.Get(url)
	if err != nil {
		logger.LogToFile(fmt.Sprintf("Erro ao fazer GET: %v\n", err))
		return
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		logger.LogToFile(fmt.Sprintf("Falha no download. Status: %s\n", resp.Status))
		return
	}

	// Define caminho completo do destino
	destPath := filepath.Join("C:\\", "Program Files", "techmind", "techmind.exe")

	// Cria arquivo de destino
	outFile, err := os.Create(destPath)
	if err != nil {
		logger.LogToFile(fmt.Sprintf("Erro ao criar arquivo: %v\n", err))
		return
	}
	defer outFile.Close()

	// Copia o conteúdo da resposta para o arquivo
	_, err = io.Copy(outFile, resp.Body)
	if err != nil {
		logger.LogToFile(fmt.Sprintf("Erro ao salvar arquivo: %v\n", err))
		return
	}
}

func RemoveFile(dir string){
	// Remove o arquivo
	err := os.Remove(dir)
	if err != nil {
		logger.LogToFile(fmt.Sprintf("Erro ao deletar o arquivo: %v\n", err))
		return
	}
}

func main() {
	KillExistingTechmind()

    old_file := RenameFile()

	if len(old_file) == 0{
		logger.LogToFile(fmt.Sprintln("erro ao renomear o techmind antigo"))
		return
	}

	version := GetVersion()

	if len(version) == 0{
		logger.LogToFile(fmt.Sprintln("Erro ao obter a Versão"))
		return
	}

	DownloadNewFile(version)

	RemoveFile(old_file)

	exec_tech := executil.RunExe("C:\\Program Files\\techmind", "techmind.exe")
	if exec_tech != nil{
		logger.LogToFile(fmt.Sprintln("Erro ao iniciar TechMind: ", exec_tech))
		return
	}

	send := report.SendStatus("Atualizado com sucesso", "satt", 200)
	if send != nil{
		logger.LogToFile(fmt.Sprintln("Erro ao enviar menssagem para o servidor: ", send))
	}

	logger.LogToFile(fmt.Sprintln("==============================="))
	logger.LogToFile(fmt.Sprintln("Atualizado com Sucesso!!!"))
	logger.LogToFile(fmt.Sprintln("==============================="))
	return
}
