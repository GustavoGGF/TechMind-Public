import { CommonModule } from "@angular/common";
import { HttpClient, HttpHeaders } from "@angular/common/http";
import { Component } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { NgSelectModule } from "@ng-select/ng-select";
import { catchError, throwError } from "rxjs";
import { saveAs } from "file-saver";

export interface ReportResponse {
  file_name: string;
  file_content: string;
}

@Component({
  selector: "app-system-report",
  standalone: true,
  imports: [CommonModule, NgSelectModule, FormsModule],
  templateUrl: "./system-report.component.html",
  styleUrl: "./system-report.component.css",
})
export class SystemReportComponent {
  constructor(private http: HttpClient) {}

  selectedReports: string = "None";
  errorType: string = "";
  messageError: string = "";

  canViewMessage: boolean = false;

  /**
   * Descrição:
   * A função `onReportChange` é responsável por identificar qual relatório foi selecionado em um menu `<select>` e,
   * com base nessa seleção, acionar a função correspondente para geração ou exportação do relatório.
   *
   * Ela é geralmente utilizada quando o usuário escolhe um tipo de relatório (como DNS ou XLS) em uma interface de relatórios,
   * automatizando a chamada da função correta sem necessidade de múltiplos blocos condicionais (if/else ou switch).
   *
   * Parâmetros:
   * - value: string (opcional, padrão = ""), representa o tipo de relatório selecionado pelo usuário.
   *   Pode conter valores como "DNS" ou "reportxls", que determinam qual ação será executada.
   *
   * Variáveis:
   * - actions: Record<string, () => void>, um objeto que mapeia cada tipo de relatório para sua função correspondente.
   *   - "DNS" chama `this.submitReportDNS()`, responsável por gerar um relatório DNS.
   *   - "reportxls" chama `this.exportMachineReport()`, responsável por exportar o relatório de máquinas em formato Excel.
   */
  onReportChange(value: string = ""): void {
    // Define um mapa de ações, onde a chave é o nome do relatório e o valor é a função a ser executada.
    const actions: Record<string, () => void> = {
      DNS: () => this.submitReportDNS(), // Se o valor selecionado for "DNS", executa a função de relatório DNS
      reportxls: () => this.exportMachineReport(), // Se o valor for "reportxls", executa a função de exportação XLS
    };

    // Verifica se existe uma função associada ao valor selecionado e a executa, caso exista.
    // O operador ?. garante que, se o valor não estiver mapeado, nada será executado (evita erros).
    actions[value]?.();
  }

  /**
   * Descrição:
   * A função `exportMachineReport` é acionada quando o relatório de máquinas é selecionado.
   * Ela identifica todas as máquinas marcadas pelo usuário na interface (checkboxes),
   * envia essas informações ao backend e, em resposta, recebe e baixa um arquivo Excel (.xlsx)
   * contendo os dados correspondentes às máquinas escolhidas.
   *
   * Esse processo permite ao usuário gerar relatórios personalizados de forma dinâmica,
   * com base apenas nas máquinas que ele selecionar manualmente.
   *
   * Parâmetros:
   * - (nenhum): a função utiliza diretamente os elementos da interface (checkboxes com classe `.ckip`).
   *
   * Variáveis:
   * - checkboxes: HTMLInputElement[], contém todos os checkboxes com a classe `.ckip` presentes na página.
   * - selectedValues: string[], armazena os valores (geralmente IDs ou IPs) dos checkboxes que foram marcados.
   * - bytes: Uint8Array, representa os bytes decodificados do conteúdo Base64 retornado pelo backend.
   * - blob: Blob, representa o arquivo Excel pronto para ser baixado.
   */
  exportMachineReport(): void {
    // Obtém todos os checkboxes da página com a classe ".ckip" e converte o NodeList em um array
    const checkboxes = Array.from(
      document.querySelectorAll<HTMLInputElement>(".ckip")
    );

    // Filtra apenas os checkboxes marcados e coleta seus valores (IDs/IPs das máquinas)
    const selectedValues = checkboxes
      .filter((c) => c.checked)
      .map((c) => c.value);

    // Se nenhuma máquina estiver selecionada, interrompe a execução
    if (!selectedValues.length) return;

    // Envia uma requisição POST ao backend com as máquinas selecionadas
    this.http
      .post<ReportResponse>(
        "/home/computers/get-report/xls/",
        { selectedValues: selectedValues.join(",") }, // Envia os valores separados por vírgula
        {
          headers: new HttpHeaders({
            Accept:
              "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          }),
        }
      )
      // Intercepta possíveis erros e os repassa
      .pipe(catchError((error) => throwError(() => error)))
      // Recebe a resposta do backend contendo o nome e o conteúdo do arquivo Excel
      .subscribe(({ file_name = "report.xlsx", file_content }) => {
        // Converte o conteúdo Base64 recebido em bytes binários
        const bytes = new Uint8Array(
          [...atob(file_content)].map((c) => c.charCodeAt(0))
        );

        // Cria um Blob a partir dos bytes para gerar o arquivo Excel
        const blob = new Blob([bytes], {
          type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        });

        // Utiliza a função saveAs (FileSaver.js) para baixar o arquivo no navegador
        saveAs(blob, file_name);
      });
  }

  /**
   * Descrição:
   * A função `submitReportDNS` é acionada quando o relatório de DNS é selecionado pelo usuário.
   * Ela envia uma requisição ao backend para gerar uma planilha Excel contendo informações
   * sobre máquinas que compartilham o mesmo endereço IP.
   *
   * O backend retorna o arquivo em formato Base64, e a função então converte essa resposta
   * em um link de download dinâmico, permitindo ao usuário baixar a planilha diretamente
   * no navegador.
   *
   * Parâmetros:
   * - (nenhum): a função não recebe parâmetros, pois o relatório é fixo e não depende de seleção de máquinas.
   *
   * Variáveis:
   * - link: HTMLAnchorElement, elemento `<a>` criado dinamicamente para realizar o download do arquivo.
   * - filedata: string, conteúdo do arquivo Excel em formato Base64 retornado pelo backend.
   * - filename: string, nome do arquivo que será baixado pelo usuário.
   */
  submitReportDNS(): void {
    // Realiza uma requisição GET para o endpoint que gera o relatório DNS
    this.http
      .get<{ filedata: string; filename: string }>(
        "/home/computers/report/dns",
        {
          // Define o cabeçalho "Accept" indicando que a resposta esperada é um arquivo Excel (.xlsx)
          headers: new HttpHeaders({
            Accept:
              "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          }),
        }
      )
      // Captura e repassa erros que possam ocorrer na requisição
      .pipe(catchError((error) => throwError(() => error)))
      // Trata a resposta do backend contendo o arquivo codificado em Base64 e o nome do arquivo
      .subscribe(({ filedata, filename }) => {
        // Cria dinamicamente um elemento <a> para simular o clique de download do arquivo
        const link = document.createElement("a");

        // Define o link de download usando a string Base64 retornada
        link.href = `data:application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;base64,${filedata}`;

        // Define o nome padrão do arquivo Excel que será baixado
        link.download = filename;

        // Executa o clique no link, iniciando o download do arquivo no navegador
        link.click();
      });
  }
}
