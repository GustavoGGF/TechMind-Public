import { RouterModule, Routes } from "@angular/router";
import { NgModule } from "@angular/core";

export const routes: Routes = [
  {
    path: "",
    loadChildren: () =>
      import("./pages/login/login.module").then((m) => m.LoginModule),
  },
  {
    path: "login",
    loadChildren: () =>
      import("./pages/login/login.module").then((m) => m.LoginModule),
  },
  {
    path: "home",
    loadChildren: () =>
      import("./pages/home/home.module").then((m) => m.HomeModule),
  },
  {
    path: "home/computers",
    loadChildren: () =>
      import("./pages/computers/computers.module").then(
        (m) => m.ComputersModule
      ),
  },
  {
    path: "home/computers/:mac",
    loadChildren: () =>
      import("./pages/computers/computers.module").then(
        (m) => m.ComputersModule
      ),
  },
  {
    path: "home/devices",
    loadChildren: () =>
      import("./pages/devices/devices.module").then((m) => m.DevicesModule),
  },
  {
    path: "home/devices/:sn",
    loadChildren: () =>
      import("./pages/devices/devices.module").then((m) => m.DevicesModule),
  },
  {
    path: "home/panel-adm",
    loadChildren: () =>
      import("./pages/panel-adm/panel-adm.module").then(
        (m) => m.PanelAdministrativeModule
      ),
  },
];

NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule],
});
