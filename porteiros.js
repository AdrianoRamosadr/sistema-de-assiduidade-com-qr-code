// porteiros.js - Sistema de Controle de Assiduidade para Porteiros

class SistemaPorteiro {
    constructor() {
        this.alunos = [];
        this.presencas = [];
        this.turmas = [];
        this.presencasHoje = [];
        this.scannerAtivo = false;
        this.stream = null;
        this.videoElement = null;
        this.canvasElement = null;
        this.user = null;
        
        this.init();
    }

    init() {
        // Verificar autenticação
        this.verificarAutenticacao();
        
        // Carregar dados do localStorage
        this.carregarDados();
        
        // Inicializar elementos DOM
        this.initElementos();
        
        // Configurar event listeners
        this.initEventListeners();
        
        // Atualizar interface
        this.atualizarInterface();
        
        // Adicionar estilos CSS
        this.adicionarEstilos();
    }

    verificarAutenticacao() {
        this.user = JSON.parse(localStorage.getItem('user'));
        
        if (!this.user || this.user.tipo !== 'porteiro') {
            window.location.href = 'index.html';
            return;
        }

        // Atualizar nome do usuário no header
        const userNameDisplay = document.getElementById('userNameDisplay');
        if (userNameDisplay) {
            userNameDisplay.textContent = this.user.nome || 'Porteiro';
        }
    }

    carregarDados() {
        // Carregar alunos
        this.alunos = JSON.parse(localStorage.getItem('alunos')) || [];
        
        // Carregar presenças
        this.presencas = JSON.parse(localStorage.getItem('presencas')) || [];
        
        // Carregar turmas
        this.turmas = JSON.parse(localStorage.getItem('turmas')) || [];
        
        // Filtrar presenças de hoje
        this.filtrarPresencasHoje();
    }

    filtrarPresencasHoje() {
        const hoje = new Date().toISOString().split('T')[0];
        this.presencasHoje = this.presencas.filter(p => p.data === hoje);
    }

    initElementos() {
        this.iniciarScannerBtn = document.getElementById('btnIniciarScanner');
        this.scannerContainer = document.getElementById('scannerContainer');
        this.scannerStatus = document.getElementById('scannerStatus');
        this.ultimaLeitura = document.getElementById('ultimaLeitura');
        this.ultimoAluno = document.getElementById('ultimoAluno');
        this.totalAlunosElement = document.getElementById('totalAlunos');
        this.presentesHojeElement = document.getElementById('presentesHoje');
        this.tabelaPresencas = document.getElementById('tabelaPresencas');
        this.turmasContainer = document.getElementById('turmasContainer');
        this.btnSair = document.getElementById('btnSair');
    }

    initEventListeners() {
        if (this.iniciarScannerBtn) {
            this.iniciarScannerBtn.addEventListener('click', () => this.iniciarScanner());
        }

        if (this.btnSair) {
            this.btnSair.addEventListener('click', (e) => {
                e.preventDefault();
                this.fazerLogout();
            });
        }
    }

    fazerLogout() {
        // Parar scanner se estiver ativo
        if (this.scannerAtivo) {
            this.pararScanner();
        }
        
        // Remover dados do usuário
        localStorage.removeItem('user');
        
        // Redirecionar para login
        window.location.href = 'index.html';
    }

    async iniciarScanner() {
    if (this.scannerAtivo) {
        // Se já está ativo, vamos parar ao invés de mostrar aviso
        this.pararScanner();
        return;
    }

    try {
        // Verificar suporte a câmera
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            throw new Error('Seu navegador não suporta acesso à câmera');
        }

        // Solicitar permissão para câmera
        this.stream = await navigator.mediaDevices.getUserMedia({
            video: {
                facingMode: 'environment',
                width: { ideal: 1280 },
                height: { ideal: 720 }
            }
        });

        // Mostrar container do scanner
        this.scannerContainer.style.display = 'block';
        
        // Mudar o texto do botão para "Parar Scanner"
        this.iniciarScannerBtn.innerHTML = '<i class="fa fa-stop" aria-hidden="true"></i> Parar Scanner';
        this.iniciarScannerBtn.classList.remove('green');
        this.iniciarScannerBtn.classList.add('red');
        
        // Atualizar status
        this.scannerStatus.innerHTML = '<i class="fas fa-check-circle text-success"></i> Scanner ativo - Aponte para o QR Code';
        this.scannerAtivo = true;

        // Configurar vídeo
        this.videoElement = document.getElementById('qr-video');
        this.videoElement.srcObject = this.stream;
        this.videoElement.setAttribute('playsinline', true);
        
        await this.videoElement.play();

        // Configurar canvas
        this.canvasElement = document.getElementById('qr-canvas');
        this.canvasElement.width = this.videoElement.videoWidth;
        this.canvasElement.height = this.videoElement.videoHeight;

        // Iniciar detecção de QR Code
        this.detectarQRCode();

    } catch (error) {
        console.error('Erro ao iniciar scanner:', error);
        
        let mensagem = 'Erro ao acessar câmera: ';
        
        if (error.name === 'NotAllowedError') {
            mensagem += 'Permissão negada. Verifique as configurações do navegador.';
        } else if (error.name === 'NotFoundError') {
            mensagem += 'Nenhuma câmera encontrada.';
        } else {
            mensagem += error.message;
        }
        
        this.mostrarNotificacao(mensagem, 'error');
        this.pararScanner();
    }
}

    detectarQRCode() {
        if (!this.scannerAtivo) return;

        const canvas = this.canvasElement;
        const video = this.videoElement;
        const context = canvas.getContext('2d');

        if (video.readyState === video.HAVE_ENOUGH_DATA) {
            // Atualizar dimensões do canvas
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;

            // Desenhar frame do vídeo no canvas
            context.drawImage(video, 0, 0, canvas.width, canvas.height);

            // Obter dados da imagem
            const imageData = context.getImageData(0, 0, canvas.width, canvas.height);

            // Usar jsQR para detectar QR Code
            const code = jsQR(imageData.data, imageData.width, imageData.height, {
                inversionAttempts: "dontInvert",
            });

            if (code) {
                // QR Code encontrado!
                this.processarQRCode(code.data);
                
                // Desenhar retângulo ao redor do QR Code
                context.strokeStyle = '#28a745';
                context.lineWidth = 5;
                context.beginPath();
                context.moveTo(code.location.topLeftCorner.x, code.location.topLeftCorner.y);
                context.lineTo(code.location.topRightCorner.x, code.location.topRightCorner.y);
                context.lineTo(code.location.bottomRightCorner.x, code.location.bottomRightCorner.y);
                context.lineTo(code.location.bottomLeftCorner.x, code.location.bottomLeftCorner.y);
                context.closePath();
                context.stroke();

                // Pequena pausa para evitar múltiplas leituras
                setTimeout(() => {
                    if (this.scannerAtivo) requestAnimationFrame(() => this.detectarQRCode());
                }, 2000);
                return;
            }
        }

        // Continuar detecção
        requestAnimationFrame(() => this.detectarQRCode());
    }

    processarQRCode(dadosQR) {
        try {
            // Tentar parsear os dados do QR Code
            let dados;
            
            try {
                dados = JSON.parse(dadosQR);
            } catch {
                // Se não for JSON válido, tentar interpretar como texto simples
                dados = { id: dadosQR, nome: dadosQR };
            }

            // Buscar aluno no localStorage
            const aluno = this.alunos.find(a => 
                a.id === dados.id || 
                a.qrCode === dadosQR || 
                a.nome.toLowerCase().includes(dadosQR.toLowerCase())
            );

            if (!aluno) {
                this.mostrarNotificacao('Aluno não encontrado no sistema!', 'error');
                this.emitirSom('error');
                return;
            }

            const agora = new Date();
            const hoje = agora.toISOString().split('T')[0];
            const horario = agora.toLocaleTimeString('pt-BR', { 
                hour: '2-digit', 
                minute: '2-digit',
                second: '2-digit'
            });

            // Verificar se já foi registrado hoje
            const jaRegistrado = this.presencasHoje.some(p => p.alunoId === aluno.id);

            if (jaRegistrado) {
                this.mostrarNotificacao(`${aluno.nome} já registrou presença hoje!`, 'warning');
                this.emitirSom('warning');
                return;
            }

            // Criar registro de presença
            const novaPresenca = {
                id: Date.now().toString(),
                alunoId: aluno.id,
                alunoNome: aluno.nome,
                turma: aluno.turma,
                data: hoje,
                horario: horario,
                porteiro: this.user?.nome || 'Porteiro',
                timestamp: agora.toISOString()
            };

            // Adicionar à lista de presenças
            this.presencas.push(novaPresenca);
            this.presencasHoje.unshift(novaPresenca);

            // Salvar no localStorage
            localStorage.setItem('presencas', JSON.stringify(this.presencas));

            // Atualizar interface
            this.atualizarInterface();

            // Mostrar última leitura
            this.ultimaLeitura.style.display = 'block';
            this.ultimoAluno.textContent = `${aluno.nome} - ${aluno.turma} (${horario})`;

            // Notificação de sucesso
            this.mostrarNotificacao(`Presença registrada: ${aluno.nome}`, 'success');
            this.emitirSom('success');

        } catch (error) {
            console.error('Erro ao processar QR Code:', error);
            this.mostrarNotificacao('Erro ao processar QR Code', 'error');
            this.emitirSom('error');
        }
    }

    pararScanner() {
    console.log('Parando scanner...'); // Para debug
    
    this.scannerAtivo = false;
    
    // Parar stream da câmera
    if (this.stream) {
        this.stream.getTracks().forEach(track => {
            track.stop();
            console.log('Track parada:', track.kind);
        });
        this.stream = null;
    }

    // Limpar o vídeo
    if (this.videoElement) {
        this.videoElement.srcObject = null;
    }

    // Ocultar container do scanner
    if (this.scannerContainer) {
        this.scannerContainer.style.display = 'none';
    }
    
    // Restaurar botão
    if (this.iniciarScannerBtn) {
        this.iniciarScannerBtn.innerHTML = '<i class="fa fa-camera" aria-hidden="true"></i> Iniciar Scanner';
        this.iniciarScannerBtn.classList.remove('red');
        this.iniciarScannerBtn.classList.add('green');
    }

    // Limpar status
    if (this.scannerStatus) {
        this.scannerStatus.innerHTML = '';
    }

    this.mostrarNotificacao('Scanner parado', 'info');
    console.log('Scanner parado com sucesso');
}

    emitirSom(tipo = 'success') {
        try {
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();

            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);

            if (tipo === 'success') {
                oscillator.frequency.value = 800;
            } else if (tipo === 'error') {
                oscillator.frequency.value = 300;
            } else {
                oscillator.frequency.value = 600;
            }

            oscillator.type = 'sine';
            gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);

            oscillator.start();
            oscillator.stop(audioContext.currentTime + 0.3);
        } catch (error) {
            console.log('Som não disponível');
        }
    }

    atualizarInterface() {
        // Atualizar total de alunos
        if (this.totalAlunosElement) {
            this.totalAlunosElement.textContent = this.alunos.length;
        }

        // Atualizar presenças de hoje
        if (this.presentesHojeElement) {
            this.presentesHojeElement.textContent = this.presencasHoje.length;
        }

        // Atualizar tabela de presenças
        this.atualizarTabelaPresencas();

        // Atualizar turmas
        this.atualizarTurmas();
    }

    atualizarTabelaPresencas() {
        if (!this.tabelaPresencas) return;

        if (this.presencasHoje.length === 0) {
            this.tabelaPresencas.innerHTML = `
                <tr>
                    <td colspan="4" class="mensagem-vazia">Nenhuma presença hoje</td>
                </tr>
            `;
            return;
        }

        this.tabelaPresencas.innerHTML = this.presencasHoje
            .map(p => `
                <tr>
                    <td>${p.alunoNome}</td>
                    <td>${p.turma}</td>
                    <td>${p.horario}</td>
                    <td>${p.porteiro}</td>
                </tr>
            `).join('');
    }

    atualizarTurmas() {
        if (!this.turmasContainer) return;

        if (this.turmas.length === 0) {
            this.turmasContainer.innerHTML = '<div class="carregando">Nenhuma turma cadastrada</div>';
            return;
        }

        // Agrupar presenças por turma
        const presencasPorTurma = {};
        this.presencasHoje.forEach(p => {
            presencasPorTurma[p.turma] = (presencasPorTurma[p.turma] || 0) + 1;
        });

        // Contar alunos por turma
        const alunosPorTurma = {};
        this.alunos.forEach(a => {
            alunosPorTurma[a.turma] = (alunosPorTurma[a.turma] || 0) + 1;
        });

        this.turmasContainer.innerHTML = `
            <div class="turmas-grid">
                ${this.turmas.map(turma => {
                    const totalAlunos = alunosPorTurma[turma.nome] || 0;
                    const presentes = presencasPorTurma[turma.nome] || 0;
                    const percentual = totalAlunos > 0 ? Math.round((presentes / totalAlunos) * 100) : 0;
                    
                    return `
                        <div class="card-turma">
                            <div class="turma-nome">${turma.nome}</div>
                            <div class="turma-curso">${turma.curso}</div>
                            <div class="turma-presencas">
                                <strong>${presentes}/${totalAlunos}</strong> alunos
                            </div>
                            <div class="progresso-container">
                                <div class="progresso-bar" style="width: ${percentual}%"></div>
                            </div>
                            <div class="turma-percentual">${percentual}%</div>
                        </div>
                    `;
                }).join('')}
            </div>
        `;
    }

    mostrarNotificacao(mensagem, tipo = 'info') {
        const notificacao = document.createElement('div');
        notificacao.className = `notificacao notificacao-${tipo}`;
        
        const icones = {
            success: 'fa-check-circle',
            error: 'fa-exclamation-circle',
            warning: 'fa-exclamation-triangle',
            info: 'fa-info-circle'
        };

        notificacao.innerHTML = `
            <i class="fas ${icones[tipo]} me-2"></i>
            <span>${mensagem}</span>
        `;

        document.body.appendChild(notificacao);

        // Remover após 3 segundos
        setTimeout(() => {
            notificacao.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => notificacao.remove(), 300);
        }, 3000);
    }

    adicionarEstilos() {
        const style = document.createElement('style');
        style.textContent = `
            .user-info {
                display: flex;
                align-items: center;
                gap: 15px;
            }

            #userNameDisplay {
                color: white;
                font-weight: 500;
            }

            .dropdown-toggle {
                color: white !important;
                font-size: 1.5rem;
                padding: 0;
            }

            .dropdown-toggle:hover {
                color: rgba(255,255,255,0.8) !important;
            }

            .dropdown-menu {
                min-width: 200px;
            }

            .button.red {
                background-color: #dc3545;
            }

            .button.red:hover {
                background-color: #c82333;
            }

            .scanner-wrapper {
                position: relative;
                width: 100%;
                max-width: 500px;
                margin: 0 auto;
                border-radius: 10px;
                overflow: hidden;
                border: 3px solid #28a745;
            }

            #qr-video {
                width: 100%;
                height: auto;
                display: block;
            }

            .scanner-overlay {
                position: absolute;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                pointer-events: none;
            }

            .scanner-line {
                position: absolute;
                left: 0;
                right: 0;
                height: 2px;
                background: linear-gradient(90deg, transparent, #28a745, transparent);
                animation: scan 2s linear infinite;
            }

            @keyframes scan {
                0% { top: 0; }
                50% { top: 100%; }
                100% { top: 0; }
            }

            .scanner-status {
                text-align: center;
                margin-top: 10px;
                padding: 10px;
                background: #f8f9fa;
                border-radius: 5px;
            }

            .notificacao {
                position: fixed;
                top: 20px;
                right: 20px;
                padding: 15px 20px;
                border-radius: 5px;
                box-shadow: 0 4px 6px rgba(0,0,0,0.1);
                z-index: 9999;
                animation: slideIn 0.3s ease;
                display: flex;
                align-items: center;
                min-width: 300px;
                color: white;
            }

            .notificacao-success { background: #28a745; }
            .notificacao-error { background: #dc3545; }
            .notificacao-warning { background: #ffc107; color: #333; }
            .notificacao-info { background: #17a2b8; }

            @keyframes slideIn {
                from { transform: translateX(100%); opacity: 0; }
                to { transform: translateX(0); opacity: 1; }
            }

            @keyframes slideOut {
                from { transform: translateX(0); opacity: 1; }
                to { transform: translateX(100%); opacity: 0; }
            }

            .turmas-grid {
                display: grid;
                grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
                gap: 15px;
                margin-top: 15px;
            }

            .card-turma {
                background: white;
                border-radius: 10px;
                padding: 15px;
                box-shadow: 0 2px 4px rgba(0,0,0,0.1);
                border: 1px solid #e0e0e0;
                transition: transform 0.2s;
            }

            .card-turma:hover {
                transform: translateY(-2px);
                box-shadow: 0 4px 8px rgba(0,0,0,0.15);
            }

            .turma-nome {
                font-size: 1.1rem;
                font-weight: bold;
                color: #333;
                margin-bottom: 5px;
            }

            .turma-curso {
                font-size: 0.9rem;
                color: #666;
                margin-bottom: 10px;
            }

            .turma-presencas {
                font-size: 0.95rem;
                color: #28a745;
                margin-bottom: 10px;
            }

            .progresso-container {
                width: 100%;
                height: 8px;
                background: #e0e0e0;
                border-radius: 4px;
                overflow: hidden;
                margin: 10px 0;
            }

            .progresso-bar {
                height: 100%;
                background: linear-gradient(90deg, #28a745, #20c997);
                border-radius: 4px;
                transition: width 0.5s ease;
            }

            .turma-percentual {
                font-size: 0.9rem;
                color: #28a745;
                font-weight: 500;
                text-align: right;
            }

            .carregando {
                text-align: center;
                padding: 30px;
                color: #666;
            }

            .table {
                width: 100%;
                margin-bottom: 0;
            }

            .table th {
                background: #f8f9fa;
                border-bottom: 2px solid #dee2e6;
            }

            .mensagem-vazia {
                text-align: center;
                color: #999;
                padding: 20px;
            }

            .mt-3 { margin-top: 1rem; }
            .me-2 { margin-right: 0.5rem; }
        `;
        document.head.appendChild(style);
    }
}

// Inicializar o sistema quando a página carregar
document.addEventListener('DOMContentLoaded', () => {
    window.sistemaPorteiro = new SistemaPorteiro();
});