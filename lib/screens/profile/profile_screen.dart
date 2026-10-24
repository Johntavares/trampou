import 'package:flutter/material.dart';
import '../../theme/app_theme.dart';
import '../professional_area/professional_dashboard_screen.dart';

class ProfileScreen extends StatelessWidget {
  final ValueChanged<int>? onNavigateTab;

  const ProfileScreen({super.key, this.onNavigateTab});

  Widget _buildMenuItem({
    required IconData icon,
    required String title,
    String? subtitle,
    Widget? trailing,
    required VoidCallback onTap,
    Color? iconColor,
    Color? textColor,
  }) {
    return ListTile(
      leading: Container(
        padding: const EdgeInsets.all(8),
        decoration: BoxDecoration(
          color: (iconColor ?? AppTheme.primaryPurple).withOpacity(0.1),
          borderRadius: BorderRadius.circular(10),
        ),
        child: Icon(icon, color: iconColor ?? AppTheme.primaryPurple, size: 20),
      ),
      title: Text(
        title,
        style: TextStyle(
          fontWeight: FontWeight.w600,
          fontSize: 14,
          color: textColor ?? AppTheme.textPrimary,
        ),
      ),
      subtitle: subtitle != null
          ? Text(subtitle, style: const TextStyle(fontSize: 12, color: AppTheme.textSecondary))
          : null,
      trailing: trailing ?? const Icon(Icons.arrow_forward_ios, size: 14, color: AppTheme.textSecondary),
      onTap: onTap,
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppTheme.background,
      appBar: AppBar(
        title: const Text('Meu Perfil', style: TextStyle(fontWeight: FontWeight.bold)),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          children: [
            // Card de Perfil
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: AppTheme.cardWhite,
                borderRadius: BorderRadius.circular(20),
                border: Border.all(color: AppTheme.borderGrey),
              ),
              child: Row(
                children: [
                  const CircleAvatar(
                    radius: 32,
                    backgroundColor: AppTheme.softPurple,
                    child: Icon(Icons.person, color: AppTheme.primaryPurple, size: 36),
                  ),
                  const SizedBox(width: 16),
                  const Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'Cliente Parauapebas',
                          style: TextStyle(fontWeight: FontWeight.bold, fontSize: 17),
                        ),
                        SizedBox(height: 2),
                        Text(
                          'cliente@goparauapebas.com.br',
                          style: TextStyle(fontSize: 13, color: AppTheme.textSecondary),
                        ),
                        SizedBox(height: 4),
                        Row(
                          children: [
                            Icon(Icons.location_on, size: 13, color: AppTheme.primaryPurple),
                            SizedBox(width: 2),
                            Text(
                              'Cidade Nova, Parauapebas',
                              style: TextStyle(fontSize: 12, color: AppTheme.textSecondary),
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),
                  IconButton(
                    onPressed: () {
                      ScaffoldMessenger.of(context).showSnackBar(
                        const SnackBar(content: Text('Editar perfil')),
                      );
                    },
                    icon: const Icon(Icons.edit_outlined, color: AppTheme.primaryPurple),
                  ),
                ],
              ),
            ),

            const SizedBox(height: 16),

            // Destaque: Modo Prestador de Serviços / Área do Profissional
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                gradient: const LinearGradient(
                  colors: [AppTheme.primaryPurple, AppTheme.darkPurple],
                ),
                borderRadius: BorderRadius.circular(16),
              ),
              child: Row(
                children: [
                  const Icon(Icons.handyman, color: Colors.white, size: 28),
                  const SizedBox(width: 14),
                  const Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'Área do Profissional',
                          style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 15),
                        ),
                        Text(
                          'Gerencie serviços, orçamentos recebidos e portfólio',
                          style: TextStyle(color: Colors.white70, fontSize: 12),
                        ),
                      ],
                    ),
                  ),
                  ElevatedButton(
                    onPressed: () {
                      Navigator.of(context).push(
                        MaterialPageRoute(
                          builder: (_) => const ProfessionalDashboardScreen(),
                        ),
                      );
                    },
                    style: ElevatedButton.styleFrom(
                      backgroundColor: Colors.white,
                      foregroundColor: AppTheme.primaryPurple,
                      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                      minimumSize: Size.zero,
                    ),
                    child: const Text('Acessar', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
                  ),
                ],
              ),
            ),

            const SizedBox(height: 20),

            // Card com Menus do Usuário
            Container(
              decoration: BoxDecoration(
                color: AppTheme.cardWhite,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: AppTheme.borderGrey),
              ),
              child: Column(
                children: [
                  _buildMenuItem(
                    icon: Icons.chat_bubble_outline,
                    title: 'Minhas Conversas',
                    subtitle: 'Histórico de mensagens com profissionais',
                    onTap: () => onNavigateTab?.call(2),
                  ),
                  const Divider(height: 1, indent: 56),
                  _buildMenuItem(
                    icon: Icons.favorite_border,
                    title: 'Profissionais Favoritos',
                    subtitle: 'Autônomos salvos para contato rápido',
                    onTap: () {
                      ScaffoldMessenger.of(context).showSnackBar(
                        const SnackBar(content: Text('Lista de favoritos')),
                      );
                    },
                  ),
                ],
              ),
            ),

            const SizedBox(height: 16),

            // Card Configurações & Suporte
            Container(
              decoration: BoxDecoration(
                color: AppTheme.cardWhite,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: AppTheme.borderGrey),
              ),
              child: Column(
                children: [
                  _buildMenuItem(
                    icon: Icons.notifications_none,
                    title: 'Notificações',
                    onTap: () {},
                  ),
                  const Divider(height: 1, indent: 56),
                  _buildMenuItem(
                    icon: Icons.lock_outline,
                    title: 'Privacidade e Segurança',
                    onTap: () {},
                  ),
                  const Divider(height: 1, indent: 56),
                  _buildMenuItem(
                    icon: Icons.help_outline,
                    title: 'Ajuda e Suporte',
                    onTap: () {},
                  ),
                  const Divider(height: 1, indent: 56),
                  _buildMenuItem(
                    icon: Icons.description_outlined,
                    title: 'Termos de Uso e Privacidade',
                    onTap: () {},
                  ),
                  const Divider(height: 1, indent: 56),
                  _buildMenuItem(
                    icon: Icons.logout,
                    title: 'Sair da conta',
                    iconColor: AppTheme.errorRed,
                    textColor: AppTheme.errorRed,
                    trailing: const SizedBox.shrink(),
                    onTap: () {
                      ScaffoldMessenger.of(context).showSnackBar(
                        const SnackBar(content: Text('Fluxo de logout preservado')),
                      );
                    },
                  ),
                ],
              ),
            ),

            const SizedBox(height: 24),
            const Text(
              'GO Parauapebas v1.0.0 (MVP)',
              style: TextStyle(color: AppTheme.textSecondary, fontSize: 12),
            ),
          ],
        ),
      ),
    );
  }
}
