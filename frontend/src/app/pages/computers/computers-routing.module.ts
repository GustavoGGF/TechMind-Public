import { NgModule } from "@angular/core";
import { RouterModule, Routes } from "@angular/router";
import { ComputersComponent } from "./computers-page/computers.component";
import { ComputersDetailsComponent } from "./computers-details-page/computers-details.component";

const routes: Routes = [
  { path: "", component: ComputersComponent, title: "Dispositivos" },
  {
    path: ":mac",
    component: ComputersDetailsComponent,
    title: "Detalhes do Computador",
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class ComputersRoutingModule {}
