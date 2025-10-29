import { CommonModule } from "@angular/common";
import { Component, EventEmitter, Output } from "@angular/core";

@Component({
  selector: "app-quantity-buttons",
  standalone: true,
  imports: [CommonModule],
  templateUrl: "./quantity-buttons.component.html",
  styleUrl: "./quantity-buttons.component.css",
})
export class QuantityButtonsComponent {
  @Output() filterChanged = new EventEmitter<string>();

  ten_quantity: string = "";
  fifty_quantity: string = "";
  one_hundred_quantity: string = "";
  all_quantity: string = "";

  /**
   * Descrição: Inicializa o componente definindo a quantidade padrão de itens a serem exibidos.
   *              Recupera o valor salvo no localStorage ou define o padrão "10".
   *              Emite o evento de alteração de filtro e atualiza classes de estilo para os botões de quantidade.
   *
   * Parâmetros: Nenhum
   *
   * Variáveis:
   * - quant: string, representa a quantidade selecionada, recuperada do localStorage ou definida como padrão.
   * - ten_quantity, fifty_quantity, one_hundred_quantity, all_quantity: string, armazenam classes CSS para indicar qual botão de quantidade está ativo.
   * - this.filterChanged: EventEmitter<string>, emite o valor da quantidade selecionada para o componente pai ou serviço.
   */
  ngOnInit(): void {
    // Recupera a quantidade selecionada no localStorage ou define "10" como padrão
    const quant = localStorage.getItem("quantity") ?? "10";

    // Salva a quantidade no localStorage para persistência
    localStorage.setItem("quantity", quant);

    // Emite evento para informar outros componentes sobre a quantidade selecionada
    this.filterChanged.emit(quant);

    // Atualiza a classe CSS para indicar qual botão de quantidade está ativo
    this.ten_quantity = quant === "10" ? "active_filter" : "";
    this.fifty_quantity = quant === "50" ? "active_filter" : "";
    this.one_hundred_quantity = quant === "100" ? "active_filter" : "";
    this.all_quantity = quant === "all" ? "active_filter" : "";
  }

  /**
   * Descrição: Atualiza a quantidade de itens a serem exibidos em uma tabela ou lista.
   *              Emite o evento de mudança de filtro, salva a seleção no localStorage
   *              e atualiza as classes CSS para indicar visualmente qual botão de quantidade está ativo.
   *
   * Parâmetros:
   * - quantity: string, valor da quantidade selecionada. Pode ser "10", "50", "100" ou "all".
   *             Valor padrão é "10".
   *
   * Variáveis:
   * - quantities: string[], array contendo todas as opções de quantidade possíveis.
   * - this.ten_quantity, this.fifty_quantity, this.one_hundred_quantity, this.all_quantity: string, armazenam classes CSS para indicar o botão ativo.
   * - this.filterChanged: EventEmitter<string>, emite o valor selecionado para outros componentes ou serviços.
   */
  getData(quantity: string = "10"): void {
    // Define todas as opções possíveis de quantidade
    const quantities = ["10", "50", "100", "all"];

    // Emite o valor da quantidade selecionada para componentes ou serviços ouvintes
    this.filterChanged.emit(quantity);

    // Salva a quantidade selecionada no localStorage para persistência
    localStorage.setItem("quantity", quantity);

    // Atualiza as classes CSS dos botões de quantidade, ativando apenas o botão correspondente
    [
      this.ten_quantity,
      this.fifty_quantity,
      this.one_hundred_quantity,
      this.all_quantity,
    ] = quantities.map((q) => (q === quantity ? "active_filter" : ""));
  }
}
