import 'package:flutter/material.dart';
import '../../models/app_models.dart';
import '../../theme/app_theme.dart';
import '../chat/chat_screen.dart';

class ProfessionalProfileScreen extends StatefulWidget {
  final ProfessionalModel professional;
  final bool initialIsOwner;

  const ProfessionalProfileScreen({
    super.key,
    required this.professional,
    this.initialIsOwner = false,
  });

  @override
  State<ProfessionalProfileScreen> createState() => _ProfessionalProfileScreenState();
}

class _ProfessionalProfileScreenState extends State<ProfessionalProfileScreen> with SingleTickerProviderStateMixin {
  late TabController _tabController;
  late bool _isOwner;
  bool _isFavorited = false;

  // Lista local de publicações da vitrine (Estilo Instagram)
  late List<Map<String, dynamic>> _posts;
  late List<Map<String, String>> _services;
  late List<Map<String, dynamic>> _reviews;

  @override
  void initState() {
    super.initState();
    _isOwner = widget.initialIsOwner;
    _tabController = TabController(length: 3, vsync: this);

    _services = [
      {'title': 'Instalação de Split 9.000 a 12.000 BTUs', 'price': 'R$ 250,00', 'unit': 'por serviço'},
      {'title': 'Higienização Completa com Carga de Gás', 'price': 'R$ 180,00', 'unit': 'por aparelho'},
      {'title': 'Manutenção Preventiva & Troca de Peças', 'price': 'A partir de R$ 90,00', 'unit': 'a combinar'},
    ];

    _posts = [
      {
        'id': 'post_1',
        'title': 'Instalação de Split 12.000 BTUs Inverter',
        'category': 'Instalação de Split',
        'neighborhood': widget.professional.neighborhood,
        'date': 'Há 2 dias',
        'color': Colors.blue.shade900,
        'icon': Icons.ac_unit,
        'desc': 'Instalação completa com furação limpa, tubulação de cobre isolada termicamente, dreno nivelado e vácuo a 450 microns. Consumo reduzido e ruído zero.',
        'likes': 24,
      },
      {
        'id': 'post_2',
        'title': 'Higienização Química com Carga de Gás R410A',
        'category': 'Higienização de Ar',
        'neighborhood': 'Rio Verde',
        'date': 'Há 4 dias',
        'color': Colors.teal.shade800,
        'icon': Icons.cleaning_services,
        'desc': 'Desmonte completo da evaporadora, aplicação de bactericida certificado na serpentina e turbina. Ar saindo a 16°C com fluxo livre.',
        'likes': 19,
      },
      {
        'id': 'post_3',
        'title': 'Correção de Dreno com Vazamento no Quarto',
        'category': 'Conserto de Dreno',
        'neighborhood': 'União',
        'date': 'Há 1 semana',
        'color': Colors.deepPurple.shade800,
        'icon': Icons.water_drop,
        'desc': 'Cliente com água caindo sobre a cama. Dreno plástico desobstruído com nitrogênio e calha alinhada. Problema sanado em 40 minutos.',
        'likes': 15,
      },
      {
        'id': 'post_4',
        'title': 'Instalação Comercial de 2 Splits 24.000',
        'category': 'Projetos Comerciais',
        'neighborhood': 'Beira Rio',
        'date': 'Há 2 semanas',
        'color': Colors.indigo.shade900,
        'icon': Icons.business,
        'desc': 'Climatização de escritório de contabilidade. Suporte externo com amortecedores antivibração e circuito elétrico dedicado padrão Equatorial.',
        'likes': 31,
      },
      {
        'id': 'post_5',
        'title': 'Troca de Capacitor & Manutenção de Placa',
        'category': 'Manutenção Elétrica',
        'neighborhood': 'Nova Carajás',
        'date': 'Há 3 semanas',
        'color': Colors.amber.shade900,
        'icon': Icons.bolt,
        'desc': 'Condensadora não partia no calor da tarde. Troca de capacitor duplo 35+5uF original e reaperto dos bornes. Aparelho gelando na hora.',
        'likes': 12,
      },
      {
        'id': 'post_6',
        'title': 'Higienização Preventiva Pré-Verão',
        'category': 'Manutenção Preventiva',
        'neighborhood': widget.professional.neighborhood,
        'date': 'Há 1 mês',
        'color': Colors.grey.shade900,
        'icon': Icons.wind_power,
        'desc': 'Limpeza de filtros, lubrificação da bucha do motor ventilador e aplicação de película protetora contra corrosão.',
        'likes': 18,
      },
    ];

    _reviews = [
      {
        'author': 'Mariana S.',
        'neighborhood': 'Cidade Nova',
        'rating': 5.0,
        'date': 'Há 2 dias',
        'comment': 'Excelente profissional! Chegou no horário marcado no Cidade Nova e fez a instalação limpa do split. Testou tudo antes de ir embora.',
      },
      {
        'author': 'Roberto C.',
        'neighborhood': 'Rio Verde',
        'rating': 5.0,
        'date': 'Há 1 semana',
        'comment': 'Fez a higienização do ar do meu comércio. O quarto voltou a gelar em 10 minutos. Muito atencioso e preço justo.',
      },
      {
        'author': 'Patrícia Lima',
        'neighborhood': 'União',
        'rating': 4.8,
        'date': 'Há 2 semanas',
        'comment': 'Trabalho limpo, recolheu toda a sujeira da furação e emitiu recibo com garantia. Recomendo demais em Parauapebas!',
      },
    ];
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  void _openPostDetail(Map<String, dynamic> post) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) => Container(
        height: MediaQuery.of(context).size.height * 0.85,
        decoration: const BoxDecoration(
          color: AppTheme.cardWhite,
          borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Barra do Modal
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Text('Publicação do Serviço', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
                  if (_isOwner)
                    IconButton(
                      icon: const Icon(Icons.delete_outline, color: AppTheme.errorRed),
                      onPressed: () {
                        setState(() {
                          _posts.removeWhere((p) => p['id'] == post['id']);
                        });
                        Navigator.pop(context);
                        ScaffoldMessenger.of(context).showSnackBar(
                          const SnackBar(content: Text('Publicação excluída da sua vitrine.')),
                        );
                      },
                    )
                  else
                    IconButton(
                      icon: const Icon(Icons.close),
                      onPressed: () => Navigator.pop(context),
                    ),
                ],
              ),
            ),
            const Divider(height: 1),

            // Imagem em Destaque
            Container(
              height: 240,
              width: double.infinity,
              color: post['color'] as Color,
              child: Center(
                child: Icon(post['icon'] as IconData, size: 72, color: Colors.white38),
              ),
            ),

            // Detalhes
            Expanded(
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Expanded(
                          child: Text(
                            post['title'],
                            style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 16),
                          ),
                        ),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                          decoration: BoxDecoration(
                            color: AppTheme.softPurple,
                            borderRadius: BorderRadius.circular(6),
                          ),
                          child: Text(
                            post['category'],
                            style: const TextStyle(color: AppTheme.primaryPurple, fontSize: 10, fontWeight: FontWeight.bold),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 4),
                    Text(
                      '${post['neighborhood']}, Parauapebas • ${post['date']}',
                      style: TextStyle(color: AppTheme.textSecondary, fontSize: 11),
                    ),
                    const SizedBox(height: 12),
                    Text(
                      post['desc'],
                      style: const TextStyle(fontSize: 13, height: 1.4, color: AppTheme.textPrimary),
                    ),
                    const Spacer(),
                    if (!_isOwner)
                      SizedBox(
                        width: double.infinity,
                        height: 46,
                        child: ElevatedButton.icon(
                          onPressed: () {
                            Navigator.pop(context);
                            _showRequestQuoteDialog(prefilledTitle: post['title']);
                          },
                          icon: const Icon(Icons.auto_awesome, color: Colors.white),
                          label: const Text('Solicitar este mesmo serviço', style: TextStyle(fontWeight: FontWeight.bold, color: Colors.white)),
                          style: ElevatedButton.styleFrom(
                            backgroundColor: AppTheme.primaryPurple,
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                          ),
                        ),
                      ),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  void _showCreatePostDialog() {
    final titleController = TextEditingController();
    final descController = TextEditingController();
    String selectedCategory = _services.first['title']!;

    showDialog(
      context: context,
      builder: (context) => StatefulBuilder(
        builder: (context, setDialogState) => AlertDialog(
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
          title: const Text('Nova Publicação de Serviço', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
          content: SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Prévia de Foto
                Container(
                  height: 120,
                  width: double.infinity,
                  decoration: BoxDecoration(
                    color: Colors.blue.shade900,
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: const Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(Icons.camera_alt, color: Colors.white, size: 36),
                      SizedBox(height: 6),
                      Text('Foto do serviço selecionada', style: TextStyle(color: Colors.white, fontSize: 11, fontWeight: FontWeight.bold)),
                    ],
                  ),
                ),
                const SizedBox(height: 12),
                TextField(
                  controller: titleController,
                  decoration: const InputDecoration(labelText: 'Título do serviço executado'),
                ),
                const SizedBox(height: 10),
                DropdownButtonFormField<String>(
                  value: selectedCategory,
                  decoration: const InputDecoration(labelText: 'Serviço relacionado'),
                  items: _services.map((s) => DropdownMenuItem(value: s['title'], child: Text(s['title']!, style: const TextStyle(fontSize: 12)))).toList(),
                  onChanged: (val) {
                    if (val != null) setDialogState(() => selectedCategory = val);
                  },
                ),
                const SizedBox(height: 10),
                TextField(
                  controller: descController,
                  maxLines: 3,
                  decoration: const InputDecoration(labelText: 'Descrição técnica e resultado obtido'),
                ),
              ],
            ),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(context),
              child: const Text('Cancelar', style: TextStyle(color: AppTheme.textSecondary)),
            ),
            ElevatedButton(
              onPressed: () {
                if (titleController.text.trim().isEmpty) return;
                setState(() {
                  _posts.insert(0, {
                    'id': 'post_${DateTime.now().millisecondsSinceEpoch}',
                    'title': titleController.text.trim(),
                    'category': selectedCategory,
                    'neighborhood': widget.professional.neighborhood,
                    'date': 'Agora mesmo',
                    'color': Colors.blue.shade900,
                    'icon': Icons.verified,
                    'desc': descController.text.trim().isEmpty ? 'Serviço realizado com alta qualidade técnica.' : descController.text.trim(),
                    'likes': 1,
                  });
                });
                Navigator.pop(context);
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(content: Text('✨ Publicação adicionada à sua vitrine!')),
                );
              },
              child: const Text('Publicar na Vitrine'),
            ),
          ],
        ),
      ),
    );
  }

  void _showRequestQuoteDialog({String? prefilledTitle}) {
    final titleController = TextEditingController(text: prefilledTitle ?? '');
    final descController = TextEditingController();

    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        title: const Text('Solicitar Orçamento', style: TextStyle(fontWeight: FontWeight.bold)),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Para: ${widget.professional.fullName}', style: const TextStyle(color: AppTheme.textSecondary, fontSize: 13)),
            const SizedBox(height: 12),
            TextField(
              controller: titleController,
              decoration: const InputDecoration(labelText: 'Título do serviço (ex: Troca de disjuntor)'),
            ),
            const SizedBox(height: 10),
            TextField(
              controller: descController,
              maxLines: 3,
              decoration: const InputDecoration(labelText: 'Descreva o que precisa e seu bairro'),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Cancelar', style: TextStyle(color: AppTheme.textSecondary)),
          ),
          ElevatedButton(
            onPressed: () {
              Navigator.pop(context);
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(
                  content: Text('Solicitação enviada com sucesso! O profissional responderá no chat.'),
                  backgroundColor: AppTheme.successGreen,
                ),
              );
            },
            child: const Text('Enviar Orçamento'),
          ),
        ],
      ),
    );
  }

  bool _isBioExpanded = false;

  void _showServicesBottomSheet() {
    showModalBottomSheet(
      context: context,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
      builder: (context) => Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Container(
                  width: 32,
                  height: 32,
                  decoration: BoxDecoration(
                    color: AppTheme.softPurple,
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: const Icon(Icons.work_outline, color: AppTheme.primaryPurple, size: 18),
                ),
                const SizedBox(width: 10),
                const Text('Meus Serviços Oferecidos', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
                const Spacer(),
                IconButton(icon: const Icon(Icons.close), onPressed: () => Navigator.pop(context)),
              ],
            ),
            const Divider(),
            ..._services.map((s) => Container(
              margin: const EdgeInsets.only(bottom: 8),
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                border: Border.all(color: AppTheme.borderGrey),
                borderRadius: BorderRadius.circular(10),
              ),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(s['title']!, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
                      Text(s['price']!, style: const TextStyle(color: AppTheme.primaryPurple, fontWeight: FontWeight.bold, fontSize: 12)),
                    ],
                  ),
                  if (!_isOwner)
                    ElevatedButton(
                      onPressed: () {
                        Navigator.pop(context);
                        _showRequestQuoteDialog(prefilledTitle: s['title']);
                      },
                      style: ElevatedButton.styleFrom(
                        backgroundColor: AppTheme.softPurple,
                        foregroundColor: AppTheme.primaryPurple,
                        elevation: 0,
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                      ),
                      child: const Text('Solicitar', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 11)),
                    ),
                ],
              ),
            )),
            if (_isOwner) ...[
              const SizedBox(height: 8),
              SizedBox(
                width: double.infinity,
                child: OutlinedButton.icon(
                  onPressed: () {
                    Navigator.pop(context);
                    ScaffoldMessenger.of(context).showSnackBar(
                      const SnackBar(content: Text('Gerenciador de serviços aberto')),
                    );
                  },
                  icon: const Icon(Icons.add),
                  label: const Text('Adicionar / Gerenciar Serviços'),
                  style: OutlinedButton.styleFrom(
                    foregroundColor: AppTheme.primaryPurple,
                    side: const BorderSide(color: AppTheme.primaryPurple),
                  ),
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }

  void _showReviewsBottomSheet() {
    showModalBottomSheet(
      context: context,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
      builder: (context) => Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                const Icon(Icons.star, color: Colors.amber, size: 22),
                const SizedBox(width: 8),
                const Text('Avaliações de Clientes', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
                const Spacer(),
                IconButton(icon: const Icon(Icons.close), onPressed: () => Navigator.pop(context)),
              ],
            ),
            const Divider(),
            ..._reviews.map((r) => Container(
              margin: const EdgeInsets.only(bottom: 10),
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                border: Border.all(color: AppTheme.borderGrey),
                borderRadius: BorderRadius.circular(10),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(r['author'], style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
                      Text(r['date'], style: TextStyle(color: AppTheme.textSecondary, fontSize: 11)),
                    ],
                  ),
                  Text('${r['neighborhood']}', style: TextStyle(color: AppTheme.textSecondary, fontSize: 10)),
                  const SizedBox(height: 4),
                  Text('"${r['comment']}"', style: const TextStyle(fontSize: 12, height: 1.3)),
                ],
              ),
            )),
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final pro = widget.professional;
    final handle = pro.fullName.toLowerCase().replaceAll(' ', '.');

    return Scaffold(
      backgroundColor: AppTheme.cardWhite,
      appBar: AppBar(
        backgroundColor: AppTheme.cardWhite,
        elevation: 0,
        centerTitle: true,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back, color: AppTheme.textPrimary),
          onPressed: () => Navigator.pop(context),
        ),
        title: Text(
          handle,
          style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 16, color: AppTheme.textPrimary),
        ),
        actions: [
          PopupMenuButton<String>(
            icon: const Icon(Icons.more_horiz, color: AppTheme.textPrimary),
            onSelected: (value) {
              if (value == 'toggle') {
                setState(() => _isOwner = !_isOwner);
                ScaffoldMessenger.of(context).showSnackBar(
                  SnackBar(
                    content: Text(_isOwner ? '💼 Modo Dono ativado' : '👁️ Modo Visitante ativado'),
                    duration: const Duration(seconds: 1),
                  ),
                );
              } else if (value == 'share') {
                ScaffoldMessenger.of(context).showSnackBar(
                  SnackBar(content: Text('Link do perfil de ${pro.fullName} copiado!')),
                );
              }
            },
            itemBuilder: (context) => [
              PopupMenuItem(
                value: 'toggle',
                child: Row(
                  children: [
                    Icon(_isOwner ? Icons.visibility : Icons.admin_panel_settings, size: 18),
                    const SizedBox(width: 8),
                    Text(_isOwner ? 'Ver como Visitante' : 'Alternar para Modo Dono'),
                  ],
                ),
              ),
              const PopupMenuItem(
                value: 'share',
                child: Row(
                  children: [
                    Icon(Icons.share, size: 18),
                    const SizedBox(width: 8),
                    Text('Compartilhar perfil'),
                  ],
                ),
              ),
            ],
          ),
        ],
      ),
      body: SingleChildScrollView(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Bloco Superior: Avatar + Nome + Métricas
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
              child: Row(
                children: [
                  Container(
                    width: 76,
                    height: 76,
                    padding: const EdgeInsets.all(2.5),
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      border: Border.all(color: AppTheme.primaryPurple, width: 2.5),
                    ),
                    child: CircleAvatar(
                      backgroundColor: AppTheme.darkPurple,
                      child: Text(
                        pro.fullName.isNotEmpty ? pro.fullName[0] : 'C',
                        style: const TextStyle(fontSize: 28, fontWeight: FontWeight.bold, color: Colors.white),
                      ),
                    ),
                  ),
                  const SizedBox(width: 16),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          pro.fullName,
                          style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 16.5, color: AppTheme.textPrimary),
                        ),
                        const SizedBox(height: 2),
                        Text(
                          pro.specialty,
                          style: TextStyle(color: AppTheme.textSecondary, fontSize: 13),
                        ),
                        const SizedBox(height: 8),
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            _buildStatColumn('32', 'Trabalhos'),
                            InkWell(
                              onTap: _showReviewsBottomSheet,
                              child: _buildStatColumn('28', 'Avaliações'),
                            ),
                            InkWell(
                              onTap: _showReviewsBottomSheet,
                              child: _buildStatColumn('4,9', 'Nota', hasStar: true),
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),

            // Bloco Bio & Descrição
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Row(
                    children: [
                      Text('⚡', style: TextStyle(fontSize: 14)),
                      SizedBox(width: 4),
                      Text(
                        'Instalações e manutenção elétrica',
                        style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13.5, color: AppTheme.textPrimary),
                      ),
                    ],
                  ),
                  const SizedBox(height: 4),
                  const Text(
                    'Serviços residenciais e comerciais. Instalações, iluminação, chuveiros e reparos elétricos.',
                    style: TextStyle(fontSize: 13, height: 1.35, color: Color(0xFF374151)),
                  ),
                  const SizedBox(height: 4),
                  Row(
                    children: [
                      const Icon(Icons.location_on, size: 13, color: AppTheme.textSecondary),
                      const SizedBox(width: 3),
                      Text('Parauapebas, PA', style: TextStyle(color: AppTheme.textSecondary, fontSize: 12.5)),
                    ],
                  ),
                  const SizedBox(height: 4),
                  InkWell(
                    onTap: () {
                      setState(() => _isBioExpanded = !_isBioExpanded);
                    },
                    child: Text(
                      _isBioExpanded ? 'Ver menos' : 'Ver descrição completa',
                      style: const TextStyle(color: AppTheme.primaryPurple, fontWeight: FontWeight.bold, fontSize: 13),
                    ),
                  ),
                  if (_isBioExpanded) ...[
                    const SizedBox(height: 6),
                    Container(
                      padding: const EdgeInsets.all(8),
                      decoration: BoxDecoration(
                        color: const Color(0xFFF9FAFB),
                        border: const Border(left: BorderSide(color: AppTheme.primaryPurple, width: 3)),
                        borderRadius: BorderRadius.circular(6),
                      ),
                      child: const Text(
                        'Mais de 8 anos de experiência em Parauapebas. Atendimento nos bairros Cidade Nova, Rio Verde, União e Nova Carajás. Instalação e manutenção de quadros de distribuição, disjuntores DIN, DPS, IDR e adequação ao padrão Equatorial Energia.',
                        style: TextStyle(fontSize: 12, color: Color(0xFF4B5563), height: 1.35),
                      ),
                    ),
                  ],
                ],
              ),
            ),

            const SizedBox(height: 8),

            // Linha de Botões de Ação
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16),
              child: Row(
                children: [
                  Expanded(
                    child: ElevatedButton(
                      onPressed: () {
                        if (_isOwner) {
                          ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Edição de perfil')));
                        } else {
                          Navigator.push(
                            context,
                            MaterialPageRoute(
                              builder: (context) => ChatScreen(
                                contactName: pro.fullName,
                                serviceTitle: pro.specialty,
                              ),
                            ),
                          );
                        }
                      },
                      style: ElevatedButton.styleFrom(
                        backgroundColor: AppTheme.primaryPurple,
                        foregroundColor: Colors.white,
                        elevation: 0,
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                        padding: const EdgeInsets.symmetric(vertical: 10),
                      ),
                      child: Text(
                        _isOwner ? 'Editar perfil' : 'Conversar',
                        style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13),
                      ),
                    ),
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: OutlinedButton(
                      onPressed: () {
                        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Link de ${pro.fullName} copiado!')));
                      },
                      style: OutlinedButton.styleFrom(
                        foregroundColor: AppTheme.primaryPurple,
                        side: const BorderSide(color: AppTheme.primaryPurple, width: 1.5),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                        padding: const EdgeInsets.symmetric(vertical: 10),
                      ),
                      child: const Text(
                        'Compartilhar perfil',
                        style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13),
                      ),
                    ),
                  ),
                  const SizedBox(width: 8),
                  Container(
                    width: 38,
                    height: 38,
                    decoration: BoxDecoration(
                      border: Border.all(color: const Color(0xFFE5E7EB), width: 1.5),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: IconButton(
                      padding: EdgeInsets.zero,
                      icon: const Icon(Icons.share, size: 16, color: Color(0xFF374151)),
                      onPressed: () {
                        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Compartilhando perfil de ${pro.fullName}')));
                      },
                    ),
                  ),
                ],
              ),
            ),

            const SizedBox(height: 12),

            // Divisória sutil
            Container(
              height: 6,
              color: const Color(0xFFFAF9FC),
            ),

            // Card Meus Serviços
            InkWell(
              onTap: _showServicesBottomSheet,
              child: Container(
                margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  border: Border.all(color: const Color(0xFFE5E7EB)),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Row(
                  children: [
                    Container(
                      width: 36,
                      height: 36,
                      decoration: BoxDecoration(
                        color: AppTheme.softPurple,
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: const Icon(Icons.work_outline, color: AppTheme.primaryPurple, size: 18),
                    ),
                    const SizedBox(width: 12),
                    const Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text('Meus serviços', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14, color: AppTheme.textPrimary)),
                          SizedBox(height: 2),
                          Text('Especialidades e serviços oferecidos', style: TextStyle(fontSize: 12, color: Color(0xFF6B7280))),
                        ],
                      ),
                    ),
                    const Icon(Icons.chevron_right, color: Color(0xFF9CA3AF), size: 18),
                  ],
                ),
              ),
            ),

            // Seção Meus Trabalhos
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Text('Meus trabalhos', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 15, color: AppTheme.textPrimary)),
                  if (_isOwner)
                    InkWell(
                      onTap: _showCreatePostDialog,
                      child: const Text('+ Nova publicação', style: TextStyle(color: AppTheme.primaryPurple, fontWeight: FontWeight.bold, fontSize: 13)),
                    )
                  else
                    const Text('Ver todas', style: TextStyle(color: AppTheme.primaryPurple, fontWeight: FontWeight.bold, fontSize: 13)),
                ],
              ),
            ),

            // Grade 3 Colunas de Trabalhos
            GridView.builder(
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
              gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                crossAxisCount: 3,
                crossAxisSpacing: 6,
                mainAxisSpacing: 6,
                childAspectRatio: 0.8,
              ),
              itemCount: _posts.length,
              itemBuilder: (context, index) {
                final post = _posts[index];
                return InkWell(
                  onTap: () => _openPostDetail(post),
                  child: Container(
                    decoration: BoxDecoration(
                      color: post['color'] as Color,
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Stack(
                      children: [
                        Center(child: Icon(post['icon'] as IconData, color: Colors.white38, size: 32)),
                        Positioned(
                          bottom: 6,
                          left: 6,
                          right: 6,
                          child: Text(
                            post['title'],
                            maxLines: 2,
                            overflow: TextOverflow.ellipsis,
                            style: const TextStyle(color: Colors.white, fontSize: 9.5, fontWeight: FontWeight.bold, shadows: [Shadow(color: Colors.black, blurRadius: 4)]),
                          ),
                        ),
                      ],
                    ),
                  ),
                );
              },
            ),

            const SizedBox(height: 30),
          ],
        ),
      ),
    );
  }

  Widget _buildStatColumn(String number, String label, {bool hasStar = false}) {
    return Column(
      children: [
        Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            if (hasStar) ...[
              const Icon(Icons.star_border, color: Colors.amber, size: 14),
              const SizedBox(width: 2),
            ],
            Text(number, style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 16.5, color: AppTheme.textPrimary)),
          ],
        ),
        const SizedBox(height: 2),
        Text(label, style: const TextStyle(color: Color(0xFF6B7280), fontSize: 11.5)),
      ],
    );
  }
}

