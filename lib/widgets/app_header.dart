import 'package:flutter/material.dart';
import '../theme/app_theme.dart';

class AppHeaderCompact extends StatelessWidget {
  final String userName;
  final String userLocation;
  final int unreadNotificationsCount;
  final VoidCallback? onNotificationTap;
  final VoidCallback? onAvatarTap;
  final VoidCallback? onSearchTap;

  const AppHeaderCompact({
    super.key,
    this.userName = 'Cliente',
    this.userLocation = 'Parauapebas, PA',
    this.unreadNotificationsCount = 2,
    this.onNotificationTap,
    this.onAvatarTap,
    this.onSearchTap,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      color: AppTheme.primaryPurple,
      padding: EdgeInsets.only(
        top: MediaQuery.of(context).padding.top + 8,
        bottom: 14,
        left: 16,
        right: 16,
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Linha Superior: Saudação, Localização e Ações
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Olá, $userName',
                    style: const TextStyle(
                      color: Colors.white,
                      fontSize: 18,
                      fontWeight: FontWeight.bold,
                      letterSpacing: -0.2,
                    ),
                  ),
                  const SizedBox(height: 2),
                  Row(
                    children: [
                      const Icon(Icons.location_on, color: AppTheme.softPurple, size: 14),
                      const SizedBox(width: 4),
                      Text(
                        userLocation,
                        style: const TextStyle(
                          color: AppTheme.softPurple,
                          fontSize: 12,
                          fontWeight: FontWeight.w500,
                        ),
                      ),
                    ],
                  ),
                ],
              ),

              // Notificações e Avatar
              Row(
                children: [
                  Stack(
                    children: [
                      IconButton(
                        onPressed: onNotificationTap,
                        icon: const Icon(Icons.notifications_outlined, color: Colors.white, size: 24),
                        padding: EdgeInsets.zero,
                        constraints: const BoxConstraints(),
                      ),
                      if (unreadNotificationsCount > 0)
                        Positioned(
                          right: 0,
                          top: 0,
                          child: Container(
                            width: 8,
                            height: 8,
                            decoration: const BoxDecoration(
                              color: AppTheme.errorRed,
                              shape: BoxShape.circle,
                            ),
                          ),
                        ),
                    ],
                  ),
                  const SizedBox(width: 12),
                  GestureDetector(
                    onTap: onAvatarTap,
                    child: const CircleAvatar(
                      radius: 17,
                      backgroundColor: Colors.white24,
                      child: Icon(Icons.person, color: Colors.white, size: 20),
                    ),
                  ),
                ],
              ),
            ],
          ),

          const SizedBox(height: 12),

          // Campo de Busca Integrado
          GestureDetector(
            onTap: onSearchTap,
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(12),
                boxShadow: [
                  BoxShadow(
                    color: Colors.black.withOpacity(0.06),
                    blurRadius: 8,
                    offset: const Offset(0, 3),
                  ),
                ],
              ),
              child: Row(
                children: [
                  const Icon(Icons.search, color: AppTheme.primaryPurple, size: 20),
                  const SizedBox(width: 10),
                  const Expanded(
                    child: Text(
                      'Buscar eletricista, encanador, diarista...',
                      style: TextStyle(
                        color: AppTheme.textSecondary,
                        fontSize: 13,
                      ),
                      overflow: TextOverflow.ellipsis,
                    ),
                  ),
                  Container(
                    padding: const EdgeInsets.all(5),
                    decoration: BoxDecoration(
                      color: AppTheme.softPurple,
                      borderRadius: BorderRadius.circular(6),
                    ),
                    child: const Icon(Icons.tune, color: AppTheme.primaryPurple, size: 16),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}
