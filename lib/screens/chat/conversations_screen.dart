import 'package:flutter/material.dart';
import '../../models/app_models.dart';
import '../../theme/app_theme.dart';
import '../../widgets/state_views.dart';
import 'chat_screen.dart';

class ConversationsScreen extends StatelessWidget {
  const ConversationsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final List<ConversationModel> conversations = [
      ConversationModel(
        id: 'c1',
        contactName: 'Carlos Eduardo Silva',
        lastMessage: 'Posso ir amanhã às 14h no Cidade Nova verificar o aparelho.',
        lastMessageAt: DateTime.now().subtract(const Duration(minutes: 18)),
        unreadCount: 2,
        serviceTitle: 'Instalação de Ar-Condicionado',
      ),
      ConversationModel(
        id: 'c2',
        contactName: 'Marcos Vinicius Santos',
        lastMessage: 'Orçamento de R$ 380 com materiais inclusos.',
        lastMessageAt: DateTime.now().subtract(const Duration(hours: 3)),
        unreadCount: 0,
        serviceTitle: 'Troca de fiação',
      ),
      ConversationModel(
        id: 'c3',
        contactName: 'Antônio de Pádua (Tonho)',
        lastMessage: 'Combinado! Sexta-feira finalizamos o piso.',
        lastMessageAt: DateTime.now().subtract(const Duration(days: 2)),
        unreadCount: 0,
        serviceTitle: 'Reforma de banheiro',
      ),
    ];

    return Scaffold(
      backgroundColor: AppTheme.background,
      appBar: AppBar(
        title: const Text('Conversas', style: TextStyle(fontWeight: FontWeight.bold)),
      ),
      body: conversations.isEmpty
          ? const EmptyStateView(
              icon: Icons.chat_bubble_outline,
              title: 'Nenhuma conversa ainda',
              description: 'Quando você entrar em contato com um profissional, as mensagens aparecerão aqui.',
            )
          : ListView.separated(
              itemCount: conversations.length,
              separatorBuilder: (_, __) => const Divider(height: 1, indent: 80),
              itemBuilder: (context, index) {
                final chat = conversations[index];

                return InkWell(
                  onTap: () {
                    Navigator.of(context).push(
                      MaterialPageRoute(
                        builder: (_) => ChatScreen(
                          contactName: chat.contactName,
                          serviceTitle: chat.serviceTitle,
                        ),
                      ),
                    );
                  },
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                    child: Row(
                      children: [
                        CircleAvatar(
                          radius: 26,
                          backgroundColor: AppTheme.softPurple,
                          child: Text(
                            chat.contactName.substring(0, 1),
                            style: const TextStyle(
                              color: AppTheme.primaryPurple,
                              fontWeight: FontWeight.bold,
                              fontSize: 18,
                            ),
                          ),
                        ),
                        const SizedBox(width: 14),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Row(
                                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                children: [
                                  Text(
                                    chat.contactName,
                                    style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15),
                                  ),
                                  const Text(
                                    '14:22',
                                    style: TextStyle(fontSize: 11, color: AppTheme.textSecondary),
                                  ),
                                ],
                              ),
                              if (chat.serviceTitle != null) ...[
                                const SizedBox(height: 2),
                                Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                  decoration: BoxDecoration(
                                    color: AppTheme.softPurple.withOpacity(0.5),
                                    borderRadius: BorderRadius.circular(4),
                                  ),
                                  child: Text(
                                    chat.serviceTitle!,
                                    style: const TextStyle(
                                      color: AppTheme.darkPurple,
                                      fontSize: 10,
                                      fontWeight: FontWeight.w600,
                                    ),
                                  ),
                                ),
                              ],
                              const SizedBox(height: 4),
                              Row(
                                children: [
                                  Expanded(
                                    child: Text(
                                      chat.lastMessage,
                                      maxLines: 1,
                                      overflow: TextOverflow.ellipsis,
                                      style: TextStyle(
                                        fontSize: 13,
                                        color: chat.unreadCount > 0 ? AppTheme.textPrimary : AppTheme.textSecondary,
                                        fontWeight: chat.unreadCount > 0 ? FontWeight.bold : FontWeight.normal,
                                      ),
                                    ),
                                  ),
                                  if (chat.unreadCount > 0)
                                    Container(
                                      margin: const EdgeInsets.only(left: 6),
                                      padding: const EdgeInsets.all(6),
                                      decoration: const BoxDecoration(
                                        color: AppTheme.primaryPurple,
                                        shape: BoxShape.circle,
                                      ),
                                      child: Text(
                                        '${chat.unreadCount}',
                                        style: const TextStyle(color: Colors.white, fontSize: 10, fontWeight: FontWeight.bold),
                                      ),
                                    ),
                                ],
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ),
                );
              },
            ),
    );
  }
}
