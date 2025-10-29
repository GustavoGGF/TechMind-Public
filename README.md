# 🧠 TechMind – Sistema Inteligente de Inventário e Gestão de Ativos de TI

O **TechMind** é uma plataforma completa de **inventário e monitoramento de ativos de TI**, desenvolvida para oferecer **visibilidade em tempo real** sobre o parque computacional da organização.  
Integrando **frontend em Angular** e **backend em Python/Django**, a ferramenta proporciona **gestão centralizada, acesso seguro e automação inteligente** de coleta e atualização de dados.

---

## 💡 Propósito da Ferramenta

Em ambientes corporativos, manter um inventário atualizado de máquinas, softwares e configurações é essencial para **segurança, governança e eficiência operacional**.  
O **TechMind** resolve esse desafio automatizando o processo de inventário e controle, oferecendo um **painel unificado** com informações detalhadas de hardware, software e sessões ativas.

---

## ⚙️ Como Funciona

A solução é composta por três camadas integradas:

1. **Frontend (Angular)**  
   Interface moderna e responsiva, oferecendo dashboards intuitivos e visualização rápida dos dados coletados.  

2. **Backend (Python/Django)**  
   Responsável pelo processamento, autenticação via **LDAP** e integração com o banco de dados **SQL**.  
   Utiliza **Redis** para otimizar a comunicação entre serviços e melhorar o desempenho em operações simultâneas.  

3. **Agente Local (Golang)**  
   Um software executável instalado em cada máquina cliente.  
   - Coleta dados de hardware e software  
   - Gera logs e relatórios locais  
   - Possui sistema de **autoatualização**  
   - É altamente otimizado, funcionando bem até em computadores com recursos limitados  
   - Roda automaticamente no login do usuário  

4. **Instalador (C#)**  
   Desenvolvido para garantir **implantação simples e segura** nas máquinas clientes.

5. **Banco de Dados (Mysql/Redis)**
   Visando desempenho e dinamismo

---

## 📊 Principais Funcionalidades

- 🔐 **Autenticação via LDAP** – Acesso restrito a usuários autorizados.  
- 🖥️ **Dashboard de Equipamentos** – Exibe todos os dispositivos instalados e ativos locais.  
- 📈 **Dashboard de Sessões** – Acompanha histórico de acessos, número de máquinas conectadas e horários.  
- 💽 **Dashboard de Sistemas Operacionais** – Monitora distribuições, versões e compatibilidade com o AD.  
- 🧩 **Painel Detalhado de Máquinas** –  
  Informações completas de cada dispositivo, incluindo:
  - **Hardware:** CPU, GPU, memória, HD, BIOS, motherboard, slots e capacidades.  
  - **Software:** versões, licenças, sistema operacional, softwares instalados.  
  - **Rede:** IP, domínio, MAC address.  
  - **Inventário:** localização, imobilizado, status de locação, notas e observações.  
- 🔁 **Atualização Automática** – O próprio sistema de inventário é atualizado via portal.  
- ⚡ **Sincronização Otimizada com Redis** – Respostas rápidas e processamento dinâmico de solicitações.  

---

## 🧠 Tecnologias e Recursos Utilizados

| Camada | Tecnologia | Descrição |
|--------|-------------|-----------|
| **Frontend** | Angular | Interface interativa e reativa com dashboards modernos |
| **Backend** | Python / Django | Lógica de negócios, API REST e integração LDAP |
| **Banco de Dados** | SQL | Armazenamento eficiente de informações de inventário |
| **Cache / Mensageria** | Redis | Otimização da comunicação entre frontend e backend |
| **Agente Local** | Golang | Coleta e atualização automática de dados das máquinas |
| **Instalador** | C# | Distribuição e instalação do agente local |
| **Integração** | LDAP | Controle de acesso seguro e corporativo |

---

## 🧩 Como Executar Localmente

### 🔧 Backend (Django)
```bash
# Clone o repositório

cd techmind/backend

🐍 Backend (Django)
# Crie o ambiente virtual
python -m venv venv
source venv/bin/activate  # ou venv\Scripts\activate no Windows

# Instale as dependências
pip install -r requirements.txt

💻 Frontend (Angular)
ng build
cole a pasta static em techmind/backend

💾 Redis
redis-server

🐍 Backend (Django)
Execute:
python -m daphne -b 0.0.0.0 -p 3000 techmind.asgi:application


Acesse no navegador: http://localhost:3000

🧩 Arquitetura Resumida
┌────────────────────┐       ┌────────────────────┐
│  Agente Local      │──────▶│  Backend Django     │
│ (Golang)           │       │  + Redis + SQL      │
└────────────────────┘       └─────────┬───────────┘
                                        │
                                        ▼
                               ┌────────────────────┐
                               │  Frontend Angular  │
                               │  Dashboards e UI   │
                               └────────────────────┘

🌟 Conclusão

O TechMind foi desenvolvido com foco em eficiência, escalabilidade e governança de ativos de TI, combinando desempenho técnico e experiência visual moderna.
A plataforma representa um exemplo sólido de integração entre múltiplas linguagens e frameworks, evidenciando boas práticas de arquitetura e desenvolvimento corporativo.

🚀 Projeto desenvolvido com foco em eficiência, escalabilidade e boas práticas modernas de desenvolvimento.
