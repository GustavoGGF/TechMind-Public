🧠 TechMind Access Portal
Plataforma Inteligente de Monitoramento e Inventário Corporativo

O TechMind Access Portal é uma solução completa de gestão e monitoramento de ativos computacionais, desenvolvida para ambientes corporativos que exigem controle, segurança e integração contínua com o diretório corporativo (LDAP).

Projetado com foco em eficiência, escalabilidade e automação, o sistema centraliza informações detalhadas sobre hardware, software, sessões de acesso e inventário físico, permitindo decisões rápidas e assertivas sobre o parque tecnológico da empresa.

💡 Propósito da Ferramenta

Gerenciar e monitorar todos os dispositivos conectados ao ambiente corporativo de forma automatizada, segura e integrada, reduzindo o esforço manual e garantindo a consistência entre o inventário real e o registrado no Active Directory (AD).

O sistema oferece uma visão completa da infraestrutura, consolidando dados técnicos e operacionais de cada máquina em tempo real.

🧭 Como Funciona

O funcionamento do TechMind Access Portal é dividido em três camadas principais, interligadas de forma eficiente:

🧩 Agente Local (GoLang)

Instalado em cada máquina cliente.

Coleta dados de hardware, software e rede.

Roda automaticamente no login do usuário.

Gera logs de execução e realiza autoatualização.

Extremamente otimizado, ideal para computadores de baixo desempenho.

Desenvolvido em GoLang, garantindo leveza e desempenho nativo.

⚙️ Backend (Python/Django + Redis)

Responsável pelo processamento, armazenamento e comunicação entre os módulos.

Integração direta com LDAP para controle de autenticação e acesso.

Utiliza Redis para agilizar respostas entre frontend e backend, melhorando a performance e a sincronização de dados.

Armazena informações em banco de dados SQL, com estrutura otimizada (dados em string, baixo consumo de espaço).

💻 Frontend (Angular)

Interface moderna, responsiva e de fácil navegação.

Dashboards interativos para visualização de equipamentos, sessões e sistemas operacionais.

Comunicação em tempo real com o backend via APIs RESTful e cache Redis.

📊 Principais Dashboards e Funcionalidades
🔐 Acesso e Autenticação

Integração completa com LDAP.

Acesso exclusivo a usuários autorizados.

🖥️ Dashboard de Equipamentos

Visualização de todas as máquinas instaladas localmente.

Exibição detalhada dos dados de cada dispositivo, incluindo:

Rede: MAC Address, domínio, IP, fabricante e modelo.

Sistema Operacional: nome, distribuição, versão e data de conexão.

Usuário: nome do usuário logado e status de acesso.

Hardware Completo:

CPU: modelo, arquitetura, núcleos, threads, frequência mínima e máxima, vendor ID.

GPU: vendor ID, bus info, clock, logical name, configuração.

Memória: capacidade máxima, número de slots.

Armazenamento: modelo, número de série, capacidade, versão SATA.

Placa-mãe: fabricante, produto, versão, número de série, asset tag.

BIOS: versão e data.

Áudio: modelo e fabricante.

Softwares Instalados: nome, versão e licenças.

Inventário Físico: imobilizado, localização, notas e disponibilidade para locação.

Sistema: versão do inventário, portas lógicas abertas e status de comunicação.

📈 Dashboard de Sessões

Histórico de acessos e contagem de conexões por máquina.

🧠 Dashboard de Sistemas Operacionais

Análise comparativa entre os sistemas registrados no portal e no Active Directory, garantindo a consistência dos dados.

🔄 Atualização do Agente

Atualização remota e automatizada do software de inventário, diretamente pelo portal.

🧠 Tecnologias e Recursos Utilizados
Camada	Tecnologia	Descrição
Frontend	Angular	Framework moderno e reativo para aplicações SPA.
Backend	Python / Django	Estrutura robusta e escalável para APIs e lógica de negócio.
Banco de Dados	SQL (PostgreSQL/MySQL)	Armazenamento eficiente, com estrutura leve em strings.
Cache e Mensageria	Redis	Acelera comunicações e respostas entre frontend e backend.
Agente Local	GoLang	Aplicativo leve, otimizado e autoatualizável para coleta de dados.
Instalador	C#	Instalador nativo para ambientes Windows.
Autenticação	LDAP	Integração corporativa com controle de acesso seguro.


🧩 Como Executar Localmente
🔧 Frontend (Angular)
ng build
mover pasta static para pasta backend

🐍 Backend (Django)
pip install -r requirements.txt
python manage.py migrate
python -m daphne -b 0.0.0.0 -p 3000 techmind.asgi:application

💾 Redis
redis-server

💻 Agente Local

O executável (em GoLang) deve ser instalado nas máquinas clientes.
Ele iniciará automaticamente no login do usuário e enviará os dados ao servidor configurado.

🌟 Conclusão

O TechMind Access Portal foi desenvolvido com foco em eficiência, escalabilidade e segurança corporativa, utilizando boas práticas modernas de desenvolvimento full stack.
A combinação de Angular, Django, GoLang e Redis garante desempenho excepcional, mesmo em ambientes de grande volume de dados e dispositivos conectados.

🚀 Projeto desenvolvido para proporcionar visibilidade total da infraestrutura corporativa, aliando tecnologia, automação e inteligência operacional.
