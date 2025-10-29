import { Component, OnInit, ViewChild } from "@angular/core";
import { HttpClient, HttpHeaders } from "@angular/common/http";
import { ApexYAxis, ChartComponent } from "ng-apexcharts";
import {
  ApexAxisChartSeries,
  ApexChart,
  ApexDataLabels,
  ApexStroke,
  ApexTitleSubtitle,
  ApexXAxis,
} from "ng-apexcharts";
import { catchError, tap, throwError } from "rxjs";

export type ChartOptions = {
  series: ApexAxisChartSeries;
  chart: ApexChart;
  yaxis: ApexYAxis;
  xaxis: ApexXAxis;
  stroke: ApexStroke;
  dataLabels: ApexDataLabels;
  title: ApexTitleSubtitle;
  labels: string[];
  subtitle: ApexTitleSubtitle;
};

@Component({
  selector: "app-chart-basic-area",
  templateUrl: "./chart-basic-area.component.html",
  styleUrls: ["./chart-basic-area.component.css"],
})
export class ChartBasicAreaComponent implements OnInit {
  @ViewChild("chart") chart!: ChartComponent;
  public chartOptions: ChartOptions;
  // Declarando varaiveis Dict
  dates: string[] = [];
  quantity: number[] = [];

  // Declarando varaiveis Boolean
  canViewChart: boolean = false;

  // Construtor monta o Chart Inicialmente
  constructor(private http: HttpClient) {
    this.chartOptions = {
      series: [
        {
          name: "",
          data: [],
        },
      ],
      chart: {
        height: 350,
        type: "area",
        zoom: {
          enabled: false,
        },
      },
      dataLabels: {
        enabled: false,
      },
      stroke: {
        curve: "straight",
      },
      title: {
        text: "",
        align: "left",
      },
      subtitle: {
        text: "",
        align: "left",
      },
      labels: [],
      xaxis: {
        type: "datetime",
      },
      yaxis: {
        opposite: true,
      },
    };
  }

  ngOnInit(): void {
    this.http
      .get<Array<{ date: string; count: number }>>(
        "/home/get-info-last-update",
        {
          headers: new HttpHeaders({
            Accept: "application/json",
          }),
        }
      )
      .pipe(
        tap((data) => {
          this.processData(data);
          this.setupChart();
        }),
        catchError((error) => {
          // this.status = error.status;
          // this.canViewChart = false;
          return throwError(error);
        })
      )
      .subscribe(() => {
        this.canViewChart = true;
      });
  }

  // Faz o processamento dos dados, segregando os nomes e quantidade
  private processData(data: { date: string; count: number }[]): void {
    const monthOrder = [
      "January",
      "February",
      "March",
      "April",
      "May",
      "June",
      "July",
      "August",
      "September",
      "October",
      "November",
      "December",
    ];

    data.sort((a, b) => {
      const [monthA, yearA] = a.date.split(" ");
      const [monthB, yearB] = b.date.split(" ");

      const dateA = new Date(parseInt(yearA), monthOrder.indexOf(monthA));
      const dateB = new Date(parseInt(yearB), monthOrder.indexOf(monthB));

      return dateA.getTime() - dateB.getTime(); // crescente (mais antigo → mais novo)
    });

    this.dates = data.map((item) => item.date);
    this.quantity = data.map((item) => item.count);
  }

  private setupChart(): void {
    this.chartOptions = {
      series: [
        {
          name: "Conectaram na Aplicação",
          data: this.quantity,
        },
      ],
      chart: {
        height: 500,
        type: "area",
        zoom: {
          enabled: false,
        },
      },
      dataLabels: {
        enabled: false,
      },
      stroke: {
        curve: "straight",
      },
      title: {
        text: "Conexões",
        align: "left",
      },
      subtitle: {
        text: "",
        align: "left",
      },
      labels: this.dates,
      xaxis: {
        type: "datetime",
      },
      yaxis: {
        opposite: true,
      },
    };
  }
}
