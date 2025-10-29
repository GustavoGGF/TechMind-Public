import { Component } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { Subscription } from "rxjs";

@Component({
  selector: "app-machine-overview",
  templateUrl: "./machine-overview.component.html",
  styleUrl: "./machine-overview.component.css",
})
export class MachineOverviewComponent {
  private wsSubscription?: Subscription;
  constructor(private http: HttpClient) {}

  // Variaveis number
  totalMachines: number = 0;
  totalWindows: number = 0;
  totalUnix: number = 0;
  active_directory: number = 0;

  status: any;

  messages: any[] = [];

  notDataWindows: boolean = true;
  notDataTotal: boolean = true;
  notDataUnix: boolean = true;
  notDataAd: boolean = true;

  ngOnInit() {
    this.startPolling();
  }

  ngOnDestroy() {
    // Evita vazamento de memória
    this.wsSubscription?.unsubscribe();
  }

  // Polling a cada 10 segundos (10000 ms)
  startPolling() {
    this.getData(); // Chamada inicial
    setInterval(() => {
      this.getData();
    }, 60000); // 10 segundos
  }

  // Função que os dados do dashboard
  getData() {
    this.http
      .get("/home/get-info-main-panel/windows", {})
      .subscribe((data: any) => {
        if (data) {
          this.totalWindows = data.windows;
          this.notDataWindows = false;
        }
      });
    this.http
      .get("/home/get-info-main-panel/total", {})
      .subscribe((data: any) => {
        if (data) {
          this.totalMachines = data.total;
          this.notDataTotal = false;
        }
      });
    this.http
      .get("/home/get-info-main-panel/unix", {})
      .subscribe((data: any) => {
        if (data) {
          this.totalUnix = data.unix;
          this.notDataUnix = false;
        }
      });
    this.http.get("/home/get-info-main-panel/ad", {}).subscribe((data: any) => {
      if (data) {
        this.active_directory = data.ad;
        this.notDataAd = false;
      }
    });
  }
}
