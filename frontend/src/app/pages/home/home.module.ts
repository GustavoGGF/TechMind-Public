import { NgModule } from "@angular/core";
import { HomeComponent } from "./home-page/home.component";
import { CommonModule } from "@angular/common";
import { UtilitiesModule } from "../../utilities/utilities.module";
import { HomeRoutingModule } from "./home-routing.module";
import { HttpClientModule } from "@angular/common/http";
import { SharedModule } from "../../shared/shared.module";

@NgModule({
  declarations: [HomeComponent],
  imports: [
    CommonModule,
    SharedModule,
    UtilitiesModule,
    HomeRoutingModule,
    HttpClientModule,
  ],
})
export class HomeModule {}
