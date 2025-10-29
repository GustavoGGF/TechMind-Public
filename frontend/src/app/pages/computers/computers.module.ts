import { NgModule } from "@angular/core";
import { CommonModule } from "@angular/common";
import { UtilitiesModule } from "../../utilities/utilities.module";
import { HttpClientModule } from "@angular/common/http";
import { ComputersComponent } from "./computers-page/computers.component";
import { ComputersRoutingModule } from "./computers-routing.module";
import { FormsModule } from "@angular/forms";
import { NgSelectModule } from "@ng-select/ng-select";
import { SharedModule } from "../../shared/shared.module";
import { ComputersDetailsComponent } from "./computers-details-page/computers-details.component";
import { QuantityButtonsComponent } from "./components/quantity-buttons/quantity-buttons.component";
import { FilterButonComponent } from "./components/filter-buton/filter-buton.component";
import { FilterWindowComponent } from "./components/filter-window/filter-window.component";
import { SystemReportComponent } from "./components/system-report/system-report.component";

@NgModule({
  declarations: [ComputersComponent, ComputersDetailsComponent],
  imports: [
    CommonModule,
    UtilitiesModule,
    SharedModule,
    ComputersRoutingModule,
    HttpClientModule,
    FormsModule,
    NgSelectModule,
    QuantityButtonsComponent,
    FilterButonComponent,
    FilterWindowComponent,
    SystemReportComponent,
  ],
})
export class ComputersModule {}
