import {
  Component,
  ElementRef,
  OnInit,
  Renderer2,
  ViewChild,
} from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { catchError, throwError } from "rxjs";

import { FilterService } from "../filter.service";

interface Software {
  name: string;
  ids: string[];
  // Adicione outras propriedades se necessário
}

@Component({
  selector: "app-computers",
  templateUrl: "./computers.component.html",
  styleUrl: "./computers.component.css",
})
export class ComputersComponent implements OnInit {
  constructor(
    private http: HttpClient,
    private renderer: Renderer2,
    private el: ElementRef, // private cdRef: ChangeDetectorRef
    private filterService: FilterService
  ) {}
  // Declarando variaveis any
  @ViewChild("selectElement") selectElement!: ElementRef<HTMLSelectElement>;

  dataMachines: any[] = [];
  name: any;
  status: any;
  token: any;
  // Declarando variaveis string
  arrow_up: string = "/static/assets/images/seta2.png";
  arrow_down: string = "/static/assets/images/seta.png";
  computers_class: string = "active";
  errorType: string = "";
  input_name: string = "";

  messageError: string = "";
  placeHolderDynamic: string = "Selecione um Software";

  quantity_filter: string = "";
  field_for_filter: string = "";
  ten_quantity: string = "";

  // Declarando variaveis boolean
  canView: boolean = false;
  canViewMachines: boolean = false;
  canViewMessage: boolean = false;
  checkedAll: boolean = true;
  showMessage: boolean = false;

  // Declarando variaveis list
  soft_list: Software[] = [];

  soft_list_new = [
    { name: "Office", ids: 1 },
    { name: "Chrome", ids: 1 },
  ];

  softwares_list: any;

  /**
   * Descrição: Inicializa o componente verificando se o usuário possui dados salvos no localStorage.
   *              Se os dados do usuário estiverem ausentes, exibe uma mensagem de erro.
   *              Caso contrário, habilita a visualização do componente e chama métodos para carregar
   *              token, sistema operacional e distribuição de dados.
   *
   * Parâmetros: Nenhum
   *
   * Variáveis:
   * - name: string, nome do usuário recuperado do localStorage.
   * - errorType: string, tipo de erro a ser exibido em caso de falha na recuperação dos dados.
   * - messageError: string, mensagem detalhada de erro a ser exibida ao usuário.
   * - showMessage: boolean, indica se a mensagem de erro deve ser exibida no componente.
   * - canView: boolean, indica se o usuário pode visualizar o conteúdo do componente.
   * - this.getToken(): método que busca e armazena o token de autenticação ou sessão.
   * - this.getSO(): método que recupera informações sobre o sistema operacional do usuário.
   * - this.getDistribution(): método que obtém dados sobre distribuição ou segmentação específica.
   */
  ngOnInit(): void {
    // Recupera o nome do usuário do localStorage ou define uma string vazia caso não exista
    this.name = localStorage.getItem("name") ?? "";

    // Se o nome estiver ausente, exibe mensagem de erro e interrompe a execução
    if (!this.name) {
      this.errorType = "Falta de Dados";
      this.messageError =
        "Houve um erro ao acessar dados do LDAP, contatar a TI";
      this.showMessage = true;
      return;
    }

    // Caso o nome exista, permite que o usuário visualize o componente
    this.canView = true;

    // Chama métodos para carregar dados adicionais necessários no componente
    this.getToken(); // Recupera token de autenticação ou sessão

    this.filterService.dataMachinesShared$.subscribe((val: object[]) => {
      // Atualiza a variável local com o valor emitido pelo serviço
      this.dataMachines = val;
    });

    this.filterService.resetShared$.subscribe((val: boolean) => {
      // Atualiza a variável local com o valor emitido pelo serviço
      if (val) {
        this.getData(this.quantity_filter);
        this.filterService.setValueToReloadData(false);
      }
    });
  }

  closeMessage() {
    this.canViewMessage = false;
  }

  // Função que obtem o token CSRF
  getToken(): void {
    this.http
      .get("/home/get-token", {})
      .pipe(
        catchError((error) => {
          this.status = error.status;

          if (this.status === 0) {
          }

          return throwError(error);
        })
      )
      .subscribe((data: any) => {
        if (data) {
          this.token = data.token;
          this.filterService.setToken(data.token);
        }
      });
  }

  // Buscando as maquinas disponiveis
  getData(quantity: string): void {
    this.http
      .get("/home/computers/get-data/" + quantity, {})
      .pipe(
        catchError((error) => {
          this.status = error.status;

          return throwError(error);
        })
      )
      .subscribe((data: any) => {
        if (data) {
          this.dataMachines = data.machines;

          this.quantity_filter = quantity;
          this.mountSoftwares();

          this.canViewMachines = true;
          // Apos pegar os dados principais chama a função para preencher o filtro de SO
          this.dataMachines;
        }
      });
  }

  mountSoftwares(): void {
    try {
      const machineNames = this.dataMachines.map(
        (machine: any[]) => machine[40]
      );

      const so = this.dataMachines.map((machine: any[]) => machine[3]);
      const ids = this.dataMachines.map((machine: any[]) => machine[0]);

      // Encontrar todos os índices onde o valor de `so` é "Microsoft Windows 10 Pro"
      const windows10ProIndexes = so
        .map((value: string, index: number) =>
          value === "Microsoft Windows 10 Pro" ? index : -1
        )
        .filter((index: number) => index !== -1);

      // Usar esses índices para pegar os valores correspondentes de `machineNames` e `ids`
      const result = windows10ProIndexes.map((index: number) => ({
        name: machineNames[index],
        id: ids[index],
      }));

      // Processar cada resultado com a função `stringToSortedArray`
      result.forEach(({ name, id }: { name: string; id: string }) => {
        const names = this.stringToSortedArray(name);
        return this.updateSoftwareList(names, id);
      });
    } catch (err) {
      return console.error("Erro ao Montar os softwares: ", err);
    }
  }

  stringToSortedArray(array: string): string[] {
    if (!array || array.trim().length <= 1) {
      return [];
    }
    try {
      let soft_list: any[] = [];
      const trimmedData = array.trim();
      // Verifica se a string é um array válido
      if (trimmedData.startsWith("[") && trimmedData.endsWith("]")) {
        soft_list = JSON.parse(trimmedData.replace(/'/g, '"'));
      }

      // Verifica se a string é um objeto único
      else if (trimmedData.startsWith("{") && trimmedData.endsWith("}")) {
        // Adiciona colchetes para transformar em um array com um único item
        const arrayString = `[${trimmedData}]`;
        soft_list = JSON.parse(arrayString.replace(/'/g, '"'));
      }
      // Verifica se soft_list é um array de objetos
      if (
        Array.isArray(soft_list) &&
        soft_list.every((item) => typeof item === "object" && item !== null)
      ) {
        // Extrai o valor da propriedade `name` de cada objeto
        return soft_list.map((item) => item.name);
      } else {
        console.error("A string não contém um array de objetos válidos.");
        return [];
      }
    } catch (error) {
      console.error("Erro ao converter a string para JSON:", error);
      return [];
    }
  }

  updateSoftwareList(names: string[], id: string): void {
    try {
      names.forEach((name: string) => {
        // Verifica se já existe um objeto com o mesmo nome em soft_list
        const software = this.soft_list.find(
          (software) => software.name === name
        );

        if (software) {
          // Adiciona o ID ao array de IDs se ainda não estiver presente
          if (!software.ids.includes(id)) {
            software.ids.push(id);
          }
        } else {
          // Adiciona um novo objeto com o nome e o ID
          this.soft_list.push({ name, ids: [id] });
          this.soft_list.sort((a, b) =>
            a.name.toLowerCase().localeCompare(b.name.toLowerCase())
          );
        }
      });
    } catch (err) {
      return console.error(err);
    }
  }

  // A função onRowClick trata o clique em uma linha da tabela de máquinas.
  // Ela constrói a URL de visualização de uma máquina a partir do seu endereço MAC,
  // substitui ":" por "-", e decide a ação com base no botão do mouse clicado:
  // - Botão esquerdo (0): abre a URL na mesma aba.
  // - Botão do meio (1): abre a URL em uma nova aba.
  onRowClick(index: number, event: MouseEvent) {
    // Obtém o endereço MAC da máquina selecionada no índice informado

    const mac = this.dataMachines[index].mac_address.replace(/:/g, "-");

    // Monta a URL para visualizar os detalhes da máquina
    const url = `/home/computers/${mac}`;

    // Se o botão do mouse for o do meio (1), abre a página em uma nova aba
    if (event.button === 1) {
      window.open(url, "_blank");
    }
    // Se o botão do mouse for o esquerdo (0), redireciona na mesma aba
    else if (event.button === 0) {
      window.location.href = url;
    }
  }

  // Função que formata as datas que aparecem na tabela dos computadores
  formatDate(date: string): string {
    try {
      const parsedDate = new Date(date);
      const day = String(parsedDate.getDate()).padStart(2, "0");
      const month = String(parsedDate.getMonth() + 1).padStart(2, "0"); // Meses são baseados em 0 (Janeiro é 0)
      const year = parsedDate.getFullYear();

      return `${day}/${month}/${year}`;
    } catch (err) {
      console.error(err);
      return String(err);
    }
  }

  // Reorganiza os os computadores pelo nome em ordem alfabetica
  sortByName(): void {
    try {
      this.dataMachines.sort((a: any, b: any) => {
        const nameA = a[1].toUpperCase(); // Ignore case
        const nameB = b[1].toUpperCase(); // Ignore case
        if (nameA < nameB) {
          return -1;
        }
        if (nameA > nameB) {
          return 1;
        }
        return 0;
      });
    } catch (err) {
      return console.error(err);
    }
  }

  // Reorganiza os os computadores pelo nome em ordem alfabetica invertido
  sortDataByNameDescending(): void {
    try {
      this.dataMachines.sort((a: any, b: any) => {
        const nameA = a[1].toUpperCase(); // Ignore case
        const nameB = b[1].toUpperCase(); // Ignore case
        if (nameA < nameB) {
          return 1;
        }
        if (nameA > nameB) {
          return -1;
        }
        return 0;
      });
    } catch (err) {
      return console.error(err);
    }
  }

  // Reorganiza os os computadores pelo SO em ordem alfabetica
  sortByNameSO(): void {
    try {
      this.dataMachines.sort((a: any, b: any) => {
        const nameA = a[2].toUpperCase(); // Ignore case
        const nameB = b[2].toUpperCase(); // Ignore case
        if (nameA < nameB) {
          return -1;
        }
        if (nameA > nameB) {
          return 1;
        }
        return 0;
      });
    } catch (err) {
      return console.error(err);
    }
  }

  // Reorganiza os os computadores pelo SO em ordem alfabetica invertido
  sortDataByNameDescendingSO(): void {
    try {
      this.dataMachines.sort((a: any, b: any) => {
        const nameA = a[2].toUpperCase(); // Ignore case
        const nameB = b[2].toUpperCase(); // Ignore case
        if (nameA < nameB) {
          return 1;
        }
        if (nameA > nameB) {
          return -1;
        }
        return 0;
      });
    } catch (err) {
      return console.error(err);
    }
  }

  // Reorganiza os os computadores pela Distribuição em ordem alfabetica
  sortByNameDis(): void {
    try {
      this.dataMachines.sort((a: any, b: any) => {
        const nameA = a[3].toUpperCase(); // Ignore case
        const nameB = b[3].toUpperCase(); // Ignore case
        if (nameA < nameB) {
          return -1;
        }
        if (nameA > nameB) {
          return 1;
        }
        return 0;
      });
    } catch (err) {
      return console.error(err);
    }
  }

  // Reorganiza os os computadores pela Distribuição em ordem alfabetica invertido
  sortDataByNameDescendingDis(): void {
    try {
      this.dataMachines.sort((a: any, b: any) => {
        const nameA = a[3].toUpperCase(); // Ignore case
        const nameB = b[3].toUpperCase(); // Ignore case
        if (nameA < nameB) {
          return 1;
        }
        if (nameA > nameB) {
          return -1;
        }
        return 0;
      });
    } catch (err) {
      return console.error(err);
    }
  }

  // Reorganiza os os computadores pela data em ordem decrecente
  sortByDateDesc(): void {
    try {
      this.dataMachines.sort((a: any, b: any) => {
        const dateA = new Date(a[4]);
        const dateB = new Date(b[4]);

        return dateB.getTime() - dateA.getTime(); // Mais recente para o mais antigo
      });
    } catch (err) {
      return console.error(err);
    }
  }

  // Reorganiza os os computadores pela data em ordem crescente
  sortByDateASC(): void {
    try {
      this.dataMachines.sort((a: any, b: any) => {
        const dateA = new Date(a[4]);
        const dateB = new Date(b[4]);

        return dateA.getTime() - dateB.getTime(); // Mais antigo para o mais novo
      });
    } catch (err) {
      return console.error(err);
    }
  }

  selectAll(): void {
    const checkboxes = this.el.nativeElement.querySelectorAll(".ckip");
    checkboxes.forEach((checkbox: HTMLInputElement) => {
      if (this.checkedAll) {
        this.renderer.setProperty(checkbox, "checked", true);
      } else {
        this.renderer.setProperty(checkbox, "checked", false);
      }
    });
    if (this.checkedAll) {
      this.checkedAll = false;
    } else {
      this.checkedAll = true;
    }
  }

  /**
   * Descrição: Envia uma requisição POST para o backend com os critérios de filtragem e retorna os dados filtrados.
   *
   * Parâmetros:
   * - filter: any — objeto contendo os critérios de filtragem que serão enviados para o servidor.
   *
   * Retorno:
   * - Promise<any> — dados filtrados retornados pelo backend; retorna array vazio em caso de erro.
   *
   * Interfaces/Variáveis:
   * - token: string — token CSRF usado para autenticação da requisição.
   */
  async fetch_filtered_data(filter: any) {
    try {
      // Envia a requisição POST para o endpoint de filtro
      const response = await fetch("get-filter-result/", {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          "X-CSRFToken": this.token, // Autenticação CSRF
        },
        body: JSON.stringify(filter), // Converte o objeto de filtro em JSON
      });

      // Converte a resposta para JSON
      const data = await response.json();
      return data;
    } catch (err) {
      // Em caso de erro, exibe no console e retorna array vazio
      console.error(err);
      return [];
    }
  }

  onQuantityChanged(value: string) {
    this.getData(value);
  }
}
