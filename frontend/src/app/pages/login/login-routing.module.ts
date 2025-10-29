import { NgModule } from "@angular/core";
import { RouterModule, Routes } from "@angular/router";
import { LoginComponent } from "./login-page/login.component";

const routes: Routes = [
  { path: "", component: LoginComponent, title: "Login" },
  { path: "login", component: LoginComponent, title: "Login" },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class LoginRoutingModule {}
