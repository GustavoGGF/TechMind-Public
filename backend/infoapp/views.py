from base64 import b64encode
from io import BytesIO
from dns.resolver import resolve
from json import loads, JSONDecodeError
from logging import getLogger
from mysql import connector
from pandas import DataFrame, ExcelWriter
from contextlib import contextmanager
from decouple import config
from django.contrib.auth.decorators import login_required
from django.db import transaction
from django.http import HttpRequest, JsonResponse, FileResponse
from django.middleware.csrf import get_token
from django_ratelimit.decorators import ratelimit
from django.shortcuts import render
from django.views.decorators.cache import never_cache
from django.views.decorators.csrf import csrf_exempt, requires_csrf_token
from django.views.decorators.http import require_POST, require_GET
from io import BytesIO
from ldap3 import ALL, Connection, Server, SUBTREE
from re import sub
from ast import literal_eval
from json import loads, dumps
from os import path
from channels.layers import get_channel_layer
from channels_redis.core import RedisChannelLayer
from asgiref.sync import async_to_sync
from socket import socket, AF_INET, SOCK_STREAM
from time import time
from hmac import new
from hashlib import sha256
from django.views.decorators.cache import cache_page

# Configuração básica de logging
logger = getLogger("techmind")


@contextmanager
def get_database_connection():
    """Context manager for managing database connections."""
    connection = None
    try:
        connection = connector.connect(
            host=config("DB_HOST"),
            database=config("DB_NAME"),
            user=config("DB_USER"),
            password=config("DB_PASSWORD"),
        )
        yield connection
    except connector.Error as err:
        logger.error(f"Database connection error: {err}")
        raise
    finally:
        if connection and connection.is_connected():
            connection.close()


# Create your views here.
@requires_csrf_token
@login_required(login_url="/login")
@require_GET
def home(request):
    return render(request, "index.html", {})

"""
Descrição: Retorna informações resumidas para o painel principal, contando máquinas conforme o sistema ou origem (Windows, Unix, Total ou Active Directory).

Parâmetros:
- request: HttpRequest, objeto que contém informações da requisição HTTP.
- panel: str, identifica qual painel será consultado. Valores válidos: "windows", "unix", "total", "ad".

Decorators:
- @require_GET: garante que a função só possa ser acessada via requisição GET.
- @cache_page(60): armazena a resposta em cache por 60 segundos para otimizar desempenho.
"""
@require_GET
@cache_page(60)
def getInfo_main_panel(request, panel):
    # Checar se o painel é um dos tipos suportados: "windows", "unix" ou "total"
    if panel in ["windows", "unix", "total"]:
        # Criar um dicionário mapeando cada painel para sua query SQL correspondente
        query_map = {
            "windows": "SELECT COUNT(*) FROM machines WHERE system_name LIKE '%windows%'",
            "unix": "SELECT COUNT(*) FROM machines WHERE system_name LIKE '%linux%' OR system_name LIKE '%freebsd%'",
            "total": "SELECT COUNT(mac_address) FROM machines",
        }

        # Abrir uma conexão com o banco de dados usando o context manager get_database_connection
        with get_database_connection() as connection:
            # Criar um cursor para executar a query
            cursor = connection.cursor()
            # Executar a query correspondente ao painel
            cursor.execute(query_map[panel])
            # Obter o resultado da contagem e retornar em JsonResponse
            return JsonResponse({panel: cursor.fetchone()[0]}, status=200, safe=True)

    # Caso o painel seja "ad" (Active Directory)
    if panel == "ad":
        try:
            # Configurar conexão com o servidor LDAP
            server = Server(config("SERVER1"), get_info=ALL)
            conn = Connection(
                server,
                user=f"nt-lupatech\\{config('ACCOUNT_MCH_SR')}",
                password=config("ACCOUNT_MCH_WD"),
                auto_bind=True,
                read_only=True,
            )

            # Realizar busca de objetos do tipo "computer" no LDAP
            conn.search(
                search_base=config("LDAP_BASE"),
                search_filter="(objectClass=computer)",
                attributes=["dnsHostName"],
                search_scope=SUBTREE,
                types_only=False,
            )

            # Contar quantos computadores possuem dnsHostName definido e retornar em JsonResponse
            return JsonResponse({"ad": sum(1 for e in conn.entries if getattr(e, "dnsHostName", None) and e.dnsHostName.value)}, status=200, safe=True)
        
        except connector.Error as e:
            # Registrar erro de consulta ao banco de dados ou LDAP no logger
            logger.error(f"Database query error: {e}")

@csrf_exempt
@require_GET
@login_required(login_url="/login")
def getInfo_so_chart(request):
    cursor = None
    query = ""
    results = None
    results_list = None
    try:
        with get_database_connection() as connection:
            cursor = connection.cursor()
            query = """SELECT distribution, COUNT(*) as count 
                       FROM machines 
                       GROUP BY distribution;"""
            cursor.execute(query)
            results = cursor.fetchall()

            # Converta os resultados para uma lista de dicionários
            results_list = [{"system_name": row[0], "count": row[1]} for row in results]

    except connector.Error as e:
        logger.error(f"Database query error: {e}")
        return JsonResponse({"error": "Erro ao consultar o banco de dados"}, status=500)
    except Exception as e:
        logger.error(f"Unexpected error: {e}")
        return JsonResponse({"error": "Erro inesperado"}, status=500)
    finally:
        if connection.is_connected():
            cursor.close()
            connection.close()

    return JsonResponse(results_list, status=200, safe=False)


@csrf_exempt
@require_GET
@login_required(login_url="/login")
def getInfo_last_update(request):
    cursor = None
    results = None
    results_list = None
    try:
        with get_database_connection() as connection:
            cursor = connection.cursor()
            query = """SELECT DISTINCT date_format(insertion_date, '%M %Y'), COUNT(*) AS computer_count
                        from machines
                        GROUP BY date_format(insertion_date, '%M %Y')
                        ORDER BY date_format(insertion_date, '%M %Y');"""
            cursor.execute(query)
            results = cursor.fetchall()

            # Converta os resultados para uma lista de dicionários
            results_list = [{"date": row[0], "count": row[1]} for row in results]

    except connector.Error as e:
        logger.error(f"Database query error: {e}")
        return JsonResponse({"error": "Erro ao consultar o banco de dados"}, status=500)

    except Exception as e:
        logger.error(f"Unexpected error: {e}")
        return JsonResponse({"error": "Erro inesperado"}, status=500)
    finally:
        if connection.is_connected():
            cursor.close()
            connection.close()

    return JsonResponse(results_list, status=200, safe=False)


@requires_csrf_token
@login_required(login_url="/login")
@require_GET
def computers(request):
    return render(request, "index.html", {})

"""
Descrição: Recupera informações de computadores da tabela 'machines' com base na quantidade
especificada pelo usuário e retorna os resultados em formato JSON. Também reverte o formato
do endereço MAC antes de enviar a resposta.

Parâmetros:
- request: HttpRequest, objeto que contém informações da requisição HTTP.
- quantity: str, quantidade de registros a serem retornados. Valores aceitos: "10", "50", "100", "all".

Decorators:
- @requires_csrf_token: garante que um token CSRF válido seja usado na requisição.
- @login_required(login_url="/login"): garante que apenas usuários autenticados possam acessar a função.
- @never_cache: evita que o resultado da view seja armazenado em cache pelo navegador ou proxies.
- @transaction.atomic: garante que todas as operações de banco de dados dentro da função ocorram de forma atômica.
- @require_GET: permite apenas requisições HTTP GET.
"""
@requires_csrf_token
@login_required(login_url="/login")
@never_cache
@transaction.atomic
@require_GET
def get_data_computers(request, quantity):
    # Inicializar a conexão e a query
    connection = None
    query = ""

    try:
        # Passo 1: Montar a query SQL de acordo com a quantidade solicitada
        if quantity == "10":
            query = "SELECT * FROM machines ORDER BY insertion_date DESC LIMIT 10"
        elif quantity == "50":
            query = "SELECT * FROM machines ORDER BY insertion_date DESC LIMIT 50"
        elif quantity == "100":
            query = "SELECT * FROM machines ORDER BY insertion_date DESC LIMIT 100"
        elif quantity == "all":
            query = "SELECT * FROM machines ORDER BY insertion_date DESC"

        # Passo 2: Executar a query no banco de dados
        with get_database_connection() as connection:
            cursor = connection.cursor()
            cursor.execute(query)

            # Passo 3: Obter os nomes das colunas retornadas
            columns = [col[0] for col in cursor.description]

            # Passo 4: Construir uma lista de dicionários com os resultados
            results = [dict(zip(columns, row)) for row in cursor.fetchall()]

        # Passo 5: Reverter o formato do endereço MAC em cada registro, se presente
        MAC_ADDRESS_FIELD = "mac_address"
        for row in results:
            if MAC_ADDRESS_FIELD in row:
                row[MAC_ADDRESS_FIELD] = revert_mac_address(row[MAC_ADDRESS_FIELD])

    except connector.Error as e:
        # Passo 6: Tratar erros específicos do banco de dados
        logger.error(f"Database query error: {e}")
        return JsonResponse({"error": "Erro ao consultar o banco de dados"}, status=500)

    except Exception as e:
        # Passo 7: Tratar erros inesperados
        logger.error(f"Unexpected error: {e}")
        return JsonResponse({"error": "Erro inesperado"}, status=500)

    finally:
        # Passo 8: Garantir que a conexão e o cursor sejam fechados corretamente
        if connection and connection.is_connected():
            cursor.close()
            connection.close()

    # Passo 9: Retornar os resultados como JSON
    return JsonResponse({"machines": results}, status=200, safe=True)



def normalize_mac_address(mac):
    return sub(r"[^0-9A-Fa-f]", "", mac).upper()


def revert_mac_address(normalized_mac):
    # Adiciona os separadores de volta ao endereço MAC normalizado
    return ":".join(normalized_mac[i : i + 2] for i in range(0, len(normalized_mac), 2))


def contains_backslash(s):
    return "\\" in s


# Função que recebe os dados do computador
@csrf_exempt
@require_POST
@transaction.atomic
@ratelimit(key="ip", rate="200/d", method="POST", block=True)
@never_cache
def post_machines(request):
    # Declarando varaiveis
    try:
        # Pegando os dados
        data = loads(request.body.decode("utf-8"))
        system = data.get("system")
        name = data.get("name")
        distribution = data.get("distribution")
        insertionDate = data.get("insertionDate")
        macAddress = data.get("macAddress")
        user = data.get("currentUser")

        # Validando o usuario
        if user != None:
            if contains_backslash(user):
                currentUser = user.split("\\")[-1]
            else:
                currentUser = user

        # Validando a versão do SO
        ver = data.get("platformVersion")
        if ver != None:
            version = ver.split(" ")[0]

        domain = data.get("domain")
        ip = data.get("ip")
        manufacturer = data.get("manufacturer")
        if len(manufacturer) > 20:
            logger.error("Manufacturer: ", manufacturer)
            logger.error("Lenv Manufacturer: ", len(manufacturer))
        model = data.get("model")
        serial_number = data.get("serialNumber")
        max_capacity_memory = data.get("maxCapacityMemory")
        number_of_slots = data.get("numberOfDevices")
        memories = data.get("memories")
        memories = str(memories)
        hard_disk_model = data.get("hardDiskModel")
        hard_disk_serial_number = data.get("hardDiskSerialNumber")
        hard_disk_user_capacity = data.get("hardDiskUserCapacity")
        hard_disk_sata_version = data.get("hardDiskSataVersion")
        cpu_architecture = data.get("cpuArchitecture")
        cpu_operation_mode = data.get("cpuOperationMode")
        cpu_vendor_id = data.get("cpuVendorID")
        cpu_model_name = data.get("cpuModelName")
        cpu_thread = data.get("cpuThread")
        cpu_core = data.get("cpuCore")
        cpu_max_mhz = data.get("cpuMaxMHz")
        cpu_min_mhz = data.get("cpuMinMHz")
        gpu_product = data.get("gpuProduct")
        gpu_vendor_id = data.get("gpuVendorID")
        gpu_bus_info = data.get("gpuBusInfo")
        gpu_logical_name = data.get("gpuLogicalName")
        gpu_clock = data.get("gpuClock")
        gpu_configuration = data.get("gpuConfiguration")
        audio_device_product = data.get("audioDeviceProduct")
        audio_device_model = data.get("audioDeviceModel")
        bios_version = data.get("biosVersion").strip()
        motherboard_manufacturer = data.get("motherboardManufacturer")
        motherboard_product_name = data.get("motherboardProductName")
        motherboard_version = data.get("motherboardVersion")
        motherboard_serial_name = data.get("motherbaoardSerialName")
        motherboard_asset_tag = data.get("motherboardAssetTag")
        # Ajustando a lista de softwares
        softwares_list = data.get("installedPackages")
        techmind_version = data.get("version")
        get_ports = data.get("ports")
        ports = ', '.join(map(str, get_ports))
        softwares = None
        try:
            if softwares_list != None:
                if (
                    distribution == "Windows 10"
                    or distribution == "Windows 8.1"
                    or distribution == "Windows Server 2012 R2"
                    or distribution == "Windows Server 2012"
                    or distribution == "Windows10"
                    or distribution == "Microsoft Windows 10 Pro"
                    or distribution == "Microsoft Windows 11 Pro"
                ):
                    softwares = str(softwares_list)
                else:
                    softwares = ",".join(str(soft) for soft in softwares_list)
        except TypeError as e:
            softwares = ""

        license = data.get("license")

        # Verificando a existencia do macAddress
        if macAddress == None:
            logger.error("Mac Address is required")
            return JsonResponse(
                {"error": "Mac Address is required"}, status=400, safe=False
            )
            
        logger.info("=========================================")
        logger.info(f"Uploading Machine: {name} IP: {ip}")
        logger.info("=========================================")
        # Conectando no banco de dados
        connection = connector.connect(
            host=config("DB_HOST"),
            database=config("DB_NAME"),
            user=config("DB_USER"),
            password=config("DB_PASSWORD"),
        )

        if connection.is_connected():
            cursor = connection.cursor()

        # Comando SQL para verificar se o endereço MAC existe na tabela
        select_query = "SELECT * FROM machines WHERE mac_address = %s"

        # Exectando a query
        cursor.execute(select_query, (normalize_mac_address(macAddress),))

        # Obtendo os resultados
        results = cursor.fetchall()

        try:
            if results:
                # Comando SQL para atualizar o nome do dispositivo
                update_query = """UPDATE machines SET name = %s, system_name = %s, 
                    distribution = %s, insertion_date = %s, logged_user = %s, version = %s , 
                    domain = %s, ip = %s, manufacturer= %s, model = %s,
                    serial_number = %s, max_capacity_memory = %s, number_of_slots = %s,  
                    hard_disk_model = %s, hard_disk_serial_number = %s, hard_disk_user_capacity = %s,
                    hard_disk_sata_version = %s, cpu_architecture = %s, cpu_operation_mode = %s,
                    cpu_vendor_id = %s, cpu_model_name = %s, cpu_thread = %s, cpu_core = %s,
                    cpu_max_mhz = %s, cpu_min_mhz = %s, gpu_product = %s, gpu_vendor_id = %s, 
                    gpu_bus_info = %s, gpu_logical_name = %s, gpu_clock = %s, gpu_configuration =%s ,
                    audio_device_product = %s, audio_device_model = %s, bios_version = %s, 
                    motherboard_manufacturer = %s, motherboard_product_name = %s,
                    motherboard_version = %s, motherboard_serial_name = %s,
                    motherboard_asset_tag = %s, softwares = %s, memories = %s, license = %s, techmind_version = %s,
                    ports = %s 
                    WHERE mac_address = %s"""

                cursor.execute(
                    update_query,
                    (
                        name,
                        system,
                        distribution,
                        insertionDate,
                        currentUser,
                        version,
                        domain,
                        ip,
                        manufacturer,
                        model,
                        serial_number,
                        max_capacity_memory,
                        number_of_slots,
                        hard_disk_model,
                        hard_disk_serial_number,
                        hard_disk_user_capacity,
                        hard_disk_sata_version,
                        cpu_architecture,
                        cpu_operation_mode,
                        cpu_vendor_id,
                        cpu_model_name,
                        cpu_thread,
                        cpu_core,
                        cpu_max_mhz,
                        cpu_min_mhz,
                        gpu_product,
                        gpu_vendor_id,
                        gpu_bus_info,
                        gpu_logical_name,
                        gpu_clock,
                        gpu_configuration,
                        audio_device_product,
                        audio_device_model,
                        bios_version,
                        motherboard_manufacturer,
                        motherboard_product_name,
                        motherboard_version,
                        motherboard_serial_name,
                        motherboard_asset_tag,
                        softwares,
                        memories,
                        license,
                        techmind_version,
                        ports,
                        (normalize_mac_address(macAddress)),
                    ),
                )

                # Confirmando a inserção
                connection.commit()

                # Fechando a conexão
                cursor.close()
                connection.close()

                return JsonResponse({}, status=200, safe=False)
            else:
                query = """INSERT INTO machines (mac_address, name, system_name, distribution, 
                    insertion_date, logged_user, version, domain, ip, manufacturer, model, serial_number,
                    max_capacity_memory, number_of_slots, hard_disk_model, hard_disk_serial_number, 
                    hard_disk_user_capacity, hard_disk_sata_version, cpu_architecture, cpu_operation_mode, 
                    cpu_vendor_id, cpu_model_name, cpu_thread, cpu_core, cpu_max_mhz, cpu_min_mhz, gpu_product, 
                    gpu_vendor_id, gpu_bus_info, gpu_logical_name, gpu_clock, gpu_configuration, audio_device_product, 
                    audio_device_model, bios_version, motherboard_manufacturer, motherboard_product_name, motherboard_version, 
                    motherboard_serial_name, motherboard_asset_tag, softwares, memories, license, techmind_version, ports) 
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s,
                    %s , %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s,
                    %s, %s, %s)"""

                cursor.execute(
                    query,
                    (
                        (normalize_mac_address(macAddress)),
                        name,
                        system,
                        distribution,
                        insertionDate,
                        currentUser,
                        version,
                        domain,
                        ip,
                        manufacturer,
                        model,
                        serial_number,
                        max_capacity_memory,
                        number_of_slots,
                        hard_disk_model,
                        hard_disk_serial_number,
                        hard_disk_user_capacity,
                        hard_disk_sata_version,
                        cpu_architecture,
                        cpu_operation_mode,
                        cpu_vendor_id,
                        cpu_model_name,
                        cpu_thread,
                        cpu_core,
                        cpu_max_mhz,
                        cpu_min_mhz,
                        gpu_product,
                        gpu_vendor_id,
                        gpu_bus_info,
                        gpu_logical_name,
                        gpu_clock,
                        gpu_configuration,
                        audio_device_product,
                        audio_device_model,
                        bios_version,
                        motherboard_manufacturer,
                        motherboard_product_name,
                        motherboard_version,
                        motherboard_serial_name,
                        motherboard_asset_tag,
                        softwares,
                        memories,
                        license,
                        techmind_version,
                        ports
                    ),
                )

                # Confirmando a inserção
                connection.commit()

                # Fechando a conexão
                cursor.close()
                connection.close()
        except Exception as e:
            logger.error(f"Erro ao autalizar os dados no banco de dados: {e}")

        finally:
            if connection.is_connected():
                cursor.close()
                connection.close()

        return JsonResponse({}, status=200, safe=False)

    except JSONDecodeError:
        logger.error("Erro ao decodificar JSON")
        return JsonResponse({"error": "Invalid JSON"}, status=400, safe=False)

    except connector.Error as err:
        logger.error(f"Erro ao inserir dados: {err}")
        return JsonResponse({"error": "Invalid MYSQL"}, status=400, safe=False)

    except Exception as e:
        logger.error(f"Error: {str(e)}")
        return JsonResponse({"error": str(e)}, status=400)


@require_GET
def post_machines_with_mac(request, mac_address):
    return render(request, "index.html", {})


@require_GET
@never_cache
@requires_csrf_token
@login_required(login_url="/login")
def info_machine(request, mac_address):
    connection = None
    cursor = None
    query = None
    try:
        with get_database_connection() as connection:
            cursor = connection.cursor()
            query = "SELECT * FROM machines WHERE mac_address = %s"
            # Normalizando o endereço MAC
            normalized_mac = normalize_mac_address(mac_address)
            cursor.execute(query, (normalized_mac,))
            results = cursor.fetchall()

        return JsonResponse({"data": results}, status=200, safe=True)
    except connector.Error as e:
        logger.error(f"Database query error: {e}")
        return JsonResponse({"error": "Erro ao consultar o banco de dados"}, status=500)

    except Exception as e:
        logger.error(f"Unexpected error: {e}")
        return JsonResponse({"error": "Erro inesperado"}, status=500)
    finally:
        if connection.is_connected():
            cursor.close()
            connection.close()


@require_GET
@requires_csrf_token
@login_required(login_url="/login")
def devices(request):
    return render(request, "index.html", {})


@login_required(login_url="/login")
@require_POST
@requires_csrf_token
def devices_post(request):
    data = None
    equipament = ""
    model = ""
    serial_number = ""
    imob = ""
    connection = None
    cursor = None
    try:
        data = loads(request.body)
        equipament = data.get("device")
        model = data.get("model")
        serial_number = data.get("serial_number")
        imob = data.get("imob")
        brand = data.get("brand")

        with get_database_connection() as connection:
            cursor = connection.cursor()
            query = """INSERT INTO devices (equipament, model, serial_number, imob, brand) 
                VALUES (%s, %s, %s, %s, %s)"""
            cursor.execute(
                query,
                (equipament, model, serial_number, imob, brand),
            )

        return JsonResponse({}, status=200, safe=True)

    except connector.Error as err:
        if err.errno == 1062:
            with get_database_connection() as connection:
                cursor = connection.cursor()
                query = """UPDATE devices SET equipament = %s, model = %s, 
                imob = %s, brand = %s WHERE serial_number = %s"""
                cursor.execute(
                    query,
                    (equipament, model, serial_number, imob, brand),
                )

            return JsonResponse({}, status=200, safe=False)
        else:
            logger.error(f"Erro ao inserir dados: {err}")
            return JsonResponse({"error": "Invalid MYSQL"}, status=400, safe=False)

    except Exception as e:
        logger.error(e)
        return JsonResponse({"error": "Invalid MYSQL"}, status=400, safe=False)

    finally:
        if connection.is_connected():
            cursor.close()
            connection.close()


# Função que pega os dispositivos em quantidade conforme solicitação
@require_GET
@requires_csrf_token
@login_required(login_url="/login")
def devices_get(request, quantity):
    # Declarando algumas variaveis
    connection = None
    cursor = None
    results = None
    query = None
    results = None
    try:
        # Verificando quantidade selecionada
        match quantity:
            case "10":
                query = "SELECT * FROM devices LIMIT 10;"
            case "50":
                query = "SELECT * FROM devices LIMIT 50;"
            case "100":
                query = "SELECT * FROM devices LIMIT 100;"
            case "all":
                query = "SELECT * FROM devices;"

        with get_database_connection() as connection:
            cursor = connection.cursor()
            cursor.execute(query)
            results = [list(row) for row in cursor.fetchall()]

        return JsonResponse({"devices": results}, status=200, safe=True)

    except connector.Error as e:
        logger.error(f"Database query error: {e}")
        return JsonResponse({"error": "Erro ao consultar o banco de dados"}, status=500)

    except Exception as e:
        logger.error(f"Unexpected error: {e}")
        return JsonResponse({"error": "Erro inesperado"}, status=500)
    finally:
        if connection.is_connected():
            cursor.close()
            connection.close()


@require_GET
@login_required(login_url="/login")
@requires_csrf_token
def devices_details(request, sn):
    return render(request, "index.html", {})


@require_GET
@login_required(login_url="/login")
@requires_csrf_token
def info_device(request, sn):
    connection = None
    cursor = None
    query = None
    try:
        with get_database_connection() as connection:
            cursor = connection.cursor()
            query = "SELECT * FROM devices WHERE serial_number = %s"
            # Normalizando o endereço MAC
            cursor.execute(query, (sn,))
            results = cursor.fetchall()

        return JsonResponse({"data": results}, status=200, safe=True)

    except connector.Error as e:
        logger.error(f"Database query error: {e}")
        return JsonResponse({"error": "Erro ao consultar o banco de dados"}, status=500)
    except Exception as e:
        logger.error(e)
        return JsonResponse({}, status=403, safe=True)
    finally:
        if connection.is_connected():
            cursor.close()
            connection.close()


@require_GET
@login_required(login_url="/login")
@requires_csrf_token
@never_cache
def last_machines(request):
    connection = None
    cursor = None
    query = None
    results = None
    try:
        with get_database_connection() as connection:
            cursor = connection.cursor()
            query = "SELECT * FROM machines ORDER BY insertion_date DESC"
            cursor.execute(query)
            results = [list(row) for row in cursor.fetchall()]

        # Presumindo que o índice da coluna mac_address é 0 (modifique conforme necessário)
        MAC_ADDRESS_INDEX = 0

        # Reverter o endereço MAC para cada item nos resultados
        for row in results:
            row[MAC_ADDRESS_INDEX] = revert_mac_address(row[MAC_ADDRESS_INDEX])

        return JsonResponse({"machines": results}, status=200, safe=True)

    except connector.Error as e:
        logger.error(f"Database query error: {e}")
        return JsonResponse({"error": "Erro ao consultar o banco de dados"}, status=500)

    except Exception as e:
        logger.error(f"Unexpected error: {e}")
        return JsonResponse({"error": "Erro inesperado"}, status=500)
    finally:
        if connection.is_connected():
            cursor.close()
            connection.close()


@require_GET
def added_devices(request):
    device = None
    data = None
    computer = None
    connection = None
    cursor = None
    try:
        data = loads(request.body)
        device = data.get("device")
        computer = data.get("computer")

        with get_database_connection() as connection:
            cursor = connection.cursor()
            query = "UPDATE devices SET linked_computer = %s WHERE serial_number = %s"
            cursor.execute(
                query,
                (
                    computer,
                    device,
                ),
            )

        return JsonResponse({}, status=200, safe=True)

    except connector.Error as err:
        logger.error(f"Erro ao inserir dados: {err}")
        return JsonResponse({"error": "Invalid MYSQL"}, status=400, safe=False)
    except Exception as e:
        logger.error(e)
        return JsonResponse({}, status=410, safe=True)
    finally:
        if connection.is_connected():
            cursor.close()
            connection.close()


@require_GET
@login_required(login_url="/login")
@requires_csrf_token
@never_cache
def computers_devices(request, mac_address):
    connection = None
    cursor = None
    query = None
    results = None
    mac = None
    try:
        with get_database_connection() as connection:
            cursor = connection.cursor()
            query = "SELECT * FROM devices WHERE linked_computer =%s LIMIT 10"
            mac = revert_mac_address(mac_address)
            cursor.execute(query, (mac,))
            results = [list(row) for row in cursor.fetchall()]

        return JsonResponse({"data": results}, status=200, safe=True)
    except connector.Error as e:
        logger.error(f"Database query error: {e}")
        return JsonResponse({"error": "Erro ao consultar o banco de dados"}, status=500)

    except Exception as e:
        logger.error(f"Unexpected error: {e}")
        return JsonResponse({"error": "Erro inesperado"}, status=500)
    finally:
        if connection.is_connected():
            cursor.close()
            connection.close()


# Função que salva os dados da aba outros
@requires_csrf_token
@require_POST
@transaction.atomic
@never_cache
def computers_modify(request, mac_address):
    # Pegando os dados json
    data = loads(request.body)
    imob = data.get("imob")
    location = data.get("location")
    note = data.get("note")
    alocate = data.get("alocate")
    new_imob = None
    new_location = None
    new_note = None
    new_alocate = None
    if len(imob) > 1:
        try:
            with get_database_connection() as connection:
                cursor = connection.cursor()
                query = "UPDATE machines SET imob = %s WHERE mac_address = %s"

                cursor.execute(query, (imob, mac_address))

                connection.commit()

        except connector.Error as e:
            logger.error(f"Database query error: {e}")
            return
        finally:
            if connection.is_connected():
                cursor.close()
                connection.close()

        try:
            with get_database_connection() as connection:
                cursor = connection.cursor()
                query = "select imob from machines where mac_address = %s"

                cursor.execute(query, (mac_address,))
                new_imob = cursor.fetchone()

        except connector.Error as e:
            logger.error(f"Database query error: {e}")
            return
        finally:
            if connection.is_connected():
                cursor.close()
                connection.close()

    if len(location) > 1:
        try:
            with get_database_connection() as connection:
                cursor = connection.cursor()
                query = "UPDATE machines SET location = %s WHERE mac_address = %s"

                cursor.execute(query, (location, mac_address))

                connection.commit()

        except connector.Error as e:
            logger.error(f"Database query error: {e}")
            return
        finally:
            if connection.is_connected():
                cursor.close()
                connection.close()

        try:
            with get_database_connection() as connection:
                cursor = connection.cursor()
                query = "select location from machines where mac_address = %s"

                cursor.execute(query, (mac_address,))
                new_location = cursor.fetchone()

        except connector.Error as e:
            logger.error(f"Database query error: {e}")
            return
        finally:
            if connection.is_connected():
                cursor.close()
                connection.close()

    if len(note) > 1:
        try:
            with get_database_connection() as connection:
                cursor = connection.cursor()
                query = "UPDATE machines SET note = %s WHERE mac_address = %s"

                cursor.execute(query, (note, mac_address))

                connection.commit()

        except connector.Error as e:
            logger.error(f"Database query error: {e}")
            return
        finally:
            if connection.is_connected():
                cursor.close()
                connection.close()

        try:
            with get_database_connection() as connection:
                cursor = connection.cursor()
                query = "select note from machines where mac_address = %s"

                cursor.execute(query, (mac_address,))
                new_note = cursor.fetchone()

        except connector.Error as e:
            logger.error(f"Database query error: {e}")
            return
        finally:
            if connection.is_connected():
                cursor.close()
                connection.close()
    if alocate:
        try:
            with get_database_connection() as connection:
                cursor = connection.cursor()
                query = "UPDATE machines SET alocate = 0 WHERE mac_address = %s"

                cursor.execute(query, (mac_address,))

                connection.commit()

        except connector.Error as e:
            logger.error(f"Database query error: {e}")
            return
        finally:
            if connection.is_connected():
                cursor.close()
                connection.close()

        try:
            with get_database_connection() as connection:
                cursor = connection.cursor()
                query = "select alocate from machines where mac_address = %s"

                cursor.execute(query, (mac_address,))
                new_alocate = cursor.fetchone()

        except connector.Error as e:
            logger.error(f"Database query error: {e}")
            return
        finally:
            if connection.is_connected():
                cursor.close()
                connection.close()

    return JsonResponse(
        {
            "imob": new_imob,
            "location": new_location,
            "note": new_note,
            "alocate": new_alocate,
        },
        status=200,
        safe=True,
    )


# Função que libera o token CSRF
@require_GET
def get_new_token(request):
    csrf = get_token(request)
    return JsonResponse({"token": csrf}, status=200, safe=True)


# Requer que esteja logado
@login_required(login_url="/login")
@require_GET
@never_cache
@requires_csrf_token
# Função que retorna as máquinas conforme quantidade solicitada
def get_quantity(request, quantity):
    # Inicia uma variavel e prepara a query conforme quantidade solicitada
    query = None
    match quantity:
        case "10":
            query = "SELECT * FROM machines ORDER BY insertion_date DESC LIMIT 10"
        case "50":
            query = "SELECT * FROM machines ORDER BY insertion_date DESC LIMIT 50"
        case "100":
            query = "SELECT * FROM machines ORDER BY insertion_date DESC LIMIT 100"
        case "all":
            query = "SELECT * FROM machines ORDER BY insertion_date DESC"

    # Iniciando demais varaiveis
    connection = None
    cursor = None
    results = None
    try:
        with get_database_connection() as connection:
            cursor = connection.cursor()
            cursor.execute(query, ())
            results = [list(row) for row in cursor.fetchall()]

        return JsonResponse({"machines": results}, status=200, safe=True)
    except connector.Error as e:
        logger.error(f"Database query error: {e}")
        return JsonResponse({"error": "Erro ao consultar o banco de dados"}, status=500)
    except Exception as e:
        logger.error(f"Unexpected error: {e}")
        return JsonResponse({"error": "Erro inesperado"}, status=500)
    finally:
        if connection.is_connected():
            cursor.close()
            connection.close()


"""
Descrição: Gera um relatório em Excel contendo todas as máquinas do Active Directory que compartilham o mesmo endereço IP, permitindo identificar duplicidade de IPs na rede.

Quando usada: Acionada quando o usuário solicita o relatório de DNS na interface, para verificar conflitos de IP entre computadores cadastrados no AD.

Por que é usada: Para detectar rapidamente máquinas com o mesmo IP, evitando problemas de conectividade e conflitos de rede, garantindo integridade e monitoramento da infraestrutura.

Parâmetros:
- request: HttpRequest, objeto que contém os dados da requisição HTTP GET, usado para autenticação e controle de cache.

Variáveis:
- server: Server, objeto que representa o servidor LDAP configurado.
- conn: Connection, conexão autenticada com o servidor LDAP para leitura dos dados.
- ip_to_hostnames: dict, mapeia cada endereço IP para uma lista de hostnames que o utilizam.
- entry: cada objeto retornado da pesquisa no LDAP, representando um computador.
- hostname: str, o valor do atributo dnsHostName de cada computador.
- data: list[dict], lista de dicionários contendo IPs com mais de um hostname associado, pronta para exportação.
- buffer: BytesIO, buffer em memória para gerar o arquivo Excel.
"""
@cache_page(60 * 3)
@login_required
@require_GET
@never_cache
def get_report_dns(request):
    try:
        # Cria objeto de servidor LDAP usando configuração
        server = Server(config("SERVER1"), get_info=ALL)

        # Estabelece conexão LDAP com usuário e senha, modo somente leitura
        conn = Connection(
            server,
            user=f"nt-lupatech\\{config('ACCOUNT_MCH_SR')}",
            password=config("ACCOUNT_MCH_WD"),
            auto_bind=True,
            read_only=True
        )

        # Realiza busca no LDAP para obter todos os computadores com atributo dnsHostName
        conn.search(
            search_base=config("LDAP_BASE"),
            search_filter="(objectClass=computer)",
            attributes=["dnsHostName"],
            search_scope=SUBTREE
        )

        # Dicionário para mapear IPs aos hostnames correspondentes
        ip_to_hostnames = {}

        # Itera sobre todas as entradas retornadas da pesquisa
        for entry in conn.entries:
            # Obtém o hostname do atributo dnsHostName, se existir
            hostname = getattr(entry, 'dnsHostName', None)
            if hostname:
                # Resolve hostname para um ou mais IPs usando função auxiliar
                for ip in get_ip_from_dns(hostname.value):
                    # Adiciona o hostname à lista de hostnames do respectivo IP
                    ip_to_hostnames.setdefault(ip, []).append(hostname.value)

        # Filtra apenas os IPs que possuem mais de um hostname associado
        data = [{"ip": ip, "hostnames": ", ".join(hosts)} for ip, hosts in ip_to_hostnames.items() if len(hosts) > 1]

        # Cria buffer em memória para gerar arquivo Excel
        buffer = BytesIO()
        with ExcelWriter(buffer, engine="openpyxl") as writer:
            # Converte os dados filtrados em DataFrame e escreve no Excel
            DataFrame(data).to_excel(writer, index=False)

        # Posiciona cursor no início do buffer para leitura
        buffer.seek(0)

        # Retorna o arquivo Excel codificado em base64 para o frontend
        return JsonResponse({"filename": "duplicated_ips.xlsx", "filedata": b64encode(buffer.read()).decode()}, status=200)

    except Exception as e:
        # Loga qualquer erro ocorrido e retorna resposta de falha
        logger.error(f"An error occurred: {e}")
        return JsonResponse({}, status=420)

"""
Descrição: Converte o nome de uma máquina (hostname) em seu(s) endereço(s) IP correspondente(s) usando consulta DNS.

Quando usada: Chamado dentro da função de geração de relatório DNS para obter os IPs das máquinas listadas no relatório.

Por que é usada: Para permitir que o relatório DNS contenha informações completas de rede, associando cada hostname ao seu(s) IP(s).

Parâmetros:
- hostname: str, o nome da máquina cujo endereço IP deve ser obtido.

Variáveis:
- r: resultado de cada registro DNS do tipo "A" retornado pela função resolve, contendo o endereço IP.
"""
def get_ip_from_dns(hostname):
    try:
        # Resolve o hostname para registros DNS do tipo "A" e retorna todos os endereços IP encontrados
        return [r.address for r in resolve(hostname, "A")]
    except:
        # Retorna lista vazia caso a resolução falhe (hostname não encontrado ou erro de rede)
        return []



"""
Descrição: Gera um relatório em Excel contendo os dados das máquinas selecionadas pelo usuário, permitindo que o frontend faça o download do arquivo.

Quando usada: Utilizada quando um usuário seleciona uma ou mais máquinas na interface e solicita um relatório detalhado em formato Excel.

Por que é usada: Para fornecer uma forma padronizada de exportar informações das máquinas, como hardware, sistema operacional e softwares instalados, de forma rápida e automatizada, sem necessidade de manipulação manual dos dados.

Parâmetros:
- request: HttpRequest, objeto que contém os dados da requisição HTTP POST, incluindo o corpo com os valores das máquinas selecionadas.

Variáveis:
- data: dict, dados extraídos do corpo da requisição.
- selected_values: str, string com os valores (MAC addresses) das máquinas selecionadas.
- selected_list: list[str], lista de MAC addresses normalizados.
- results: list, armazena os registros retornados do banco de dados para cada máquina selecionada.
- softwares_list: list, lista de softwares instalados em cada máquina, extraídos do banco.
- software_names_str: str, string contendo os nomes dos softwares instalados, separados por vírgula.
- df: DataFrame, estrutura de dados do pandas contendo os dados organizados para exportação.
- buffer: BytesIO, buffer em memória para gerar o arquivo Excel.
- encoded_file: str, conteúdo do arquivo Excel codificado em base64 para envio via JSON.
"""
@require_POST
@csrf_exempt
def get_report_xls(request):
    try:
        # Carrega os dados do corpo da requisição
        data = loads(request.body)

        # Obtém os valores das máquinas selecionadas
        selected_values = data.get("selectedValues")

        # Retorna falha caso nenhum valor seja fornecido
        if not selected_values:
            return JsonResponse({"status": "fail"}, status=312, safe=True)

        # Normaliza os MAC addresses das máquinas selecionadas
        selected_list = [normalize_mac_address(v) for v in selected_values.split(",")]

        # Lista para armazenar resultados do banco de dados
        results = []

        # Conecta ao banco de dados
        with get_database_connection() as conn:
            cursor = conn.cursor()
            # Itera sobre cada MAC address e busca informações correspondentes
            for mac in selected_list:
                cursor.execute("SELECT * FROM machines WHERE mac_address = %s;", (mac,))
                row = cursor.fetchone()
                # Adiciona a linha retornada à lista de resultados, se existir
                if row:
                    results.append(row)
            cursor.close()

        # Retorna falha caso nenhuma máquina seja encontrada no banco
        if not results:
            return JsonResponse({"status": "fail"}, status=312, safe=True)

        # Extrai a lista de softwares instalados da primeira máquina (assume mesma estrutura)
        softwares_list = [literal_eval(r[40]) for r in results]
        # Cria uma string com os nomes dos softwares instalados, separados por vírgula
        software_names_str = ", ".join(
            [s["name"] for s in softwares_list[0] if s.get("name")]
        )

        # Monta um DataFrame com os dados das máquinas para exportação
        df = DataFrame(
            {
                "HostName": [r[1] for r in results],
                "SO": [r[2] for r in results],
                "Distribuição": [r[3] for r in results],
                "Versão SO": [r[6] for r in results],
                "Marca": [r[9] for r in results],
                "Modelo": [r[10] for r in results],
                "SN": [r[11] for r in results],
                "HD Capacidade": [r[16] for r in results],
                "CPU Modelo": [r[22] for r in results],
                "CPU Fabricante": [r[21] for r in results],
                "GPU Modelo": [r[32] for r in results],
                "Programas Instalados": software_names_str,
            }
        )

        # Cria um buffer em memória para armazenar o arquivo Excel
        buffer = BytesIO()
        # Exporta o DataFrame para Excel dentro do buffer
        df.to_excel(buffer, index=False, sheet_name="Report")
        buffer.seek(0)

        # Codifica o arquivo Excel em base64 para envio via JSON
        encoded_file = b64encode(buffer.read()).decode("utf-8")

        # Retorna o arquivo codificado para o frontend
        return JsonResponse({"file_name": "report.xlsx", "file_content": encoded_file}, status=200, safe=True)

    except Exception as e:
        # Loga qualquer erro ocorrido e retorna falha
        logger.error(e)
        return JsonResponse({"status": "fail"}, status=312, safe=True)


def process_results(results):
    processed_data = []

    # Supondo que você queira processar os dados da primeira tupla de results
    if len(results) > 0:
        for i in range(len(results[0])):
            value = results[0][i]

            # Exemplo de tratamento: normalizar o endereço MAC se for o primeiro valor
            if i == 0:
                value = normalize_mac_address(value)

            # Adicionar o valor processado ao array
            processed_data.append(value)

    return processed_data


@require_GET
@csrf_exempt
def get_image(request, model):
    # Define o diretório correto para as imagens
    resultado = model.lower().replace(" ", "")
    base_dir = path.dirname(
        path.dirname(path.abspath(__file__))
    )  # Obtém o diretório base do projeto
    images_dir = path.join(
        base_dir, "static", "assets", "images", "models", f"{resultado}.png"
    )
    logger.error(images_dir)

    if path.isfile(images_dir):
        # Mudando para logger.info(), pois isso não é um erro
        logger.error(f"Arquivo encontrado: {images_dir}")
        return FileResponse(
            open(images_dir, "rb"), as_attachment=True, filename=f"{model}.png"
        )

    # Se o arquivo não for encontrado, retorna um erro
    logger.error(f"Arquivo não encontrado para o modelo: {model}")
    return JsonResponse({"error": "Arquivo não encontrado"}, status=404)

@login_required(login_url="/login")  # Garante que o usuário esteja autenticado; redireciona para /login se não estiver
@requires_csrf_token                 # Garante que o token CSRF esteja presente na requisição
@require_GET                         # Permite apenas requisições HTTP GET a esta view
def panel_administrator(request):
    """
    View responsável por renderizar a interface principal do painel administrativo.

    Requisitos:
    - O usuário deve estar autenticado. Caso contrário, será redirecionado para a página de login.
    - A requisição deve ser do tipo GET.
    - Um token CSRF válido deve estar presente na requisição.

    Esta view retorna a renderização do template "index.html", que representa a tela principal do painel administrativo.

    Parâmetros:
        request (HttpRequest): Objeto da requisição HTTP recebida pelo servidor.

    Retorna:
        HttpResponse: A resposta HTTP contendo o conteúdo renderizado do template "index.html".
    """
    return render(request, "index.html", {})

@login_required(login_url="/login")  # Requer autenticação do usuário
@require_GET                         # Permite apenas requisições HTTP GET
@never_cache                         # Impede cache da resposta no navegador ou servidor intermediário
def panel_get_machines(request):
    """
    View responsável por obter a lista de máquinas cadastradas no banco de dados
    e retornar os dados já tratados em formato JSON para consumo pelo frontend.

    A consulta retorna apenas os campos essenciais (nome, IP, usuário logado e data de inserção),
    que são formatados apropriadamente para exibição em uma tabela ou painel administrativo.

    A data de inserção (`insertion_date`) é convertida para o formato de string padrão "%Y-%m-%d %H:%M:%S".

    Requisitos:
    - O usuário deve estar autenticado.
    - A requisição deve ser do tipo GET.
    - A resposta nunca será armazenada em cache (para garantir dados sempre atualizados).

    Em caso de falha na consulta ao banco de dados, a função retorna um JSON com status de erro
    e registra o erro no log da aplicação.

    Parâmetros:
        request (HttpRequest): Objeto de requisição HTTP.

    Retorna:
        JsonResponse: Resposta JSON contendo a lista de máquinas ou uma mensagem de erro.
    """
    results = []
    try:
        with get_database_connection() as connection:
            cursor = connection.cursor()

            # Executa a query buscando apenas os campos necessários para o frontend
            query = "SELECT name, ip, logged_user, insertion_date, techmind_version FROM machines;"
            cursor.execute(query)
            result = cursor.fetchall()

            # Processa os resultados e formata para JSON amigável ao frontend
            for row in result:
                results.append({
                    "name": row[0],
                    "ip": row[1],
                    "logged_user": row[2],
                    "insertion_date": row[3].strftime("%Y-%m-%d %H:%M:%S"),
                    "version":row[4]
                })

            return JsonResponse({"machines": results}, status=200, safe=True)
    except connector.Error as e:
        # Em caso de erro na consulta, registra no log e retorna resposta com status customizado
        logger.error(f"Database query error for system: {e}")
        return JsonResponse({"status": "fail"}, safe=True, status=312)

    finally:
        if connection.is_connected():
            cursor.close()
            connection.close()

@login_required(login_url="/login")  # Exige autenticação para acessar a view
@require_GET                         # Aceita apenas requisições GET
def panel_administrator_contact_machine(request, action: str, ip: str):
    """
    View responsável por executar ações administrativas sobre uma máquina específica,
    com base no IP informado e na ação solicitada via rota.

    Atualmente, a ação `"force-update"` é suportada e aciona uma conexão com a máquina
    para forçar a atualização dos dados por meio de WebSocket ou protocolo definido.

    Requisitos:
    - O usuário deve estar autenticado.
    - A requisição deve ser feita por GET.
    - A resposta não pode ser armazenada em cache.

    Parâmetros:
        request (HttpRequest): Objeto da requisição HTTP.
        action (str): A ação administrativa a ser executada (ex: "force-update").
        ip (str): Endereço IP da máquina sobre a qual a ação será executada.

    Retorna:
        JsonResponse: Objeto JSON indicando o status da operação:
            - "ok" em caso de sucesso;
            - mensagem de erro específica se a conexão com a máquina falhar;
            - "fail" em caso de erro interno.
    """
    channel_layer = get_channel_layer()  # Camada de comunicação assíncrona via Django Channels
    
    try:
        if action == "force-update":
            # Tenta se conectar à máquina para forçar atualização
            conn_machine_info, error_message_conn = server_machine_connection(ip, 9090, channel_layer)

            # Retorna erro específico se a conexão falhar
            if not conn_machine_info:
                return JsonResponse({"status": f"{error_message_conn}"}, status=502, safe=True)

        # Retorna sucesso padrão (caso outras ações sejam implementadas futuramente)
        return JsonResponse({"status": "ok"}, status=200, safe=True)

    except Exception as e:
        # Captura exceções não tratadas, registra log e retorna erro genérico
        logger.error(e)
        return JsonResponse({"status": "fail"}, status=503, safe=True)
    
def server_machine_connection(host: str, port: int, channel: RedisChannelLayer):
    """
    Estabelece uma conexão TCP com uma máquina remota e envia um comando autenticado via HMAC.

    Esta função é utilizada para instruir uma máquina cliente a realizar uma ação,
    como atualizar seu software, através de um protocolo simples baseado em sockets TCP.
    Também envia mensagens de status para o frontend via WebSocket (Redis + Django Channels).

    Parâmetros:
        host (str): Endereço IP ou hostname da máquina de destino.
        port (int): Porta TCP utilizada para conexão.
        channel (RedisChannelLayer): Canal de comunicação com o frontend para envio de mensagens em tempo real.

    Retorna:
        tuple:
            - (bool): `True` se a conexão e envio ocorreram com sucesso, `False` em caso de falha.
            - (str or Exception): Mensagem de erro em caso de falha, string vazia em caso de sucesso.
    """
    try:
        # Gera o timestamp atual como string (em segundos desde epoch)
        timestamp = str(int(time()))
        
        # Define o comando que será enviado
        command = "update-software"
        
        # Gera assinatura HMAC para garantir integridade/autenticidade do comando
        assing = generate_hmac(command, timestamp)
        
        # Notifica via WebSocket que a conexão está sendo iniciada
        send_message_with_redis(channel, "Conectando na máquina", "cnmh")
        
        # Monta o payload em formato JSON
        payload = dumps({
            "command": command, 
            "timestamp": timestamp, 
            "hmac": assing
        }) + "\n"  # Finaliza com quebra de linha para delimitar o fim do pacote
        
        # Estabelece conexão TCP com a máquina
        with socket(AF_INET, SOCK_STREAM) as s:
            s.settimeout(10)  # Timeout de 10 segundos para a conexão
            s.connect((host, port))  # Conecta ao IP e porta definidos
            s.sendall(payload.encode())  # Envia o payload já convertido em bytes
            
            return True, ""  # Retorna sucesso
    except Exception as e:
        # Loga o erro e retorna falha com a exceção
        logger.error(f"Não foi possível realizar a conexão TCP: {e}")
        return False, e

def generate_hmac(command, timestamp):
    """
    Gera um código HMAC-SHA256 baseado em um comando e um timestamp.

    A chave secreta usada para gerar o HMAC é lida da variável de ambiente `MACHINE_KEY`,
    garantindo que apenas partes autorizadas (com a mesma chave) possam validar ou gerar os comandos.

    Parâmetros:
        command (str): Comando a ser autenticado (ex: "update-software").
        timestamp (str): Timestamp atual em formato string, usado para prevenir ataques de repetição.

    Retorna:
        str: Valor HMAC em hexadecimal, que representa a assinatura criptográfica da mensagem.
    """
    try:
        # Obtém a chave secreta da variável de ambiente e codifica como bytes
        key = config("MACHINE_KEY").encode()
        
        # Concatena o comando com o timestamp
        message = command + timestamp

        # Gera o HMAC usando SHA-256
        return new(key, message.encode(), sha256).hexdigest()
    
    except Exception as e:
        # Em caso de falha, registra o erro no log e retorna None
        logger.error(f"Erro ao gerar o HMAC: {e}")
        return None
    
@csrf_exempt
@require_POST
def receive_webhook_message(request: HttpRequest) -> JsonResponse:
    """
    View pública que recebe mensagens externas via POST e envia para o WebSocket interno do grupo 'monitoring'.
    
    Espera um JSON com as chaves:
        - message (str): conteúdo da mensagem
        - code (str): código identificador
        - status (int, opcional): código de status HTTP, padrão 200

    Retorna:
        JsonResponse indicando sucesso ou falha.
    """
    try:
        data = loads(request.body)

        message = data.get("message")
        code = data.get("code")

        if not message or not code:
            return JsonResponse({"error": "Campos 'message' e 'code' são obrigatórios."}, status=400)

        channel_layer = get_channel_layer()
        send_message_with_redis(channel_layer, message, code)

        return JsonResponse({"success": True})

    except Exception as e:
        logger.error(f"Erro ao processar mensagem recebida: {e} | Corpo: {request.body}")
        return JsonResponse({"error": "Erro interno ao processar a mensagem."}, status=500)

def send_message_with_redis(channel: RedisChannelLayer, message: str, code: str):
    """
    Envia uma mensagem WebSocket para o grupo 'monitoring' via Redis Channel Layer.

    Essa função encapsula o envio síncrono de mensagens para o frontend usando Django Channels.
    É utilizada para comunicação em tempo real, como logs, status de conexões, ou feedbacks visuais
    no painel administrativo.

    Parâmetros:
        channel (RedisChannelLayer): Instância da camada de canal Redis usada para comunicação.
        message (str): Texto da mensagem a ser exibida no frontend.
        code (str): Código identificador da mensagem, usado para controle ou agrupamento de mensagens.

    Exceções:
        Em caso de falha no envio, o erro é capturado e registrado no log com nível de aviso.
    """
    try:
        # Envia a mensagem para o grupo 'monitoring' usando um wrapper síncrono
        async_to_sync(channel.group_send)(
            "monitoring",  # Nome do grupo que receberá a mensagem
            {
                "type": "send_mensagem",  # Tipo do evento que será tratado no consumidor
                "message": message,       # Conteúdo textual da mensagem
                "code": code,             # Código auxiliar que pode ser interpretado no frontend
                "status": 200             # Status genérico de sucesso
            }
        )
    except Exception as e:
        # Loga qualquer falha de envio como aviso, sem interromper o fluxo da aplicação
        logger.warning(f"Falha ao enviar mensagem via WebSocket: {e}")

"""
Descrição: Recebe filtros do usuário via requisição POST, monta uma query SQL dinamicamente
e retorna os registros da tabela 'machines' que correspondem aos filtros aplicados.

Parâmetros:
- request: HttpRequest, objeto que contém informações da requisição HTTP e os filtros no corpo da requisição.

Decorators:
- @login_required(login_url="/login"): garante que apenas usuários autenticados possam acessar a função, redirecionando para /login se não estiver logado.
- @require_POST: garante que a view só aceite requisições POST.
"""
@login_required(login_url="/login")
@require_POST
def get_filter_result(request):
    # Passo 1: Decodificar o corpo da requisição JSON
    data = loads(request.body.decode("utf-8"))

    # Passo 2: Inicializar a query base e a lista de parâmetros para evitar SQL Injection
    query = "SELECT * FROM machines WHERE 1=1"
    params = []

    try:
        # Passo 3: Iterar sobre cada filtro enviado pelo usuário
        for f in data:
            field = f.get("category")  # Nome da coluna a ser filtrada
            op = f.get("operator")     # Operador do filtro (Contem, Igual, Começa, Termina)
            value = f.get("type")      # Valor do filtro

            # Passo 4: Montar a query dinamicamente de acordo com o operador
            if op == "Contem":
                query += f" AND {field} LIKE %s"
                params.append(f"%{value}%")
            elif op == "Igual":
                query += f" AND {field} = %s"
                params.append(value)
            elif op == "Começa":
                query += f" AND {field} LIKE %s"
                params.append(f"{value}%")
            elif op == "Termina":
                query += f" AND {field} LIKE %s"
                params.append(f"%{value}")

        # Passo 5: Executar a query no banco de dados
        with get_database_connection() as connection:
            cursor = connection.cursor()
            cursor.execute(query, params)

            # Passo 6: Obter os nomes das colunas retornadas
            columns = [col[0] for col in cursor.description]

            # Passo 7: Construir uma lista de dicionários com os resultados
            results = [dict(zip(columns, row)) for row in cursor.fetchall()]

    except Exception as e:
        # Passo 8: Registrar qualquer erro e retornar resposta HTTP de erro
        logger.warning(f"Falha ao fazer o filtro: {e}")
        return JsonResponse({f"Error: {e}"}, safe=True, status=400)

    # Passo 9: Retornar os resultados como JSON
    return JsonResponse(results, safe=False, status=200)

CATEGORY_MAP = {
    'MacAdress': 'mac_address',
    'Name': 'name',
    'Operating System': 'distribution',
    'Software': 'softwares',
}

@require_POST
def apply_filter(request) -> JsonResponse:
    data = loads(request.body)
    filters = sorted(data.get('filter', []), key=lambda x: x.get('id', 0))
    if not filters:
        return JsonResponse({'results': []}, status=200)

    query_parts, params = [], []
    for idx, f in enumerate(filters):
        category = CATEGORY_MAP.get(f.get('category'), f.get('category'))
        value = f.get('value', '')
        if not category or not value:
            continue

        condition = f"{category} LIKE %s" if f.get('type') == 'content' or category == 'softwares' else f"{category} = %s"
        params.append(f"%{value}%" if f.get('type') == 'content' or category == 'softwares' else value)
        query_parts.append(condition)

        operator = f.get('operator', '').upper()
        if operator in ('AND', 'OR') and idx < len(filters) - 1:
            query_parts.append(operator)

    query = f"SELECT * FROM machines WHERE {' '.join(query_parts)}" if query_parts else "SELECT * FROM machines"

    with get_database_connection() as connection:
        cursor = connection.cursor()
        cursor.execute(query, params)
        columns = [col[0] for col in cursor.description]
        results = [dict(zip(columns, row)) for row in cursor.fetchall()]

    # Extrair apenas nomes dos softwares
    for r in results:
        softwares = r.get('softwares')
        if isinstance(softwares, str):
            try:
                softwares = loads(softwares.replace("'", '"'))
            except Exception:
                softwares = []
        if isinstance(softwares, list):
            r['softwares'] = [s.get('name') for s in softwares if isinstance(s, dict) and s.get('name')]
        else:
            r['softwares'] = []

    return JsonResponse({'machines': results}, status=200)