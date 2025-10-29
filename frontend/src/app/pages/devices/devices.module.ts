import { NgModule } from "@angular/core";
import { CommonModule } from "@angular/common";
import { UtilitiesModule } from "../../utilities/utilities.module";
import { HttpClientModule } from "@angular/common/http";
import { SharedModule } from "../../shared/shared.module";
import { DevicesComponent } from "./devices-page/devices.component";
import { DevicesDetailsComponent } from "./devices-details-page/devices-details.component";
import { DevicesRoutingModule } from "./devices-routing.module";

@NgModule({
  declarations: [DevicesComponent, DevicesDetailsComponent],
  imports: [
    UtilitiesModule,
    CommonModule,
    HttpClientModule,
    SharedModule,
    DevicesRoutingModule,
  ],
})
export class DevicesModule {}
