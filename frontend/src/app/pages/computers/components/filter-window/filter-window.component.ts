import { CommonModule } from "@angular/common";
import { Component } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { NgSelectModule } from "@ng-select/ng-select";
import { UtilitiesModule } from "../../../../utilities/utilities.module";
import { FilterService } from "../../filter.service";
import { catchError, map, Observable, throwError } from "rxjs";
import { HttpClient, HttpHeaders } from "@angular/common/http";

interface FilterItem {
  id: number;
  operator: string;
  category: string;
  type: string;
  value: string;
}

@Component({
  selector: "app-filter-window",
  standalone: true,
  imports: [CommonModule, NgSelectModule, FormsModule, UtilitiesModule],
  templateUrl: "./filter-window.component.html",
  styleUrl: "./filter-window.component.css",
})
export class FilterWindowComponent {
  filter_array: Partial<FilterItem>[] = [];
  dataMachines: any[] = [];

  constructor(private filterService: FilterService, private http: HttpClient) {}

  filter_loading: boolean = false;
  filter_select_option: boolean = false;
  filter_option_content: boolean = false;
  filter_option_content_load: boolean = false;
  new_filter: boolean = false;
  showDeleteFilter: boolean = false;
  filter_active: boolean = false;
  enable_filter: boolean = false;

  closeBTN: string = "/static/assets/images/fechar.png";
  change_filter_list_option: string = "";
  options_filter_list_selected: string = "";
  field_text: string = "";
  field_selected: string = "";
  selectedValueCategory: string = "";

  filter_list: string[] = ["MacAdress", "Name", "Operating System", "Software"];
  options_filter_list: string[] = ["Contem", "É igual"];
  options_filter_field: unknown[] = [];

  count_new_filter: number = 0;
  status: number = 0;

  token: any;

  /**
   * Descrição:
   * Este método `ngOnInit()` é executado automaticamente quando o componente da **tela de filtros** é inicializado.
   * Sua principal função é **sincronizar as variáveis locais** do componente com as variáveis reativas do serviço `FilterService`,
   * garantindo que o estado de filtros seja consistente entre este componente e o componente `FilterButtonComponent`,
   * que também utiliza as mesmas informações.
   *
   * Quando é usada:
   * - Sempre que o componente de filtros é carregado ou recarregado.
   * - Em cenários onde é necessário manter o estado dos filtros sincronizado entre múltiplos componentes.
   *
   * Por que é usada:
   * - Para assegurar que as alterações feitas no serviço (`FilterService`) — como ativação, texto, opções e estado dos filtros —
   *   sejam refletidas automaticamente neste componente.
   * - Isso permite uma comunicação reativa entre componentes sem a necessidade de passagem direta de dados via inputs/outputs.
   *
   * Parâmetros:
   * - Nenhum parâmetro é recebido diretamente; o método faz parte do ciclo de vida do Angular.
   *
   * Variáveis e streams observadas:
   * - this.filterService.currentFilterActive$: Observable<boolean>
   *   → Indica se o filtro está ativo. Quando desativado (`false`), a função `getData("all")` é chamada para recarregar todos os dados.
   *
   * - this.filterService.fieldTextShared$: Observable<string>
   *   → Sincroniza o texto digitado no campo de filtro (`this.field_text`).
   *
   * - this.filterService.optionsFilterShared$: Observable<unknown[]>
   *   → Atualiza as opções de campo disponíveis para filtragem (`this.options_filter_field`).
   *
   * - this.filterService.filterOptionContentLoadShared$: Observable<boolean>
   *   → Controla o estado de carregamento das opções de conteúdo (`this.filter_option_content_load`).
   *
   * - this.filterService.filterOptionContentShared$: Observable<boolean>
   *   → Define se as opções de conteúdo devem ser exibidas (`this.filter_option_content`).
   *
   * - this.filterService.filterSelectOptionShared$: Observable<boolean>
   *   → Controla a exibição do seletor de opções de filtro (`this.filter_select_option`).
   *
   * - this.filterService.filterArrayShared$: Observable<FilterItem[]>
   *   → Mantém o array principal de filtros sincronizado com o serviço (`this.filter_array`).
   *
   * Variáveis locais:
   * - this.filter_active: boolean — indica se há filtros ativos.
   * - this.field_text: string — valor atual do campo de texto do filtro.
   * - this.options_filter_field: unknown[] — lista de opções de filtragem disponíveis.
   * - this.filter_option_content_load / this.filter_option_content / this.filter_select_option: boolean — controlam o estado e exibição dos filtros.
   * - this.filter_array: FilterItem[] — armazena a lista atual de filtros aplicados.
   */
  ngOnInit(): void {
    // 🔹 Observa se o filtro está ativo e sincroniza o estado local
    this.filterService.currentFilterActive$.subscribe((val: boolean) => {
      this.filter_active = val;

      // Caso não haja filtros ativos, recarrega todos os dados
      if (!this.filter_active) this.getData("all");
    });

    // 🔹 Sincroniza o texto do campo de filtro
    this.filterService.fieldTextShared$.subscribe((val: string) => {
      this.field_text = val;
    });

    // 🔹 Sincroniza as opções de filtro disponíveis
    this.filterService.optionsFilterShared$.subscribe((val: unknown[]) => {
      this.options_filter_field = val;
    });

    // 🔹 Controla o estado de carregamento das opções de conteúdo
    this.filterService.filterOptionContentLoadShared$.subscribe(
      (val: boolean) => {
        this.filter_option_content_load = val;
      }
    );

    // 🔹 Define se as opções de conteúdo devem ser exibidas
    this.filterService.filterOptionContentShared$.subscribe((val: boolean) => {
      this.filter_option_content = val;
    });

    // 🔹 Controla a visibilidade do seletor de opções de filtro
    this.filterService.filterSelectOptionShared$.subscribe((val: boolean) => {
      this.filter_select_option = val;
    });

    // 🔹 Mantém o array de filtros sincronizado com o serviço
    this.filterService.filterArrayShared$.subscribe(
      (filterItem: FilterItem[]) => {
        this.filter_array = filterItem;
      }
    );

    this.filterService.tokenShared$.subscribe((val: string) => {
      this.token = val;
    });
  }

  /**
   * Descrição: Busca dados de computadores do servidor baseado na quantidade especificada.
   *              Atualiza a lista `dataMachines` com os dados recebidos ou trata erros HTTP.
   *
   * Parâmetros:
   * - quantity: string, quantidade de itens a serem solicitados ao servidor.
   *
   * Variáveis:
   * - this.http: HttpClient, serviço Angular para realizar requisições HTTP.
   * - this.dataMachines: any[], armazena os dados de máquinas recebidos do servidor.
   * - this.status: number, armazena o status HTTP em caso de erro na requisição.
   * - catchError: operador RxJS que captura erros na requisição HTTP.
   */
  getData(quantity: string): void {
    // Faz uma requisição GET ao servidor para obter dados de computadores
    this.http
      .get("/home/computers/get-data/" + quantity, {})
      .pipe(
        // Captura qualquer erro que ocorra durante a requisição
        catchError((error) => {
          // Armazena o status HTTP do erro para possível exibição ou tratamento
          this.status = error.status;

          // Repassa o erro para ser tratado posteriormente
          return throwError(error);
        })
      )
      .subscribe((data: any) => {
        // Se houver dados, atualiza a lista de máquinas no componente
        if (data) {
          this.dataMachines = data.machines;
        }
      });
  }

  /**
   * Descrição: Atualiza a lista de filtros do componente.
   *              Se a lista estiver vazia, adiciona um novo filtro com a categoria selecionada.
   *              Caso contrário, atualiza a categoria do primeiro filtro existente.
   *              Também ajusta opções de seleção caso o operador seja "É igual".
   *
   * Parâmetros: Nenhum
   *
   * Interfaces/Variáveis:
   * - filter_array: Array<{ id: number; category: string; [key: string]: any }>, armazena os filtros ativos do componente.
   * - selectedValueCategory: string, categoria selecionada pelo usuário para o filtro.
   * - filter_select_option: boolean, indica se a opção de filtro está disponível para seleção.
   * - options_filter_list_selected: string, operador de filtragem atualmente selecionado (ex: "É igual").
   * - options_filter_field: any[], armazena campos disponíveis para o operador de filtro selecionado.
   * - filter_option_content_load: boolean, indica se o conteúdo das opções de filtro foi carregado.
   * - sumCounter(): método que retorna um número único para ser usado como ID de filtro.
   * - change_filter_select_option(operator: string, flag: boolean): método que atualiza opções de filtro baseadas no operador.
   */
  change_filter_list(): void {
    // Se não houver filtros na lista, cria um novo filtro
    if (!this.filter_array.length) {
      const id = this.sumCounter(); // Gera um ID único para o filtro
      this.filter_array = [
        ...this.filter_array,
        { id, category: this.selectedValueCategory }, // Adiciona o filtro com a categoria selecionada
      ];
      this.filter_select_option = true; // Habilita a seleção de opção de filtro
      return; // Encerra a função
    }

    // Caso já exista um filtro, atualiza a categoria do primeiro filtro da lista
    this.filter_array[0] = {
      ...this.filter_array[0],
      category: this.selectedValueCategory,
    };

    // Se o operador selecionado for "É igual", reseta os campos e opções correspondentes
    if (this.options_filter_list_selected === "É igual") {
      this.options_filter_field = []; // Limpa campos disponíveis para seleção
      this.filter_option_content_load = false; // Marca que o conteúdo precisa ser recarregado
      this.change_filter_select_option("É igual", false); // Atualiza opções de filtro para o operador "É igual"
    }
  }

  /**
   * Descrição: Retorna o nome do campo correspondente à categoria selecionada pelo usuário.
   *              Mapeia categorias legíveis para nomes de campos usados internamente no sistema.
   *
   * Parâmetros: Nenhum
   *
   * Variáveis:
   * - selectedValueCategory: string, categoria selecionada pelo usuário (ex: "MacAdress", "Name").
   * - map: Record<string, string>, objeto que mapeia categorias para nomes de campos internos.
   *
   * Retorno:
   * - string: nome do campo interno correspondente à categoria selecionada, ou string vazia se não houver correspondência.
   */
  select_field(): string {
    // Mapeia categorias legíveis pelo usuário para campos internos do sistema
    const map: Record<string, string> = {
      MacAdress: "mac_address",
      Name: "name",
      "Operating System": "distribution",
      Software: "softwares",
    };

    // Retorna o campo correspondente à categoria selecionada ou string vazia se não houver correspondência
    return map[this.selectedValueCategory] ?? "";
  }

  /**
   * Descrição: Atualiza as opções de filtro do componente baseado na ação selecionada.
   *              Para a ação "Contem", habilita o conteúdo dinâmico do filtro.
   *              Para a ação "É igual", extrai valores únicos do campo correspondente em `dataMachines`
   *              e os armazena em `options_filter_field` para seleção pelo usuário.
   *
   * Parâmetros:
   * - action: string, operador selecionado para o filtro (ex: "Contem", "É igual").
   * - new_filter: boolean, indica se este é um novo filtro ou atualização de filtro existente.
   *
   * Variáveis:
   * - this.filter_option_content: boolean, indica se o conteúdo do filtro deve ser exibido.
   * - this.filter_option_content_load: boolean, indica se o conteúdo do filtro foi carregado.
   * - this.select_field(): método que retorna o campo correspondente à categoria selecionada.
   * - this.dataMachines: any[], lista de máquinas carregadas do servidor.
   * - this.options_filter_field: string[], valores únicos extraídos do campo correspondente para exibição no filtro.
   */
  change_filter_select_option(action: string, new_filter: boolean): void {
    // Se a ação for "Contem", habilita o conteúdo do filtro e marca como não carregado
    if (action === "Contem") {
      this.filter_option_content = true;
      this.filter_option_content_load = false;
    }

    // Se a ação não for "É igual", encerra a função
    if (action !== "É igual") return;

    // Se não for um novo filtro, desativa a exibição do conteúdo do filtro
    if (!new_filter) this.filter_option_content = false;

    // Obtém o campo interno correspondente à categoria selecionada
    const field = this.select_field();

    // Cria um conjunto para armazenar valores únicos do campo
    const values = new Set<string>();

    // Itera sobre todas as máquinas para extrair valores do campo correspondente
    this.dataMachines.forEach((item: any) => {
      const raw = item[field];

      if (!raw) return; // Ignora valores nulos ou indefinidos

      const trimmed = String(raw).trim();

      try {
        // Tenta interpretar o valor como JSON, substituindo aspas simples por duplas
        const obj = JSON.parse(trimmed.replace(/'/g, '"'));

        // Se for um array, adiciona todos os nomes válidos ao conjunto
        if (Array.isArray(obj))
          obj.forEach((x) => x?.name && values.add(x.name));
        // Se for um objeto único com propriedade 'name', adiciona ao conjunto
        else if (obj?.name) values.add(obj.name);
      } catch {
        // Caso JSON inválido, tenta extrair o valor de 'name' usando regex
        const match = trimmed.match(/'name'\s*:\s*'([^']+)'/);
        if (match?.[1]) values.add(match[1].trim());
        // Se ainda não conseguir, divide manualmente por vírgulas e adiciona valores válidos
        else
          trimmed
            .replace(/^{|}$/g, "")
            .split(",")
            .map((x) => x.trim())
            .filter(Boolean)
            .forEach((x) => values.add(x));
      }
    });

    // Converte o conjunto em array, ordena alfabeticamente e atualiza opções do filtro
    this.options_filter_field = Array.from(values).sort((a, b) =>
      a.localeCompare(b)
    );

    // Se não for um novo filtro, marca o conteúdo como carregado
    if (!new_filter) this.filter_option_content_load = true;
  }

  /**
   * Descrição: Incrementa e retorna um contador utilizado para gerar IDs únicos de filtros.
   *              Cada chamada garante que o próximo filtro adicionado tenha um ID exclusivo.
   *
   * Parâmetros: Nenhum
   *
   * Variáveis:
   * - count_new_filter: number, contador interno que acompanha o número de filtros criados.
   *
   * Retorno:
   * - number: próximo valor do contador, que pode ser usado como ID único para um filtro.
   */
  sumCounter(): number {
    // Incrementa o contador de filtros e retorna o valor atualizado
    return ++this.count_new_filter;
  }

  /**
   * Descrição: Adiciona dinamicamente um novo filtro à interface do usuário.
   *              Cria elementos HTML (div, select, botão) e os configura para permitir
   *              seleção de operadores e remoção do filtro. Atualiza a lista de filtros internos `filter_array`.
   *
   * Parâmetros: Nenhum
   *
   * Variáveis:
   * - container: HTMLElement | null, contêiner onde os filtros serão adicionados.
   * - count: number, ID único gerado para o novo filtro usando `sumCounter()`.
   * - div: HTMLDivElement, contêiner do novo filtro com select e botão de remoção.
   * - select: HTMLSelectElement, elemento de seleção de operador ("E" / "OU").
   * - placeholder: HTMLOptionElement, opção inicial desabilitada do select.
   * - last_id: number, ID do último filtro criado, usado para atualizar o `filter_array`.
   * - button: HTMLButtonElement, botão para remover o filtro.
   * - img: HTMLImageElement, ícone do botão de remoção.
   * - this.filter_array: Array de filtros do componente, atualizado dinamicamente.
   * - this.count_new_filter: number, contador de filtros, usado para gerar IDs únicos.
   * - this.onFilterChange(id: number): método que executa ações ao alterar o filtro.
   */
  addNewFilter(): void {
    // Recupera o contêiner onde os filtros serão adicionados
    const container = document.getElementById("set_filter");
    if (!container) return; // Se não existir, encerra a função

    // Gera um ID único para o novo filtro
    const count = this.sumCounter();

    // Cria uma div para o filtro e define suas classes e ID
    const div = Object.assign(document.createElement("div"), {
      id: `filter-${count}`,
      className:
        "w-100 d-flex flex-column justify-content-center mt-3 position-relative",
    });

    // Cria o select para escolha do operador
    const select = Object.assign(document.createElement("select"), {
      className: "form-select mx-auto w_5",
    });

    // Cria e adiciona placeholder ao select
    const placeholder = document.createElement("option");
    placeholder.textContent = "Selecione...";
    placeholder.value = "";
    placeholder.disabled = true;
    placeholder.selected = true;
    select.appendChild(placeholder);

    // Adiciona opções "E" e "OU" ao select
    select.append(
      ...[
        { value: "and", text: "E" },
        { value: "or", text: "OU" },
      ].map((opt) => Object.assign(document.createElement("option"), opt))
    );

    // ID do último filtro, usado para atualizar operator no filter_array
    const last_id = this.count_new_filter - 1;

    // Adiciona evento para atualizar operator no filter_array quando select mudar
    select.addEventListener("change", () => {
      this.filter_array = this.filter_array.map((f) =>
        f.id && f.id === last_id ? { ...f, operator: select.value } : f
      );
      // Se não existir elemento de operação com o ID atual, chama onFilterChange
      if (!document.getElementById(`operation-${count}`))
        this.onFilterChange(count);
    });

    // Cria botão de remoção do filtro
    const button = Object.assign(document.createElement("button"), {
      className:
        "btn position-absolute top-50 end-0 translate-middle-y w_2dot5 p0 btn-remove-filter",
    });

    // Evento de clique para remover o filtro
    button.addEventListener(
      "click",
      (e) => {
        e.preventDefault();
        div.remove(); // Remove a div do filtro
        this.filter_array = this.filter_array.filter(
          (f) => f.id !== this.count_new_filter
        );

        // Decrementa o contador de filtros sem ir abaixo de zero
        this.count_new_filter = Math.max(0, this.count_new_filter - 1);
      },
      { once: true } // Garante que o evento será executado apenas uma vez
    );

    // Cria ícone do botão de remoção
    const img = Object.assign(document.createElement("img"), {
      src: "/static/assets/images/delete_filter.png",
      className: "img-fluid",
    });

    // Monta a estrutura do filtro: botão com ícone + select
    button.appendChild(img);

    div.append(select, button);

    // Adiciona o filtro ao contêiner principal
    container.appendChild(div);
  }

  /**
   * Descrição: Adiciona dinamicamente uma nova linha de seleção de filtro dentro de um filtro existente.
   *              Cria um select para escolher a categoria do filtro e atualiza o array de filtros `filter_array`.
   *              Executa ações adicionais como atualização de opções e lógica de seleção conforme necessário.
   *
   * Parâmetros:
   * - count: number, ID do filtro que está sendo atualizado.
   *
   * Interfaces/Variáveis:
   * - div: HTMLElement | null, contêiner do filtro principal onde será adicionada a nova linha de seleção.
   * - c_div: HTMLDivElement, contêiner da linha de operação com o select.
   * - c_select: HTMLSelectElement, select criado para escolher a categoria do filtro.
   * - this.filter_array: Array<{ id: number; category: string; [key: string]: any }>, lista de filtros ativos do componente.
   * - this.filter_list: string[], lista de categorias disponíveis para seleção.
   * - this.enable_filter: boolean, indica se ações adicionais de filtro estão habilitadas.
   * - this.new_change_filter_list(c_div: HTMLDivElement, count: number): método que executa lógica extra ao alterar filtro.
   * - this.del_options(count: number): método que limpa opções relacionadas ao filtro especificado.
   * - this.actionForSelect(action: string, count: number, div: HTMLDivElement): método que aplica ações específicas ao filtro.
   */
  onFilterChange(count: number): void {
    // Recupera o contêiner do filtro principal
    const div = document.getElementById(`filter-${count}`);
    if (!div) return; // Se não existir, encerra a função

    // Cria uma div para conter a linha de operação do filtro
    const c_div = Object.assign(document.createElement("div"), {
      id: `operation-${count}`,
      className: "w-100 d-flex justify-content-evenly mt-3",
    });

    // Cria o select para escolha da categoria do filtro
    const c_select = Object.assign(document.createElement("select"), {
      id: `field-for-filter${count}`,
      className: "form-select wd_form",
    });

    // Adiciona placeholder ao select
    c_select.appendChild(
      Object.assign(document.createElement("option"), {
        textContent: "Selecione...",
        value: "",
        disabled: true,
        selected: true,
      })
    );

    // Evento de mudança do select para atualizar o filter_array e executar lógica adicional
    c_select.addEventListener("change", (e) => {
      const target = e.target as HTMLSelectElement;
      e.preventDefault();

      // Executa ações adicionais ao mudar filtro
      this.new_change_filter_list(c_div, count);

      // Atualiza filter_array com a nova categoria
      const existing = this.filter_array.find((f) => f.id === count);
      if (existing) {
        this.filter_array = this.filter_array.map((f) =>
          f.id === count ? { ...f, category: target.value } : f
        );
      } else {
        this.filter_array.push({ id: count, category: target.value });
      }

      // Validar se o tipo já foi preenchido, assim valida a criação desnecessária de select's
      const item = this.filter_array.find((f) => f.id === 3);
      const hasType = !!item?.type;

      // Se filtros avançados estiverem habilitados, aplica ações extras
      if (this.enable_filter && hasType) {
        this.filter_array = this.filter_array.map((f) =>
          f.id === count ? { ...f, category: target.value } : f
        );
        this.del_options(count); // Limpa opções relacionadas ao filtro

        this.actionForSelect("É igual", count, c_div); // Aplica ação "É igual" ao filtro
      }
    });

    // Adiciona as opções disponíveis no select com base em filter_list
    this.filter_list.forEach((option) =>
      c_select.append(
        Object.assign(document.createElement("option"), {
          value: option,
          textContent: option,
        })
      )
    );

    // Monta a linha de operação e adiciona ao contêiner principal
    c_div.append(c_select);
    div.append(c_div);
  }

  /**
   * Descrição: Remove todas as opções de um elemento select específico do filtro.
   *              É utilizado para limpar as opções antigas antes de adicionar novas opções dinâmicas.
   *
   * Parâmetros:
   * - count: number, ID do filtro cujo select terá suas opções removidas.
   *
   * Variáveis:
   * - document.getElementById(`select-change-${count}`): HTMLElement | null, elemento select alvo que terá seus filhos removidos.
   */
  del_options(count: number): void {
    // Recupera o select pelo ID e remove todos os elementos filhos (opções)
    document.getElementById(`select-change-${count}`)?.replaceChildren();
  }

  /**
   * Descrição: Adiciona dinamicamente a linha de seleção de tipo de filtro para um filtro existente.
   *              Cria um select que permite escolher entre "É igual" ou "Contem" e atualiza a interface
   *              adicionando um segundo select ou um input conforme a escolha do usuário. Atualiza também
   *              o array `filter_array` com tipo e valor do filtro.
   *
   * Parâmetros:
   * - div: HTMLDivElement, contêiner onde os elementos do filtro serão adicionados.
   * - count: number, ID do filtro que está sendo atualizado.
   *
   * Interfaces/Variáveis:
   * - c_select: HTMLSelectElement, select criado para escolher o tipo do filtro.
   * - existingSelect: HTMLElement | null, segundo select do filtro já existente (para "É igual").
   * - existingInput: HTMLElement | null, input do filtro já existente (para "Contem").
   * - this.filter_array: Array<{ id: number; category?: string; type?: string; value?: string }>, lista de filtros ativos.
   * - this.enable_filter: boolean, indica se o filtro avançado está habilitado.
   * - this.options_filter_list: string[], lista de opções de tipo de filtro (ex: "É igual", "Contem").
   * - this.actionForSelect(action: string, count: number, div: HTMLDivElement): método que atualiza opções de filtro baseadas no operador.
   */
  new_change_filter_list(div: HTMLDivElement, count: number): void {
    // Se o select de tipo de filtro já existir para esse count, não faz nada
    if (document.getElementById(`select-os-${count}`)) return;

    // Cria o select de tipo de filtro
    const c_select = Object.assign(document.createElement("select"), {
      id: `select-os-${count}`,
      className: "form-select wd_form",
    });

    // Adiciona placeholder ao select
    c_select.appendChild(
      Object.assign(document.createElement("option"), {
        textContent: "Selecione...",
        value: "",
        disabled: true,
        selected: true,
      })
    );

    // Evento de mudança do select de tipo de filtro
    c_select.addEventListener("change", (e: Event) => {
      if (!this.enable_filter) this.enable_filter = true;
      const value = (e.target as HTMLSelectElement).value;
      const existingSelect = document.getElementById(`select-change-${count}`);
      const existingInput = document.getElementById(`input-${count}`);

      // Se o tipo selecionado for "É igual", cria ou mantém o segundo select
      if (value === "É igual") {
        if (!existingSelect) {
          const c_select_2 = Object.assign(document.createElement("select"), {
            id: `select-change-${count}`,
            className: "form-select wd_form",
          });
          c_select_2.selectedIndex = -1; // Nenhuma opção selecionada inicialmente
          div.appendChild(c_select_2);
        }

        // Atualiza filter_array para indicar tipo "equals"
        this.filter_array = this.filter_array.map((f) =>
          f.id === count ? { ...f, type: "equals" } : f
        );

        // Chama ação para atualizar opções do segundo select
        this.actionForSelect(value, count, div);

        // Remove input caso exista
        if (existingInput) existingInput.remove();
      } else {
        // Para outros tipos, remove select existente e cria input se não existir
        existingSelect?.remove();

        // Atualiza filter_array para indicar tipo "content"
        this.filter_array = this.filter_array.map((f) =>
          f.id === count ? { ...f, type: "content" } : f
        );

        if (!existingInput) {
          const c_input = Object.assign(document.createElement("input"), {
            id: `input-${count}`,
            className: "form-control wd_form",
            type: "text",
          });

          // Atualiza filter_array com valor digitado no input
          c_input.addEventListener("input", (ev: Event) => {
            const val = (ev.target as HTMLInputElement).value;
            this.filter_array = this.filter_array.map((f) =>
              f.id === count ? { ...f, value: val } : f
            );
          });

          div.appendChild(c_input);
        }
      }
    });

    // Adiciona as opções do select de tipo de filtro
    this.options_filter_list.forEach((option) =>
      c_select.appendChild(
        Object.assign(document.createElement("option"), {
          value: option,
          textContent: option,
        })
      )
    );

    // Adiciona o select ao contêiner do filtro
    div.appendChild(c_select);
  }

  /**
   * Descrição: Atualiza dinamicamente as opções do segundo select de um filtro quando o operador "É igual" é selecionado.
   *              Remove o input de texto se existir, busca valores ajustados do servidor ou do método `change_new_filter_select_option`
   *              e adiciona como opções no select correspondente.
   *
   * Parâmetros:
   * - value: string, operador selecionado (ex: "É igual").
   * - count: number, ID do filtro que está sendo atualizado.
   * - div: HTMLDivElement, contêiner onde o select será adicionado ou atualizado.
   *
   * Interfaces/Variáveis:
   * - categoryMap: Record<string, number>, mapeia categorias para índices de campos usados na função `change_new_filter_select_option`.
   * - category: string, categoria do filtro atual obtida de `filter_array`.
   * - n_field: number, índice do campo correspondente à categoria.
   * - this.filter_array: Array<{ id: number; category?: string; type?: string; value?: string }>, lista de filtros ativos.
   * - select: HTMLSelectElement, select criado ou recuperado para o filtro.
   * - adjust_array: string[], valores únicos obtidos do método `change_new_filter_select_option` que serão adicionados como opções.
   */
  actionForSelect(value: string, count: number, div: HTMLDivElement): void {
    // Mapeia categorias para índices de campo usados na busca de valores
    const categoryMap: Record<string, number> = {
      MacAdress: 0,
      Name: 1,
      "Operating System": 3,
      Software: 40,
    };

    // Obtém a categoria do filtro atual
    const category =
      this.filter_array.find((f) => f.id === count)?.category ?? "";

    // Recupera o índice do campo correspondente à categoria
    const n_field = categoryMap[category] ?? -1;

    // Se o operador não for "É igual" ou categoria inválida, encerra a função
    if (value !== "É igual" || n_field < 0) return;

    // Remove o input de texto se existir (não é necessário para "É igual")
    document.getElementById(`input-${count}`)?.remove();

    // Busca valores ajustados para popular o select
    this.change_new_filter_select_option(n_field).subscribe(
      (adjust_array: string[]) => {
        // Recupera ou cria o select de opções
        let select = document.getElementById(
          `select-change-${count}`
        ) as HTMLSelectElement | null;

        if (!select) {
          select = Object.assign(document.createElement("select"), {
            id: `select-change-${count}`,
            className: "form-select wd_form",
          });
        } else {
          // Limpa opções existentes
          select.replaceChildren();
        }

        select.addEventListener("change", (e) => {
          const target = e.target as HTMLSelectElement;

          this.filter_array = this.filter_array.map((f) =>
            f.id === count ? { ...f, value: target.value } : f
          );
        });

        // Cria e adiciona placeholder ao select
        const placeholder = document.createElement("option");
        placeholder.textContent = "Selecione...";
        placeholder.value = "";
        placeholder.disabled = true;
        placeholder.selected = true;
        select.appendChild(placeholder);

        // Adiciona cada valor do adjust_array como uma opção no select
        adjust_array.forEach((v) =>
          select!.appendChild(
            Object.assign(document.createElement("option"), {
              value: v,
              textContent: v,
            })
          )
        );

        // Adiciona ou atualiza o select no contêiner do filtro
        div.append(select);
      }
    );
  }

  /**
   * Descrição: Retorna um Observable com os valores únicos de um campo específico das máquinas.
   *              Usado para popular selects de filtros dinamicamente. Trata campos especiais que
   *              podem conter JSON ou texto estruturado (como o campo 40 para softwares).
   *
   * Parâmetros:
   * - field: number, índice do campo das máquinas a ser processado (ex: 0 = MacAdress, 1 = Name, 2 = SO, 40 = Software).
   *
   * Interfaces/Variáveis:
   * - this.getMachines(): Observable<any[]>, método que retorna todas as máquinas disponíveis.
   * - machines: any[], array de objetos representando as máquinas.
   * - raw: any, valor cru do campo específico da máquina.
   * - trimmed: string, valor convertido para string e removendo espaços em excesso.
   * - values: string[], array temporário que armazena todos os valores coletados do campo.
   * - adjust_array: string[], array final de valores únicos e ordenados.
   *
   * Retorno:
   * - Observable<string[]>: array de strings contendo os valores únicos e ordenados do campo.
   */
  change_new_filter_select_option(field: number): Observable<string[]> {
    return this.getMachines().pipe(
      map((machines: any[]) => {
        const values: string[] = [];

        machines.forEach((item) => {
          const raw = item[field];
          if (!raw) return;

          const trimmed = String(raw).trim();
          if (!trimmed) return;

          // Caso especial para campo 40 (possível JSON ou texto estruturado)
          if (field === 40) {
            try {
              // Tenta interpretar o valor como JSON, substituindo aspas simples por duplas
              const obj = JSON.parse(trimmed.replace(/'/g, '"'));

              if (Array.isArray(obj)) {
                // Se for array, adiciona todos os nomes válidos
                obj.forEach((x) => x?.name && values.push(x.name));
              } else if (obj?.name) {
                // Se for objeto único, adiciona nome
                values.push(obj.name);
              }
            } catch {
              // Caso JSON inválido, tenta extrair nome via regex
              const match = trimmed.match(/'name'\s*:\s*'([^']+)'/);
              if (match?.[1]) {
                values.push(match[1].trim());
              } else {
                // Caso ainda não consiga, divide manualmente por vírgulas
                trimmed
                  .replace(/^{|}$/g, "")
                  .split(",")
                  .map((x) => x.trim())
                  .filter(Boolean)
                  .forEach((x) => values.push(x));
              }
            }
          } else {
            // Para campos normais, adiciona valor diretamente
            values.push(trimmed);
          }
        });

        // Remove duplicatas e ordena alfabeticamente
        const adjust_array = Array.from(new Set(values)).sort((a, b) =>
          a.localeCompare(b)
        );

        return adjust_array;
      })
    );
  }

  /**
   * Descrição: Retorna um Observable com todas as máquinas disponíveis.
   *              Cada máquina é representada como um array de valores (string | number | null).
   *              É utilizado como base para popular selects de filtros ou realizar operações em massa.
   *
   * Parâmetros: Nenhum
   *
   * Interfaces/Variáveis:
   * - this.http: HttpClient, serviço Angular para requisições HTTP.
   * - response: { machines: (string | number | null)[][] }, estrutura esperada da resposta da API.
   * - this.status: number, armazena o status HTTP em caso de erro.
   *
   * Retorno:
   * - Observable<(string | number | null)[][]>: array de máquinas representadas por arrays de campos.
   */
  getMachines(): Observable<(string | number | null)[][]> {
    return this.http
      .get<{ machines: (string | number | null)[][] }>(
        "/home/computers/get-quantity/all"
      )
      .pipe(
        // Extrai apenas a propriedade 'machines' da resposta
        map((response: { machines: any }) => response.machines),

        // Captura erros HTTP e armazena o status
        catchError((error) => {
          this.status = error.status;
          return throwError(() => error);
        })
      );
  }

  /**
   * Descrição: Atualiza o valor do primeiro filtro quando o usuário seleciona uma opção em um select.
   *              Define o tipo como "equals" e marca que um novo filtro foi aplicado.
   *
   * Parâmetros:
   * - event: Event, evento disparado pelo select HTML.
   *
   * Interfaces/Variáveis:
   * - value: string, valor selecionado no select.
   * - filter_array: Array<{ id: number; category?: string; value?: string; type?: string }>, lista de filtros ativos.
   * - new_filter: boolean, indica se um novo filtro foi aplicado.
   */
  selectedValueField(event: Event): void {
    // Obtém o valor selecionado do select
    const value = (event.target as HTMLSelectElement)?.value;
    if (!value) return; // Se não houver valor, não faz nada

    this.field_text = "";

    // Atualiza o primeiro filtro com o valor selecionado e tipo "equals"
    const filter = this.filter_array[0];
    if (filter) Object.assign(filter, { value, type: "equals" });

    // Marca que um novo filtro foi aplicado
    this.new_filter ||= true;
    this.filterService.setValueFilterRemove(true);
    this.showDeleteFilter ||= true;
  }

  /**
   * Descrição: Atualiza o valor do primeiro filtro quando o usuário digita em um input de texto.
   *              Define o tipo do filtro como "content" e marca que um novo filtro foi aplicado.
   *
   * Parâmetros:
   * - event: Event, evento disparado pelo input HTML.
   *
   * Interfaces/Variáveis:
   * - value: string, valor digitado pelo usuário.
   * - filter_array: Array<{ id: number; category?: string; value?: string; type?: string }>, lista de filtros ativos.
   * - new_filter: boolean, indica se um novo filtro foi aplicado.
   */
  inputedValueField(event: Event): void {
    // Obtém o valor digitado no input
    const value = (event.target as HTMLInputElement)?.value;
    if (!value) return; // Se não houver valor, não faz nada

    // Atualiza o primeiro filtro com o valor digitado e tipo "content"
    const filter = this.filter_array[0];
    if (filter) Object.assign(filter, { value, type: "content" });

    // Marca que um novo filtro foi aplicado
    this.new_filter ||= true;
    this.filterService.setValueFilterRemove(true);
    this.showDeleteFilter ||= true;
  }

  callDeleteFilter() {
    this.filterService.deleteFilterForButton(
      "select-cat", // ID do select principal de categoria
      "first", // Valor padrão para redefinir o select
      "select-type" // ID do select de tipo que também será resetado
    );

    this.filterService.setResetInDeleteFilter("", [], false, []);

    this.filterService.setValueFilterRemove(false);

    this.filterService.setValueToReloadData(true);
  }

  apply_filter() {
    this.http
      .post(
        "/home/computers/filter-search/apply-filter",
        {
          filter: this.filter_array,
        },
        {
          headers: new HttpHeaders({
            "X-CSRFToken": this.token,
            "Content-Type": "application/json",
          }),
        }
      )
      .pipe(
        catchError((error) => {
          return throwError(error);
        })
      )
      .subscribe((data: any) => {
        if (data) {
          this.filterService.setDataMachines(data.machines);
        }
      });
  }

  closeFilter() {
    this.filterService.setValueFilterActive(false);
  }
}
