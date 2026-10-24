import 'package:flutter/material.dart';
import '../models/app_models.dart';
import '../theme/app_theme.dart';

class CategoryGridCompact extends StatelessWidget {
  final List<CategoryModel> categories;
  final ValueChanged<CategoryModel> onCategorySelected;
  final VoidCallback onSeeAllTap;

  const CategoryGridCompact({
    super.key,
    required this.categories,
    required this.onCategorySelected,
    required this.onSeeAllTap,
  });

  IconData _getIconData(String name) {
    switch (name) {
      case 'ac_unit':
        return Icons.ac_unit;
      case 'bolt':
        return Icons.bolt;
      case 'plumbing':
        return Icons.water_drop_outlined;
      case 'construction':
        return Icons.construction;
      case 'format_paint':
        return Icons.format_paint;
      case 'cleaning_services':
        return Icons.cleaning_services;
      case 'build':
        return Icons.build;
      case 'computer':
        return Icons.computer;
      case 'local_shipping':
        return Icons.local_shipping;
      case 'handyman':
        return Icons.handyman;
      default:
        return Icons.handyman;
    }
  }

  @override
  Widget build(BuildContext context) {
    final displayList = categories.take(8).toList();

    return Column(
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            const Text(
              'Categorias Principais',
              style: TextStyle(
                fontSize: 15,
                fontWeight: FontWeight.bold,
                color: AppTheme.textPrimary,
              ),
            ),
            GestureDetector(
              onTap: onSeeAllTap,
              child: const Row(
                children: [
                  Text(
                    'Ver todas',
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

        const SizedBox(height: 10),

        // Grade 4x2 com ícones redondos compactos e texto em 1 linha
        GridView.builder(
          physics: const NeverScrollableScrollPhysics(),
          shrinkWrap: true,
          itemCount: displayList.length,
          gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
            crossAxisCount: 4,
            childAspectRatio: 0.95,
            crossAxisSpacing: 8,
            mainAxisSpacing: 10,
          ),
          itemBuilder: (context, index) {
            final category = displayList[index];

            return InkWell(
              onTap: () => onCategorySelected(category),
              borderRadius: BorderRadius.circular(12),
              child: Container(
                padding: const EdgeInsets.symmetric(vertical: 8, horizontal: 4),
                decoration: BoxDecoration(
                  color: AppTheme.cardWhite,
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: AppTheme.borderGrey),
                ),
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Container(
                      width: 38,
                      height: 38,
                      decoration: const BoxDecoration(
                        color: AppTheme.softPurple,
                        shape: BoxShape.circle,
                      ),
                      child: Icon(
                        _getIconData(category.iconName),
                        color: AppTheme.primaryPurple,
                        size: 20,
                      ),
                    ),
                    const SizedBox(height: 5),
                    Text(
                      category.name,
                      textAlign: TextAlign.center,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(
                        fontSize: 11,
                        fontWeight: FontWeight.w600,
                        color: AppTheme.textPrimary,
                      ),
                    ),
                  ],
                ),
              ),
            );
          },
        ),
      ],
    );
  }
}
