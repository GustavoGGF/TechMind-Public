import { Injectable } from "@angular/core";
import { BehaviorSubject } from "rxjs";

interface FilterItem {
  id: number;
  operator: string;
  category: string;
  type: string;
  value: string;
}

@Injectable({
  providedIn: "root",
})
export class FilterService {
  private filter_active = new BehaviorSubject<boolean>(false);
  currentFilterActive$ = this.filter_active.asObservable();

  private delete_filter_active = new BehaviorSubject<boolean>(false);
  currentDeleteFilterActive$ = this.delete_filter_active.asObservable();

  private field_text_shared = new BehaviorSubject<string>("");
  fieldTextShared$ = this.field_text_shared.asObservable();

  private options_filter_shared = new BehaviorSubject<unknown[]>([]);
  optionsFilterShared$ = this.options_filter_shared.asObservable();

  private filter_option_content_load_shared = new BehaviorSubject<boolean>(
    false
  );
  filterOptionContentLoadShared$ =
    this.filter_option_content_load_shared.asObservable();

  private filter_option_content_shared = new BehaviorSubject<boolean>(false);
  filterOptionContentShared$ = this.filter_option_content_shared.asObservable();

  private filter_select_option_shared = new BehaviorSubject<boolean>(false);
  filterSelectOptionShared$ = this.filter_select_option_shared.asObservable();

  private filter_array_shared = new BehaviorSubject<FilterItem[]>([]);
  filterArrayShared$ = this.filter_array_shared.asObservable();

  private token_shared = new BehaviorSubject<string>("");
  tokenShared$ = this.token_shared.asObservable();

  private data_machines_shared = new BehaviorSubject<object[]>([]);
  dataMachinesShared$ = this.data_machines_shared.asObservable();

  private reset_shared = new BehaviorSubject<boolean>(false);
  resetShared$ = this.reset_shared.asObservable();

  /**
   * Descrição:
   * Esta função define o estado atual de **filtro ativo** dentro do serviço `FilterService`.
   * Ela é responsável por emitir um novo valor para o observable `filter_active`,
   * permitindo que todos os componentes assinantes (como telas de filtro e botões de filtro)
   * sejam atualizados automaticamente quando o estado de ativação do filtro mudar.
   *
   * Quando é usada:
   * - Ao criar ou aplicar um novo filtro (define como `true`).
   * - Ao remover todos os filtros ou redefinir o estado (define como `false`).
   *
   * Por que é usada:
   * - Para manter a comunicação reativa entre componentes que dependem do estado de filtragem.
   * - Garante que o status de “filtro ativo” seja propagado de forma centralizada e consistente.
   *
   * Parâmetros:
   * - value: boolean — valor que indica se o filtro está ativo (`true`) ou inativo (`false`).
   *
   * Variáveis e dependências internas:
   * - this.filter_active: BehaviorSubject<boolean> — stream reativa que armazena e emite o estado atual do filtro.
   *   Quando `next()` é chamado, todos os componentes que estão inscritos em `currentFilterActive$`
   *   recebem automaticamente o novo valor.
   */
  setValueFilterActive(value: boolean) {
    // Emite o novo valor do estado de filtro ativo para todos os assinantes do observable
    this.filter_active.next(value);
  }

  /**
   * Descrição:
   * Esta função define o estado do botão de **remover filtros** dentro do serviço `FilterService`.
   * Ela é utilizada para habilitar ou desabilitar o botão de exclusão de filtros na tela do componente **computers**,
   * permitindo que a interface reaja ao estado atual dos filtros de forma centralizada.
   *
   * Quando é usada:
   * - Ao aplicar ou criar filtros (habilita o botão de remoção, `true`).
   * - Ao remover todos os filtros ou redefinir o estado (desabilita o botão de remoção, `false`).
   *
   * Por que é usada:
   * - Para manter a comunicação reativa entre componentes que dependem do estado do botão de remoção de filtros.
   * - Garante que a interface reflita corretamente se a ação de remoção de filtros está disponível.
   *
   * Parâmetros:
   * - value: boolean — indica se o botão de remoção de filtros deve estar ativo (`true`) ou desativado (`false`).
   *
   * Variáveis e dependências internas:
   * - this.delete_filter_active: BehaviorSubject<boolean> — stream reativa que armazena e emite o estado do botão de remoção de filtros.
   *   Quando `next()` é chamado, todos os componentes assinantes de `currentDeleteFilterActive$` recebem automaticamente o novo valor.
   */
  setValueFilterRemove(value: boolean) {
    // Emite o novo valor do estado do botão de remover filtros para todos os assinantes do observable
    this.delete_filter_active.next(value);
  }

  /**
   * Descrição:
   * Esta função é responsável por **resetar todas as variáveis compartilhadas** dentro do serviço `FilterService`.
   * Ela é utilizada quando os filtros precisam ser totalmente limpos ou redefinidos, garantindo que todos os componentes
   * que consomem essas variáveis recebam os valores padrão fornecidos.
   *
   * Quando é usada:
   * - Ao deletar todos os filtros na tela de filtros.
   * - Ao redefinir o estado global de filtros, sincronizando todas as variáveis compartilhadas com valores iniciais.
   *
   * Por que é usada:
   * - Para centralizar a lógica de reset dos filtros e assegurar consistência entre os estados locais dos componentes
   *   e as variáveis reativas do serviço.
   * - Garante que os componentes assinantes dos observables correspondentes atualizem suas interfaces automaticamente.
   *
   * Parâmetros:
   * - value_string: string — valor que será atribuído ao campo de texto compartilhado (`field_text_shared`).
   * - value_array: unknown[] — array que será atribuído às opções de filtro compartilhadas (`options_filter_shared`).
   * - value_boolean: boolean — valor booleano que será aplicado nos estados de exibição/carregamento de filtros:
   *     - `filter_option_content_load_shared`
   *     - `filter_option_content_shared`
   *     - `filter_select_option_shared`
   * - value_array_Item: FilterItem[] — array de filtros que será atribuído ao `filter_array_shared`.
   *
   * Variáveis e dependências internas:
   * - this.field_text_shared: BehaviorSubject<string> — stream que armazena o texto do filtro compartilhado.
   * - this.options_filter_shared: BehaviorSubject<unknown[]> — stream que armazena as opções de filtro compartilhadas.
   * - this.filter_option_content_load_shared: BehaviorSubject<boolean> — stream que indica se o carregamento de opções de conteúdo está ativo.
   * - this.filter_option_content_shared: BehaviorSubject<boolean> — stream que indica se as opções de conteúdo devem ser exibidas.
   * - this.filter_select_option_shared: BehaviorSubject<boolean> — stream que controla a exibição do seletor de opções.
   * - this.filter_array_shared: BehaviorSubject<FilterItem[]> — stream que armazena o array de filtros compartilhado.
   */
  setResetInDeleteFilter(
    value_string: string,
    value_array: unknown[],
    value_boolean: boolean,
    value_array_Item: FilterItem[]
  ) {
    // Atualiza o valor compartilhado do campo de texto do filtro
    this.field_text_shared.next(value_string);

    // Atualiza o array de opções de filtro compartilhadas
    this.options_filter_shared.next(value_array);

    // Atualiza o estado de carregamento das opções de conteúdo
    this.filter_option_content_load_shared.next(value_boolean);

    // Atualiza o estado de exibição das opções de conteúdo
    this.filter_option_content_shared.next(value_boolean);

    // Atualiza a exibição do seletor de opções de filtro
    this.filter_select_option_shared.next(value_boolean);

    // Atualiza o array de filtros compartilhado
    this.filter_array_shared.next(value_array_Item);
  }

  setToken(valueToken: string) {
    this.token_shared.next(valueToken);
  }

  setDataMachines(value: object[]) {
    this.data_machines_shared.next(value);
  }

  deleteFilterForButton(
    element_class: string,
    value_selec: string,
    element_class_2: string
  ): void {
    // Obtém o primeiro select pelo ID e redefine seu valor para o padrão
    const select = document.getElementById(
      `${element_class}`
    ) as HTMLSelectElement;
    select.value = value_selec;

    // Obtém o segundo select pelo ID e redefine seu valor para o padrão
    const select_2 = document.getElementById(
      `${element_class_2}`
    ) as HTMLSelectElement;
    select_2.value = value_selec;

    // Seleciona todos os botões de remoção de filtros presentes na tela
    const buttons = document.querySelectorAll("#set_filter .btn-remove-filter");

    // Simula o clique em cada botão para remover os filtros visualmente da interface
    buttons.forEach((btn) => {
      (btn as HTMLButtonElement).click();
    });
  }

  setValueToReloadData(reset: boolean) {
    this.reset_shared.next(reset);
  }
}
