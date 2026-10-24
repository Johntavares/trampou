class CategoryModel {
  final String id;
  final String name;
  final String slug;
  final String description;
  final String iconName;
  final int displayOrder;
  final bool active;

  const CategoryModel({
    required this.id,
    required this.name,
    required this.slug,
    required this.description,
    required this.iconName,
    required this.displayOrder,
    this.active = true,
  });

  factory CategoryModel.fromJson(Map<String, dynamic> json) {
    return CategoryModel(
      id: json['id'] ?? '',
      name: json['name'] ?? '',
      slug: json['slug'] ?? '',
      description: json['description'] ?? '',
      iconName: json['icon_name'] ?? 'build',
      displayOrder: json['display_order'] ?? 0,
      active: json['active'] ?? true,
    );
  }
}

class ProfessionalModel {
  final String id;
  final String profileId;
  final String fullName;
  final String specialty;
  final String? avatarUrl;
  final String neighborhood;
  final String city;
  final double ratingAverage;
  final int ratingCount;
  final int completedServicesCount;
  final bool isVerified;
  final bool isSponsored;
  final String? bio;
  final int yearsExperience;
  final List<String> servedNeighborhoods;
  final List<Map<String, dynamic>> services;

  const ProfessionalModel({
    required this.id,
    required this.profileId,
    required this.fullName,
    required this.specialty,
    this.avatarUrl,
    required this.neighborhood,
    this.city = 'Parauapebas',
    this.ratingAverage = 0.0,
    this.ratingCount = 0,
    this.completedServicesCount = 0,
    this.isVerified = false,
    this.isSponsored = false,
    this.bio,
    this.yearsExperience = 0,
    this.servedNeighborhoods = const [],
    this.services = const [],
  });
}

class ServiceRequestModel {
  final String id;
  final String title;
  final String description;
  final String categoryName;
  final String neighborhood;
  final String status; // 'pending', 'quoted', 'accepted', 'in_progress', 'completed', 'cancelled'
  final DateTime createdAt;
  final String? professionalName;
  final double? proposedBudget;

  const ServiceRequestModel({
    required this.id,
    required this.title,
    required this.description,
    required this.categoryName,
    required this.neighborhood,
    required this.status,
    required this.createdAt,
    this.professionalName,
    this.proposedBudget,
  });
}

class ConversationModel {
  final String id;
  final String contactName;
  final String? contactAvatarUrl;
  final String lastMessage;
  final DateTime lastMessageAt;
  final int unreadCount;
  final String? serviceTitle;

  const ConversationModel({
    required this.id,
    required this.contactName,
    this.contactAvatarUrl,
    required this.lastMessage,
    required this.lastMessageAt,
    this.unreadCount = 0,
    this.serviceTitle,
  });
}

class NewsFeedItemModel {
  final String id;
  final String title;
  final String description;
  final String category;
  final String? imageUrl;
  final DateTime publishedAt;
  final bool isSponsored;
  final String? actionLabel;

  const NewsFeedItemModel({
    required this.id,
    required this.title,
    required this.description,
    required this.category,
    this.imageUrl,
    required this.publishedAt,
    this.isSponsored = false,
    this.actionLabel,
  });
}
