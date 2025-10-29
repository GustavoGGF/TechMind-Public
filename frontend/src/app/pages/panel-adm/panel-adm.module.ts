import { CUSTOM_ELEMENTS_SCHEMA, NgModule } from "@angular/core";
import { CommonModule } from "@angular/common";
import { UtilitiesModule } from "../../utilities/utilities.module";
import { PanelAdministrativeRoutingModule } from "./panel-adm-routing.module";
import { HttpClientModule } from "@angular/common/http";
import { SharedModule } from "../../shared/shared.module";
import { PanelAdmComponent } from "./panel-adm-pages/panel-adm.component";

@NgModule({
  declarations: [PanelAdmComponent],
  imports: [
    UtilitiesModule,
    CommonModule,
    HttpClientModule,
    SharedModule,
    PanelAdministrativeRoutingModule,
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class PanelAdministrativeModule {}
