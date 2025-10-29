package report

import (
	"bytes"
	"crypto/tls"
	"encoding/json"
	"fmt"
	"net/http"
)

// StatusReport representa a estrutura JSON que será enviada para o servidor,
// contendo uma mensagem, um código identificador e o código de status numérico.
type StatusReport struct {
	Message string `json:"message"` // Mensagem descritiva do status
	Code    string `json:"code"`    // Código identificador do tipo de status
	Status  int    `json:"status"`  // Código numérico de status (e.g., HTTP status ou código customizado)
}

// SendStatus envia uma requisição HTTP POST ao servidor remoto com o status atual do processo.
//
// Parâmetros:
// - message: texto descritivo do status atual.
// - code: código que identifica o tipo do status ou etapa do processo.
// - statusCode: código numérico associado ao status (ex: 200 para sucesso).
//
// Retorna um erro caso ocorra falha ao criar a requisição ou ao enviar os dados.
func SendStatus(message string, code string, statusCode int) error {
	// Monta a estrutura de dados que será serializada para JSON
	status := StatusReport{
		Message: message,
		Code:    code,
		Status:  statusCode,
	}

	// Serializa a struct para JSON.
	jsonData, err := json.Marshal(status)
	if err != nil {
		return fmt.Errorf("erro ao serializar JSON: %v", err)
	}

	// Cria um cliente HTTP que ignora verificação do certificado TLS.
	httpClient := &http.Client{
		Transport: &http.Transport{
			TLSClientConfig: &tls.Config{
				InsecureSkipVerify: true,
			},
		},
	}

	// Cria uma requisição HTTP POST para o endpoint especificado
	req, err := http.NewRequest("POST", "https://techmind.lupatech.com.br/home/panel-adm/receiving-messages/",
		bytes.NewBuffer(jsonData))
	if err != nil {
		return fmt.Errorf("erro ao criar requisição: %v", err)
	}
	// Define o header Content-Type para indicar que o corpo é JSON
	req.Header.Set("Content-Type", "application/json")

	// Envia a requisição para o servidor remoto
	resp, err := httpClient.Do(req)
	if err != nil {
		return fmt.Errorf("erro ao enviar POST: %v", err)
	}
	defer resp.Body.Close()

	return nil
}
