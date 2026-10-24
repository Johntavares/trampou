import 'package:flutter/material.dart';
import '../theme/app_theme.dart';

class QuickAccessBar extends StatelessWidget {
  final VoidCallback onRequestsTap;
  final VoidCallback onConversationsTap;
  final VoidCallback onFavoritesTap;
  final VoidCallback onHistoryTap;

  const QuickAccessBar({
    super.key,
    required this.onRequestsTap,
    required this.onConversationsTap,
    required this.onFavoritesTap,
    required this.onHistoryTap,
  });

  Widget _buildItem({
    required IconData icon,
    required String label,
    required VoidCallback onTap,
  }) {
    return Expanded(
      child: GestureDetector(
        onTap: onTap,
        child: Container(
          padding: const EdgeInsets.symmetric(vertical: 12),
          decoration: BoxDecoration(
            color: AppTheme.cardWhite,
            borderRadius: BorderRadius.circular(14),
            border: Border.all(color: AppTheme.borderGrey),
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Container(
                padding: const EdgeInsets.all(8),
                decoration: const BoxDecoration(
                  color: AppTheme.softPurple,
                  shape: BoxShape.circle,
                ),
                child: Icon(icon, color: AppTheme.primaryPurple, size: 20),
              ),
              const SizedBox(height: 6),
              Text(
                label,
                textAlign: TextAlign.center,
                style: const TextStyle(
                  fontSize: 11,
                  fontWeight: FontWeight.w600,
                  color: AppTheme.textPrimary,
                ),
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
              ),
            ],
          ),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        _buildItem(
          icon: Icons.assignment_outlined,
          label: 'Solicitações',
          onTap: onRequestsTap,
        ),
        const SizedBox(width: 8),
        _buildItem(
          icon: Icons.chat_bubble_outline,
          label: 'Conversas',
          onTap: onConversationsTap,
        ),
        const SizedBox(width: 8),
        _buildItem(
          icon: Icons.favorite_border,
          label: 'Favoritos',
          onTap: onFavoritesTap,
        ),
        const SizedBox(width: 8),
        _buildItem(
          icon: Icons.history,
          label: 'Histórico',
          onTap: onHistoryTap,
        ),
      ],
    );
  }
}
