import { NgModule } from "@angular/core";
import { RouterModule, Routes } from "@angular/router";
import { DevicesComponent } from "./devices-page/devices.component";
import { DevicesDetailsComponent } from "./devices-details-page/devices-details.component";

const routes: Routes = [
  { path: "", component: DevicesComponent, title: "DashBoard" },
  {
    path: ":sn",
    component: DevicesDetailsComponent,
    title: "Detalhes do Dispositivo",
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class DevicesRoutingModule {}
