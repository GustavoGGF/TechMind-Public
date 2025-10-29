import { NgModule } from "@angular/core";
import { RouterModule, Routes } from "@angular/router";
import { PanelAdmComponent } from "./panel-adm-pages/panel-adm.component";

const routes: Routes = [
  { path: "", component: PanelAdmComponent, title: "Painel Administrativo" },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class PanelAdministrativeRoutingModule {}
