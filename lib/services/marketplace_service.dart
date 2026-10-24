import 'package:supabase_flutter/supabase_flutter.dart';
import '../models/app_models.dart';

class MarketplaceService {
  final SupabaseClient? _client;

  MarketplaceService([this._client]);

  SupabaseClient? get client => _client;

  // Busca categorias ativas
  Future<List<CategoryModel>> getCategories() async {
    try {
      if (_client != null) {
        final data = await _client!
            .from('categories')
            .select()
            .eq('active', true)
            .order('display_order', ascending: true);
        return (data as List).map((json) => CategoryModel.fromJson(json)).toList();
      }
    } catch (_) {
      // Fallback em caso de offline
    }

    // Lista nativa com as categorias de Parauapebas
    return const [
      CategoryModel(id: '1', name: 'Ar-Condicionado', slug: 'ar-condicionado', description: 'Instalação e manutenção de Split', iconName: 'ac_unit', displayOrder: 1),
      CategoryModel(id: '2', name: 'Eletricista', slug: 'eletricista', description: 'Instalações elétricas residenciais e prediais', iconName: 'bolt', displayOrder: 2),
      CategoryModel(id: '3', name: 'Encanador', slug: 'encanador', description: 'Vazamentos, bombas e desentupimentos', iconName: 'plumbing', displayOrder: 3),
      CategoryModel(id: '4', name: 'Pedreiro', slug: 'pedreiro', description: 'Construção, pisos, reboco e reformas', iconName: 'construction', displayOrder: 4),
      CategoryModel(id: '5', name: 'Pintor', slug: 'pintor', description: 'Pinturas residencial, textura e verniz', iconName: 'format_paint', displayOrder: 5),
      CategoryModel(id: '6', name: 'Diarista', slug: 'diarista', description: 'Limpeza pesada, diária e pós-obra', iconName: 'cleaning_services', displayOrder: 6),
      CategoryModel(id: '7', name: 'Mecânico', slug: 'mecanico', description: 'Mecânica automotiva e auto socorro', iconName: 'build', displayOrder: 7),
      CategoryModel(id: '8', name: 'Informática', slug: 'informatica-celular', description: 'PCs, notebooks e troca de telas', iconName: 'computer', displayOrder: 8),
      CategoryModel(id: '9', name: 'Fretes', slug: 'fretes-mudancas', description: 'Carretos e mudanças locais', iconName: 'local_shipping', displayOrder: 9),
      CategoryModel(id: '10', name: 'Marceneiro', slug: 'marcenaria', description: 'Montagem de móveis e marcenaria', iconName: 'handyman', displayOrder: 10),
    ];
  }

  // Lista de profissionais em destaque
  Future<List<ProfessionalModel>> getFeaturedProfessionals() async {
    return const [
      ProfessionalModel(
        id: 'p1',
        profileId: 'u1',
        fullName: 'Carlos Eduardo Silva',
        specialty: 'Técnico em Refrigeração & Split',
        neighborhood: 'Cidade Nova',
        ratingAverage: 4.95,
        ratingCount: 38,
        completedServicesCount: 64,
        isVerified: true,
        isSponsored: true,
        yearsExperience: 8,
        bio: 'Especialista em climatização residencial e comercial em Parauapebas. Atendimento rápido, higienização com laudo e garantia do serviço.',
        servedNeighborhoods: ['Cidade Nova', 'Rio Verde', 'União', 'Beira Rio'],
        services: [
          {'title': 'Instalação de Split 9.000 a 12.000 BTUs', 'price': 250.0},
          {'title': 'Higienização Completa com Carga de Gás', 'price': 180.0},
        ],
      ),
      ProfessionalModel(
        id: 'p2',
        profileId: 'u2',
        fullName: 'Marcos Vinicius Santos',
        specialty: 'Eletricista Residencial e Industrial',
        neighborhood: 'Rio Verde',
        ratingAverage: 4.88,
        ratingCount: 26,
        completedServicesCount: 42,
        isVerified: true,
        isSponsored: false,
        yearsExperience: 6,
        bio: 'Instalação de quadros, padrão de energia, fiação completa e reparos de curto-circuito.',
        servedNeighborhoods: ['Rio Verde', 'União', 'Nova Carajás', 'Cidade Nova'],
      ),
      ProfessionalModel(
        id: 'p3',
        profileId: 'u3',
        fullName: 'Antônio de Pádua (Tonho)',
        specialty: 'Mestre de Obras e Porcelanato',
        neighborhood: 'União',
        ratingAverage: 5.0,
        ratingCount: 19,
        completedServicesCount: 31,
        isVerified: true,
        isSponsored: false,
        yearsExperience: 14,
        bio: 'Acabamentos de alto padrão, assentamento de porcelanato grande formato e reformas em geral.',
        servedNeighborhoods: ['Todos os bairros de Parauapebas'],
      ),
    ];
  }

  // Banners promocionais e institucionais
  List<Map<String, dynamic>> getPromoBanners() {
    return [
      {
        'id': 'b1',
        'title': 'Precisa de Ar-Condicionado limpo?',
        'subtitle': 'Profissionais verificados com avaliação em Parauapebas',
        'buttonText': 'Solicitar agora',
        'isAd': false,
        'badge': 'Destaque',
        'bgColor': 0xFF820AD1,
      },
      {
        'id': 'b2',
        'title': 'Espaço Publicitário',
        'subtitle': 'Anuncie seus serviços para milhares de clientes na região',
        'buttonText': 'Saiba mais',
        'isAd': true,
        'badge': 'Publicidade',
        'bgColor': 0xFF530082,
      },
    ];
  }

  // Feed de novidades e dicas
  List<NewsFeedItemModel> getNewsFeed() {
    return [
      NewsFeedItemModel(
        id: 'n1',
        title: '5 Dicas para contratar eletricista com segurança',
        description: 'Verifique se o profissional possui ferramentas adequadas e sempre solicite orçamento discriminado antes de iniciar.',
        category: 'Dicas de Segurança',
        publishedAt: DateTime.now().subtract(const Duration(hours: 4)),
        isSponsored: false,
        actionLabel: 'Ler artigo',
      ),
      NewsFeedItemModel(
        id: 'n2',
        title: 'Novo no app? Aprenda a negociar pelo chat interno',
        description: 'Combine valores, prazos de entrega e materiais diretamente pela nossa conversa segura com proteção de histórico.',
        category: 'Novidades da Plataforma',
        publishedAt: DateTime.now().subtract(const Duration(days: 1)),
        isSponsored: false,
        actionLabel: 'Ver tutorial',
      ),
      NewsFeedItemModel(
        id: 'n3',
        title: 'Anuncie aqui seu comércio ou serviço',
        description: 'Destaque seu negócio no topo das buscas de Parauapebas para alcançar mais clientes na sua região.',
        category: 'Campanha Patrocinada',
        publishedAt: DateTime.now().subtract(const Duration(days: 2)),
        isSponsored: true,
        actionLabel: 'Divulgar perfil',
      ),
    ];
  }
}
