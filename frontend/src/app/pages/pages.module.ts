import { NgModule } from "@angular/core";
import { CommonModule } from "@angular/common";
import { UtilitiesModule } from "../utilities/utilities.module";
import { HomeModule } from "./home/home.module";
import { ComputersModule } from "./computers/computers.module";
import { DevicesModule } from "./devices/devices.module";
import { LoginModule } from "./login/login.module";
import { PanelAdministrativeModule } from "./panel-adm/panel-adm.module";

@NgModule({
  declarations: [],
  imports: [
    CommonModule,
    LoginModule,
    HomeModule,
    UtilitiesModule,
    ComputersModule,
    DevicesModule,
    PanelAdministrativeModule,
  ],
  providers: [],
})
export class PagesModule {}
