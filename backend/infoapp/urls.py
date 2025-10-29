from django.urls import path
from . import views

urlpatterns = [
    path("", views.home, name="central-home"),
    path("get-info-main-panel/<str:panel>", views.getInfo_main_panel, name="Get-Info-Main-Panel"),
    # URL para pegar os sistemas operacionais para o gráfico
    path("get-info-SO", views.getInfo_so_chart, name="central-get-info-so-chart"),
    # URL para pegar as entradas dos computadores
    path(
        "get-info-last-update",
        views.getInfo_last_update,
        name="central-get-info-last-update",
    ),
    path("computers/", views.computers, name="central-computers"),
    # Função da url /computers que solicita dados dos computadores conforme quantidade solicitada
    path(
        "computers/get-data/<str:quantity>",
        views.get_data_computers,
        name="central-get-data-computers",
    ),
    path("computers/post-machines", views.post_machines, name="central-post-machines"),
    path(
        "computers/<str:mac_address>",
        views.post_machines_with_mac,
        name="central-post-machines",
    ),
    path(
        "computers/info-machine/<str:mac_address>",
        views.info_machine,
        name="central-post-machines",
    ),
    path(
        "devices/",
        views.devices,
        name="central-devices",
    ),
    path(
        "devices/post-devices",
        views.devices_post,
        name="central-devices",
    ),
    path(
        "devices/get-devices/<str:quantity>",
        views.devices_get,
        name="central-devices-get",
    ),
    path(
        "devices/<str:sn>",
        views.devices_details,
        name="central-devices-details",
    ),
    path(
        "devices/info-device/<str:sn>",
        views.info_device,
        name="central-info-device",
    ),
    path("devices/get-last-machines", views.last_machines, name="central-last-machines"),
    path("computers/added-device", views.added_devices, name="central-added-device"),
    path(
        "computers/added-devices/<str:mac_address>",
        views.computers_devices,
        name="central-computers-device",
    ),
    # url de modificação da aba outros
    path(
        "computers/modify-others/<str:mac_address>",
        views.computers_modify,
        name="centra-computers-modify",
    ),
    # url que libera o token csrf
    path("get-token", views.get_new_token, name="central-get-token"),
    # URL que muda a quantidade de computadores conforme solicitação
    path(
        "computers/get-quantity/<str:quantity>",
        views.get_quantity,
        name="central-get-quantity",
    ),
    # URL que gera relatorio de DNS que visa mostrar ip identicos
    path("computers/report-dns", views.get_report_dns, name="central-get-report-dns"),
    # URL para gerar um relatorio com as maquinas em XLS
    path(
        "computers/get-report/xls/", views.get_report_xls, name="central-get-report-xls"
    ),
    path(
        "computers/get-image/<str:model>",
        views.get_image,
        name="central-get-image",
    ),
    path("panel-adm", views.panel_administrator, name="central-panel-administrator"),
    path("panel-adm/get-machines", views.panel_get_machines, name="central-get-machines"),
    path("panel-adm/contact-machine/<str:action>/<str:ip>", views.panel_administrator_contact_machine, name="central-panel-administrator-contat-machine"),
    path("panel-adm/receiving-messages/", views.receive_webhook_message, name="central-receiving-messages"),
    path("get-filter-result/", views.get_filter_result, name="centra-filter"),
    path("computers/filter-search/apply-filter", views.apply_filter, name="centra-apply-filter"),
]
