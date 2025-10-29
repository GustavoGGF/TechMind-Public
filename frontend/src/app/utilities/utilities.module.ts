import { CommonModule } from "@angular/common";
import { NgModule } from "@angular/core";
import { NgApexchartsModule } from "ng-apexcharts";
import { ChartTreemapComponent } from "./chart-treemap/chart-treemap.component";
import { LoadingSearchComponent } from "./loading-search/loading-search.component";
import { ChartBasicAreaComponent } from "./chart-spline-line/chart-basic-area.component";
import { LoadingPerfectApeComponent } from "./loading-perfect-ape/loading-perfect-ape.component";
import { MachineOverviewComponent } from "./machine-overview/machine-overview.component";
import { LoadingComponent } from "./loading/loading.component";

// Modulo que gerencia os utilitarios Disponibilizando eles onde o Modulo for importado
@NgModule({
  declarations: [
    ChartTreemapComponent,
    LoadingSearchComponent,
    ChartBasicAreaComponent,
    LoadingPerfectApeComponent,
    MachineOverviewComponent,
    LoadingComponent,
  ],
  imports: [CommonModule, NgApexchartsModule],
  providers: [],
  exports: [
    ChartTreemapComponent,
    LoadingSearchComponent,
    ChartBasicAreaComponent,
    LoadingPerfectApeComponent,
    MachineOverviewComponent,
    LoadingComponent,
  ],
})
export class UtilitiesModule {}
