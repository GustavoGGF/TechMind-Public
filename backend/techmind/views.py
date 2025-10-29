from pathlib import Path
from django.contrib.auth import login
from django.contrib.auth import logout
from django.contrib.auth.decorators import login_required
from django.contrib.auth.models import User
from django.http import JsonResponse, FileResponse
from django.views.decorators.csrf import csrf_exempt
from dotenv import load_dotenv
from ldap3 import ALL_ATTRIBUTES, SAFE_SYNC, Connection
from os import getenv, path
from json import loads, load, JSONDecodeError
from django.views.decorators.http import require_POST, require_GET
from logging import getLogger

logger = getLogger("techmind")

# Exige esta view do requerimento de proteção contra falsificação de requisições cross-site (CSRF) e  Permite apenas requisições POST nesta view.
@csrf_exempt
@require_POST
def credential(request):
    # Inicialização de variáveis para armazenar credenciais e conexões.
    username = None
    password = None
    data = None
    domain = None
    server = None
    conn = None
    base_ldap = None
    response = None

    try:
        # Carrega o corpo da requisição JSON e obtém o nome de usuário e senha fornecidos.
        data = loads(request.body)
        username = data.get("username")
        password = data.get("password")
        
        # Carrega variáveis de ambiente para obter informações de configuração.
        load_dotenv()

        # Obtém o nome do domínio do ambiente.
        domain = getenv("DOMAIN_NAME")

        # Obtém o servidor do Active Directory ou LDAP do ambiente.
        server = getenv("SERVER1")

        # Cria uma conexão segura com o servidor usando as credenciais fornecidas.
        conn = Connection(
            server,
            f"{domain}\\{username}",
            password,
            auto_bind=True,  # Vincula automaticamente a conexão após a criação.
            client_strategy=SAFE_SYNC,  # Define a estratégia de cliente segura e síncrona.
        )

        # Base LDAP usada para buscas.
        base_ldap = getenv("LDAP_BASE")

        # Se a conexão for bem-sucedida, executa uma busca no diretório LDAP.
        if conn.bind():
            conn.read_only = True  # Define a conexão como somente leitura.
            search_filter = f"(sAMAccountName={username})"  # Filtro de busca baseado no nome de usuário.
            ldap_base_dn = base_ldap
            response = conn.search(
                ldap_base_dn,  # DN base para a busca.
                search_filter,  # Filtro definido.
                attributes=ALL_ATTRIBUTES,  # Busca todos os atributos.
                search_scope="SUBTREE",  # Busca recursivamente em toda a árvore.
                types_only=False,  # Recupera os valores reais dos atributos.
            )

    except Exception as e:
        # Em caso de erro, imprime a exceção e retorna uma resposta JSON com status 401.
        logger.error(e)
        return JsonResponse({"status": "invalid access"}, status=401, safe=True)

    # Inicialização de variáveis para extrair informações do resultado da busca.
    extractor = None
    information = None
    name = None
    acess_user = None

    try:
        # Extrai a resposta da busca LDAP e acessa os atributos retornados.
        extractor = response[2][0]
        information = extractor.get("attributes")

        # Obtém a lista de grupos do usuário.
        groups = information.get("memberOf", [])

        # Obtém o nome de exibição, se disponível.
        if "displayName" in information:
            name = information["displayName"]

        # Nome do grupo de acesso permitido, definido no ambiente.
        acess_user = getenv("ACESS_USER")

        # Verifica se o usuário pertence ao grupo de acesso.
        for item in groups:
            if acess_user in item:
                acess = "User"
                break  # Interrompe o loop ao encontrar o grupo de acesso.

        if acess:
            # Cria ou recupera um usuário Django com o nome de usuário fornecido.
            user, created = User.objects.get_or_create(username=username)

            # Define o backend de autenticação para permitir o login manual.
            user.backend = "django.contrib.auth.backends.ModelBackend"

            if created:
                user.save()

            # Realiza o login do usuário.
            login(request, user)

        # Retorna uma resposta JSON com o nome do usuário.
        return JsonResponse({"name": name}, status=200, safe=True)

    except Exception as e:
        # Em caso de erro, imprime a exceção e retorna uma resposta JSON com status 401.
        logger.error(e)
        return JsonResponse({"status": "invalid access"}, status=401, safe=True)

# Função que realiza logout
# Requer que o usuário esteja autenticado para acessar esta view.
# Permite apenas requisições GET para esta view.
@login_required
@require_GET
def logout_func(request):
    try:
        # Executa o logout do usuário atual.
        logout(request)

        # Retorna uma resposta JSON vazia com status 200 (OK) indicando sucesso.
        return JsonResponse({}, status=200)

    except Exception as e:
        # Em caso de erro, imprime a exceção para depuração.
        logger.error(e)

# Define uma view que permite apenas requisições GET e desabilita a verificação de CSRF (Cross-Site Request Forgery)
@require_GET
@csrf_exempt
def donwload_files(request, file: str, version: str):
    try:
        # Define o diretório base onde os instaladores estão armazenados
        base_dir = "/node/TechMind/Installers"
        
        # Constrói o nome do arquivo de destino com base nos parâmetros recebidos
        target_filename = f"{file.lower()} {version.strip()}.exe"
        
        # Gera o caminho completo do arquivo a partir do diretório base e do nome do arquivo
        file_path = path.join(base_dir, target_filename)

        # Verifica se o arquivo existe no caminho especificado
        if path.exists(file_path):
            # Retorna o arquivo como resposta para download, com o nome definido
            return FileResponse(open(file_path, 'rb'), as_attachment=True, filename=target_filename)
        
        # Caso o arquivo não exista, registra um erro nos logs
        logger.error(f"Arquivo não encontrado: {file_path}")
        # Retorna uma resposta JSON vazia com status HTTP 404 (Não encontrado)
        return JsonResponse({}, status=404)
    
    # Captura quaisquer exceções inesperadas que ocorram durante o processo
    except Exception as e:
        # Registra o erro ocorrido nos logs para análise posterior
        logger.error(f"Erro ao obter o arquivo especificado: {e}")
        # Retorna uma resposta JSON vazia com status HTTP 404 (Não encontrado)
        return JsonResponse({}, status=404)


# View responsável por retornar as versões mais recentes dos programas "TechMind" e "Updater"
# para o sistema operacional (OS) especificado. Os dados são lidos a partir de um arquivo JSON
# localizado no diretório do projeto. Retorna as versões no formato JSON ou mensagens de erro
# apropriadas em caso de falha.
def get_current_version(request, os: str):
    # Define o caminho absoluto do arquivo 'version.json' a partir do diretório atual do script
    version_file = Path(__file__).resolve().parent.parent / 'version.json'

    try:
        # Tenta abrir e carregar o conteúdo do arquivo JSON
        with open(version_file, 'r', encoding='utf-8') as f:
            data = load(f)
    except FileNotFoundError:
        # Registra erro caso o arquivo não seja encontrado e retorna erro 500
        logger.error(f"Arquivo json não encontrado")
        return JsonResponse({"error": "Arquivo version.json não encontrado."}, status=500)
    except JSONDecodeError as e:
        # Registra erro em caso de falha na leitura do conteúdo JSON e retorna erro 500
        logger.error(f"Erro ao decodificar o JSON: {e}")
        return JsonResponse({"error": "Erro ao decodificar o JSON."}, status=500)

    # Monta as chaves de acesso com base no sistema operacional fornecido
    techmind_key = f"{os}_techmind"
    updater_key = f"{os}_updater"

    # Verifica se as chaves esperadas estão presentes no conteúdo do JSON
    if techmind_key not in data or updater_key not in data:
        # Retorna erro 404 caso o sistema operacional especificado não esteja no arquivo
        return JsonResponse({"error": f"OS '{os}' não encontrado."}, status=404)

    # Retorna a última versão disponível dos programas TechMind e Updater no formato JSON
    return JsonResponse({
        "latest_version_techmind": data[techmind_key].get("latest_version"),
        "latest_version_updater": data[updater_key].get("latest_version")
    })
