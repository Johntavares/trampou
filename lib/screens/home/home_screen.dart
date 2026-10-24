import 'package:flutter/material.dart';
import '../../models/app_models.dart';
import '../../services/marketplace_service.dart';
import '../../theme/app_theme.dart';
import '../../widgets/app_header.dart';
import '../../widgets/category_grid.dart';
import '../../widgets/featured_professionals_section.dart';
import '../../widgets/promo_banner_carousel.dart';
import '../category/category_screen.dart';
import '../chat/chat_screen.dart';
import '../professional/professional_profile_screen.dart';

class HomeScreen extends StatefulWidget {
  final ValueChanged<int> onNavigateTab;

  const HomeScreen({
    super.key,
    required this.onNavigateTab,
  });

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  final MarketplaceService _service = MarketplaceService();
  List<CategoryModel> _categories = [];
  List<ProfessionalModel> _featuredProfessionals = [];
  List<Map<String, dynamic>> _promoBanners = [];
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _loadData();
  }

  Future<void> _loadData() async {
    setState(() => _isLoading = true);
    final categories = await _service.getCategories();
    final featured = await _service.getFeaturedProfessionals();
    final banners = _service.getPromoBanners();

    setState(() {
      _categories = categories;
      _featuredProfessionals = featured;
      _promoBanners = banners;
      _isLoading = false;
    });
  }

  void _onCategorySelected(CategoryModel category) {
    Navigator.of(context).push(
      MaterialPageRoute(
        builder: (_) => CategoryScreen(category: category),
      ),
    );
  }

  void _onProfessionalSelected(ProfessionalModel professional) {
    Navigator.of(context).push(
      MaterialPageRoute(
        builder: (_) => ProfessionalProfileScreen(professional: professional),
      ),
    );
  }

  void _onContactTap(ProfessionalModel professional) {
    Navigator.of(context).push(
      MaterialPageRoute(
        builder: (_) => ChatScreen(
          contactName: professional.fullName,
          serviceTitle: professional.specialty,
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppTheme.background,
      body: _isLoading
          ? const Center(
              child: CircularProgressIndicator(
                valueColor: AlwaysStoppedAnimation<Color>(AppTheme.primaryPurple),
              ),
            )
          : RefreshIndicator(
              color: AppTheme.primaryPurple,
              onRefresh: _loadData,
              child: SingleChildScrollView(
                physics: const AlwaysScrollableScrollPhysics(),
                child: Column(
                  children: [
                    // 1 & 2. Cabeçalho Compacto com Saudação, Localização e Busca Integrada
                    AppHeaderCompact(
                      userName: 'Cliente',
                      userLocation: 'Parauapebas, PA',
                      unreadNotificationsCount: 2,
                      onNotificationTap: () {
                        ScaffoldMessenger.of(context).showSnackBar(
                          const SnackBar(content: Text('Notificações de Parauapebas')),
                        );
                      },
                      onAvatarTap: () => widget.onNavigateTab(3), // Perfil
                      onSearchTap: () => widget.onNavigateTab(1), // Explorar
                    ),

                    // Conteúdo com Densidade Visual Eficiente
                    Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 14),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                          // Banners de Anúncios / Patrocinados (Antes das Categorias)
                          PromoBannerCarousel(
                            banners: _promoBanners,
                            onBannerTap: (banner) {
                              ScaffoldMessenger.of(context).showSnackBar(
                                SnackBar(content: Text('Ação: ${banner['title']}')),
                              );
                            },
                          ),

                          const SizedBox(height: 16),

                          // 3. Categorias Principais (Grade Compacta)
                          CategoryGridCompact(
                            categories: _categories,
                            onCategorySelected: _onCategorySelected,
                            onSeeAllTap: () => widget.onNavigateTab(1),
                          ),

                          const SizedBox(height: 20),

                          // 4. Profissionais em Destaque (Cards com Foco em Avaliações)
                          FeaturedProfessionalsSection(
                            professionals: _featuredProfessionals,
                            onProfessionalTap: _onProfessionalSelected,
                            onSeeAllTap: () => widget.onNavigateTab(1),
                          ),

                          const SizedBox(height: 20),

                          // 5. Feed Compacto de Dicas e Novidades da Plataforma
                          const Text(
                            'Dicas e Novidades',
                            style: TextStyle(
                              fontSize: 15,
                              fontWeight: FontWeight.bold,
                              color: AppTheme.textPrimary,
                            ),
                          ),
                          const SizedBox(height: 8),

                          Container(
                            padding: const EdgeInsets.all(12),
                            decoration: BoxDecoration(
                              color: AppTheme.cardWhite,
                              borderRadius: BorderRadius.circular(12),
                              border: Border.all(color: AppTheme.borderGrey),
                            ),
                            child: const Row(
                              children: [
                                CircleAvatar(
                                  radius: 16,
                                  backgroundColor: AppTheme.softPurple,
                                  child: Icon(Icons.shield_outlined, color: AppTheme.primaryPurple, size: 18),
                                ),
                                SizedBox(width: 10),
                                Expanded(
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      Text(
                                        'Dica de Segurança: negocie tudo pelo chat',
                                        style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold),
                                      ),
                                      Text(
                                        'Valores e prazos combinados no chat garantem histórico protegido.',
                                        style: TextStyle(fontSize: 11, color: AppTheme.textSecondary),
                                      ),
                                    ],
                                  ),
                                ),
                              ],
                            ),
                          ),

                          const SizedBox(height: 16),

                          // 6. Espaço Reservado para Publicidade
                          Container(
                            padding: const EdgeInsets.all(12),
                            decoration: BoxDecoration(
                              color: const Color(0xFFF3EEFA),
                              borderRadius: BorderRadius.circular(12),
                              border: Border.all(color: AppTheme.primaryPurple.withOpacity(0.3), style: BorderStyle.solid),
                            ),
                            child: Row(
                              children: [
                                const Icon(Icons.campaign, color: AppTheme.primaryPurple, size: 24),
                                const SizedBox(width: 10),
                                const Expanded(
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      Text(
                                        'Publicidade • Parauapebas',
                                        style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: AppTheme.darkPurple),
                                      ),
                                      Text(
                                        'Anuncie aqui seus serviços para milhares de moradores locais.',
                                        style: TextStyle(fontSize: 11, color: AppTheme.textSecondary),
                                      ),
                                    ],
                                  ),
                                ),
                                TextButton(
                                  onPressed: () => widget.onNavigateTab(3),
                                  child: const Text('Anunciar', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 11)),
                                ),
                              ],
                            ),
                          ),

                          const SizedBox(height: 20),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
            ),
    );
  }
}
