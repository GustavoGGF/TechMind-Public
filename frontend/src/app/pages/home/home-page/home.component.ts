import { Component, OnInit } from "@angular/core";

@Component({
  selector: "app-home",
  templateUrl: "./home.component.html",
  styleUrl: "./home.component.css",
})
export class HomeComponent implements OnInit {
  // Declarando variavel any
  name: any;

  // Declarando variaveis string
  computers_class: string = "";
  device_class: string = "";
  errorType: string = "";
  home_class: string = "active";
  messageError: string = "";
  message: string = "";

  // Declarando variaveis boolean
  canView: boolean = false;
  showMessage: boolean = false;

  // Função inicia ao iniciar o componente
  ngOnInit() {
    // Pegando os dados do usuario
    this.name = localStorage.getItem("name");
    // Verificando se os dados existem
    if (this.name.length == 0 || this.name == null) {
      this.errorType = "Falta de Dados";
      this.messageError =
        "Ouve um erro ao acessar dados do LDAP, contatar a TI";
      this.showMessage = true;
    } else {
      this.canView = true;
      // chamando a função para obter os dados
      this.verifyColorPie();
    }
  }

  ngAfterViewInit() {}

  // Função para fechar a mensagem de erro
  hideMessage() {
    this.showMessage = false;
  }

  verifyColorPie() {
    const legendTextElements = document.getElementsByClassName(
      "apexcharts-legend-text"
    );

    Array.from(legendTextElements).forEach((element) => {
      // Verifica se o elemento é um HTMLElement
      if (element instanceof HTMLElement) {
        // Aplica a cor amarelo com !important
        element.style.setProperty("color", "yellow", "important");
      }
    });

    Array.from(legendTextElements).forEach((element) => {
      if (element instanceof HTMLElement) {
        // Obtém o estilo computado do elemento
        const color = window.getComputedStyle(element).color;

        if (color !== "rgb(255, 255, 0)") {
          this.verifyColorPie();
        } else {
        }
      }
    });
  }
}
