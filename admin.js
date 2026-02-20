// admin.js - Sistema de Controle de Assiduidade (COM CLASSE 11, 12, 13)

class SistemaAssiduidade {
    constructor() {
        this.alunos = this.carregarDados('alunos') || [];
        this.turmas = this.carregarDados('turmas') || [];
        this.presencas = this.carregarDados('presencas') || [];
       this.logs = this.carregarDados('logs') || [];
        
        this.init();
    }

    init() {
        this.initNavegacao();
        this.initEventListeners();
        this.carregarDadosIniciais();
        this.atualizarInfoSistema();
        this.criarLog('Sistema inicializado', 'info');
    }

    // ============== FUNÇÕES DE NAVEGAÇÃO ==============
    initNavegacao() {
        const navLinks = document.querySelectorAll('.nav-link');
        const conteudoCards = document.querySelectorAll('.conteudo-card');

        const mostrarConteudo = (targetId) => {
            conteudoCards.forEach(card => card.classList.remove('active'));
            navLinks.forEach(link => link.classList.remove('active'));

            const targetCard = document.getElementById(targetId);
            const targetLink = document.querySelector(`[data-target="${targetId}"]`);
            
            if (targetCard) targetCard.classList.add('active');
            if (targetLink) targetLink.classList.add('active');
        };

        navLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const targetId = link.getAttribute('data-target');
                mostrarConteudo(targetId);
                history.pushState({ target: targetId }, '', `#${targetId}`);
            });
        });

        window.addEventListener('popstate', (e) => {
            if (e.state?.target) mostrarConteudo(e.state.target);
        });

        window.addEventListener('DOMContentLoaded', () => {
            const hash = window.location.hash.substring(1);
            const validarTargets = ['relatorios', 'alunos', 'turmas', 'auditoria', 'administracao'];
            mostrarConteudo(validarTargets.includes(hash) ? hash : 'relatorios');
        });
    }

    // ============== EVENT LISTENERS ==============
    initEventListeners() {
        document.getElementById('btnAdicionarAluno')?.addEventListener('click', () => this.mostrarModalAluno());
        document.getElementById('btnAdicionarturma')?.addEventListener('click', () => this.mostrarModalTurma());
        document.querySelector('.gerarRelatorio')?.addEventListener('click', () => this.gerarRelatorio());
        document.querySelector('.expPdf')?.addEventListener('click', () => this.exportarPDF());
        document.querySelector('.expExcel')?.addEventListener('click', () => this.exportarExcel());
        document.querySelector('.backupDados')?.addEventListener('click', () => this.fazerBackup());
        document.querySelector('.RestaurarDados')?.addEventListener('click', () => this.restaurarDados());
        document.querySelector('.btnLimpar button')?.addEventListener('click', () => this.limparTodosDados());
        document.querySelector('.btnLincializar button')?.addEventListener('click', () => this.inicializarDados());
    }

    // ============== FUNÇÕES DE ALUNOS ==============
    gerarSenha() {
        const caracteres = 'abcdefghijklmnopqrstuvwxyz0123456789';
        return Array.from({ length: 8 }, () => 
            caracteres.charAt(Math.floor(Math.random() * caracteres.length))
        ).join('');
    }

    gerarEmailAluno(nome) {
        const nomeNormalizado = nome.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        const nomeLimpo = nomeNormalizado.toLowerCase().trim().replace(/[^a-z0-9\s]/g, '');
        const primeiroNome = nomeLimpo.split(' ')[0];
        
        let email = primeiroNome.length < 3 
            ? `${nomeLimpo.replace(/\s+/g, '')}@colegio.com`
            : `${primeiroNome}@colegio.com`;
        
        let contador = 1;
        while (this.alunos.some(a => a.email === email)) {
            email = `${primeiroNome}${contador}@colegio.com`;
            contador++;
            if (contador > 100) {
                email = `${primeiroNome}${Date.now().toString().slice(-4)}@colegio.com`;
                break;
            }
        }
        return email;
    }

    mostrarModalAluno(aluno = null) {
        const senhaGerada = aluno?.senha || this.gerarSenha();
        
        const modalHTML = `
            <div class="modal fade" id="modalAluno" tabindex="-1">
                <div class="modal-dialog">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title">${aluno ? 'Editar Aluno' : 'Adicionar Aluno'}</h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                        </div>
                        <div class="modal-body">
                            <form id="formAluno">
                                <div class="mb-3">
                                    <label class="form-label">Nome Completo *</label>
                                    <input type="text" class="form-control" id="nomeAluno" 
                                           value="${aluno?.nome || ''}" required>
                                </div>
                                <div class="mb-3">
                                    <label class="form-label">Classe *</label>
                                    <select class="form-select" id="classeAluno" required>
                                        <option value="">Selecione a classe</option>
                                        ${['11ª Classe', '12ª Classe', '13ª Classe'].map(c => 
                                            `<option value="${c}" ${aluno?.classe === c ? 'selected' : ''}>${c}</option>`
                                        ).join('')}
                                    </select>
                                </div>
                                <div class="mb-3">
                                    <label class="form-label">Turma *</label>
                                    <select class="form-select" id="turmaAluno" required>
                                        <option value="">Selecione uma turma</option>
                                        ${this.turmas.map(t => 
                                            `<option value="${t.id}" ${aluno?.turmaId === t.id ? 'selected' : ''}>
                                                ${t.nome} - ${t.curso}
                                            </option>`
                                        ).join('')}
                                    </select>
                                </div>
                                <div class="mb-3">
                                    <label class="form-label">Turno</label>
                                    <select class="form-select" id="turnoAluno">
                                        <option value="">Selecione o turno</option>
                                        <option value="Manhã" ${aluno?.turno === 'Manhã' ? 'selected' : ''}>Manhã</option>
                                        <option value="Tarde" ${aluno?.turno === 'Tarde' ? 'selected' : ''}>Tarde</option>
                                    </select>
                                </div>
                                <div class="mb-3">
                                    <label class="form-label">Senha de Acesso</label>
                                    <div class="input-group">
                                        <input type="password" class="form-control" id="senhaAluno" 
                                               value="${senhaGerada}" readonly>
                                        <button class="btn btn-outline-secondary" type="button" id="gerarSenhaBtn">
                                            <i class="fas fa-sync-alt"></i>
                                        </button>
                                        <button class="btn btn-outline-secondary" type="button" id="visualizarSenhaBtn">
                                            <i class="fas fa-eye"></i>
                                        </button>
                                    </div>
                                    <small class="text-muted">O administrador pode gerar e visualizar a senha para entregar ao aluno</small>
                                </div>
                                <input type="hidden" id="alunoId" value="${aluno?.id || ''}">
                            </form>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancelar</button>
                            <button type="button" class="btn btn-primary" id="salvarAluno">
                                ${aluno ? 'Atualizar' : 'Salvar'}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        document.getElementById('modalAluno')?.remove();
        document.body.insertAdjacentHTML('beforeend', modalHTML);
        
        const modal = new bootstrap.Modal(document.getElementById('modalAluno'));
        modal.show();

        document.getElementById('gerarSenhaBtn').addEventListener('click', () => {
            document.getElementById('senhaAluno').value = this.gerarSenha();
        });

        const visualizarBtn = document.getElementById('visualizarSenhaBtn');
        const senhaInput = document.getElementById('senhaAluno');
        
        visualizarBtn.addEventListener('mousedown', () => {
            senhaInput.type = 'password';
            visualizarBtn.innerHTML = '<i class="fas fa-eye-slash"></i>';
        });
        
        visualizarBtn.addEventListener('mouseup', () => {
            senhaInput.type = 'text';
            visualizarBtn.innerHTML = '<i class="fas fa-eye"></i>';
        });
        
        visualizarBtn.addEventListener('click', () => {
            senhaInput.type = 'text';
            visualizarBtn.innerHTML = '<i class="fas fa-eye"></i>';
        });

        document.getElementById('salvarAluno').addEventListener('click', () => {
            this.salvarAluno(aluno);
            modal.hide();
        });

        document.getElementById('turmaAluno').addEventListener('change', (e) => {
            const turma = this.turmas.find(t => t.id === e.target.value);
            if (turma) {
                if (turma.turno) document.getElementById('turnoAluno').value = turma.turno;
                if (turma.classe) document.getElementById('classeAluno').value = turma.classe;
            }
        });
    }

    async salvarAluno(alunoExistente = null) {
        const nome = document.getElementById('nomeAluno')?.value.trim();
        const classe = document.getElementById('classeAluno')?.value;
        const turmaId = document.getElementById('turmaAluno')?.value;
        const turno = document.getElementById('turnoAluno')?.value;
        const senha = document.getElementById('senhaAluno')?.value;
        
        if (!nome || !classe || !turmaId) {
            this.mostrarAlerta('Preencha todos os campos obrigatórios!', 'danger');
            return;
        }

        const turma = this.turmas.find(t => t.id === turmaId);
        if (!turma) {
            this.mostrarAlerta('Turma não encontrada!', 'danger');
            return;
        }

        const alunoId = document.getElementById('alunoId')?.value;
        
        if (alunoExistente || alunoId) {
            const index = this.alunos.findIndex(a => a.id === (alunoExistente?.id || alunoId));
            if (index !== -1) {
                this.alunos[index] = {
                    ...this.alunos[index],
                    nome,
                    classe,
                    turmaId,
                    turma: turma.nome,
                    turno,
                    senha
                };
                this.criarLog(`Aluno "${nome}" atualizado`, 'warning');
            }
        } else {
            if (this.alunos.some(a => a.nome.toLowerCase() === nome.toLowerCase())) {
                this.mostrarAlerta(`O aluno "${nome}" já está cadastrado.`, 'danger');
                return;
            }

            const novoAluno = {
                id: this.gerarId(),
                nome,
                email: this.gerarEmailAluno(nome),
                classe,
                turmaId,
                turma: turma.nome,
                turno,
                senha,
                qrCode: this.gerarQRCode(),
                dataCadastro: new Date().toISOString(),
                tipo: 'aluno'
            };

            try {
                novoAluno.qrCodeImagem = await this.gerarImagemQRCode(novoAluno.id, nome);
            } catch (error) {
                console.error('Erro ao gerar QR Code:', error);
                novoAluno.qrCodeImagem = this.criarQRCodeFallback(novoAluno.id, nome);
            }

            this.alunos.push(novoAluno);
            this.criarLog(`Aluno "${nome}" adicionado com email: ${novoAluno.email}`, 'success');
        }

        this.salvarDados('alunos', this.alunos);
        this.carregarTabelaAlunos();
        this.atualizarInfoSistema();
        this.mostrarAlerta(`Aluno salvo com sucesso!`, 'success');
    }

    editarAluno(id) {
        const aluno = this.alunos.find(a => a.id === id);
        if (aluno) this.mostrarModalAluno(aluno);
    }

    excluirAluno(id) {
        if (confirm('Tem certeza que deseja excluir este aluno?')) {
            const aluno = this.alunos.find(a => a.id === id);
            const index = this.alunos.findIndex(a => a.id === id);
            
            if (index !== -1) {
                this.alunos.splice(index, 1);
                this.salvarDados('alunos', this.alunos);
                this.criarLog(`Aluno "${aluno.nome}" excluído`, 'danger');
                this.carregarTabelaAlunos();
                this.atualizarInfoSistema();
                this.mostrarAlerta('Aluno excluído com sucesso!', 'success');
            }
        }
    }

    // ============== FUNÇÕES DE TURMAS ==============
    mostrarModalTurma(turma = null) {
        const anoAtual = new Date().getFullYear();
        const anosDisponiveis = Array.from({ length: 5 }, (_, i) => 
            `${anoAtual - 1 + i}/${anoAtual + i}`
        );

        const modalHTML = `
            <div class="modal fade" id="modalTurma" tabindex="-1">
                <div class="modal-dialog">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title">${turma ? 'Editar Turma' : 'Adicionar Turma'}</h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                        </div>
                        <div class="modal-body">
                            <form id="formTurma">
                                <div class="mb-3">
                                    <label class="form-label">Curso *</label>
                                    <select class="form-select" id="cursoTurma" required>
                                        <option value="">Selecione um curso</option>
                                        ${['Informática', 'Enfermagem', 'Contabilidade & Gestão', 'Gestão Empresarial'].map(c => 
                                            `<option value="${c}" ${turma?.curso === c ? 'selected' : ''}>${c}</option>`
                                        ).join('')}
                                    </select>
                                </div>
                                <div class="mb-3">
                                    <label class="form-label">Classe *</label>
                                    <select class="form-select" id="classeTurma" required>
                                        <option value="">Selecione a classe</option>
                                        ${['11ª Classe', '12ª Classe', '13ª Classe'].map(c => 
                                            `<option value="${c}" ${turma?.classe === c ? 'selected' : ''}>${c}</option>`
                                        ).join('')}
                                    </select>
                                </div>
                                <div class="mb-3">
                                    <label class="form-label">Turma *</label>
                                    <select class="form-select" id="nomeTurma" required>
                                        <option value="">Selecione uma Turma</option>
                                        ${['Turma A', 'Turma B', 'Turma C'].map(t => 
                                            `<option value="${t}" ${turma?.nome === t ? 'selected' : ''}>${t}</option>`
                                        ).join('')}
                                    </select>
                                </div>
                                <div class="mb-3">
                                    <label class="form-label">Ano/Série *</label>
                                    <select class="form-select" id="anoTurma" required>
                                        <option value="">Selecione o ano/série</option>
                                        ${anosDisponiveis.map(ano => 
                                            `<option value="${ano}" ${turma?.ano === ano ? 'selected' : ''}>${ano}</option>`
                                        ).join('')}
                                    </select>
                                </div>
                                <div class="mb-3">
                                    <label class="form-label">Turno</label>
                                    <select class="form-select" id="turnoTurma">
                                        <option value="">Selecione o turno</option>
                                        <option value="Manhã" ${turma?.turno === 'Manhã' ? 'selected' : ''}>Manhã</option>
                                        <option value="Tarde" ${turma?.turno === 'Tarde' ? 'selected' : ''}>Tarde</option>
                                    </select>
                                </div>
                                <input type="hidden" id="turmaId" value="${turma?.id || ''}">
                            </form>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancelar</button>
                            <button type="button" class="btn btn-primary" id="salvarTurma">
                                ${turma ? 'Atualizar' : 'Salvar'}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        document.getElementById('modalTurma')?.remove();
        document.body.insertAdjacentHTML('beforeend', modalHTML);
        
        const modal = new bootstrap.Modal(document.getElementById('modalTurma'));
        modal.show();

        document.getElementById('salvarTurma').addEventListener('click', () => {
            this.salvarTurma(turma);
            modal.hide();
        });
    }

    salvarTurma(turmaExistente = null) {
        const nome = document.getElementById('nomeTurma')?.value;
        const curso = document.getElementById('cursoTurma')?.value;
        const classe = document.getElementById('classeTurma')?.value;
        const ano = document.getElementById('anoTurma')?.value;
        const turno = document.getElementById('turnoTurma')?.value;
        
        if (!nome || !curso || !classe || !ano) {
            this.mostrarAlerta('Preencha todos os campos obrigatórios!', 'danger');
            return;
        }

        if (turmaExistente) {
            const index = this.turmas.findIndex(t => t.id === turmaExistente.id);
            if (index !== -1) {
                this.turmas[index] = { ...this.turmas[index], nome, curso, classe, ano, turno };
                this.criarLog(`Turma "${nome}" atualizada`, 'warning');
                
                this.alunos.forEach(aluno => {
                    if (aluno.turmaId === turmaExistente.id) {
                        aluno.turma = nome;
                        if (classe) aluno.classe = classe;
                    }
                });
                this.salvarDados('alunos', this.alunos);
            }
        } else {
            const novaTurma = {
                id: this.gerarId(),
                nome,
                curso,
                classe,
                ano,
                turno,
                dataCriacao: new Date().toISOString()
            };
            this.turmas.push(novaTurma);
            this.criarLog(`Turma "${nome}" adicionada`, 'success');
        }

        this.salvarDados('turmas', this.turmas);
        this.carregarListaTurmas();
        this.carregarTabelaAlunos();
        this.atualizarSelectTurmas();
        this.atualizarInfoSistema();
        this.mostrarAlerta(`Turma ${turmaExistente ? 'atualizada' : 'adicionada'} com sucesso!`, 'success');
    }

    editarTurma(id) {
        const turma = this.turmas.find(t => t.id === id);
        if (turma) this.mostrarModalTurma(turma);
    }

    excluirTurma(id) {
        if (confirm('Tem certeza? Isso também removerá todos os alunos desta turma.')) {
            const turma = this.turmas.find(t => t.id === id);
            const index = this.turmas.findIndex(t => t.id === id);
            
            if (index !== -1) {
                this.turmas.splice(index, 1);
                this.alunos = this.alunos.filter(a => a.turmaId !== id);
                
                this.salvarDados('turmas', this.turmas);
                this.salvarDados('alunos', this.alunos);
                
                this.criarLog(`Turma "${turma.nome}" e seus alunos excluídos`, 'danger');
                this.carregarListaTurmas();
                this.carregarTabelaAlunos();
                this.atualizarSelectTurmas();
                this.atualizarInfoSistema();
                this.mostrarAlerta('Turma e alunos removidos com sucesso!', 'success');
            }
        }
    }

    // ============== RELATÓRIOS ==============
    gerarRelatorio() {
        const turmaId = document.getElementById('turma')?.value;
        const dataInicial = document.getElementById('dataInicial')?.value;
        const dataFinal = document.getElementById('dataF')?.value;

        let alunosFiltrados = turmaId 
            ? this.alunos.filter(a => a.turmaId === turmaId)
            : [...this.alunos];

        const relatorio = alunosFiltrados.map(aluno => {
            const presencasAluno = this.presencas.filter(p => p.alunoId === aluno.id);
            let presencasFiltradas = presencasAluno;
            
            if (dataInicial) presencasFiltradas = presencasFiltradas.filter(p => p.data >= dataInicial);
            if (dataFinal) presencasFiltradas = presencasFiltradas.filter(p => p.data <= dataFinal);
            
            const total = presencasFiltradas.length;
            const presentes = presencasFiltradas.filter(p => p.presente).length;
            const faltas = total - presentes;
            const taxa = total > 0 ? ((presentes / total) * 100).toFixed(1) : 0;

            return {
                aluno: aluno.nome,
                turma: aluno.turma,
                classe: aluno.classe || 'Não informada',
                presencas: presentes,
                faltas,
                
            };
        });

        this.preencherTabelaRelatorio(relatorio);
        this.criarLog('Relatório gerado', 'info');
    }

    preencherTabelaRelatorio(dados) {
        const tbody = document.querySelector('#relatorios .tabela tbody');
        if (!tbody) return;

        if (dados.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6">Nenhum dado encontrado para os filtros selecionados</td></tr>';
            return;
        }

        tbody.innerHTML = dados.map(item => `
            <tr>
                <td>${item.aluno}</td>
                <td>${item.turma}</td>
                <td>${item.classe}</td>
                <td>${item.presencas}</td>
                <td>${item.faltas}</td>
                
            </tr>
        `).join('');
    }

    // ============== EXPORTAÇÃO ==============
    exportarPDF() {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        
        doc.text('Relatório de Presenças - Colégio Santa Ana & Noesa', 20, 20);
        doc.text(`Data: ${new Date().toLocaleDateString()}`, 20, 30);
        
        const tabela = document.querySelector('#relatorios .tabela');
        if (tabela) doc.autoTable({ html: tabela, startY: 40 });
        
        doc.save('relatorio-presencas.pdf');
        this.criarLog('Relatório PDF exportado', 'info');
        this.mostrarAlerta('PDF exportado com sucesso!', 'success');
    }

    exportarExcel() {
        const tabela = document.querySelector('#relatorios .tabela');
        if (!tabela || tabela.rows.length <= 1) {
            this.mostrarAlerta('Não há dados para exportar!', 'warning');
            return;
        }
        
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, XLSX.utils.table_to_sheet(tabela), "Relatório");
        XLSX.writeFile(wb, "relatorio-presencas.xlsx");
        
        this.criarLog('Relatório Excel exportado', 'info');
        this.mostrarAlerta('Excel exportado com sucesso!', 'success');
    }

    // ============== BACKUP E RESTAURAÇÃO ==============
    fazerBackup() {
        const dados = {
            alunos: this.alunos,
            turmas: this.turmas,
            presencas: this.presencas,
            logs: this.logs,
            dataBackup: new Date().toISOString()
        };

        const blob = new Blob([JSON.stringify(dados, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        
        a.href = url;
        a.download = `backup-assiduidade-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        this.criarLog('Backup realizado', 'info');
        this.mostrarAlerta('Backup realizado com sucesso!', 'success');
    }

    restaurarDados() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        
        input.onchange = (e) => {
            const file = e.target.files[0];
            const reader = new FileReader();
            
            reader.onload = (event) => {
                try {
                    const dados = JSON.parse(event.target.result);
                    
                    if (confirm('Isso substituirá todos os dados atuais. Continuar?')) {
                        this.alunos = dados.alunos || [];
                        this.turmas = dados.turmas || [];
                        this.presencas = dados.presencas || [];
                        this.logs = dados.logs || [];
                        
                        ['alunos', 'turmas', 'presencas', 'logs'].forEach(chave => 
                            this.salvarDados(chave, this[chave])
                        );
                        
                        this.carregarDadosIniciais();
                        this.atualizarInfoSistema();
                        this.criarLog('Dados restaurados do backup', 'warning');
                        this.mostrarAlerta('Dados restaurados com sucesso!', 'success');
                    }
                } catch (error) {
                    this.mostrarAlerta('Erro ao restaurar dados. Arquivo inválido.', 'danger');
                }
            };
            
            reader.readAsText(file);
        };
        
        input.click();
    }

    // ============== ADMINISTRAÇÃO ==============
    limparTodosDados() {
        if (confirm('ATENÇÃO: Isso apagará TODOS os dados do sistema. Continuar?')) {
            localStorage.clear();
            this.alunos = [];
            this.turmas = [];
            this.presencas = [];
            this.logs = [];
            
            this.carregarDadosIniciais();
            this.atualizarInfoSistema();
            this.criarLog('Todos os dados foram apagados', 'danger');
            this.mostrarAlerta('Todos os dados foram apagados.', 'warning');
        }
    }

    inicializarDados() {
        const anoAtual = new Date().getFullYear();
        const anoEscolar = `${anoAtual}/${anoAtual + 1}`;
        
        const dadosExemplo = {
            turmas: [
                { id: '1', nome: 'Turma A', curso: 'Informática', classe: '11ª Classe', ano: anoEscolar, turno: 'Manhã', dataCriacao: new Date().toISOString() },
                { id: '2', nome: 'Turma B', curso: 'Enfermagem', classe: '12ª Classe', ano: anoEscolar, turno: 'Tarde', dataCriacao: new Date().toISOString() }
            ],
            alunos: [
                { id: '1', nome: 'Ana Silva', classe: '11ª Classe', turmaId: '1', turma: 'Turma A', turno: 'Manhã', qrCode: 'QR001', dataCadastro: new Date().toISOString() },
                { id: '2', nome: 'Bruno Santos', classe: '11ª Classe', turmaId: '1', turma: 'Turma A', turno: 'Manhã', qrCode: 'QR002', dataCadastro: new Date().toISOString() },
                { id: '3', nome: 'Carla Oliveira', classe: '12ª Classe', turmaId: '2', turma: 'Turma B', turno: 'Tarde', qrCode: 'QR003', dataCadastro: new Date().toISOString() }
            ]
        };

        if (confirm('Isso irá adicionar dados de exemplo. Continuar?')) {
            this.turmas = dadosExemplo.turmas;
            this.alunos = dadosExemplo.alunos;
            
            this.alunos.forEach(async (aluno) => {
                try {
                    aluno.qrCodeImagem = await this.gerarImagemQRCode(aluno.id, aluno.nome);
                } catch (error) {
                    aluno.qrCodeImagem = this.criarQRCodeFallback(aluno.id, aluno.nome);
                }
            });
            
            this.salvarDados('turmas', this.turmas);
            this.salvarDados('alunos', this.alunos);
            
            this.carregarDadosIniciais();
            this.atualizarInfoSistema();
            this.criarLog('Dados de exemplo inicializados', 'info');
            this.mostrarAlerta('Dados de exemplo adicionados com sucesso!', 'success');
        }
    }

    atualizarInfoSistema() {
        const espacoUsado = (JSON.stringify(localStorage).length / 1024).toFixed(2);
        const infoSistema = document.querySelector('#administracao .infoSistema');
        
        if (infoSistema) {
            infoSistema.innerHTML = `
                <h5>Informações do Sistema</h5>
                <p><strong>Versão:</strong> 1.0.0</p>
                <p><strong>Alunos:</strong> ${this.alunos.length}</p>
                <p><strong>Turmas:</strong> ${this.turmas.length}</p>
                <p><strong>Presenças registradas:</strong> ${this.presencas.length}</p>
                <p><strong>Espaço utilizado:</strong> ${espacoUsado} KB</p>
            `;
        }
    }

    // ============== AUDITORIA ==============
    criarLog(mensagem, tipo = 'info') {
        const log = {
            id: this.gerarId(),
            data: new Date().toISOString(),
            usuario: 'Admin@.com',
            acao: mensagem,
            tipo
        };
        
        this.logs.unshift(log);
        if (this.logs.length > 100) this.logs = this.logs.slice(0, 100);
        
        this.salvarDados('logs', this.logs);
        this.carregarLogs();
    }

    carregarLogs() {
        const container = document.querySelector('.auditoria.log');
        if (!container) return;

        if (this.logs.length === 0) {
            container.innerHTML = '<div style="text-align: center;">Nenhum log registrado</div>';
            return;
        }

        container.innerHTML = this.logs.map(log => `
            <div class="log-item log-${log.tipo}">
                <div class="log-data">${new Date(log.data).toLocaleString()}</div>
                <div class="log-usuario">${log.usuario}</div>
                <div class="log-acao">${log.acao}</div>
            </div>
        `).join('');
    }

    // ============== FUNÇÕES AUXILIARES ==============
    carregarDadosIniciais() {
        this.atualizarSelectTurmas();
        this.carregarTabelaAlunos();
        this.carregarListaTurmas();
        this.carregarLogs();
    }

    atualizarSelectTurmas() {
        const select = document.getElementById('turma');
        if (!select) return;

        select.innerHTML = `
            <option value="">Todas as Turmas</option>
            ${this.turmas.map(t => `<option value="${t.id}">${t.nome} - ${t.curso} (${t.classe})</option>`).join('')}
        `;
    }

    carregarTabelaAlunos() {
        const tbody = document.querySelector('#alunos .tabela tbody');
        if (!tbody) return;

        if (this.alunos.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7">Nenhum aluno cadastrado</td></tr>';
            return;
        }

        tbody.innerHTML = this.alunos.map(aluno => `
            <tr>
                <td>${aluno.id}</td>
                <td>${aluno.nome}</td>
                <td>${aluno.classe || 'Não informada'}</td>
                <td>${aluno.turma}</td>
                <td>
                    ${aluno.qrCodeImagem 
                        ? `<img src="${aluno.qrCodeImagem}" alt="QR Code" style="width: 50px; height: 50px; cursor: pointer;" class="qr-code-img" data-id="${aluno.id}">`
                        : `<span class="badge bg-secondary">${aluno.qrCode}</span>`
                    }
                    <br><small>${aluno.qrCode}</small>
                </td>
                <td>
                    <button class="btn btn-sm btn-info me-1" onclick="sistema.baixarQRCode('${aluno.id}')">
                        <i class="fas fa-download"></i>
                    </button>
                    <button class="btn btn-sm btn-warning me-1" onclick="sistema.editarAluno('${aluno.id}')">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-sm btn-danger" onclick="sistema.excluirAluno('${aluno.id}')">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            </tr>
        `).join('');

        document.querySelectorAll('.qr-code-img').forEach(img => {
            img.addEventListener('click', (e) => this.mostrarQRCodeGrande(e.target.dataset.id));
        });
    }

    carregarListaTurmas() {
        const container = document.querySelector('#turmas .lista');
        if (!container) return;

        if (this.turmas.length === 0) {
            container.innerHTML = '<div style="text-align: center;">Nenhuma turma cadastrada</div>';
            return;
        }

        container.innerHTML = this.turmas.map(turma => `
            <div class="turma-item">
                <div class="turma-info">
                    <h6>${turma.nome}</h6>
                    <small>${turma.curso} - ${turma.classe} - ${turma.ano}</small>
                    <div><small>Turno: ${turma.turno || 'Não especificado'}</small></div>
                </div>
                <div class="turma-acoes">
                    <button class="btn btn-sm btn-warning me-1" onclick="sistema.editarTurma('${turma.id}')">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-sm btn-danger" onclick="sistema.excluirTurma('${turma.id}')">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        `).join('');

        const titulo = document.querySelector('#turmas .card-titulo');
        if (titulo && this.turmas.length > 0) {
            titulo.textContent = `Turmas do ${this.turmas[0].curso}`;
        }
    }

    // ============== FUNÇÕES DE QR CODE ==============
    gerarId() {
        return Math.floor(100000 + Math.random() * 900000).toString();
    }

    gerarQRCode() {
        return 'QR' + this.gerarId();
    }

    gerarImagemQRCode(alunoId, alunoNome) {
        const qrData = { id: alunoId, nome: alunoNome, escola: "Colégio Santa Ana & Noesa", tipo: "aluno" };
        const qrTextEncoded = encodeURIComponent(JSON.stringify(qrData));
        const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${qrTextEncoded}`;
        
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.crossOrigin = "Anonymous";
            
            img.onload = () => {
                const canvas = document.createElement('canvas');
                canvas.width = img.width;
                canvas.height = img.height;
                canvas.getContext('2d').drawImage(img, 0, 0);
                resolve(canvas.toDataURL('image/png'));
            };
            
            img.onerror = reject;
            img.src = qrCodeUrl;
        });
    }

    criarQRCodeFallback(alunoId, alunoNome) {
        const canvas = document.createElement('canvas');
        canvas.width = canvas.height = 200;
        const ctx = canvas.getContext('2d');
        
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, 200, 200);
        
        ctx.fillStyle = '#000000';
        ctx.font = 'bold 16px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('ID: ' + alunoId, 100, 50);
        
        const nomeTruncado = alunoNome.length > 20 ? alunoNome.substring(0, 20) + '...' : alunoNome;
        ctx.font = '14px Arial';
        ctx.fillText(nomeTruncado, 100, 80);
        
        ctx.font = '12px Arial';
        ctx.fillText('Colégio Santa Ana', 100, 110);
        ctx.fillText('& Noesa', 100, 130);
        
        ctx.fillStyle = '#000000';
        for (let i = 0; i < 10; i++) {
            ctx.fillRect(30 + i * 14, 150, 10, 10 + Math.random() * 20);
        }
        
        return canvas.toDataURL('image/png');
    }

    mostrarQRCodeGrande(alunoId) {
        const aluno = this.alunos.find(a => a.id === alunoId);
        if (!aluno) return;
        
        const modalHTML = `
            <div class="modal fade" id="modalQRCode" tabindex="-1">
                <div class="modal-dialog modal-sm">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title">QR Code - ${aluno.nome}</h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                        </div>
                        <div class="modal-body text-center">
                            ${aluno.qrCodeImagem 
                                ? `<img src="${aluno.qrCodeImagem}" alt="QR Code" style="width: 250px; height: 250px;">`
                                : `<div style="width: 250px; height: 250px; background: #f8f9fa; display: flex; align-items: center; justify-content: center;">
                                    <span class="badge bg-secondary">QR Code não disponível</span>
                                   </div>`
                            }
                            <p class="mt-3">
                                <strong>ID:</strong> ${aluno.id}<br>
                                <strong>Nome:</strong> ${aluno.nome}<br>
                                <strong>Classe:</strong> ${aluno.classe || 'Não informada'}<br>
                                <strong>Código:</strong> ${aluno.qrCode}
                            </p>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Fechar</button>
                            <button type="button" class="btn btn-primary" onclick="sistema.baixarQRCode('${alunoId}')">
                                <i class="fas fa-download me-1"></i>Baixar
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        document.getElementById('modalQRCode')?.remove();
        document.body.insertAdjacentHTML('beforeend', modalHTML);
        new bootstrap.Modal(document.getElementById('modalQRCode')).show();
    }

    baixarQRCode(alunoId) {
        const aluno = this.alunos.find(a => a.id === alunoId);
        if (!aluno?.qrCodeImagem) {
            this.mostrarAlerta('QR Code não disponível!', 'warning');
            return;
        }
        
        const link = document.createElement('a');
        link.href = aluno.qrCodeImagem;
        link.download = `QRCode_${aluno.nome.replace(/\s+/g, '_')}_${aluno.id}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        this.criarLog(`QR Code do aluno ${aluno.nome} baixado`, 'info');
    }

    mostrarAlerta(mensagem, tipo = 'info') {
        document.querySelectorAll('.alert-flutuante').forEach(a => a.remove());

        const alertaHTML = `
            <div class="alert alert-${tipo} alert-flutuante alert-dismissible fade show" role="alert">
                ${mensagem}
                <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', alertaHTML);
        setTimeout(() => document.querySelector('.alert-flutuante')?.remove(), 5000);
    }

    // ============== LOCAL STORAGE ==============
    salvarDados(chave, dados) {
        localStorage.setItem(chave, JSON.stringify(dados));
    }

    carregarDados(chave) {
        const dados = localStorage.getItem(chave);
        return dados ? JSON.parse(dados) : null;
    }
}

// ============== INICIALIZAÇÃO ==============
let sistema;

document.addEventListener('DOMContentLoaded', () => {
    sistema = new SistemaAssiduidade();
    
    const estiloLogs = `
        <style>
            .log-item { padding: 10px; margin: 5px 0; border-left: 4px solid #ccc; background: #f8f9fa; }
            .log-info { border-color: #17a2b8; }
            .log-success { border-color: #28a745; }
            .log-warning { border-color: #ffc107; }
            .log-danger { border-color: #dc3545; }
            .alert-flutuante { position: fixed; top: 20px; right: 20px; z-index: 9999; min-width: 300px; }
            .turma-item { display: flex; justify-content: space-between; align-items: center; padding: 10px; border-bottom: 1px solid #dee2e6; }
            .turma-item:last-child { border-bottom: none; }
            .qr-code-img { transition: transform 0.3s ease; border: 1px solid #ddd; border-radius: 5px; padding: 2px; background: white; }
            .qr-code-img:hover { transform: scale(1.1); box-shadow: 0 4px 8px rgba(0,0,0,0.2); }
            .modal-sm { max-width: 300px; }
        </style>
    `;
    document.head.insertAdjacentHTML('beforeend', estiloLogs);
});

window.sistema = sistema;