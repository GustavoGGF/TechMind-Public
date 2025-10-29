import { Component, OnInit, ViewChild } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import {
  ApexChart,
  ApexDataLabels,
  ApexLegend,
  ApexPlotOptions,
  ApexTitleSubtitle,
  ChartComponent,
} from "ng-apexcharts";
import { catchError, tap, throwError } from "rxjs";

export type TreemapChartOptions = {
  series: { data: { x: string; y: number }[] }[];
  chart: ApexChart;
  dataLabels: ApexDataLabels;
  title: ApexTitleSubtitle;
  plotOptions: ApexPlotOptions;
  legend: ApexLegend;
  colors: string[];
};

@Component({
  selector: "app-chart-treemap",
  templateUrl: "./chart-treemap.component.html",
  styleUrls: ["./chart-treemap.component.css"],
})
export class ChartTreemapComponent implements OnInit {
  @ViewChild("chart") chart!: ChartComponent;
  public chartOptions: TreemapChartOptions;

  canViewChart: boolean = false;
  chartData: { x: string; y: number }[] = [];

  constructor(private http: HttpClient) {
    this.chartOptions = {
      chart: {
        type: "treemap",
        width: "40px",
      },
      series: [{ data: [] }],
      legend: {
        show: false,
      },
      title: {
        text: "Distibuted Treemap (different color for each cell)",
        align: "center",
      },
      dataLabels: {
        enabled: true,
        style: {
          fontSize: "100px",
          fontWeight: "bold",
          colors: ["#000"],
        },
      },
      colors: [
        "#3B93A5",
        "#F7B844",
        "#ADD8C7",
        "#EC3C65",
        "#1ce5f3ff",
        "#C1F666",
        "#D43F97",
        "#1E5D8C",
        "#421243",
        "#1c2e07ff",
        "#EF6537",
        "#4d0ca8ff",
      ],
      plotOptions: {
        treemap: {
          distributed: true,
          enableShades: false,
        },
      },
    };
  }

  ngOnInit(): void {
    this.http
      .get<Array<{ system_name: string; count: number }>>(
        "/home/get-info-SO",
        {}
      )
      .pipe(
        tap((data) => {
          this.processData(data);
          this.setupChart();
        }),
        catchError((error) => {
          this.canViewChart = false;
          return throwError(error);
        })
      )
      .subscribe(() => {
        this.canViewChart = true;
      });
  }

  private processData(data: { system_name: string; count: number }[]) {
    this.chartData = data.map((item) => ({
      x: item.system_name,
      y: item.count,
    }));
  }

  private setupChart(): void {
    this.chartOptions = {
      chart: {
        type: "treemap",
        height: 600,
      },
      series: [
        {
          data: this.chartData,
        },
      ],
      dataLabels: {
        textAnchor: "middle",
        enabled: true,
        style: {
          fontSize: "30px",
          fontWeight: "bold",
          colors: ["#000"],
        },
      },
      legend: {
        show: false,
      },
      title: {
        text: "Sistemas Operacionais",
        align: "center",
      },
      colors: [
        "#3B93A5",
        "#F7B844",
        "#ADD8C7",
        "#EC3C65",
        "#1ce5f3ff",
        "#C1F666",
        "#D43F97",
        "#1E5D8C",
        "#421243",
        "#1c2e07ff",
        "#EF6537",
        "#4d0ca8ff",
      ],
      plotOptions: {
        treemap: {
          distributed: true,
          enableShades: false,
        },
      },
    };
  }
}
