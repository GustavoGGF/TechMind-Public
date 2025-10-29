package ports

import (
	"fmt"
	"log"
	"net"
	"regexp"
	"strconv"
	"strings"
	"sync"
	"syscall"
	"techmind/windows/pkg/logger"
	"time"
	"unsafe"

	"github.com/yusufpapurcu/wmi"
	"golang.org/x/sys/windows"
)

const timeout = 500 * time.Millisecond

type USBDevice struct {
    Dependent string
}

type USBControllerDevice struct {
	Antecedent string // Controlador USB (ex: "\\\\root\\cimv2:Win32_USBController.DeviceID=\"USB\\ROOT_HUB30\"")
	Dependent  string // Dispositivo USB (ex: "USB\\VID_0D8C&PID_0014\\5&28E4B4E4&0&2")
}

type Win32_USBHub struct {
	DeviceID string
	Name     string
	Status   string
	PNPDeviceID string
	// A velocidade vem em bps, se disponível
	Speed uint32
}

func ScanOpenTCPPorts(host string, startPort, endPort int) []int {
	var wg sync.WaitGroup
	var mu sync.Mutex
	var openPorts []int

	sem := make(chan struct{}, 100)

	for port := startPort; port <= endPort; port++ {
		wg.Add(1)
		sem <- struct{}{}

		go func(p int) {
			defer func() {
				<-sem
				wg.Done()
			}()

			address := host + ":" + strconv.Itoa(p)
			conn, err := net.DialTimeout("tcp", address, timeout)
			if err == nil {
				mu.Lock()
				openPorts = append(openPorts, p)
				mu.Unlock()
				conn.Close()
			}
		}(port)
	}

	wg.Wait()
	return openPorts
}


func USBPorts() ([]string, error) {
	var usbDevices []USBDevice
	err := wmi.Query("SELECT * FROM Win32_USBControllerDevice", &usbDevices)
	if err != nil {
		return nil, fmt.Errorf("erro ao listar USB: %w", err)
	}

	if len(usbDevices) == 0 {
		return nil, fmt.Errorf("nenhum dispositivo USB encontrado")
	}

	var results []string
	for _, d := range usbDevices {
		// Extrai o valor de dentro de DeviceID="..."
		start := strings.Index(d.Dependent, "DeviceID=\"")
		if start != -1 {
			start += len("DeviceID=\"")
			end := strings.Index(d.Dependent[start:], "\"")
			if end != -1 {
				deviceID := d.Dependent[start : start+end]
				results = append(results, deviceID)
			}
		}
	}
	return results, nil
}

// Busca o nome amigável na WMI, dado um deviceID
func LookupName(deviceID string) string {
	type PnPEntity struct {
		DeviceID    string
		Name        string
		Caption     string
		Description string
	}

	deviceIDEscaped := strings.ReplaceAll(deviceID, `\`, `\\`)
	query := fmt.Sprintf("SELECT DeviceID, Name, Caption, Description FROM Win32_PnPEntity WHERE DeviceID='%s'", deviceIDEscaped)

	var entities []PnPEntity
	err := wmi.Query(query, &entities)
	if err != nil || len(entities) == 0 {
		return ""
	}

	entity := entities[0]

	// Tente preferir Caption, depois Name, depois Description
	if entity.Caption != "" {
		return entity.Caption
	} else if entity.Name != "" {
		return entity.Name
	} else {
		return entity.Description
	}
}

// Consulta o controlador USB associado ao deviceID, para identificar o tipo da porta
func GetControllerPortType(deviceID string) (string, error) {
	var associations []USBControllerDevice
	err := wmi.Query("SELECT Antecedent, Dependent FROM Win32_USBControllerDevice", &associations)
	if err != nil {
		return "", err
	}

	// Normaliza para facilitar comparação
	normalizedDeviceID := strings.ToUpper(deviceID)

	for _, assoc := range associations {
		// O campo Dependent vem com formato: "\\\\...:Win32_PnPEntity.DeviceID=\"USB\\VID_...\""
		// Vamos extrair só a parte do DeviceID
		dependent := assoc.Dependent
		// Exemplo de dependent: \\ROOT\cimv2:Win32_PnPEntity.DeviceID="USB\\VID_0D8C&PID_0014\\5&28E4B4E4&0&2"
		// Extrair o DeviceID do meio das aspas
		start := strings.Index(dependent, "DeviceID=\"")
		if start == -1 {
			continue
		}
		start += len("DeviceID=\"")
		end := strings.Index(dependent[start:], "\"")
		if end == -1 {
			continue
		}
		extractedDeviceID := dependent[start : start+end]
		if strings.ToUpper(extractedDeviceID) == normalizedDeviceID {
			// Achou o controlador associado
			// Agora extrair o DeviceID do controlador (Antecedent)
			// Exemplo: Antecedent: \\.\root\cimv2:Win32_USBController.DeviceID="USB\\ROOT_HUB30"
			ant := assoc.Antecedent
			startAnt := strings.Index(ant, "DeviceID=\"")
			if startAnt == -1 {
				continue
			}
			startAnt += len("DeviceID=\"")
			endAnt := strings.Index(ant[startAnt:], "\"")
			if endAnt == -1 {
				continue
			}
			controllerID := ant[startAnt : startAnt+endAnt]
			// controllerID exemplo: USB\ROOT_HUB30
			return controllerID, nil
		}
	}
	return "", fmt.Errorf("controlador USB não encontrado para deviceID %s", deviceID)
}

type DeviceInfo struct {
	DeviceID string
	Name     string
	Caption  string
	Manufacturer	string
}



func GetDeviceName(deviceID string) DeviceInfo {
	// Normaliza o DeviceID (remove barras duplas, se houver)
	// deviceID = strings.ReplaceAll(deviceID, "\\\\", "\\")

	var result []DeviceInfo

	// Monta a query buscando pelo DeviceID na classe Win32_PnPEntity
	query := fmt.Sprintf("SELECT DeviceID, Name, Caption, Manufacturer FROM Win32_PnPEntity WHERE DeviceID='%s'", deviceID)

	err := wmi.Query(query, &result)
	if err != nil {
		logger.LogToFile(fmt.Sprintf("Erro na query Win32_PnPEntity %s no dispositivo: %s:", err, deviceID))
		return DeviceInfo{}
	}

	if len(result) > 0 {
		device := result[0]
		return device
	}

	logger.LogToFile("Dispositivo não encontrado.")
	return DeviceInfo{}
}

func GetUSBVersion(deviceID string) string {
	deviceID = strings.ReplaceAll(deviceID, "\\\\", "\\")
	type Controller struct {
		DeviceID string
		Name     string
		Caption  string
	}

	var controllers []Controller
	err := wmi.Query("SELECT DeviceID, Name, Caption FROM Win32_USBController", &controllers)
	if err != nil {
		logger.LogToFile(fmt.Sprintf("Dispositivo: %s retornou um erro na query Win32_USBController: %s", deviceID, err))
		return "Unknown"
	}

	for _, ctrl := range controllers {
		if strings.Contains(deviceID, ctrl.DeviceID) || strings.Contains(ctrl.DeviceID, deviceID) {
			name := strings.ToLower(ctrl.Name)
			caption := strings.ToLower(ctrl.Caption)

			// Heurísticas conhecidas
			if strings.Contains(name, "extensible") || strings.Contains(caption, "extensible") ||
				strings.Contains(name, "xhci") || strings.Contains(caption, "xhci") ||
				strings.Contains(name, "3.0") || strings.Contains(caption, "3.0") {
				return "USB 3.x"
			}

			if strings.Contains(name, "enhanced") || strings.Contains(caption, "enhanced") {
				return "USB 2.0"
			}

			// Se não caiu em nenhuma regra
			return "Unknown"
		}
	}

	return "Unknown"
}


var (
	// modsetupapi            = windows.NewLazySystemDLL("setupapi.dll")
	modkernel32            = windows.NewLazySystemDLL("kernel32.dll")

	// procSetupDiGetClassDevs           = modsetupapi.NewProc("SetupDiGetClassDevsW")
	// procSetupDiEnumDeviceInterfaces   = modsetupapi.NewProc("SetupDiEnumDeviceInterfaces")
	// procSetupDiGetDeviceInterfaceDetail = modsetupapi.NewProc("SetupDiGetDeviceInterfaceDetailW")
	// procSetupDiDestroyDeviceInfoList  = modsetupapi.NewProc("SetupDiDestroyDeviceInfoList")

	// procCreateFile   = modkernel32.NewProc("CreateFileW")
	// procCloseHandle  = modkernel32.NewProc("CloseHandle")
	procDeviceIoControl = modkernel32.NewProc("DeviceIoControl")
)

const (
	DIGCF_PRESENT         = 0x02
	DIGCF_DEVICEINTERFACE = 0x10

	GENERIC_READ          = 0x80000000
	FILE_SHARE_READ       = 0x00000001
	FILE_SHARE_WRITE      = 0x00000002
	OPEN_EXISTING         = 3

	IOCTL_USB_GET_NODE_CONNECTION_INFORMATION_EX = 0x220448
)

// GUID_DEVINTERFACE_USB_DEVICE = {A5DCBF10-6530-11D2-901F-00C04FB951ED}
var GUID_DEVINTERFACE_USB_DEVICE = windows.GUID{Data1: 0xA5DCBF10, Data2: 0x6530, Data3: 0x11D2, Data4: [8]byte{0x90, 0x1F, 0x00, 0xC0, 0x4F, 0xB9, 0x51, 0xED}}

// Estrutura USB_NODE_CONNECTION_INFORMATION_EX
type USB_NODE_CONNECTION_INFORMATION_EX struct {
	ConnectionIndex uint32
	DeviceDescriptor USB_DEVICE_DESCRIPTOR
	CurrentConfiguration uint8
	Speed uint8 // Aqui está a velocidade da conexão USB
	DeviceIsHub uint8
	// Outros campos omitidos para simplificação
}

// Estrutura USB_DEVICE_DESCRIPTOR (simplificada)
type USB_DEVICE_DESCRIPTOR struct {
	bLength            uint8
	bDescriptorType    uint8
	bcdUSB             uint16
	bDeviceClass       uint8
	bDeviceSubClass    uint8
	bDeviceProtocol    uint8
	bMaxPacketSize0    uint8
	idVendor           uint16
	idProduct          uint16
	bcdDevice          uint16
	iManufacturer      uint8
	iProduct           uint8
	iSerialNumber      uint8
	bNumConfigurations uint8
}

// Helper para abrir handle para device pelo device path (exemplo, deve ser adaptado para o deviceID)
func openDevice(devicePath string) (windows.Handle, error) {
	pathPtr, err := windows.UTF16PtrFromString(devicePath)
	if err != nil {
		return 0, err
	}
	handle, err := windows.CreateFile(pathPtr, GENERIC_READ, FILE_SHARE_READ|FILE_SHARE_WRITE, nil, OPEN_EXISTING, 0, 0)
	if err != nil {
		return 0, err
	}
	return handle, nil
}

func GetUSBPortHID(deviceID string) (string, error) {
	// IMPORTANTE: aqui deveria mapear o deviceID para devicePath (ex: \\?\USB#VID_xxxx&PID_yyyy#...)
	// Esse mapeamento não é trivial e geralmente requer uso do SetupAPI para encontrar DevicePath
	// Como esse passo é complexo, aqui vamos assumir deviceID é devicePath (apenas para exemplo)
	// Se quiser eu posso ajudar a implementar esse mapeamento.

	handle, err := openDevice(deviceID)
	if err != nil {
		return "", fmt.Errorf("falha ao abrir device: %v", err)
	}
	defer windows.CloseHandle(handle)

	// Prepara estrutura para receber info
	var connectionInfo USB_NODE_CONNECTION_INFORMATION_EX
	connectionInfo.ConnectionIndex = 1 // normalmente 1 para primeira porta, isso pode variar

	var bytesReturned uint32
	r1, _, err := procDeviceIoControl.Call(
		uintptr(handle),
		uintptr(IOCTL_USB_GET_NODE_CONNECTION_INFORMATION_EX),
		uintptr(unsafe.Pointer(&connectionInfo)),
		unsafe.Sizeof(connectionInfo),
		uintptr(unsafe.Pointer(&connectionInfo)),
		unsafe.Sizeof(connectionInfo),
		uintptr(unsafe.Pointer(&bytesReturned)),
		0,
	)
	if r1 == 0 {
		return "", fmt.Errorf("DeviceIoControl falhou: %v", err)
	}

	// Interpreta velocidade
	var speed string
	switch connectionInfo.Speed {
	case 1:
		speed = "Low Speed (USB 1.1)"
	case 2:
		speed = "Full Speed (USB 1.1)"
	case 3:
		speed = "High Speed (USB 2.0)"
	case 4:
		speed = "SuperSpeed (USB 3.0)"
	case 5:
		speed = "SuperSpeedPlus (USB 3.1+)"
	default:
		speed = "Desconhecido"
	}

	return speed, nil
}

var (
	setupapi                        = windows.NewLazySystemDLL("setupapi.dll")
	procSetupDiGetClassDevs         = setupapi.NewProc("SetupDiGetClassDevsW")
	procSetupDiEnumDeviceInterfaces = setupapi.NewProc("SetupDiEnumDeviceInterfaces")
	procSetupDiGetDeviceInterfaceDetail = setupapi.NewProc("SetupDiGetDeviceInterfaceDetailW")
	procSetupDiDestroyDeviceInfoList = setupapi.NewProc("SetupDiDestroyDeviceInfoList")
)

// GUID para dispositivos HID: {4D1E55B2-F16F-11CF-88CB-001111000030}
var GUID_DEVINTERFACE_HID = windows.GUID{Data1: 0x4D1E55B2, Data2: 0xF16F, Data3: 0x11CF, Data4: [8]byte{0x88, 0xCB, 0x00, 0x11, 0x11, 0x00, 0x00, 0x30}}

type SP_DEVICE_INTERFACE_DATA struct {
    CbSize       uint32
    InterfaceClassGuid windows.GUID
    Flags        uint32
    Reserved     uintptr
}

func GetDevicePathFromInstanceID(deviceID string) (string, error) {
	deviceID = strings.ToUpper(deviceID)
	deviceID = strings.ReplaceAll(deviceID, `\\`, `\`)

	hDevInfo, _, err := procSetupDiGetClassDevs.Call(
		uintptr(unsafe.Pointer(&GUID_DEVINTERFACE_HID)),
		0,
		0,
		uintptr(DIGCF_PRESENT|DIGCF_DEVICEINTERFACE),
	)

	logger.LogToFile(fmt.Sprintf("hDevInfo: %v, err: %v", hDevInfo, err))

	if hDevInfo == 0 || hDevInfo == uintptr(syscall.InvalidHandle) {
		return "", fmt.Errorf("SetupDiGetClassDevs falhou: %v", err)
	}
	defer procSetupDiDestroyDeviceInfoList.Call(hDevInfo)

	var index uint32 = 0
	for {
		var interfaceData SP_DEVICE_INTERFACE_DATA
		interfaceData.CbSize = uint32(unsafe.Sizeof(interfaceData))

		r1, _, _ := procSetupDiEnumDeviceInterfaces.Call(
			hDevInfo,
			0,
			uintptr(unsafe.Pointer(&GUID_DEVINTERFACE_HID)),
			uintptr(index),
			uintptr(unsafe.Pointer(&interfaceData)),
		)

		if r1 == 0 {
			logger.LogToFile("Enumeração finalizada.")
			break // acabou a enumeração
		}

		// Primeiro, pega o tamanho necessário para o buffer
		var requiredSize uint32
		procSetupDiGetDeviceInterfaceDetail.Call(
			hDevInfo,
			uintptr(unsafe.Pointer(&interfaceData)),
			0,
			0,
			uintptr(unsafe.Pointer(&requiredSize)),
			0,
		)

		buf := make([]byte, requiredSize)
		*(*uint32)(unsafe.Pointer(&buf[0])) = 8 // cbSize da struct SP_DEVICE_INTERFACE_DETAIL_DATA

		r2, _, _ := procSetupDiGetDeviceInterfaceDetail.Call(
			hDevInfo,
			uintptr(unsafe.Pointer(&interfaceData)),    // <<== aqui, não &interfaceData[0]
			uintptr(unsafe.Pointer(&buf[0])),
			uintptr(requiredSize),
			0,
			0,
		)
		if r2 == 0 {
			index++
			continue
		}

		// O caminho começa na posição 4 ou 6 dependendo da arquitetura (offset do wchar array)
		devicePath := syscall.UTF16ToString((*[4096]uint16)(unsafe.Pointer(&buf[4]))[:])

		if strings.Contains(strings.ToUpper(devicePath), deviceID) {
			return devicePath, nil
		}

		index++
	}

	return "", fmt.Errorf("dispositivo com DeviceID '%s' não encontrado", deviceID)
}

func fallbackDetectPortType(vid, pid string) string {
	var hubs []Win32_USBHub

	// Consulta todos os hubs USB
	query := "SELECT DeviceID, Name, PNPDeviceID FROM Win32_USBHub"
	err := wmi.Query(query, &hubs)
	if err != nil {
		log.Println("Erro ao consultar WMI:", err)
		return "PORTA x.x"
	}

	for _, hub := range hubs {
		// Verifica se o hub contém o VID/PID procurado
		if containsIgnoreCase(hub.PNPDeviceID, vid) && containsIgnoreCase(hub.PNPDeviceID, pid) {
			// Se conseguir determinar a velocidade pelo nome
			name := hub.Name
			switch {
			case name != "" && (containsIgnoreCase(name, "3.0") || containsIgnoreCase(name, "SuperSpeed")):
				return "PORTA 3.0"
			case name != "" && containsIgnoreCase(name, "2.0"):
				return "PORTA 2.0"
			case name != "" && containsIgnoreCase(name, "1.1"):
				return "PORTA 1.x"
			default:
				return "PORTA x.x"
			}
		}
	}

	// Se não encontrou nada
	return "PORTA x.x"
}

// Função auxiliar case-insensitive
func containsIgnoreCase(str, substr string) bool {
	s, t := []rune(str), []rune(substr)
	if len(t) == 0 || len(s) < len(t) {
		return false
	}
	for i := 0; i+len(t) <= len(s); i++ {
		match := true
		for j := range t {
			a, b := s[i+j], t[j]
			if a >= 'A' && a <= 'Z' {
				a += 'a' - 'A'
			}
			if b >= 'A' && b <= 'Z' {
				b += 'a' - 'A'
			}
			if a != b {
				match = false
				break
			}
		}
		if match {
			return true
		}
	}
	return false
}

func NormalizeUSBDevice(deviceID string, nameLookup func(string) string) string {
	logger.LogToFile(fmt.Sprintf("Dispositivo: %s", deviceID))
	cleanedID := strings.ReplaceAll(deviceID, `\\`, `\`)
	parts := strings.Split(cleanedID, `\`)

	if !strings.HasPrefix(deviceID, `USB\`) || len(parts) < 2 {

		if !strings.HasPrefix(deviceID, `HID\`) || len(parts) < 2 {
			// tratamento para SWD
			return fmt.Sprintf("%s,", deviceID)

		} else{
			// Tratamento para HID
			re := regexp.MustCompile(`VID_([0-9A-Fa-f]{4})&PID_([0-9A-Fa-f]{4})`)
			matches := re.FindStringSubmatch(deviceID)

			if len(matches) < 3 {
				logger.LogToFile(fmt.Sprintln("VID/PID não encontrados"))
				return fmt.Sprintf("%s,", deviceID)
			}

			vid := strings.ToUpper(matches[1])
			pid := strings.ToUpper(matches[2])

			// Banco de exemplo (poderia carregar de JSON ou arquivo maior)
			usbDB := map[string]map[string]string{
				"0D8C": {
					"0014": "C-Media USB Audio Device (headset/placa de som USB)",
				},
				"046D": {
					"C077": "Logitech Mouse M105/M115",
				},
				"413C": {
					"2106": "Dell Teclado/Mouse USB",
				},
			}

			desc := "Dispositivo desconhecido"
			if products, ok := usbDB[vid]; ok {
				if d, ok := products[pid]; ok {
					desc = d
				}
			}

			return fmt.Sprintf("VID\\%s,", desc)
		}
	} else{
		logger.LogToFile("tratamento USB")
		// Tratamento para USB
		var portType string

		// Detecta tipo da porta
		portTypeRaw := parts[1]

		// Se já for ROOT_HUBxx, trata diretamente
		if strings.HasPrefix(portTypeRaw, "ROOT_HUB30") {
			portType = "PORTA 3.0"
		} else if strings.HasPrefix(portTypeRaw, "ROOT_HUB20") {
			portType = "PORTA 2.0"
		} else if strings.HasPrefix(portTypeRaw, "ROOT_HUB") {
			portType = "PORTA 1.x"
		} else {
			logger.LogToFile("não é root")
			// Se não for ROOT_HUB, tenta achar o controlador USB para descobrir a porta
			controllerID, err := GetControllerPortType(deviceID)
			if err != nil {
				logger.LogToFile(fmt.Sprintln("Não foi possível achar a porta do dispositivo: ", deviceID))
				return deviceID
			}

			// Busca o nome da controladora
			controllerName := GetUSBVersion(controllerID)

			switch {
			case strings.Contains(controllerName, "3.0"):
				portType = "PORTA 3.0"
			case strings.Contains(controllerName, "2.0"):
				portType = "PORTA 2.0"
			case strings.Contains(controllerName, "1.1"):
				portType = "PORTA 1.x"
			default:
				// Se não conseguir determinar, mostra o nome da controladora como fallback
				portType = "PORTA x.x"
			}

			// Separar por '\'
			parts := strings.Split(deviceID, `\`)
			
			if len(parts) < 3 {
				logger.LogToFile("Formato inválido")
				return deviceID
			}

			// 2️⃣ Pegar a segunda parte que contém VID e PID
			vidpidPart := parts[1]
			logger.LogToFile(fmt.Sprintf("VID/PID parte: %s", vidpidPart))

			// 3️⃣ Separar por '&'
			subParts := strings.Split(vidpidPart, "&")
			if len(subParts) < 2 {
				logger.LogToFile("Não contém VID e PID")
				return deviceID
			}

			// 4️⃣ Separar VID_ e PID_
			vid := strings.TrimPrefix(subParts[0], "VID_")
			pid := strings.TrimPrefix(subParts[1], "PID_")

			logger.LogToFile(fmt.Sprintf("VID: %s", vid))
			logger.LogToFile(fmt.Sprintf("PID: %s", pid))

			if portType == "PORTA x.x"{
				portType = fallbackDetectPortType(vid, pid)
			}
		}

		name := GetDeviceName(deviceID)

		return fmt.Sprintf("USB\\%s\\%s, ", portType, name.Name)
	}
}