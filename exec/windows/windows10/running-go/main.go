package main

import (
	"bufio"
	"bytes"
	"crypto/hmac"
	"crypto/sha256"
	"crypto/tls"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net"
	"net/http"
	"os"
	"os/exec"
	"os/user"
	"path/filepath"
	"runtime"
	"strconv"
	"strings"
	"time"

	"techmind/windows/pkg/audio"
	"techmind/windows/pkg/config"
	"techmind/windows/pkg/cpu"
	"techmind/windows/pkg/executil"
	"techmind/windows/pkg/gpu"
	"techmind/windows/pkg/logger"
	"techmind/windows/pkg/memory"
	"techmind/windows/pkg/network"
	"techmind/windows/pkg/ports"
	"techmind/windows/pkg/report"
	"techmind/windows/pkg/software"
	"techmind/windows/pkg/storage"
	"techmind/windows/pkg/sysinfo"

	"github.com/mitchellh/go-ps"
	"github.com/shirou/gopsutil/host"
	"golang.org/x/sys/windows/svc"
)

// Struct onde que mandará o JSON
type Data struct {
	System                  string                                  `json:"system"`
	Name                    string                                  `json:"name"`
	Distribution            string                                  `json:"distribution"`
	InsertionDate           string                                  `json:"insertionDate"`
	MacAddress              string                                  `json:"macAddress"`
	CurrentUser             string                                  `json:"currentUser"`
	PlatformVersion         string                                  `json:"platformVersion"`
	Domain                  string                                  `json:"domain"`
	IP                      string                                  `json:"ip"`
	Manufacturer            string                                  `json:"manufacturer"`
	Model                   string                                  `json:"model"`
	SerialNumber            string                                  `json:"serialNumber"`
	MaxCapacityMemory       string                                  `json:"maxCapacityMemory"`
	NumberOfDevices         string                                  `json:"numberOfDevices"`
	HardDiskModel           string                                  `json:"hardDiskModel"`
	HardDiskSerialNumber    string                                  `json:"hardDiskSerialNumber"`
	HardDiskUserCapacity    string                                  `json:"hardDiskUserCapacity"`
	HardDiskSataVersion     string                                  `json:"hardDiskSataVersion"`
	CPUArchitecture         string                                  `json:"cpuArchitecture"`
	CPUOperationMode        string                                  `json:"cpuOperationMode"`
	CPUS                    uint32                                  `json:"cpus"`
	CPUVendorID             string                                  `json:"cpuVendorID"`
	CPUModelName            string                                  `json:"cpuModelName"`
	CPUThread               uint32                                  `json:"cpuThread"`
	CPUCore                 uint32                                  `json:"cpuCore"`
	CPUSocket               int                                     `json:"cpuSocket"`
	CPUMaxMHz               uint32                                  `json:"cpuMaxMHz"`
	CPUMinMHz               uint32                                  `json:"cpuMinMHz"`
	GPUProduct              string                                  `json:"gpuProduct"`
	GPUVendorID             string                                  `json:"gpuVendorID"`
	GPUBusInfo              string                                  `json:"gpuBusInfo"`
	GPULogicalName          string                                  `json:"gpuLogicalName"`
	GPUClock                string                                  `json:"gpuClock"`
	GPUConfiguration        string                                  `json:"gpuConfiguration"`
	AudioDeviceProduct      string                                  `json:"audioDeviceProduct"`
	AudioDeviceModel        string                                  `json:"audioDeviceModel"`
	BiosVersion             string                                  `json:"biosVersion"`
	MotherboardManufacturer string                                  `json:"motherboardManufacturer"`
	MotherboardProductName  string                                  `json:"motherboardProductName"`
	MotherboardVersion      string                                  `json:"motherboardVersion"`
	MotherbaoardSerialName  string                                  `json:"motherboardSerialName"`
	MotherboardAssetTag     string                                  `json:"motherboardAssetTag"`
	SoftwareNames           []software.InstalledSoftware  `json:"installedPackages"`
	Memories                []map[string]interface{}                `json:"memories"`
	License                 string                                  `json:"license"`
	Version					string 								    `json:"version"`
	Ports					[]int									`json:"ports"`
}

var(
	MemoryArray          []map[string]interface{}
	CombinedSoftware     []software.InstalledSoftware
)

const secretKey = "AccessKeyEncryptedServerConnection"

type Message struct {
	Command string `json:"command"`
	Timestamp string `json:"timestamp"`
	HMAC string `json:"hmac"`
}

type VersionResponse struct {
    LatestVersion string `json:"latest_version_techmind"`
}

func GetGeneralInformation()(string, string, string, string, string, string, string, string, string, string, string){
	// Obtem o SO do equipamento
	sys := sysinfo.GetSys()
	// Pega o nome do computador
	hostname, err := sysinfo.GetComputerName()
	if err != nil {
		logger.LogToFile(fmt.Sprintln("Erro ao obter o nome do computador:", err))
	}

	// Varaivel que armazena informações gerais do windows
	output, err := sysinfo.GetWindowsInfo()
	if err != nil {
		logger.LogToFile(fmt.Sprintln("Erro ao obter informações do Windows:", err))
	}

	// Extrai a Edição do Windows
	edition, err := sysinfo.ExtractWindowsEdition(output)
	if err != nil {
		logger.LogToFile(fmt.Sprintln("Erro ao extrair a Edição do Windows:", err))
	}

	// Pega o usuario que esta logado
	currentUser, err := user.Current()
	if err != nil {
		logger.LogToFile(fmt.Sprintf("Erro ao obter o usuário atual: %v", err))
	}

	// Pega diversas informações do computador
	info, err := host.Info()
	if err != nil {
		logger.LogToFile(fmt.Sprintf("Error ao obter host.info: %v", err))
	}
	 
	// Obtem a versão do SO
	version := info.PlatformVersion

	// Obtem o dominio como nt-lupatech.com.br
	domain, err := sysinfo.GetDomain()
	if err != nil {
		logger.LogToFile(fmt.Sprintf("Erro ao obter o dominio: %v", err))
	}

	// obtem o Manufacturer e o Model
	manufacturer, model, err := sysinfo.GetDeviceBrand()
	if err != nil {
		logger.LogToFile(fmt.Sprintf("Erro ao obter o modelo e fabricante: %v", err))
	}

	// Obtem o Serial Number
	serialNumber, err := sysinfo.GetSerialNumber()
	if err != nil {
		logger.LogToFile(fmt.Sprintf("Erro ao obter o SerialNumber do equipamento: %v", err))
	}

	smbiosInfo, err := sysinfo.GetSMBIOS()
	if err != nil {
		logger.LogToFile(fmt.Sprintf("Failed to get SMBIOS information: %v", err))
	}

	license, err := sysinfo.ExtractWindowsLicense(output)
	if err != nil {
		logger.LogToFile(fmt.Sprintln("Erro ao extrair a licença do Windows:", err))
	}

	return sys, hostname, edition, currentUser.Username, version, domain, manufacturer, model, serialNumber, smbiosInfo, license
}

func GetNetWorkInformation()(string, string){
	// Obtem macAddress
	macAddress, err := network.GetMac()
	if err != nil {
		logger.LogToFile(fmt.Sprintf("Erro fatal!! Não foi possivel obter o MAC ADDRESS: %s", err))
		return "", ""
	}

	// Obtem o IP
	ip, err := network.GetIP()
	if err != nil {
		logger.LogToFile(fmt.Sprintf("Erro ao tentar obter o ip: %v", err))
	}

	return macAddress, ip
}

func GetMemoryInformation()(string, string,  []map[string]interface{}){
	// Obtem a quantidade Máxima de memoria RAM suportada
	maxCapacityMemory, err := memory.GetMaxMemoryCapacity()
	if err != nil {
		logger.LogToFile(fmt.Sprintf("Erro ao obter a capacidade máxima da memoria: %v", err))
	}

	// Obtem informações sobre os slot's de memoria
	memorySlots, err := memory.GetMemorySlots()
	if err != nil {
		logger.LogToFile(fmt.Sprintf("Erro ao obter a quantidade de slot's da memoria: %d", err))
	}

	// Armazena informações detalhadas sobnre cada memoria
	mem, err := memory.GetMemoryDetails()
	if err != nil {
		logger.LogToFile(fmt.Sprintf("Erro ao tentar obter informações detalhadas da memoria RAM: %d", err))
	}

	for _, memory := range mem {
		memoryInfo := map[string]interface{}{
			"BankLabel":     memory.BankLabel,
			"Capacity":      memory.Capacity,
			"DeviceLocator": memory.DeviceLocator,
			"MemoryType":    memory.MemoryType,
			"TypeDetail":    memory.TypeDetail,
			"Speed":         memory.Speed,
			"SerialNumber":  memory.SerialNumber,
		}
		MemoryArray = append(MemoryArray, memoryInfo)
	}

	return maxCapacityMemory, memorySlots, MemoryArray
}

func GetHardDiskInformatin()(string, string, string){
	modelHardDisk, err := storage.GetHardDiskModel()
	if err != nil {
		logger.LogToFile(fmt.Sprintf("Erro ao tentar obter o modelo do HD: %v", err))
	}

	var hdModel string
	var hdSerialNumber string
	var hdCapacity string

	for _, model := range modelHardDisk {
		hdModel = model
	}

	hardDiskSerialNumber, err := storage.GetHardDiskSerialNumber()
	if err != nil {
		logger.LogToFile(fmt.Sprintf("Erro ao tentar obter o SN do HD: %v", err))
	}

	
	for _, serialNumber := range hardDiskSerialNumber {
		hdSerialNumber = serialNumber
	}

	capacities, err := storage.GetHardDiskCapacity()
	if err != nil {
		logger.LogToFile(fmt.Sprint("Erro ao tentar obter a capacidade do HD:", err))
	}

	for _, capacity := range capacities {
		hdCapacity = fmt.Sprintf("%.2f", capacity)
	}

	return hdModel, hdSerialNumber, hdCapacity
}

func GetCpuInformation()(string, string, uint32, string, string, uint32, uint32, int, uint32, uint32){
	arch, err := cpu.GetCPUArchitecture()
	if err != nil {
		logger.LogToFile(fmt.Sprintf("Falha ao obter arquitetura do processador: %v", err))
	}

	operationMode, err := cpu.GetCPUOperationMode()
	if err != nil {
		logger.LogToFile(fmt.Sprintf("Falha ao obter modo de operação do CPU: %v", err))
	}

	cpuCount, err := cpu.GetCPUCount()
	if err != nil {
		logger.LogToFile(fmt.Sprintf("Falha em obter a quantidade de CPU: %v", err))
	}

	vendorID, err := cpu.GetCPUVendorID()
	if err != nil {
		logger.LogToFile(fmt.Sprintf("Falha ao Obter o Fabricante do CPU: %v", err))
	}

	modelName, err := cpu.GetCPUModelName()
	if err != nil {
		logger.LogToFile(fmt.Sprintf("Failed to get CPU Model Name: %v", err))
	}

	threads, err := cpu.GetCPUThreads()
	if err != nil {
		logger.LogToFile(fmt.Sprintf("Failed to get CPU threads: %v", err))
	}

	cores, err := cpu.GetCPUCores()
	if err != nil {
		logger.LogToFile(fmt.Sprintf("Failed to get CPU cores: %v", err))
	}

	sockets, err := cpu.GetCPUSockets()
	if err != nil {
		logger.LogToFile(fmt.Sprintf("Failed to get CPU sockets: %v", err))
	}

	maxMHz, err := cpu.GetCPUMaxMHz()
	if err != nil {
		logger.LogToFile(fmt.Sprintf("Failed to get CPU Max MHz: %v", err))
	}

	minMHz, err := cpu.GetCPUMinMHz()
	if err != nil {
		logger.LogToFile(fmt.Sprintf("Failed to get CPU Min MHz: %v", err))
	}

	return arch, operationMode, cpuCount, vendorID, modelName, threads, cores, sockets, maxMHz, minMHz
}

func GetGPUInformation()(string, string, string, string, string, string){
	gpuProduct, err := gpu.GetGPUProduct()
	if err != nil {
		logger.LogToFile(fmt.Sprintf("Failed to get GPU product: %v", err))
	}

	gpuVendorID, err := gpu.GetGPUVendorID()
	if err != nil {
		logger.LogToFile(fmt.Sprintf("Failed to get GPU Vendor ID: %v", err))
	}

	busInfo, err := gpu.GetGPUBusInfo()
	if err != nil {
		logger.LogToFile(fmt.Sprintf("Failed to get GPU Bus Info: %v", err))
	}

	gpuLogicalName, err := gpu.GetGPULogicalName()
	if err != nil {
		logger.LogToFile(fmt.Sprintf("Failed to get GPU Logical Name: %v", err))
	}

	clock, err := gpu.GetGPUClock()
	if err != nil {
		logger.LogToFile(fmt.Sprintf("Failed to get GPU Clock: %v", err))
	}

	horizRes, vertRes, ram, err := gpu.GetGPUConfiguration()
	if err != nil {
		logger.LogToFile(fmt.Sprintf("Failed to get GPU configuration: %v", err))
	}

	// Formata a string com as informações da GPU
	configurationGPU := fmt.Sprintf("Resolution %dx%d, RAM %d MB", horizRes, vertRes, ram/1024/1024)

	return gpuProduct, gpuVendorID, busInfo, gpuLogicalName, clock, configurationGPU
}

func GetAudioInformation()(string){
	product, err := audio.GetAudioDeviceProduct()
	if err != nil {
		logger.LogToFile(fmt.Sprintf("Failed to get audio device product: %v", err))
	}

	return product
}

func GetSoftwareInformation()([]software.InstalledSoftware){
	wmiSoftware, err := software.GetInstalledSoftwareFromWMI()
	if err != nil {
		logger.LogToFile(fmt.Sprintln("Error ao obter os softwares instalados via WMI:", err))
	}

	registrySoftware, err := software.GetInstalledSoftwareFromRegistry()
	if err != nil {
		logger.LogToFile(fmt.Sprintln("Error querying Registry:", err))
	}

	// Combinar as listas de software, removendo duplicatas
	softwareMap := make(map[string]software.InstalledSoftware)
	for _, software := range append(wmiSoftware, registrySoftware...) {
		key := strings.ToLower(software.Name)
		softwareMap[key] = software
	}

	for _, software := range softwareMap {
		CombinedSoftware = append(CombinedSoftware, software)
	}
	return CombinedSoftware
}

func GetPortsInfo() []int {
	port := ports.ScanOpenTCPPorts("127.0.0.1", 1, 65535)

	return port
}
	
func GetUSBPorts() []string {
	usbIDs, err := ports.USBPorts()
	if err != nil {
		logger.LogToFile(fmt.Sprintln(err))
	}

	var normalizedDevices []string
	for _, deviceID := range usbIDs {
		normalized := ports.NormalizeUSBDevice(deviceID, ports.LookupName)
		normalizedDevices = append(normalizedDevices, normalized)
	}
	return normalizedDevices
}

func StartingInformationGathering() (Data, string){
	sys, hostname, edition, currentUser, version, domain, manuFacturer, model,serialNumber, smbiosInfo, license := GetGeneralInformation()
	
	// Pega a data atual e formatada
	dateNow := time.Now()
	formatedDate := dateNow.Format("2006-01-02 15:04")

	macAddress, ip := GetNetWorkInformation()

	maxCapacityMemory, memorySlots, MemoryArray := GetMemoryInformation()

	hdModel, hdSerialNumber, hdCapacity := GetHardDiskInformatin()

	arch, operationMode, cpuCount, vendorID, modelName, threads, cores, sockets, maxMHz, minMHz := GetCpuInformation()

	gpuProduct, gpuVendorID, busInfo, gpuLogicalName, clock, configurationGPU := GetGPUInformation()

	productAudio := GetAudioInformation()

	combinedSoftware := GetSoftwareInformation()

	versionSoftware, err := config.GetCurrentVersion("C:\\Program Files\\techmind\\configs\\version.json")
	if err != nil {
		logger.LogToFile(fmt.Sprintf("erro ao obter versão atual: %v", err))
	}

	port := GetPortsInfo()

	if len(versionSoftware) == 0{
		logger.LogToFile(fmt.Sprintln("Erro ao obter a versão atualizada do software"))
	}

	// usb := GetUSBPorts()
	// logger.LogToFile(fmt.Sprintln("Portas USB: ", usb))

	if macAddress == ""{
		return Data{}, fmt.Sprintln("Codigo cancelado, falta de macAddress para dar andamento")
	}
	// Montando o Json
	jsonData := Data{
		System:               sys,
		Name:                 hostname,
		Distribution:         edition,
		InsertionDate:        formatedDate,
		MacAddress:           macAddress,
		CurrentUser:          currentUser,
		PlatformVersion:      version,
		Domain:               domain,
		IP:                   ip,
		Manufacturer:         manuFacturer,
		Model:                model,
		SerialNumber:         serialNumber,
		MaxCapacityMemory:    maxCapacityMemory,
		NumberOfDevices:      memorySlots,
		Memories:             MemoryArray,
		HardDiskModel:        hdModel,
		HardDiskSerialNumber: hdSerialNumber,
		HardDiskUserCapacity: hdCapacity,
		CPUArchitecture:      arch,
		CPUOperationMode:     operationMode,
		CPUS:                 cpuCount,
		CPUVendorID:          vendorID,
		CPUModelName:         modelName,
		CPUThread:            threads,
		CPUCore:              cores,
		CPUSocket:            sockets,
		CPUMaxMHz:            maxMHz,
		CPUMinMHz:            minMHz,
		GPUProduct:           gpuProduct,
		GPUVendorID:          gpuVendorID,
		GPUBusInfo:           busInfo,
		GPULogicalName:       gpuLogicalName,
		GPUClock:             clock,
		GPUConfiguration:     configurationGPU,
		BiosVersion:          smbiosInfo,
		AudioDeviceProduct:   productAudio,
		SoftwareNames:        combinedSoftware,
		License:	license,
		Version: versionSoftware,
		Ports: port,
	}

	return jsonData, ""
}

func SendSystemData(jsonPost Data){
	requestBody, err := json.Marshal(jsonPost)
	if err != nil {
		logger.LogToFile(fmt.Sprintf("Erro ao montar o json: %v", err))
		return
	}

	url := "https://techmind.lupatech.com.br/home/computers/post-machines"

	// Cria um transporte com verificação desabilitada
	transport := &http.Transport{
		TLSClientConfig: &tls.Config{
			InsecureSkipVerify: true,
			MinVersion:         tls.VersionTLS12, // força mínimo TLS 1.2
			MaxVersion:         tls.VersionTLS12, // trava em TLS 1.2
		},
	}
	
	// Cria um cliente HTTP com esse transporte customizado
	client := &http.Client{Transport: transport}
	
	resp, erro := client.Post(url, "application/json", bytes.NewBuffer(requestBody))
	if erro != nil {
		logger.LogToFile(fmt.Sprintf("Erro ao fazer o post: %v", erro))
		return
	}

	defer resp.Body.Close()

	// Ler o corpo da resposta
	body, err := io.ReadAll(resp.Body)
	if err != nil {
		logger.LogToFile(fmt.Sprintf("Erro ao ler o corpo da resposta: %v", err))
		return
	}

	if resp.StatusCode != http.StatusOK {
		logger.LogToFile(fmt.Sprintf("Resposta com status code %d: %s", resp.StatusCode, body))
		if resp.StatusCode == http.StatusBadRequest {
			logger.LogToFile(fmt.Sprintln("Erro: Resposta 400 - Solicitação inválida."))
		} else {
			logger.LogToFile(fmt.Sprintf("Erro: Resposta %d\n", resp.StatusCode))
		}
		return
	}
}

func StartUpdateListener(port string) error {
	listener, err := net.Listen("tcp", ":"+port)
	if err != nil {
    if strings.Contains(err.Error(), "Normalmente é permitida apenas uma utilização de cada endereço de soquete") {
        findAndKillPort("9090")

    } else {
        logger.LogToFile(fmt.Sprintf("Erro ao abrir porta %s: %v", port, err))
        return nil
    }
	}
	logger.LogToFile(fmt.Sprintf("Porta %s aberta aguardando conexões...", port))
	defer listener.Close()

	for {
		conn, err := listener.Accept()
		if err != nil {
			logger.LogToFile(fmt.Sprintf("Erro ao aceitar conexão: %v", err))
			continue
		}
		go handleConnection(conn)
	}
}

// findAndKillPort procura processos que estão usando a porta especificada e os finaliza.
// port: porta que será verificada (ex: "9090").
// Após finalizar os processos, reinicia o listener de atualização na mesma porta.
func findAndKillPort(port string) {
    // Executa o comando netstat para listar todas as conexões e filtra pelo número da porta
    cmd := exec.Command("cmd", "/C", "netstat -ano | findstr :"+port)
    output, err := cmd.Output()
    if err != nil {
        // Loga erro caso o comando netstat falhe
        logger.LogToFile(fmt.Sprintln("Erro ao executar netstat: ", err))
    }

    // Divide a saída do comando em linhas
    lines := strings.Split(string(output), "\n")
    // Cria um mapa para evitar finalizar o mesmo PID mais de uma vez
    pids := make(map[string]bool)

    // Itera sobre cada linha da saída do netstat
    for _, line := range lines {
        // Divide a linha em campos usando espaços como separador
        fields := strings.Fields(line)
        // Verifica se existem pelo menos 5 campos (formato esperado do netstat)
        if len(fields) >= 5 {
            pid := fields[4] // PID do processo que está usando a porta
            // Verifica se o PID ainda não foi finalizado
            if !pids[pid] {
                // Cria comando para finalizar o processo pelo PID
                killCmd := exec.Command("taskkill", "/PID", pid, "/F")
                var out bytes.Buffer
                killCmd.Stdout = &out
                // Executa o comando taskkill
                err := killCmd.Run()
                if err != nil {
                    // Loga erro caso não consiga finalizar o processo
                    logger.LogToFile(fmt.Sprintf("Erro ao finalizar PID %s: %v\n", pid, err))
                    return
                }
                // Marca o PID como finalizado
                pids[pid] = true
            }
        }
    }

    // Reinicia o listener de atualização na porta especificada
    StartUpdateListener("9090")
}


func handleConnection(conn net.Conn) {
	defer conn.Close()

	remoteAddr := conn.RemoteAddr().String()

	reader := bufio.NewReader(conn)
	rawMessage, err := reader.ReadString('\n')
	if err != nil {
		logger.LogToFile(fmt.Sprintf("Erro ao ler dados de %s: %v", remoteAddr, err))
		return
	}

	// Remove espaços em branco extras
	rawMessage = strings.TrimSpace(rawMessage)
	logger.LogToFile(fmt.Sprintf("Mensagem recebida de %s: %s", remoteAddr, rawMessage))

	// Converte JSON para struct
	var msg Message
	err = json.Unmarshal([]byte(rawMessage), &msg)
	if err != nil {
		logger.LogToFile(fmt.Sprintf("JSON inválido de %s: %v", remoteAddr, err))
		return
	}

	// Valida timestamp (tolerância de 60s)
	now := time.Now().Unix()
	tInt, err := strconv.ParseInt(msg.Timestamp, 10, 64)
	if err != nil {
		logger.LogToFile(fmt.Sprintf("Timestamp inválido de %s: %v", remoteAddr, err))
		return
	}

	if now-tInt > 60 {
		logger.LogToFile(fmt.Sprintf("Mensagem expirada de %s", remoteAddr))
		return
	}

	// Valida HMAC
	if verifyHMAC(msg.Command, msg.Timestamp, msg.HMAC) {

		send := report.SendStatus("conectado com sucesso", "consc", 200)
		if send != nil{
			logger.LogToFile(fmt.Sprintln("Erro ao enviar menssagem para o servidor: ", send))
		}

		if msg.Command == "update-software"{
			version, err := config.GetCurrentVersion("C:\\Program Files\\techmind\\configs\\version.json")
			if err != nil {
				logger.LogToFile(fmt.Sprintf("erro ao obter versão atual: %v", err))
			}

			send := report.SendStatus("Versão Validada", "vldvr", 200)
			if send != nil{
				logger.LogToFile(fmt.Sprintln("Erro ao enviar menssagem para o servidor: ", send))
			}

			GetNewVersion(version)
		}

	} else {
		logger.LogToFile(fmt.Sprintf("❌ HMAC inválido de %s. Comando rejeitado.", remoteAddr))
		conn.Write([]byte("HMAC inválido. Acesso negado.\n"))
	}
}

// GetNewVersion consulta a versão mais recente de um software hospedado em um servidor remoto.
// Se o parâmetro `onlyGet` for true, a função apenas retorna a versão atual disponível.
// Caso contrário, ela compara a versão fornecida com a versão disponível e, se houver diferença,
// atualiza o arquivo de versão local, executa o atualizador e envia uma notificação ao servidor.
func GetNewVersion(version string) string {
	// ⚠️ Cria um cliente HTTP que ignora a verificação de certificados SSL (uso de InsecureSkipVerify).
	// Essa prática deve ser usada com extremo cuidado apenas em ambientes controlados ou internos,
	// pois compromete a segurança da conexão.
	client := &http.Client{
		Transport: &http.Transport{
			TLSClientConfig: &tls.Config{InsecureSkipVerify: true},
		},
	}

	// Envia a requisição GET para obter a versão mais recente disponível no servidor
	resp, err := client.Get("https://techmind.lupatech.com.br/get-current-version/windows10")
	if err != nil {
		logger.LogToFile(fmt.Sprintln("Erro ao fazer requisição:", err))
		return ""
	}
	// Fecha o corpo da resposta ao final da função para evitar vazamento de recursos
	defer resp.Body.Close()

	// Lê todo o corpo da resposta
	body, err := io.ReadAll(resp.Body)
	if err != nil {
		logger.LogToFile(fmt.Sprintln("Erro ao ler resposta:", err))
		return ""
	}

	// Converte a resposta JSON para a struct esperada (VersionResponse)
	var versionResp VersionResponse
	err = json.Unmarshal(body, &versionResp)
	if err != nil {
		logger.LogToFile(fmt.Sprintln("Erro ao decodificar JSON:", err))
		return ""
	}

	// Obtém a versão atual a partir da resposta
	current_version := versionResp.LatestVersion

	// Se a versão atual for diferente da instalada, realiza processo de atualização
	if current_version != version {
		// Caminho completo para o arquivo de configuração de versão
		configFilePath := filepath.Join("C:\\", "Program Files", "techmind", "configs", "version.json")

		// Atualiza a chave new_version no arquivo de versão loca
		err := config.UpdateVersionFile(configFilePath, current_version)
		if err != nil {
			logger.LogToFile(fmt.Sprintln("Erro ao atualizar o arquivo de versão:", err))
		}
		
		logger.LogToFile("Setado nova versão...")

		send := report.SendStatus("Iniciando Atualizador", "iatt", 200)
		if send != nil{
			logger.LogToFile(fmt.Sprintln("Erro ao enviar menssagem para o servidor: ", send))
		}

		logger.LogToFile(fmt.Sprintln("====================="))

		// Executa o atualizador do software em modo silencioso
		err_exec := executil.RunExe("C:\\Program Files\\techmind", "tm-updater.exe")
		if err_exec != nil {
			logger.LogToFile(fmt.Sprintln("Erro ao executar:", err_exec))
		}

	} else {
		// Se a versão já está atualizada, envia uma notificação para o servidor
		send := report.SendStatus("Versão Atualizada", "crtvs", 200)
		if send != nil{
			logger.LogToFile(fmt.Sprintln("Erro ao enviar menssagem para o servidor: ", send))
		}

		return ""
	}

	// Valor padrão de retorno caso nenhuma condição anterior seja atendida
	return ""
}

// KillExistingTechmind finaliza todas as instâncias do TechMind que estejam rodando,
// exceto o próprio processo atual.
func KillExistingTechmind() {
    // Obtém o PID do processo atual
    currentPid := os.Getpid()

    // Lista todos os processos em execução no sistema usando a biblioteca ps
    processes, err := ps.Processes()
    if err != nil {
        // Loga erro caso não consiga listar os processos
        logger.LogToFile("Erro ao listar processos: " + err.Error())
        return
    }

    // Itera sobre todos os processos listados
    for _, proc := range processes {
        // Verifica se o executável é "techmind.exe" e não é o processo atual
        if strings.EqualFold(proc.Executable(), "techmind.exe") && proc.Pid() != currentPid {
            // Cria comando para finalizar o processo pelo PID
            cmd := exec.Command("taskkill", "/PID", fmt.Sprint(proc.Pid()), "/F")
            // Executa o comando taskkill
            err := cmd.Run()
            if err != nil {
                // Loga erro caso não consiga finalizar o processo
                logger.LogToFile(fmt.Sprintf("Erro ao finalizar processo %d: %v", proc.Pid(), err))
                return
            } else {
                // Loga sucesso ao finalizar o processo duplicado
                logger.LogToFile(fmt.Sprintf("Finalizado processo duplicado: PID %d", proc.Pid()))
            }
        }
    }
}


func verifyHMAC(command, timestamp, receivedHMAC string) bool{
	mac := hmac.New(sha256.New, []byte(secretKey))
	mac.Write(([]byte(command + timestamp)))
	expectedMAC := mac.Sum(nil)
	expectedHex := hex.EncodeToString(expectedMAC)
	return hmac.Equal([]byte(expectedHex), []byte(receivedHMAC))
}

// Constante que define o nome do serviço
const serviceName = "TechMind"

// TechMindService é uma struct vazia que representa o serviço TechMind.
// Pode ser expandida futuramente para incluir atributos e métodos relacionados ao serviço.
type TechMindService struct{}

// safeGo executa uma função fornecida dentro de uma goroutine segura.
// Se a função causar um panic, ele será capturado e logado, evitando que a aplicação inteira seja finalizada.
// name: uma string usada para identificar a goroutine nos logs.
// fn: a função que será executada de forma segura.
func safeGo(name string, fn func()) {
    // Inicia uma goroutine anônima para executar a função fn de forma assíncrona
    go func() {
        // Defer garante que o código dentro dele será executado no final da execução desta goroutine,
        // mesmo que ocorra um panic.
        defer func() {
            // recover captura qualquer panic que tenha ocorrido dentro da goroutine
            if r := recover(); r != nil {
                // Loga o panic com o nome da goroutine e a mensagem de erro
                log.Printf("[panic] %s: %v\n", name, r)
            }
        }()
        // Executa a função passada como argumento
        fn()
    }()
}

// Execute é o método principal do TechMindService que gerencia o ciclo de vida do serviço Windows.
// Ele inicializa o serviço, executa a lógica principal de trabalho em uma goroutine separada,
// responde a comandos do Service Control Manager (como Stop e Shutdown) e mantém o serviço ativo
// enquanto espera por eventos de controle.
// args: argumentos passados para o serviço (não utilizados neste exemplo).
// r: canal de leitura com comandos do Service Control (svc.ChangeRequest).
// changes: canal de escrita para atualizar o status do serviço (svc.Status).
// Retorna um booleano indicando se o serviço deve reiniciar e um código de saída (uint32).
func (m *TechMindService) Execute(args []string, r <-chan svc.ChangeRequest, changes chan<- svc.Status) (bool, uint32) {
    // Define os tipos de comandos que o serviço aceita enquanto estiver rodando
    const accepts = svc.AcceptStop | svc.AcceptShutdown

    // Notifica que o serviço está em processo de inicialização
    changes <- svc.Status{State: svc.StartPending}

    // Notifica que o serviço está rodando e quais comandos ele aceita
    changes <- svc.Status{State: svc.Running, Accepts: accepts}
    logger.LogToFile("Service state: Running")

    // Inicia a lógica principal do serviço em uma goroutine segura usando safeGo
    safeGo("worker", func() {
        // Garantir log de finalização quando a goroutine terminar
        defer logger.LogToFile("worker finished")

        // Encerra qualquer instância existente do TechMind antes de iniciar
        KillExistingTechmind()

        // Coleta informações iniciais do sistema
        dataJson, errMsg := StartingInformationGathering()
        if errMsg == "" {
            // Se não houve erro, envia os dados coletados
            SendSystemData(dataJson)
        } else {
            // Loga erro se houver
           logger.LogToFile(fmt.Sprintln("StartingInformationGathering error:", errMsg))
        }

        // Inicia um listener de atualização na porta 9090
        StartUpdateListener("9090")
    })

    // Loop principal que mantém o serviço vivo e responde a comandos do Service Control Manager
loop:
    for c := range r {
        switch c.Cmd {
        case svc.Interrogate:
            // Responde a uma solicitação de status
            changes <- c.CurrentStatus
        case svc.Stop, svc.Shutdown:
            // Loga o comando Stop/Shutdown recebido
            logger.LogToFile("Stop/Shutdown received")

            // Mata qualquer instância existente do TechMind antes de parar
            KillExistingTechmind()

            // Sai do loop principal e permite que o serviço seja finalizado
            break loop
        default:
            // Loga comandos não tratados para auditoria
            logger.LogToFile(fmt.Sprintf("Unhandled cmd: %v\n", c))
        }
    }

    // Notifica que o serviço está em processo de parada
    changes <- svc.Status{State: svc.StopPending}
    logger.LogToFile("Service stopping")

    // Retorna false (não reiniciar) e código de saída 0
    return false, 0
}

func main() {
    // Define o número máximo de CPUs que o Go irá utilizar para execução de goroutines
    runtime.GOMAXPROCS(1)

    // Loga o início da execução do programa
    logger.LogToFile("Main start")

    // Verifica se o programa está rodando em uma sessão interativa (ex: terminal) ou como serviço do Windows
    isInteractive, err := svc.IsAnInteractiveSession()
    if err != nil {
        // Em caso de erro ao verificar a sessão, loga e finaliza o programa
        log.Fatalf("IsAnInteractiveSession erro: %v", err)
        return
    }

    // Se não estiver em modo interativo, inicia como serviço do Windows
    if !isInteractive {
        log.Println("Starting as service")
        // Registra e executa o serviço TechMind
        if err := svc.Run(serviceName, &TechMindService{}); err != nil {
            log.Fatalf("svc.Run falhou: %v", err)
        }
        log.Println("svc.Run retornou")
        return
    }

    // Se estiver em modo interativo, roda o serviço como aplicativo normal
    safeGo("interactive-worker", func() {
        // Mata qualquer instância existente do TechMind
        KillExistingTechmind()

        // Coleta informações iniciais do sistema
        dataJson, errMsg := StartingInformationGathering()
        if errMsg == "" {
            // Envia os dados se não houver erro
            SendSystemData(dataJson)
        }

        // Inicia o listener de atualização na porta 9090
        StartUpdateListener("9090")
    })

    // Mantém o programa vivo no modo interativo
    select {}
}
