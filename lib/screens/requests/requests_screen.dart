import 'package:flutter/material.dart';
import '../../models/app_models.dart';
import '../../theme/app_theme.dart';
import '../../widgets/state_views.dart';
import '../chat/chat_screen.dart';

class RequestsScreen extends StatefulWidget {
  const RequestsScreen({super.key});

  @override
  State<RequestsScreen> createState() => _RequestsScreenState();
}

class _RequestsScreenState extends State<RequestsScreen> with SingleTickerProviderStateMixin {
  late TabController _tabController;

  final List<String> _statusTabs = [
    'Todos',
    'Aguardando',
    'Orçamento recebido',
    'Em andamento',
    'Concluído',
  ];

  final List<ServiceRequestModel> _requests = [
    ServiceRequestModel(
      id: 'req1',
      title: 'Instalação de Ar-Condicionado Split 12.000 BTUs',
      description: 'Preciso de instalação na sala com tubulação de cobre e suporte externo.',
      categoryName: 'Ar-Condicionado',
      neighborhood: 'Cidade Nova',
      status: 'quoted',
      createdAt: DateTime.now().subtract(const Duration(hours: 3)),
      professionalName: 'Carlos Eduardo Silva',
      proposedBudget: 250.0,
    ),
    ServiceRequestModel(
      id: 'req2',
      title: 'Troca de fiação e padrão de energia',
      description: 'Quadro antigo desarmando disjuntor principal.',
      categoryName: 'Eletricista',
      neighborhood: 'Rio Verde',
      status: 'pending',
      createdAt: DateTime.now().subtract(const Duration(days: 1)),
      professionalName: 'Marcos Vinicius Santos',
    ),
    ServiceRequestModel(
      id: 'req3',
      title: 'Reparo de vazamento no registro do banheiro',
      description: 'Vazamento contínuo na parede.',
      categoryName: 'Encanador',
      neighborhood: 'União',
      status: 'completed',
      createdAt: DateTime.now().subtract(const Duration(days: 4)),
      professionalName: 'José da Hidráulica',
      proposedBudget: 120.0,
    ),
  ];

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: _statusTabs.length, vsync: this);
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  Color _getStatusColor(String status) {
    switch (status) {
      case 'quoted':
        return AppTheme.primaryPurple;
      case 'accepted':
      case 'completed':
        return AppTheme.successGreen;
      case 'in_progress':
        return AppTheme.warningOrange;
      case 'cancelled':
        return AppTheme.errorRed;
      default:
        return AppTheme.textSecondary;
    }
  }

  String _getStatusLabel(String status) {
    switch (status) {
      case 'quoted':
        return 'Orçamento recebido';
      case 'accepted':
        return 'Aceito';
      case 'in_progress':
        return 'Em andamento';
      case 'completed':
        return 'Concluído';
      case 'cancelled':
        return 'Cancelado';
      default:
        return 'Aguardando resposta';
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppTheme.background,
      appBar: AppBar(
        title: const Text('Minhas Solicitações', style: TextStyle(fontWeight: FontWeight.bold)),
        bottom: TabBar(
          controller: _tabController,
          isScrollable: true,
          labelColor: AppTheme.primaryPurple,
          unselectedLabelColor: AppTheme.textSecondary,
          indicatorColor: AppTheme.primaryPurple,
          indicatorWeight: 3,
          tabs: _statusTabs.map((tab) => Tab(text: tab)).toList(),
        ),
      ),
      body: TabBarView(
        controller: _tabController,
        children: _statusTabs.map((tab) {
          final filtered = tab == 'Todos'
              ? _requests
              : _requests.where((r) {
                  if (tab == 'Aguardando') return r.status == 'pending';
                  if (tab == 'Orçamento recebido') return r.status == 'quoted';
                  if (tab == 'Em andamento') return r.status == 'in_progress';
                  if (tab == 'Concluído') return r.status == 'completed';
                  return true;
                }).toList();

          if (filtered.isEmpty) {
            return const EmptyStateView(
              icon: Icons.assignment_outlined,
              title: 'Nenhuma solicitação nesta etapa',
              description: 'Quando você solicitar um orçamento, ele aparecerá aqui com o status atualizado.',
            );
          }

          return ListView.separated(
            padding: const EdgeInsets.all(16),
            itemCount: filtered.length,
            separatorBuilder: (_, __) => const SizedBox(height: 12),
            itemBuilder: (context, index) {
              final req = filtered[index];
              final statusColor = _getStatusColor(req.status);

              return Card(
                child: Padding(
                  padding: const EdgeInsets.all(16),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      // Status Badge e Categoria
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                            decoration: BoxDecoration(
                              color: statusColor.withOpacity(0.12),
                              borderRadius: BorderRadius.circular(8),
                            ),
                            child: Text(
                              _getStatusLabel(req.status),
                              style: TextStyle(
                                color: statusColor,
                                fontWeight: FontWeight.bold,
                                fontSize: 12,
                              ),
                            ),
                          ),
                          Text(
                            req.categoryName,
                            style: const TextStyle(fontSize: 12, color: AppTheme.textSecondary),
                          ),
                        ],
                      ),
                      const SizedBox(height: 10),

                      // Título do Serviço
                      Text(
                        req.title,
                        style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        req.description,
                        style: const TextStyle(fontSize: 13, color: AppTheme.textSecondary),
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                      ),
                      const Divider(height: 20),

                      // Profissional & Bairro
                      Row(
                        children: [
                          const Icon(Icons.person_outline, size: 16, color: AppTheme.textSecondary),
                          const SizedBox(width: 4),
                          Text(
                            req.professionalName ?? 'Aberto para cotações',
                            style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w500),
                          ),
                          const Spacer(),
                          const Icon(Icons.location_on_outlined, size: 14, color: AppTheme.textSecondary),
                          const SizedBox(width: 2),
                          Text(
                            req.neighborhood,
                            style: const TextStyle(fontSize: 12, color: AppTheme.textSecondary),
                          ),
                        ],
                      ),
                      const SizedBox(height: 12),

                      // Botão Acessar Conversa / Detalhes
                      Row(
                        mainAxisAlignment: MainAxisAlignment.end,
                        children: [
                          OutlinedButton.icon(
                            onPressed: () {
                              Navigator.of(context).push(
                                MaterialPageRoute(
                                  builder: (_) => ChatScreen(
                                    contactName: req.professionalName ?? 'Profissional',
                                    serviceTitle: req.title,
                                  ),
                                ),
                              );
                            },
                            icon: const Icon(Icons.chat_bubble_outline, size: 16),
                            label: const Text('Abrir Chat'),
                            style: OutlinedButton.styleFrom(
                              foregroundColor: AppTheme.primaryPurple,
                              side: const BorderSide(color: AppTheme.primaryPurple),
                              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                              minimumSize: Size.zero,
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
              );
            },
          );
        }).toList(),
      ),
    );
  }
}
