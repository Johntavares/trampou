import 'package:flutter/material.dart';
import '../models/app_models.dart';
import '../theme/app_theme.dart';

class FeaturedProfessionalsSection extends StatelessWidget {
  final List<ProfessionalModel> professionals;
  final ValueChanged<ProfessionalModel> onProfessionalTap;
  final VoidCallback onSeeAllTap;

  const FeaturedProfessionalsSection({
    super.key,
    required this.professionals,
    required this.onProfessionalTap,
    required this.onSeeAllTap,
  });

  @override
  Widget build(BuildContext context) {
    if (professionals.isEmpty) return const SizedBox.shrink();

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // Topo com Título "Profissionais em Destaque" e link "Ver todos"
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            const Text(
              'Profissionais em Destaque',
              style: TextStyle(
                fontSize: 16,
                fontWeight: FontWeight.bold,
                color: AppTheme.textPrimary,
                letterSpacing: -0.2,
              ),
            ),
            GestureDetector(
              onTap: onSeeAllTap,
              child: const Row(
                children: [
                  Text(
                    'Ver todos',
                    style: TextStyle(
                      color: AppTheme.primaryPurple,
                      fontWeight: FontWeight.w600,
                      fontSize: 12,
                    ),
                  ),
                  SizedBox(width: 2),
                  Icon(Icons.arrow_forward_ios, size: 10, color: AppTheme.primaryPurple),
                ],
              ),
            ),
          ],
        ),

        const SizedBox(height: 12),

        // Carrossel Horizontal de Cards com Ênfase em Avaliações
        SizedBox(
          height: 235,
          child: ListView.separated(
            scrollDirection: Axis.horizontal,
            itemCount: professionals.length,
            separatorBuilder: (_, __) => const SizedBox(width: 12),
            itemBuilder: (context, index) {
              final pro = professionals[index];

              return InkWell(
                onTap: () => onProfessionalTap(pro),
                borderRadius: BorderRadius.circular(18),
                child: Container(
                  width: 255,
                  padding: const EdgeInsets.all(14),
                  decoration: BoxDecoration(
                    color: AppTheme.cardWhite,
                    borderRadius: BorderRadius.circular(18),
                    border: Border.all(color: AppTheme.borderGrey),
                    boxShadow: [
                      BoxShadow(
                        color: Colors.black.withOpacity(0.04),
                        blurRadius: 8,
                        offset: const Offset(0, 3),
                      ),
                    ],
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      // Cabeçalho do Card
                      Row(
                        children: [
                          CircleAvatar(
                            radius: 20,
                            backgroundColor: AppTheme.softPurple,
                            child: Text(
                              pro.fullName.substring(0, 1),
                              style: const TextStyle(
                                color: AppTheme.primaryPurple,
                                fontWeight: FontWeight.bold,
                                fontSize: 16,
                              ),
                            ),
                          ),
                          const SizedBox(width: 10),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Row(
                                  children: [
                                    Flexible(
                                      child: Text(
                                        pro.fullName,
                                        style: const TextStyle(
                                          fontWeight: FontWeight.bold,
                                          fontSize: 13,
                                          color: AppTheme.textPrimary,
                                        ),
                                        overflow: TextOverflow.ellipsis,
                                      ),
                                    ),
                                    if (pro.isVerified) ...[
                                      const SizedBox(width: 4),
                                      const Icon(Icons.verified, color: AppTheme.primaryPurple, size: 12),
                                    ],
                                  ],
                                ),
                                const SizedBox(height: 1),
                                Text(
                                  pro.specialty,
                                  style: const TextStyle(fontSize: 11, color: AppTheme.textSecondary),
                                  overflow: TextOverflow.ellipsis,
                                ),
                                Text(
                                  pro.neighborhood,
                                  style: const TextStyle(fontSize: 10, color: AppTheme.textSecondary),
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),

                      // Bloco de Avaliação em Destaque
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 7),
                        decoration: BoxDecoration(
                          color: const Color(0xFFFFFDF5),
                          borderRadius: BorderRadius.circular(10),
                          border: Border.all(color: const Color(0xFFFEF3C7)),
                        ),
                        child: Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Row(
                              children: [
                                Text(
                                  pro.ratingAverage.toStringAsFixed(1),
                                  style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w800),
                                ),
                                const SizedBox(width: 4),
                                Row(
                                  children: List.generate(
                                    5,
                                    (starIndex) => const Icon(
                                      Icons.star,
                                      color: Colors.amber,
                                      size: 13,
                                    ),
                                  ),
                                ),
                              ],
                            ),
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                              decoration: BoxDecoration(
                                color: const Color(0xFFFEF3C7),
                                borderRadius: BorderRadius.circular(5),
                              ),
                              child: Text(
                                '${pro.ratingCount} avaliações',
                                style: const TextStyle(
                                  fontSize: 10,
                                  fontWeight: FontWeight.bold,
                                  color: Color(0xFF92400E),
                                ),
                              ),
                            ),
                          ],
                        ),
                      ),

                      // Balão com Depoimento/Avaliação Real
                      Container(
                        padding: const EdgeInsets.all(8),
                        decoration: BoxDecoration(
                          color: const Color(0xFFF8F7FA),
                          borderRadius: BorderRadius.circular(8),
                          border: const Border(left: BorderSide(color: AppTheme.primaryPurple, width: 2.5)),
                        ),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              index == 0
                                  ? '"Chegou no horário no Cidade Nova e fez a instalação limpa do split."'
                                  : index == 1
                                      ? '"Resolveu o curto do quadro de energia com muita agilidade."'
                                      : '"Trabalho impecável no porcelanato grande formato!"',
                              style: const TextStyle(
                                fontSize: 10.5,
                                fontStyle: FontStyle.italic,
                                color: AppTheme.textPrimary,
                                height: 1.25,
                              ),
                              maxLines: 2,
                              overflow: TextOverflow.ellipsis,
                            ),
                            const SizedBox(height: 3),
                            const Align(
                              alignment: Alignment.centerRight,
                              child: Text(
                                '— Cliente Verificado',
                                style: TextStyle(fontSize: 9, color: AppTheme.textSecondary, fontWeight: FontWeight.w600),
                              ),
                            ),
                          ],
                        ),
                      ),

                      // Rodapé do Card
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Text(
                            '${pro.completedServicesCount} serviços feitos',
                            style: const TextStyle(fontSize: 10, color: AppTheme.textSecondary),
                          ),
                          const Row(
                            children: [
                              Text(
                                'Ver perfil',
                                style: TextStyle(
                                  color: AppTheme.primaryPurple,
                                  fontWeight: FontWeight.bold,
                                  fontSize: 11,
                                ),
                              ),
                              SizedBox(width: 2),
                              Icon(Icons.chevron_right, size: 14, color: AppTheme.primaryPurple),
                            ],
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
              );
            },
          ),
        ),
      ],
    );
  }
}
