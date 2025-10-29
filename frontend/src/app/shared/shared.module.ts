import { CommonModule } from "@angular/common";
import { NgModule } from "@angular/core";
import { NgApexchartsModule } from "ng-apexcharts";
import { NavbarComponent } from "./components/navbar/navbar.component";
import { MessageComponent } from "./components/message/message.component";

// Modulo que gerencia os utilitarios Disponibilizando eles onde o Modulo for importado
@NgModule({
  declarations: [NavbarComponent, MessageComponent],
  imports: [CommonModule, NgApexchartsModule],
  providers: [],
  exports: [NavbarComponent, MessageComponent],
})
export class SharedModule {}
