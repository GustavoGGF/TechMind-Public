import { CommonModule } from "@angular/common";
import { Component } from "@angular/core";
import { FilterService } from "../../filter.service";

@Component({
  selector: "app-filter-buton",
  standalone: true,
  imports: [CommonModule],
  templateUrl: "./filter-buton.component.html",
  styleUrl: "./filter-buton.component.css",
})
export class FilterButonComponent {
  create_filter: string = "/static/assets/images/filtro.png";
  delete_filter: string = "/static/assets/images/delete.png";

  delete_filter_active: boolean = false;

  constructor(private filterService: FilterService) {}

  /**
   * Descrição:
   * Este método do ciclo de vida do Angular (`ngOnInit`) é executado automaticamente quando o componente é inicializado.
   * Sua função é observar (via subscription) uma variável reativa (`currentDeleteFilterActive$`) proveniente do serviço `FilterService`.
   * Sempre que o valor dessa variável for alterado, a função atualiza a variável local `delete_filter_active` do componente.
   *
   * Quando é usada:
   * - É executada no momento em que o componente é carregado na tela.
   * - Mantém o estado local do componente sincronizado com o estado global (gerenciado pelo serviço de filtros).
   *
   * Por que é usada:
   * - Para garantir que o componente saiba em tempo real se a ação de "deletar filtros" está ativa em outro ponto da aplicação,
   *   refletindo mudanças de estado compartilhadas pelo serviço `FilterService`.
   * - Essa abordagem é útil em cenários onde múltiplos componentes dependem do mesmo estado de controle (como a remoção global de filtros).
   *
   * Parâmetros:
   * - Nenhum parâmetro é recebido diretamente; o método é parte do ciclo de vida do componente.
   *
   * Variáveis internas e externas utilizadas:
   * - this.filterService: FilterService — serviço responsável por gerenciar o estado de filtros na aplicação.
   * - this.filterService.currentDeleteFilterActive$: Observable<boolean> — stream observável que emite o estado atual da ativação do botão "deletar filtros".
   * - active: boolean — valor emitido pelo observable, indicando se a ação de deletar filtros está ativa.
   * - this.delete_filter_active: boolean — variável local que reflete o valor atual recebido do observable.
   */
  ngOnInit(): void {
    // Realiza a inscrição (subscription) no observable que indica se a exclusão de filtros está ativa
    this.filterService.currentDeleteFilterActive$.subscribe(
      (active: boolean) => {
        // Atualiza a variável local com o valor emitido pelo serviço
        this.delete_filter_active = active;
      }
    );
  }

  /**
   * Descrição:
   * Esta função é responsável por atualizar o estado global de filtros no serviço `FilterService`,
   * informando que um filtro foi criado ou está ativo.
   * É usada em momentos onde o usuário aplica, confirma ou inicia um processo de filtragem,
   * sinalizando para outros componentes da aplicação que há um filtro ativo.
   *
   * Quando é usada:
   * - Ao criar um novo filtro ou confirmar a seleção de critérios de filtragem.
   * - Pode ser acionada por eventos de interface (como clique em "Aplicar filtro").
   *
   * Por que é usada:
   * - Para manter o estado de filtragem sincronizado entre diferentes componentes,
   *   permitindo que o serviço `FilterService` propague essa informação reativamente.
   * - Isso facilita a comunicação entre componentes sem a necessidade de passagem direta de dados por inputs ou outputs.
   *
   * Parâmetros:
   * - Nenhum parâmetro é recebido diretamente; a função apenas atualiza o estado no serviço.
   *
   * Variáveis e dependências:
   * - this.filterService: FilterService — serviço responsável por gerenciar e compartilhar o estado dos filtros na aplicação.
   * - setValueFilterActive(value: boolean): void — método do serviço utilizado para definir se há filtros ativos.
   *   Neste caso, é chamado com o valor `true`, indicando que os filtros foram criados/ativados.
   */
  createFilter(): void {
    // Atualiza o serviço para indicar que há filtros ativos
    this.filterService.setValueFilterActive(true); // envia valor
  }

  /**
   * Descrição:
   * Esta função é responsável por aplicar a exclusão completa dos filtros ativos a partir do botão
   * "Remover filtro" localizado na tela de **computers**.
   * O processo executado por ela envolve três etapas principais:
   * 1. Resetar todas as variáveis e estados relacionados aos filtros dentro do serviço `FilterService`.
   * 2. Atualizar o estado de controle do botão de exclusão de filtros, desativando-o após a remoção.
   * 3. Remover visualmente, na interface, todas as opções e campos de filtros renderizados.
   *
   * Quando é usada:
   * - Ao clicar no botão "Remover filtro" na tela de listagem de computadores.
   * - Quando se deseja limpar completamente os filtros aplicados e restaurar o estado inicial.
   *
   * Por que é usada:
   * - Para garantir que tanto o estado interno (no serviço) quanto a interface visual sejam
   *   sincronizados após a remoção dos filtros.
   * - Evita inconsistências entre os dados de filtro armazenados e os elementos exibidos na tela.
   *
   * Parâmetros:
   * - Nenhum parâmetro é recebido diretamente pela função.
   *
   * Variáveis e dependências:
   * - this.filterService: FilterService — serviço responsável por gerenciar o estado global dos filtros.
   * - setResetInDeleteFilter(field_text: string, options: any[], optionContent: boolean, filterArray: any[]): void
   *   → Método que redefine o estado dos filtros no serviço, limpando todos os valores associados.
   * - setValueFilterRemove(active: boolean): void
   *   → Método que define o estado da funcionalidade de remoção de filtros; recebe `false` para indicar que a remoção foi concluída.
   * - this.deleteFilter.deleteFilterForButton(selectId: string, defaultValue: string, typeSelectId: string): void
   *   → Método auxiliar que limpa visualmente os filtros da interface, resetando os elementos de seleção e suas opções.
   */
  callDeleteFilter() {
    // 3️⃣ Remove visualmente as opções de filtros renderizadas na interface
    this.filterService.deleteFilterForButton(
      "select-cat", // ID do select principal de categoria
      "first", // Valor padrão para redefinir o select
      "select-type" // ID do select de tipo que também será resetado
    );

    // 1️⃣ Redefine todas as variáveis e estados relacionados aos filtros no serviço
    this.filterService.setResetInDeleteFilter("", [], false, []);

    // 2️⃣ Desativa a opção de "deletar filtro", já que a exclusão foi executada
    this.filterService.setValueFilterRemove(false);

    this.filterService.setValueToReloadData(true);
  }
}
