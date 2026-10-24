import 'package:flutter/material.dart';
import '../../models/app_models.dart';
import '../../services/marketplace_service.dart';
import '../../theme/app_theme.dart';
import '../professional/professional_profile_screen.dart';

class SearchScreen extends StatefulWidget {
  const SearchScreen({super.key});

  @override
  State<SearchScreen> createState() => _SearchScreenState();
}

class _SearchScreenState extends State<SearchScreen> {
  final MarketplaceService _service = MarketplaceService();
  String _activeTroubleKey = 'ar_pingando';
  String _selectedPriceService = 'split_instalacao';

  final Map<String, Map<String, dynamic>> _troubles = {
    'ar_pingando': {
      'pill': '❄️ Ar pingando água',
      'title': 'Ar-condicionado pingando no quarto',
      'urgent': 'Muito comum em Parauapebas',
      'cause': 'Acúmulo de sujeira no dreno plástico ou inclinação inadequada da calha evaporadora.',
      'price': 'R$ 80 a R$ 130',
      'pro': 'Técnico de Refrigeração',
    },
    'disjuntor_caindo': {
      'pill': '⚡ Chuveiro caindo disjuntor',
      'title': 'Disjuntor desarmando com chuveiro ou ar',
      'urgent': 'Risco de curto-circuito',
      'cause': 'Fiação superaquecendo por bitola insuficiente ou disjuntor frouxo com desgaste mecânico.',
      'price': 'R$ 70 a R$ 140',
      'pro': 'Eletricista Residencial',
    },
    'pia_entupida': {
      'pill': '🚰 Pia voltando água',
      'title': 'Pia da cozinha ou ralo com mau cheiro',
      'urgent': 'Urgente / Higiene',
      'cause': 'Caixa de gordura saturada ou obstrução no sifão por resíduos orgânicos.',
      'price': 'R$ 90 a R$ 150',
      'pro': 'Encanador & Desentupidor',
    },
    'porta_raspando': {
      'pill': '🚪 Porta emperrando no chão',
      'title': 'Porta de madeira raspando ou não travando',
      'urgent': 'Desconforto diário',
      'cause': 'Empenamento da folha por umidade e calor ou dobradiças frouxas no batente.',
      'price': 'R$ 60 a R$ 110',
      'pro': 'Montador / Marceneiro',
    },
    'carro_nao_liga': {
      'pill': '🚗 Carro não liga na garagem',
      'title': 'Carro fez "tlec" e não dá partida de manhã',
      'urgent': 'Socorro Imediato',
      'cause': 'Bateria descarregada, terminais oxidados ou alternador com falha de carga.',
      'price': 'R$ 60 a R$ 120 (socorro)',
      'pro': 'Auto Socorro / Mecânico',
    },
    'tomada_estalos': {
      'pill': '🔥 Tomada cheirando queimado',
      'title': 'Tomada com estalos ou esquentando',
      'urgent': 'Risco iminente de fogo',
      'cause': 'Mau contato nos parafusos da tomada ou plugue derretendo devido a alta amperagem.',
      'price': 'R$ 50 a R$ 90',
      'pro': 'Eletricista Residencial',
    },
  };

  final Map<String, Map<String, dynamic>> _priceGuide = {
    'split_instalacao': {
      'name': 'Instalação de Split 12.000 BTUs',
      'min': 'R$ 220',
      'avg': 'R$ 250',
      'max': 'R$ 320',
      'desc': 'Inclui furação, até 3m de tubulação de cobre e teste de estanqueidade.',
    },
    'split_limpeza': {
      'name': 'Higienização Química de Split',
      'min': 'R$ 130',
      'avg': 'R$ 160',
      'max': 'R$ 200',
      'desc': 'Desmonte da turbina, lavagem de bandeja e aplicação de produto bactericida.',
    },
    'diaria_diarista': {
      'name': 'Diária de Faxina Residencial',
      'min': 'R$ 140',
      'avg': 'R$ 160',
      'max': 'R$ 190',
      'desc': 'Jornada de até 8h em casas ou aptos. Alta demanda em Cidade Nova e Rio Verde.',
    },
    'ponto_tomada': {
      'name': 'Ponto de Tomada Adicional / Fio',
      'min': 'R$ 50',
      'avg': 'R$ 75',
      'max': 'R$ 110',
      'desc': 'Puxada do quadro ou derivação com acabamento na caixinha 4x2.',
    },
    'porcelanato_m2': {
      'name': 'Assentamento de Porcelanato (m²)',
      'min': 'R$ 40/m²',
      'avg': 'R$ 48/m²',
      'max': 'R$ 65/m²',
      'desc': 'Mão de obra especializada com cunhas de nivelamento para peças retificadas.',
    },
  };

  final List<Map<String, String>> _showcaseList = [
    {
      'title': 'Banheiro em Porcelanato 84x84',
      'bairro': 'Cidade Nova',
      'pro': 'Antônio de Pádua (Tonho)',
      'before': 'Piso antigo solto e infiltração',
      'after': 'Porcelanato marmorizado com nicho LED',
    },
    {
      'title': 'Limpeza & Recuperação Split 18k',
      'bairro': 'União',
      'pro': 'Carlos Eduardo Silva',
      'before': 'Serpentina obstruída e mau cheiro',
      'after': 'Higienização química + 17°C garantido',
    },
    {
      'title': 'Painel Ripado com Rack Suspenso',
      'bairro': 'Nova Carajás',
      'pro': 'Alex Souza Montador',
      'before': 'Parede branca com fios aparentes',
      'after': 'Tom freijó com fita de LED embutida',
    },
    {
      'title': 'Fachada Comercial com Grafiato',
      'bairro': 'Rio Verde',
      'pro': 'Raimundo Pinturas',
      'before': 'Pintura queimada de sol e trincas',
      'after': 'Grafiato impermeável cinza chumbo',
    },
  ];

  @override
  Widget build(BuildContext context) {
    final activeTrouble = _troubles[_activeTroubleKey]!;
    final activePrice = _priceGuide[_selectedPriceService]!;

    return Scaffold(
      backgroundColor: AppTheme.backgroundGrey,
      appBar: AppBar(
        backgroundColor: AppTheme.cardWhite,
        elevation: 0,
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'Explorar Soluções',
              style: TextStyle(
                color: AppTheme.textPrimary,
                fontWeight: FontWeight.w800,
                fontSize: 18,
              ),
            ),
            Text(
              'Casos reais, emergências e preços em Parauapebas',
              style: TextStyle(
                color: AppTheme.textSecondary,
                fontSize: 11,
              ),
            ),
          ],
        ),
        actions: [
          Container(
            margin: const EdgeInsets.only(right: 16),
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
            decoration: BoxDecoration(
              color: AppTheme.softPurple,
              borderRadius: BorderRadius.circular(16),
            ),
            child: const Row(
              children: [
                Icon(Icons.location_on, color: AppTheme.primaryPurple, size: 14),
                SizedBox(width: 4),
                Text(
                  'Parauapebas',
                  style: TextStyle(
                    color: AppTheme.primaryPurple,
                    fontWeight: FontWeight.bold,
                    fontSize: 11,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // 1. PLANTÃO SOS EMERGÊNCIA
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Row(
                  children: [
                    Container(
                      width: 8,
                      height: 8,
                      decoration: const BoxDecoration(
                        color: Colors.red,
                        shape: BoxShape.circle,
                      ),
                    ),
                    const SizedBox(width: 6),
                    const Text(
                      'Plantão SOS Emergência',
                      style: TextStyle(fontWeight: FontWeight.w800, fontSize: 15),
                    ),
                  ],
                ),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                  decoration: BoxDecoration(
                    color: Colors.red.shade50,
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: Text(
                    'ATENDENDO HOJE',
                    style: TextStyle(
                      color: Colors.red.shade700,
                      fontWeight: FontWeight.w800,
                      fontSize: 9,
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 4),
            Text(
              'Profissionais de plantão para socorro rápido no seu bairro',
              style: TextStyle(color: AppTheme.textSecondary, fontSize: 12),
            ),
            const SizedBox(height: 12),

            SizedBox(
              height: 125,
              child: ListView(
                scrollDirection: Axis.horizontal,
                children: [
                  _buildSosCard('Eletricista Plantão', 'Curto ou sem luz', '~25 min', Icons.bolt, Colors.amber),
                  _buildSosCard('Desentupimento', 'Cano ou ralo', '~30 min', Icons.water_drop, Colors.blue),
                  _buildSosCard('Ar-Condicionado', 'Parou de gelar', 'Hoje', Icons.ac_unit, AppTheme.primaryPurple),
                  _buildSosCard('Auto Socorro', 'Carro não liga', '24 Horas', Icons.build, Colors.orange),
                ],
              ),
            ),

            const SizedBox(height: 24),

            // 2. FEITO EM PARAUAPEBAS (ANTES & DEPOIS)
            const Text(
              '📸 Feito em Parauapebas (Antes & Depois)',
              style: TextStyle(fontWeight: FontWeight.w800, fontSize: 15),
            ),
            const SizedBox(height: 4),
            Text(
              'Transformações reais executadas por autônomos nos bairros da cidade',
              style: TextStyle(color: AppTheme.textSecondary, fontSize: 12),
            ),
            const SizedBox(height: 12),

            SizedBox(
              height: 195,
              child: ListView.builder(
                scrollDirection: Axis.horizontal,
                itemCount: _showcaseList.length,
                itemBuilder: (context, index) {
                  final item = _showcaseList[index];
                  return Container(
                    width: 240,
                    margin: const EdgeInsets.only(right: 12),
                    decoration: BoxDecoration(
                      color: AppTheme.cardWhite,
                      borderRadius: BorderRadius.circular(16),
                      border: Border.all(color: AppTheme.borderGrey),
                      boxShadow: [
                        BoxShadow(
                          color: Colors.black.withOpacity(0.04),
                          blurRadius: 8,
                          offset: const Offset(0, 2),
                        ),
                      ],
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        // Simulação Antes/Depois
                        Container(
                          height: 80,
                          decoration: BoxDecoration(
                            color: Colors.blueGrey.shade900,
                            borderRadius: const BorderRadius.vertical(top: Radius.circular(16)),
                          ),
                          child: Row(
                            children: [
                              Expanded(
                                child: Container(
                                  padding: const EdgeInsets.all(6),
                                  color: Colors.black38,
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    mainAxisAlignment: MainAxisAlignment.end,
                                    children: [
                                      Container(
                                        padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 1),
                                        decoration: BoxDecoration(
                                          color: Colors.red.shade700,
                                          borderRadius: BorderRadius.circular(4),
                                        ),
                                        child: const Text('Antes', style: TextStyle(color: Colors.white, fontSize: 8, fontWeight: FontWeight.bold)),
                                      ),
                                      const SizedBox(height: 2),
                                      Text(item['before']!, maxLines: 1, overflow: TextOverflow.ellipsis, style: const TextStyle(color: Colors.white70, fontSize: 9)),
                                    ],
                                  ),
                                ),
                              ),
                              Container(width: 1.5, color: Colors.white24),
                              Expanded(
                                child: Container(
                                  padding: const EdgeInsets.all(6),
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    mainAxisAlignment: MainAxisAlignment.end,
                                    children: [
                                      Container(
                                        padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 1),
                                        decoration: BoxDecoration(
                                          color: Colors.green.shade700,
                                          borderRadius: BorderRadius.circular(4),
                                        ),
                                        child: const Text('Depois', style: TextStyle(color: Colors.white, fontSize: 8, fontWeight: FontWeight.bold)),
                                      ),
                                      const SizedBox(height: 2),
                                      Text(item['after']!, maxLines: 1, overflow: TextOverflow.ellipsis, style: const TextStyle(color: Colors.white, fontSize: 9)),
                                    ],
                                  ),
                                ),
                              ),
                            ],
                          ),
                        ),
                        Padding(
                          padding: const EdgeInsets.all(10),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(item['title']!, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 12), maxLines: 1),
                              const SizedBox(height: 2),
                              Text('${item['bairro']} • por ${item['pro']}', style: TextStyle(color: AppTheme.textSecondary, fontSize: 10)),
                              const SizedBox(height: 8),
                              SizedBox(
                                width: double.infinity,
                                height: 30,
                                child: OutlinedButton(
                                  onPressed: () {
                                    ScaffoldMessenger.of(context).showSnackBar(
                                      SnackBar(content: Text('Solicitação iniciada para: ${item['title']}')),
                                    );
                                  },
                                  style: OutlinedButton.styleFrom(
                                    foregroundColor: AppTheme.primaryPurple,
                                    side: const BorderSide(color: AppTheme.primaryPurple),
                                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                                    padding: EdgeInsets.zero,
                                  ),
                                  child: const Text('Quero um assim', style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold)),
                                ),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                  );
                },
              ),
            ),

            const SizedBox(height: 24),

            // 3. QUAL É O SEU PERRENGUE HOJE?
            const Text(
              '💡 Qual é o seu perrengue hoje?',
              style: TextStyle(fontWeight: FontWeight.w800, fontSize: 15),
            ),
            const SizedBox(height: 4),
            Text(
              'Clique no sintoma para diagnóstico imediato e custo médio:',
              style: TextStyle(color: AppTheme.textSecondary, fontSize: 12),
            ),
            const SizedBox(height: 10),

            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: _troubles.entries.map((entry) {
                final isSelected = entry.key == _activeTroubleKey;
                return ChoiceChip(
                  label: Text(entry.value['pill']),
                  selected: isSelected,
                  selectedColor: AppTheme.softPurple,
                  backgroundColor: AppTheme.cardWhite,
                  labelStyle: TextStyle(
                    color: isSelected ? AppTheme.primaryPurple : AppTheme.textPrimary,
                    fontWeight: isSelected ? FontWeight.bold : FontWeight.w500,
                    fontSize: 11,
                  ),
                  onSelected: (val) {
                    if (val) setState(() => _activeTroubleKey = entry.key);
                  },
                );
              }).toList(),
            ),

            const SizedBox(height: 12),

            // Gaveta de Diagnóstico
            Container(
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(
                color: AppTheme.cardWhite,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: AppTheme.primaryPurple.withOpacity(0.4), width: 1.5),
                boxShadow: [
                  BoxShadow(
                    color: AppTheme.primaryPurple.withOpacity(0.06),
                    blurRadius: 12,
                    offset: const Offset(0, 4),
                  ),
                ],
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Expanded(
                        child: Text(
                          activeTrouble['title'],
                          style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13),
                        ),
                      ),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                        decoration: BoxDecoration(
                          color: Colors.amber.shade100,
                          borderRadius: BorderRadius.circular(6),
                        ),
                        child: Text(
                          activeTrouble['urgent'],
                          style: TextStyle(color: Colors.amber.shade900, fontSize: 9, fontWeight: FontWeight.bold),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 8),
                  Text(
                    'Diagnóstico rápido: ${activeTrouble['cause']}',
                    style: TextStyle(color: AppTheme.textSecondary, fontSize: 12, height: 1.3),
                  ),
                  const SizedBox(height: 12),
                  Container(
                    padding: const EdgeInsets.all(10),
                    decoration: BoxDecoration(
                      color: AppTheme.backgroundGrey,
                      borderRadius: BorderRadius.circular(10),
                    ),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text('Preço médio local', style: TextStyle(color: AppTheme.textSecondary, fontSize: 10)),
                            Text(activeTrouble['price'], style: const TextStyle(color: AppTheme.primaryPurple, fontWeight: FontWeight.bold, fontSize: 13)),
                          ],
                        ),
                        Column(
                          crossAxisAlignment: CrossAxisAlignment.end,
                          children: [
                            Text('Quem resolve', style: TextStyle(color: AppTheme.textSecondary, fontSize: 10)),
                            Text(activeTrouble['pro'], style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 12)),
                          ],
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 12),
                  SizedBox(
                    width: double.infinity,
                    child: ElevatedButton(
                      onPressed: () {
                        ScaffoldMessenger.of(context).showSnackBar(
                          SnackBar(content: Text('Chamando especialistas em ${activeTrouble['pro']}...')),
                        );
                      },
                      style: ElevatedButton.styleFrom(
                        backgroundColor: AppTheme.primaryPurple,
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                        padding: const EdgeInsets.symmetric(vertical: 10),
                      ),
                      child: const Text('Chamar quem resolve agora', style: TextStyle(fontWeight: FontWeight.bold, color: Colors.white, fontSize: 12)),
                    ),
                  ),
                ],
              ),
            ),

            const SizedBox(height: 24),

            // 4. TERMÔMETRO DE PREÇOS
            const Text(
              '💰 Termômetro de Preços da Cidade',
              style: TextStyle(fontWeight: FontWeight.w800, fontSize: 15),
            ),
            const SizedBox(height: 4),
            Text(
              'Consulte a faixa média real praticada em Parauapebas antes de fechar:',
              style: TextStyle(color: AppTheme.textSecondary, fontSize: 12),
            ),
            const SizedBox(height: 12),

            Container(
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(
                color: AppTheme.cardWhite,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: AppTheme.borderGrey),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  DropdownButtonFormField<String>(
                    value: _selectedPriceService,
                    decoration: InputDecoration(
                      contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                      border: OutlineInputBorder(borderRadius: BorderRadius.circular(10)),
                      fillColor: AppTheme.backgroundGrey,
                      filled: true,
                    ),
                    items: _priceGuide.entries.map((e) {
                      return DropdownMenuItem(value: e.key, child: Text(e.value['name'], style: const TextStyle(fontSize: 12)));
                    }).toList(),
                    onChanged: (val) {
                      if (val != null) setState(() => _selectedPriceService = val);
                    },
                  ),
                  const SizedBox(height: 14),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text('Preço Médio', style: TextStyle(color: AppTheme.textSecondary, fontSize: 11)),
                          Text(activePrice['avg'], style: const TextStyle(fontSize: 20, fontWeight: FontWeight.w800, color: AppTheme.primaryPurple)),
                        ],
                      ),
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.end,
                        children: [
                          Text('Faixa de Mercado', style: TextStyle(color: AppTheme.textSecondary, fontSize: 11)),
                          Text('${activePrice['min']} — ${activePrice['max']}', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
                        ],
                      ),
                    ],
                  ),
                  const SizedBox(height: 10),
                  Text(
                    '💡 ${activePrice['desc']}',
                    style: TextStyle(color: AppTheme.textSecondary, fontSize: 11),
                  ),
                ],
              ),
            ),

            const SizedBox(height: 24),

            // 5. COMBOS DE SERVIÇOS
            const Text(
              '📦 Combos de Serviços',
              style: TextStyle(fontWeight: FontWeight.w800, fontSize: 15),
            ),
            const SizedBox(height: 4),
            Text(
              'Pacotes completos com desconto para resolver tudo de uma vez',
              style: TextStyle(color: AppTheme.textSecondary, fontSize: 12),
            ),
            const SizedBox(height: 12),

            _buildComboCard(
              'Combo Mudança Sem Dor de Cabeça',
              'Carreto/Frete + Montagem de Móveis + Faxina de Entrada',
              'Economize 15%',
              '3 profissionais coordenados',
            ),
            const SizedBox(height: 10),
            _buildComboCard(
              'Combo Verão Parauapebas',
              'Limpeza Química de 2 Splits + Revisão do Quadro de Luz',
              'Mais Pedido',
              'Garantia de 90 dias',
            ),

            const SizedBox(height: 30),
          ],
        ),
      ),
    );
  }

  Widget _buildSosCard(String title, String subtitle, String time, IconData icon, Color color) {
    return Container(
      width: 145,
      margin: const EdgeInsets.only(right: 10),
      padding: const EdgeInsets.all(10),
      decoration: BoxDecoration(
        color: AppTheme.cardWhite,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: AppTheme.borderGrey),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.03),
            blurRadius: 6,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          CircleAvatar(
            radius: 16,
            backgroundColor: color.withOpacity(0.15),
            child: Icon(icon, color: color, size: 18),
          ),
          const Spacer(),
          Text(title, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 11), maxLines: 1),
          Text(subtitle, style: TextStyle(color: AppTheme.textSecondary, fontSize: 9.5), maxLines: 1),
          const SizedBox(height: 4),
          Row(
            children: [
              const Icon(Icons.access_time, size: 10, color: Colors.green),
              const SizedBox(width: 3),
              Text(time, style: const TextStyle(color: Colors.green, fontWeight: FontWeight.bold, fontSize: 9.5)),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildComboCard(String title, String desc, String badge, String extra) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: AppTheme.cardWhite,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: AppTheme.borderGrey),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Expanded(child: Text(title, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 12))),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                decoration: BoxDecoration(
                  color: AppTheme.softPurple,
                  borderRadius: BorderRadius.circular(6),
                ),
                child: Text(badge, style: const TextStyle(color: AppTheme.primaryPurple, fontSize: 9.5, fontWeight: FontWeight.bold)),
              ),
            ],
          ),
          const SizedBox(height: 4),
          Text(desc, style: TextStyle(color: AppTheme.textSecondary, fontSize: 11)),
          const SizedBox(height: 6),
          Text(extra, style: const TextStyle(color: AppTheme.primaryPurple, fontWeight: FontWeight.bold, fontSize: 10.5)),
        ],
      ),
    );
  }
}
