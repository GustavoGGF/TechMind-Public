package config

import (
	"encoding/json"
	"os"
)

type VersionData struct {
    CurrentVersion string `json:"current_version"`
    NewVersion     string `json:"new_version"`
}

// UpdateVersionFile atualiza a chave "new_version ou current_version" de um arquivo JSON com o valor fornecido.
// Lê o conteúdo do arquivo JSON, faz o parse para a struct VersionData, atualiza o campo
// NewVersion, e salva novamente o arquivo com a nova versão formatada.
// Retorna um erro caso ocorra falha em qualquer etapa do processo.
func UpdateVersionFile(filepath, newVersion string) error {
    var v VersionData

    // Lê todo o conteúdo do arquivo JSON especificado
    data, err := os.ReadFile(filepath)
    if err != nil {
        return err // Retorna erro caso a leitura falhe
    }

    // Faz o parse do conteúdo JSON para a struct VersionData
    if err := json.Unmarshal(data, &v); err != nil {
        return err // Retorna erro se o conteúdo não puder ser decodificado
    }

    // Atualiza o campo "NewVersion" com o novo valor fornecido
    v.NewVersion = newVersion

    // Converte novamente a struct para JSON com indentação para manter a legibilidade
    updated, err := json.MarshalIndent(v, "", "  ")
    if err != nil {
        return err // Retorna erro se falhar ao converter para JSON
    }

    // Sobrescreve o arquivo original com o novo conteúdo JSON atualizado
    return os.WriteFile(filepath, updated, 0644)
}


// GetCurrentVersion lê um arquivo JSON e retorna o valor associado à chave "current_version".
// O conteúdo do arquivo é desserializado para a struct VersionData. Em caso de erro na leitura
// ou no parse do JSON, a função retorna uma string vazia e o erro correspondente.
func GetCurrentVersion(filepath string) (string, error) {
	var v VersionData

	// Lê todo o conteúdo do arquivo JSON especificado
	data, err := os.ReadFile(filepath)
	if err != nil {
		return "", err // Retorna erro caso a leitura falhe
	}

	// Faz o parse do conteúdo JSON para a struct VersionData
	if err := json.Unmarshal(data, &v); err != nil {
		return "", err // Retorna erro se o conteúdo não puder ser decodificado
	}

	// Retorna o valor da chave "CurrentVersion" e erro nulo
	return v.CurrentVersion, nil
}
